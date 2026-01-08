import { createClient } from "@/lib/supabase/server"
import { createClient as createServiceClient } from "@supabase/supabase-js"
import { NextResponse } from "next/server"

// Synexa API - High quality Hunyuan3D-2 models (PRIMARY)
const SYNEXA_API_KEY = process.env.SYNEXA_API_KEY || ""
const SYNEXA_API_URL = "https://api.synexa.ai/v1/predictions"

// Max duration for Vercel Pro
export const maxDuration = 300

interface ModelResult {
  model_url: string | null
  preview_url: string | null
  formats: { glb: string | null; obj: string | null; fbx: string | null }
  source: string
}

// ============ SYNEXA HUNYUAN3D-2 - PRIMARY (HIGH QUALITY) ============
// This is an image-to-3D API, so we first generate a concept image
async function generateWithSynexa(prompt: string): Promise<ModelResult> {
  if (!SYNEXA_API_KEY) {
    console.log("[Synexa] No API key configured")
    throw new Error("No Synexa API key")
  }

  console.log("[Synexa] Generating 3D model with Hunyuan3D-2:", prompt)

  try {
    // Step 1: Generate concept image from text using FLUX or similar
    // For now, we'll use a sample image approach - in production, generate real image
    const conceptImageUrl = await generateConceptImage(prompt)
    console.log("[Synexa] Concept image URL:", conceptImageUrl)

    // Step 2: Create 3D generation prediction
    const createResponse = await fetch(SYNEXA_API_URL, {
      method: "POST",
      headers: {
        "x-api-key": SYNEXA_API_KEY,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "tencent/hunyuan3d-2",
        input: {
          seed: Math.floor(Math.random() * 10000),
          image: conceptImageUrl,
          steps: 5,
          caption: prompt,
          shape_only: false, // We want textures
          guidance_scale: 5.5,
          check_box_rembg: true,
          octree_resolution: "256"
        }
      }),
    })

    if (!createResponse.ok) {
      const errorText = await createResponse.text()
      console.log("[Synexa] Create task failed:", createResponse.status, errorText)
      throw new Error(`Synexa create failed: ${createResponse.status}`)
    }

    const taskData = await createResponse.json()
    const predictionId = taskData.id || taskData.prediction_id
    console.log("[Synexa] Prediction created:", predictionId)

    if (!predictionId) {
      throw new Error("No prediction ID returned from Synexa")
    }

    // Step 3: Poll for completion (max 180 seconds)
    for (let i = 0; i < 90; i++) {
      await new Promise(resolve => setTimeout(resolve, 2000))

      const statusResponse = await fetch(`${SYNEXA_API_URL}/${predictionId}`, {
        headers: {
          "x-api-key": SYNEXA_API_KEY,
        },
      })

      if (!statusResponse.ok) {
        console.log("[Synexa] Status check failed:", statusResponse.status)
        continue
      }

      const statusData = await statusResponse.json()
      console.log("[Synexa] Status:", statusData.status)

      if (statusData.status === "succeeded" || statusData.status === "completed") {
        // Get the model URL from output
        const output = statusData.output
        let modelUrl: string | null = null

        // Try to find GLB URL in various locations
        if (typeof output === 'string') {
          modelUrl = output
        } else if (Array.isArray(output)) {
          modelUrl = output.find((url: string) => url.includes('.glb') || url.includes('.obj')) || output[0]
        } else if (output?.glb) {
          modelUrl = output.glb
        } else if (output?.mesh) {
          modelUrl = output.mesh
        } else if (output?.model) {
          modelUrl = output.model
        }

        if (modelUrl) {
          console.log("[Synexa] ✅ Got model URL:", modelUrl)
          return {
            model_url: modelUrl,
            preview_url: output?.preview || output?.thumbnail || null,
            formats: {
              glb: modelUrl.includes('.glb') ? modelUrl : modelUrl,
              obj: output?.obj || null,
              fbx: null,
            },
            source: "Hunyuan3D-2 (Synexa)"
          }
        }
      }

      if (statusData.status === "failed" || statusData.status === "error") {
        throw new Error("Synexa generation failed: " + (statusData.error || "Unknown error"))
      }
    }

    throw new Error("Synexa generation timed out")
  } catch (error: any) {
    console.error("[Synexa] Error:", error.message)
    throw error
  }
}

