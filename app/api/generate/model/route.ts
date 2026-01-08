import { createClient } from "@/lib/supabase/server"
import { createClient as createServiceClient } from "@supabase/supabase-js"
import { NextResponse } from "next/server"

// Meshy.ai API for high-quality 3D models
const MESHY_API_URL = "https://api.meshy.ai/openapi/v2"
const MESHY_API_KEY = process.env.MESHY_API_KEY || ""

// Max duration for Vercel Pro
export const maxDuration = 300

// Poll for task completion
async function pollMeshyTask(taskId: string, maxAttempts = 60): Promise<any> {
  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    try {
      const response = await fetch(`${MESHY_API_URL}/text-to-3d/${taskId}`, {
        headers: {
          "Authorization": `Bearer ${MESHY_API_KEY}`,
        },
      })

      if (!response.ok) {
        console.error("[Meshy] Poll error:", await response.text())
        await new Promise(resolve => setTimeout(resolve, 5000))
        continue
      }

      const task = await response.json()
      console.log(`[Meshy] Task ${taskId} status: ${task.status} (${task.progress}%)`)

      if (task.status === "SUCCEEDED") {
        return task
      } else if (task.status === "FAILED" || task.status === "CANCELED") {
        throw new Error(`Task ${task.status}`)
      }

      // Wait 5 seconds before next poll
      await new Promise(resolve => setTimeout(resolve, 5000))
    } catch (error) {
      console.error("[Meshy] Poll error:", error)
      await new Promise(resolve => setTimeout(resolve, 5000))
    }
  }
  throw new Error("Task timed out")
}

// Generate 3D model with Meshy.ai
async function generateWithMeshy(prompt: string, style?: string): Promise<{
  model_url: string | null;
  preview_url: string | null;
  formats: { glb: string | null; obj: string | null; fbx: string | null };
}> {
  console.log("[Meshy] Generating 3D model:", prompt)

  if (!MESHY_API_KEY) {
    console.log("[Meshy] No API key, falling back to Shap-E")
    return await fallbackGeneration(prompt)
  }

  try {
    // Create preview task
    const createResponse = await fetch(`${MESHY_API_URL}/text-to-3d`, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${MESHY_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        mode: "preview",
        prompt: prompt,
        art_style: style === "sculpture" ? "sculpture" : "realistic",
        should_remesh: true,
        target_polycount: 30000, // Good for Roblox
      }),
    })

    if (!createResponse.ok) {
      const errorText = await createResponse.text()
      console.error("[Meshy] Create task error:", errorText)
      return await fallbackGeneration(prompt)
    }

    const createData = await createResponse.json()
    const taskId = createData.result
    console.log("[Meshy] Created preview task:", taskId)

    // Poll for completion
    const completedTask = await pollMeshyTask(taskId)

    return {
      model_url: completedTask.model_urls?.glb || completedTask.model_urls?.obj || null,
      preview_url: completedTask.thumbnail_url || null,
      formats: {
        glb: completedTask.model_urls?.glb || null,
        obj: completedTask.model_urls?.obj || null,
        fbx: completedTask.model_urls?.fbx || null,
      }
    }
  } catch (error: any) {
    console.error("[Meshy] Error:", error.message)
    return await fallbackGeneration(prompt)
  }
}

