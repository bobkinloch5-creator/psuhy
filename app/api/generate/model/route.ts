import { createClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"
import { Client } from "@gradio/client"

// Hugging Face Cube3D Space
const CUBE3D_SPACE = "Roblox/cube3d-interactive"

// Helper to upload model to Supabase Storage
async function uploadModelToSupabase(
  supabase: any,
  modelBuffer: Buffer,
  userId: string,
  filename: string
): Promise<string | null> {
  try {
    const path = `models/${userId}/${Date.now()}_${filename}`

    const { data, error } = await supabase.storage
      .from("generated-models")
      .upload(path, modelBuffer, {
        contentType: "model/gltf-binary",
        upsert: false,
      })

    if (error) {
      console.error("[Cube3D] Storage upload error:", error)
      return null
    }

    // Get public URL
    const { data: urlData } = supabase.storage
      .from("generated-models")
      .getPublicUrl(path)

    return urlData?.publicUrl || null
  } catch (err) {
    console.error("[Cube3D] Upload failed:", err)
    return null
  }
}

export async function POST(request: Request) {
  try {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    let body
    try {
      body = await request.json()
    } catch (e) {
      return NextResponse.json({ error: "Invalid request body" }, { status: 400 })
    }

    const { prompt, style, boundingBox } = body

    if (!prompt) {
      return NextResponse.json({ error: "Prompt is required" }, { status: 400 })
    }

    console.log("[Cube3D] User:", user.id, "Prompt:", prompt)

    // Look up user by auth ID
    let { data: userData, error: userError } = await supabase
      .from("users")
      .select("id, discord_id, generation_credits, model_credits, subscription_tier")
      .eq("id", user.id)
      .single()

    // If not found by id, try discord_id for backwards compatibility
    if (userError || !userData) {
      console.log("[Cube3D] User not found by id, trying discord_id...")
      const result = await supabase
        .from("users")
        .select("id, discord_id, generation_credits, model_credits, subscription_tier")
        .eq("discord_id", user.id)
        .single()

      userData = result.data
      userError = result.error
    }

    if (userError || !userData) {
      console.error("[Cube3D] User lookup error:", userError)
      // Create user if they don't exist
      const { data: newUser, error: createError } = await supabase
        .from("users")
        .insert({
          id: user.id,
          discord_id: user.id,
          email: user.email,
          generation_credits: 10,
          model_credits: 50,
        })
        .select("id, discord_id, generation_credits, model_credits, subscription_tier")
        .single()

      if (createError || !newUser) {
        console.error("[Cube3D] Failed to create user:", createError)
        return NextResponse.json({ error: "User not found" }, { status: 404 })
      }
      userData = newUser
    }

    const isPremium =
      userData.subscription_tier && ["pro", "premium", "enterprise"].includes(userData.subscription_tier)
    if (!isPremium && userData.model_credits <= 0) {
      return NextResponse.json(
        {
          error: "No model generation credits remaining",
          upgradeUrl: "/upgrade",
        },
        { status: 403 },
      )
    }

    console.log("[Cube3D] Connecting to Hugging Face Space...")

    try {
      // Connect to the Cube3D Hugging Face Space
      const client = await Client.connect(CUBE3D_SPACE)

      console.log("[Cube3D] Connected! Generating model for:", prompt)

      // Bounding box defaults (x, y, z)
      const bbox = boundingBox || { x: 1.0, y: 1.0, z: 1.0 }

      // Call the Cube3D generation endpoint
      const result = await client.predict("/generate", {
        prompt: prompt,
        bounding_box_x: bbox.x || 1.0,
        bounding_box_y: bbox.y || 1.0,
        bounding_box_z: bbox.z || 1.0,
      })

      console.log("[Cube3D] Generation result:", JSON.stringify(result))

      // Extract the model file from result
      const resultData = result.data as any[]

      let originalModelUrl = null
      let previewUrl = null
      let storedModelUrl = null

      if (resultData && resultData.length > 0) {
        // First result is usually the 3D model file
        const modelFile = resultData[0]
        if (typeof modelFile === 'string') {
          originalModelUrl = modelFile
        } else if (modelFile?.url) {
          originalModelUrl = modelFile.url
        } else if (modelFile?.path) {
          originalModelUrl = modelFile.path
        }

        // Second result might be a preview image
        if (resultData[1]) {
          const preview = resultData[1]
          if (typeof preview === 'string') {
            previewUrl = preview
          } else if (preview?.url) {
            previewUrl = preview.url
          }
        }
      }

      console.log("[Cube3D] Original Model URL:", originalModelUrl)

      // Download and store the model in Supabase Storage
      if (originalModelUrl) {
        try {
          console.log("[Cube3D] Downloading model for Supabase storage...")
          const modelResponse = await fetch(originalModelUrl)

          if (modelResponse.ok) {
            const modelBuffer = Buffer.from(await modelResponse.arrayBuffer())
            const filename = originalModelUrl.includes('.glb') ? 'model.glb' : 'model.obj'

            storedModelUrl = await uploadModelToSupabase(
              supabase,
              modelBuffer,
              userData.id,
              filename
            )

            if (storedModelUrl) {
              console.log("[Cube3D] Model stored in Supabase:", storedModelUrl)
            }
          }
        } catch (downloadErr) {
          console.error("[Cube3D] Failed to download/store model:", downloadErr)
          // Fall back to original URL
        }
      }

      // Use Supabase URL if available, otherwise fall back to original
      const finalModelUrl = storedModelUrl || originalModelUrl

      const enhancedModelData: {
        prompt: string;
        style: string;
        model_url: any;
        preview_url: any;
        formats: { glb: any; obj: any };
        source: string;
        original_url?: string;
        auto_queued?: boolean;
      } = {
        prompt: prompt,
        style: style || "realistic",
        model_url: finalModelUrl,
        preview_url: previewUrl,
        formats: {
          glb: finalModelUrl?.includes('.glb') ? finalModelUrl : null,
          obj: finalModelUrl?.includes('.obj') ? finalModelUrl : null,
        },
        source: "cube3d",
        original_url: originalModelUrl,
      }

      // Auto-queue to Studio if connected
      let autoQueued = false
      const userDiscordId = userData.discord_id || user.id

      try {
        const { data: connection } = await supabase
          .from("plugin_connections")
          .select("*")
          .eq("user_id", userDiscordId)
          .eq("is_active", true)
          .single()

        if (connection && enhancedModelData.model_url) {
          const { error: queueError } = await supabase.from("asset_queue").insert({
            user_id: userDiscordId,
            asset_id: enhancedModelData.model_url,
            asset_type: "GeneratedModel",
            asset_name: prompt.slice(0, 50),
            status: "pending",
            metadata: {
              model_url: enhancedModelData.model_url,
              preview_url: enhancedModelData.preview_url,
              formats: enhancedModelData.formats,
              prompt: prompt,
            },
          })

          if (!queueError) {
            autoQueued = true
            console.log("[Cube3D] Auto-queued model to Studio for user:", userDiscordId)
          }
        }
      } catch (error) {
        console.error("[Cube3D] Auto-queue error:", error)
      }

      enhancedModelData.auto_queued = autoQueued

      // Save creation
      const { data: creation, error: creationError } = await supabase
        .from("creations")
        .insert({
          user_id: userData.id,
          type: "model",
          name: prompt.slice(0, 50),
          description: prompt,
          prompt: prompt,
          preview_url: enhancedModelData.preview_url,
          asset_data: enhancedModelData,
          status: "ready",
        })
        .select()
        .single()

      if (creationError) {
        console.error("[Cube3D] Creation insert error:", creationError)
      }

      // Deduct credits for non-premium users
      if (!isPremium) {
        const balanceBefore = userData.model_credits
        const balanceAfter = balanceBefore - 1

        await supabase.from("users").update({ model_credits: balanceAfter }).eq("id", userData.id)

        await supabase
          .from("credit_transactions")
          .insert({
            user_id: userData.id,
            transaction_type: "deduction",
            credit_type: "model",
            amount: 1,
            balance_before: balanceBefore,
            balance_after: balanceAfter,
            reason: "Cube3D model generation",
            creation_id: creation?.id,
            ip_address: request.headers.get("x-forwarded-for") || "unknown",
          })
          .catch((err) => console.error("[Cube3D] Transaction log error:", err))

        return NextResponse.json({
          success: true,
          creation: creation,
          model: enhancedModelData,
          creditsRemaining: balanceAfter,
          storedInSupabase: !!storedModelUrl,
        })
      }

      return NextResponse.json({
        success: true,
        creation: creation,
        model: enhancedModelData,
        creditsRemaining: "unlimited",
        storedInSupabase: !!storedModelUrl,
      })

    } catch (gradioError: any) {
      console.error("[Cube3D] Gradio API error:", gradioError)
      return NextResponse.json(
        {
          error: "Model generation failed",
          details: gradioError.message || "Cube3D service temporarily unavailable. Please try again.",
        },
        { status: 503 },
      )
    }

  } catch (error: any) {
    console.error("[Cube3D] Unexpected error:", error)
    return NextResponse.json(
      {
        error: "Generation failed",
        details: error.message || "An unexpected error occurred. Please try again.",
      },
      { status: 500 },
    )
  }
}