// Generate concept image from text prompt
async function generateConceptImage(prompt: string): Promise<string> {
  // Use a sample concept image for now
  // In production, integrate with FLUX or similar image generation
  const sampleImages = [
    "https://synexa.s3.us-east-005.backblazeb2.com/models/tencent-hunyuan3d-2-demo.png",
  ]

  // Try to generate with Together.ai FLUX if API key available
  const togetherKey = process.env.TOGETHER_API_KEY
  if (togetherKey) {
    try {
      console.log("[Image] Generating concept image with FLUX...")
      const response = await fetch("https://api.together.xyz/v1/images/generations", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${togetherKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "black-forest-labs/FLUX.1-schnell-Free",
          prompt: `3D game asset concept art, isometric view, white background: ${prompt}`,
          width: 512,
          height: 512,
          steps: 4,
          n: 1,
        }),
      })

      if (response.ok) {
        const data = await response.json()
        if (data.data?.[0]?.url) {
          console.log("[Image] ✅ Generated concept image")
          return data.data[0].url
        }
      }
    } catch (e) {
      console.log("[Image] FLUX generation failed, using sample")
    }
  }

  // Fallback to sample image
  return sampleImages[0]
}

// ============ FREE FALLBACK - SHAP-E ============
async function generateWithShapE(prompt: string): Promise<ModelResult> {
  console.log("[Shap-E] Using free fallback:", prompt)

  try {
    const { Client } = await import("@gradio/client")
    const client = await Client.connect("hysts/Shap-E")

    const result = await client.predict("text-to-3d", [
      prompt,
      0,        // seed
      15.0,     // guidance_scale
      64,       // num_steps
    ])

    const resultData = result.data as any[]

    if (resultData && resultData.length > 0) {
      const modelFile = resultData[0]
      const modelUrl = typeof modelFile === 'string' ? modelFile : modelFile?.url || modelFile?.path
      const previewUrl = resultData[1] ? (typeof resultData[1] === 'string' ? resultData[1] : resultData[1]?.url) : null

      if (modelUrl) {
        return {
          model_url: modelUrl,
          preview_url: previewUrl,
          formats: {
            glb: modelUrl.includes('.glb') ? modelUrl : null,
            obj: modelUrl.includes('.obj') ? modelUrl : modelUrl,
            fbx: null,
          },
          source: "Shap-E"
        }
      }
    }
    throw new Error("No model returned")
  } catch (error: any) {
    console.error("[Shap-E] Error:", error.message)
    throw error
  }
}

// ============ CUBE3D FALLBACK ============
async function generateWithCube3D(prompt: string): Promise<ModelResult> {
  console.log("[Cube3D] Generating with Roblox Cube3D:", prompt)

  try {
    const { Client } = await import("@gradio/client")
    const client = await Client.connect("Roblox/cube3d-interactive")

    const result = await client.predict("/predict", [
      prompt,
      1.0,
      1.0,
      1.0,
    ])

    const resultData = result.data as any[]

    if (resultData && resultData.length > 0) {
      const modelFile = resultData[0]
      const modelUrl = typeof modelFile === 'string' ? modelFile : modelFile?.url || modelFile?.path

      if (modelUrl) {
        console.log("[Cube3D] ✅ Got model URL:", modelUrl)
        return {
          model_url: modelUrl,
          preview_url: null,
          formats: {
            glb: modelUrl.includes('.glb') ? modelUrl : null,
            obj: modelUrl.includes('.obj') ? modelUrl : modelUrl,
            fbx: null,
          },
          source: "Cube3D (Roblox)"
        }
      }
    }
    throw new Error("No model returned from Cube3D")
  } catch (error: any) {
    console.error("[Cube3D] Error:", error.message)
    throw error
  }
}

// ============ MAIN GENERATION ============
async function generateModel(prompt: string, style?: string): Promise<ModelResult> {
  const enhancedPrompt = style
    ? `${prompt}, ${style} style, high quality 3D model with detailed textures`
    : `${prompt}, high quality 3D game asset, detailed textured mesh`

  // Priority: Synexa (paid, reliable) → Cube3D → Shap-E (fallbacks)
  const services: { name: string; fn: () => Promise<ModelResult> }[] = []

  // Add Synexa first if key exists (best quality, paid)
  if (SYNEXA_API_KEY) {
    services.push({ name: "Synexa-Hunyuan3D", fn: () => generateWithSynexa(enhancedPrompt) })
  }

  // Free fallbacks
  services.push(
    { name: "Cube3D", fn: () => generateWithCube3D(prompt) },
    { name: "Shap-E", fn: () => generateWithShapE(prompt) },
  )

  for (const service of services) {
    try {
      console.log(`[3D-Gen] Trying ${service.name}...`)
      const result = await service.fn()
      if (result.model_url) {
        console.log(`[3D-Gen] ✅ Success with ${service.name}`)
        return result
      }
    } catch (error: any) {
      console.log(`[3D-Gen] ${service.name} failed:`, error.message)
      continue
    }
  }

  return {
    model_url: null,
    preview_url: null,
    formats: { glb: null, obj: null, fbx: null },
    source: "none"
  }
}