// Fallback using Gradio Shap-E
async function fallbackGeneration(prompt: string): Promise<{
  model_url: string | null;
  preview_url: string | null;
  formats: { glb: string | null; obj: string | null; fbx: string | null };
}> {
  console.log("[Fallback] Using Shap-E Gradio fallback...")

  try {
    const { Client } = await import("@gradio/client")
    const SHAP_E_SPACE = "hysts/Shap-E"

    const client = await Client.connect(SHAP_E_SPACE)

    const result = await client.predict("text-to-3d", [
      prompt,
      0,
      15.0,
      64,
    ])

    const resultData = result.data as any[]

    let modelUrl = null
    let previewUrl = null

    if (resultData && resultData.length > 0) {
      const modelFile = resultData[0]
      if (typeof modelFile === 'string') {
        modelUrl = modelFile
      } else if (modelFile?.url) {
        modelUrl = modelFile.url
      } else if (modelFile?.path) {
        modelUrl = modelFile.path
      }

      if (resultData[1]) {
        const preview = resultData[1]
        if (typeof preview === 'string') {
          previewUrl = preview
        } else if (preview?.url) {
          previewUrl = preview.url
        }
      }
    }

    return {
      model_url: modelUrl,
      preview_url: previewUrl,
      formats: {
        glb: modelUrl?.includes('.glb') ? modelUrl : null,
        obj: modelUrl?.includes('.obj') ? modelUrl : null,
        fbx: null,
      }
    }
  } catch (error: any) {
    console.error("[Fallback] Shap-E error:", error.message)
    return {
      model_url: null,
      preview_url: null,
      formats: { glb: null, obj: null, fbx: null }
    }
  }
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
      console.error("[Storage] Upload error:", error)
      return null
    }

    const { data: urlData } = supabase.storage
      .from("generated-models")
      .getPublicUrl(path)

    return urlData?.publicUrl || null
  } catch (err) {
    console.error("[Storage] Upload failed:", err)
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

    const { prompt, style } = body

    if (!prompt) {
      return NextResponse.json({ error: "Prompt is required" }, { status: 400 })
    }

    console.log("[3D-Gen] User:", user.id, "Prompt:", prompt)

    // Use service client to bypass RLS
    const serviceClient = createServiceClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      { auth: { autoRefreshToken: false, persistSession: false } }
    )

    // Look up user by discord_id (which stores supabase auth id)
    let { data: userData, error: userError } = await serviceClient
      .from("users")
      .select("id, discord_id, generation_credits, model_credits, subscription_tier")
      .eq("discord_id", user.id)
      .single()

    // If not found by discord_id, try by id
    if (userError || !userData) {
      const result = await serviceClient
        .from("users")
        .select("id, discord_id, generation_credits, model_credits, subscription_tier")
        .eq("id", user.id)
        .single()

      userData = result.data
      userError = result.error
    }

    if (userError || !userData) {
      console.error("[3D-Gen] User not found:", userError)
      return NextResponse.json({ error: "User not found. Please log out and log back in." }, { status: 404 })
    }

    // Check credits
    const isPremium = userData.subscription_tier && ["pro", "premium", "enterprise"].includes(userData.subscription_tier)
    const modelCredits = userData.model_credits ?? 0

    if (!isPremium && modelCredits <= 0) {
      return NextResponse.json(
        {
          error: "No model generation credits remaining!",
          message: "Upgrade to Pro for more model credits or wait for your monthly reset.",
          creditsRemaining: 0,
          upgradeUrl: "/upgrade",
        },
        { status: 403 },
      )
    }

    console.log("[3D-Gen] User has", modelCredits, "credits. Generating with Meshy.ai...")

    try {
      // Generate 3D model
      const generationResult = await generateWithMeshy(prompt, style)

      if (!generationResult.model_url) {
        console.error("[3D-Gen] No model generated")
        return NextResponse.json(
          {
            error: "Model generation failed",
            details: "Could not generate 3D model. Please try again.",
          },
          { status: 503 },
        )
      }

      console.log("[3D-Gen] Model URL:", generationResult.model_url)

      let storedModelUrl: string | null = null

      // Download and store the model in Supabase Storage
      if (generationResult.model_url) {
        try {
          console.log("[3D-Gen] Downloading model for Supabase storage...")
          const modelResponse = await fetch(generationResult.model_url)

          if (modelResponse.ok) {
            const modelBuffer = Buffer.from(await modelResponse.arrayBuffer())
            const filename = generationResult.formats.glb ? 'model.glb' :
              generationResult.formats.fbx ? 'model.fbx' : 'model.obj'

            storedModelUrl = await uploadModelToSupabase(
              serviceClient,
              modelBuffer,
              userData.id,
              filename
            )

            if (storedModelUrl) {
              console.log("[3D-Gen] Model stored in Supabase:", storedModelUrl)
            }
          }
        } catch (downloadErr) {
          console.error("[3D-Gen] Failed to download/store model:", downloadErr)
        }
      }

      const finalModelUrl = storedModelUrl || generationResult.model_url

      const enhancedModelData = {
        prompt: prompt,
        style: style || "realistic",
        model_url: finalModelUrl,
        preview_url: generationResult.preview_url,
        formats: {
          glb: generationResult.formats.glb || (finalModelUrl?.includes('.glb') ? finalModelUrl : null),
          obj: generationResult.formats.obj || (finalModelUrl?.includes('.obj') ? finalModelUrl : null),
          fbx: generationResult.formats.fbx || (finalModelUrl?.includes('.fbx') ? finalModelUrl : null),
        },
        source: MESHY_API_KEY ? "Meshy.ai" : "Shap-E",
        original_url: generationResult.model_url,
        auto_queued: false,
      }

      // Auto-queue to Studio if connected
      const userDiscordId = userData.discord_id || user.id

      try {
        const { data: connection } = await serviceClient
          .from("plugin_connections")
          .select("*")
          .eq("user_id", userDiscordId)
          .eq("is_active", true)
          .single()

        if (connection && enhancedModelData.model_url) {
          const { error: queueError } = await serviceClient.from("asset_queue").insert({
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
            enhancedModelData.auto_queued = true
            console.log("[3D-Gen] Auto-queued model to Studio")
          }
        }
      } catch (error) {
        console.error("[3D-Gen] Auto-queue error:", error)
      }

      // Save creation
      const { data: creation, error: creationError } = await serviceClient
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
        console.error("[3D-Gen] Creation insert error:", creationError)
      }

      // Deduct credits for non-premium users
      if (!isPremium) {
        const balanceBefore = modelCredits
        const balanceAfter = balanceBefore - 1

        await serviceClient.from("users").update({ model_credits: balanceAfter }).eq("id", userData.id)

        try {
          await serviceClient
            .from("credit_transactions")
            .insert({
              user_id: userData.id,
              transaction_type: "deduction",
              credit_type: "model",
              amount: 1,
              balance_before: balanceBefore,
              balance_after: balanceAfter,
              reason: "3D model generation",
              creation_id: creation?.id,
              ip_address: request.headers.get("x-forwarded-for") || "unknown",
            })
        } catch (transactionErr) {
          console.error("[3D-Gen] Transaction log error:", transactionErr)
        }

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

    } catch (apiError: any) {
      console.error("[3D-Gen] API error:", apiError)
      return NextResponse.json(
        {
          error: "Model generation failed",
          details: apiError.message || "3D generation service temporarily unavailable. Please try again.",
        },
        { status: 503 },
      )
    }

  } catch (error: any) {
    console.error("[3D-Gen] Unexpected error:", error)
    return NextResponse.json(
      {
        error: "Generation failed",
        details: error.message || "An unexpected error occurred. Please try again.",
      },
      { status: 500 },
    )
  }
}
