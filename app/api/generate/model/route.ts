import { createClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"
import { Client } from "@gradio/client"

// LGM (Large Multi-View Gaussian) - Fast text-to-3D (5 seconds)
const LGM_SPACE = "ashawkey/LGM"

// Max duration for Vercel Pro
export const maxDuration = 300

// Helper function to connect with retries
async function connectToLGM(maxRetries: number = 3): Promise<any> {
  let lastError: Error | null = null

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      console.log(`[LGM] Connection attempt ${attempt}/${maxRetries}...`)
      const client = await Client.connect(LGM_SPACE)
      console.log(`[LGM] Connected successfully on attempt ${attempt}`)
      return client
    } catch (error: any) {
      console.error(`[LGM] Connection attempt ${attempt} failed:`, error.message)
      lastError = error

      if (attempt < maxRetries) {
        // Wait before retry with exponential backoff
        const waitTime = 2000 * attempt
        console.log(`[LGM] Waiting ${waitTime}ms before retry...`)
        await new Promise(resolve => setTimeout(resolve, waitTime))
      }
    }
  }

  throw lastError || new Error("Failed to connect to LGM")
}

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
      console.error("[LGM] Storage upload error:", error)
      return null
    }

    // Get public URL
    const { data: urlData } = supabase.storage
      .from("generated-models")
      .getPublicUrl(path)

    return urlData?.publicUrl || null
  } catch (err) {
    console.error("[LGM] Upload failed:", err)
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

    console.log("[LGM] User:", user.id, "Prompt:", prompt)

    // Look up user by auth ID
    let { data: userData, error: userError } = await supabase
      .from("users")
      .select("id, discord_id, generation_credits, model_credits, subscription_tier")
      .eq("id", user.id)
      .single()

    // If not found by id, try discord_id for backwards compatibility
    if (userError || !userData) {
      console.log("[LGM] User not found by id, trying discord_id...")
      const result = await supabase
        .from("users")
        .select("id, discord_id, generation_credits, model_credits, subscription_tier")
        .eq("discord_id", user.id)
        .single()

      userData = result.data
      userError = result.error
    }

    if (userError || !userData) {
      console.error("[LGM] User lookup error:", userError)
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
        console.error("[LGM] Failed to create user:", createError)
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

    console.log("[LGM] Connecting to Hugging Face Space...")

    try {
      // Connect to LGM Hugging Face Space with retries
      const client = await connectToLGM(3)

      console.log("[LGM] Connected! Generating model for:", prompt)

      // LGM uses text-to-3D generation
      // The API takes a text prompt and returns GLB model + video preview
      const result = await client.predict("/run", {
        prompt: prompt,
      })

      console.log("[LGM] Generation result:", JSON.stringify(result))

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

      console.log("[LGM] Original Model URL:", originalModelUrl)

      // Download and store the model in Supabase Storage
      if (originalModelUrl) {
        try {
          console.log("[LGM] Downloading model for Supabase storage...")
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
              console.log("[LGM] Model stored in Supabase:", storedModelUrl)
            }
          }
        } catch (downloadErr) {
          console.error("[LGM] Failed to download/store model:", downloadErr)
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
        source: "LGM",
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
            console.log("[LGM] Auto-queued model to Studio for user:", userDiscordId)
          }
        }
      } catch (error) {
        console.error("[LGM] Auto-queue error:", error)
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
        console.error("[LGM] Creation insert error:", creationError)
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
            reason: "LGM model generation",
            creation_id: creation?.id,
            ip_address: request.headers.get("x-forwarded-for") || "unknown",
          })
          .catch((err) => console.error("[LGM] Transaction log error:", err))

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
      console.error("[LGM] Gradio API error:", gradioError)
      return NextResponse.json(
        {
          error: "Model generation failed",
          details: gradioError.message || "LGM service temporarily unavailable. Please try again.",
        },
        { status: 503 },
      )
    }

  } catch (error: any) {
    console.error("[LGM] Unexpected error:", error)
    return NextResponse.json(
      {
        error: "Generation failed",
        details: error.message || "An unexpected error occurred. Please try again.",
      },
      { status: 500 },
    )
  }
}