// ============ STORAGE ============
async function uploadModelToSupabase(
  supabase: any,
  modelBuffer: Buffer,
  userId: string,
  filename: string
): Promise<string | null> {
  try {
    const path = `models/${userId}/${Date.now()}_${filename}`
    const { error } = await supabase.storage
      .from("generated-models")
      .upload(path, modelBuffer, { contentType: "model/gltf-binary", upsert: false })

    if (error) return null

    const { data: urlData } = supabase.storage.from("generated-models").getPublicUrl(path)
    return urlData?.publicUrl || null
  } catch {
    return null
  }
}

// ============ API ROUTE ============
export async function POST(request: Request) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = await request.json().catch(() => null)
    if (!body?.prompt) {
      return NextResponse.json({ error: "Prompt is required" }, { status: 400 })
    }

    const { prompt, style } = body
    console.log("[3D-Gen] User:", user.id, "Prompt:", prompt)

    const serviceClient = createServiceClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      { auth: { autoRefreshToken: false, persistSession: false } }
    )

    // Find user
    let { data: userData } = await serviceClient
      .from("users")
      .select("id, discord_id, generation_credits, subscription_tier")
      .eq("discord_id", user.id)
      .single()

    if (!userData) {
      const result = await serviceClient
        .from("users")
        .select("id, discord_id, generation_credits, subscription_tier")
        .eq("id", user.id)
        .single()
      userData = result.data
    }

    if (!userData) {
      return NextResponse.json({ error: "User not found" }, { status: 404 })
    }

    // Check credits
    const credits = userData.generation_credits ?? 0

    if (credits <= 0) {
      const isPremium = userData.subscription_tier && ["pro", "premium", "enterprise"].includes(userData.subscription_tier)
      return NextResponse.json({
        error: "No credits remaining!",
        message: isPremium
          ? "Your 100 credits have been used. Credits reset monthly."
          : "Upgrade to Pro for 100 credits per month!",
        creditsRemaining: 0,
      }, { status: 403 })
    }

    // Generate model
    const result = await generateModel(prompt, style)

    if (!result.model_url) {
      return NextResponse.json({
        error: "Model generation temporarily unavailable",
        details: "All 3D generation services are currently down. Please try again in a few minutes.",
      }, { status: 503 })
    }

    // Store in Supabase
    let storedModelUrl: string | null = null
    try {
      const modelResponse = await fetch(result.model_url)
      if (modelResponse.ok) {
        const modelBuffer = Buffer.from(await modelResponse.arrayBuffer())
        storedModelUrl = await uploadModelToSupabase(serviceClient, modelBuffer, userData.id, "model.glb")
      }
    } catch { }

    const finalModelUrl = storedModelUrl || result.model_url

    const modelData = {
      prompt,
      style: style || "realistic",
      model_url: finalModelUrl,
      preview_url: result.preview_url,
      formats: result.formats,
      source: result.source,
      original_url: result.model_url,
      auto_queued: false,
    }

    // Auto-queue to Studio
    try {
      const { data: connection } = await serviceClient
        .from("plugin_connections")
        .select("*")
        .eq("user_id", userData.discord_id || user.id)
        .eq("is_active", true)
        .single()

      if (connection) {
        await serviceClient.from("asset_queue").insert({
          user_id: userData.discord_id || user.id,
          asset_id: modelData.model_url,
          asset_type: "GeneratedModel",
          asset_name: prompt.slice(0, 50),
          status: "pending",
          metadata: modelData,
        })
        modelData.auto_queued = true
      }
    } catch { }

    // Save creation
    const { data: creation } = await serviceClient
      .from("creations")
      .insert({
        user_id: userData.id,
        type: "model",
        name: prompt.slice(0, 50),
        description: prompt,
        prompt,
        preview_url: modelData.preview_url,
        asset_data: modelData,
        status: "ready",
      })
      .select()
      .single()

    // Deduct credits
    const newCredits = credits - 1
    await serviceClient.from("users").update({ generation_credits: newCredits }).eq("id", userData.id)

    return NextResponse.json({
      success: true,
      creation,
      model: modelData,
      source: result.source,
      creditsRemaining: newCredits,
    })

  } catch (error: any) {
    console.error("[3D-Gen] Error:", error)
    return NextResponse.json({
      error: "Generation failed",
      details: error.message,
    }, { status: 500 })
  }
}
