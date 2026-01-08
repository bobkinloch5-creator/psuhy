import { createClient } from "@/lib/supabase/server"
import { createClient as createServiceClient } from "@supabase/supabase-js"
import { NextResponse } from "next/server"

// Hyper3D Rodin API - High quality 3D models with PBR textures
const HYPER3D_API_KEY = process.env.HYPER3D_API_KEY || ""
const HYPER3D_API_URL = "https://api.hyper3d.ai"

// CometAPI for high-quality 3D models (Hunyuan3D-2) - fallback
const COMETAPI_KEY = process.env.COMETAPI_KEY || ""
const COMETAPI_URL = "https://api.cometapi.com/v1"

// Max duration for Vercel Pro
export const maxDuration = 300

interface ModelResult {
  model_url: string | null
  preview_url: string | null
  formats: { glb: string | null; obj: string | null; fbx: string | null }
  source: string
}

// ============ HYPER3D RODIN - HIGH QUALITY WITH TEXTURES ============
async function generateWithHyper3DRodin(prompt: string): Promise<ModelResult> {
  if (!HYPER3D_API_KEY) {
    console.log("[Hyper3D] No API key configured")
    throw new Error("No Hyper3D API key")
  }

  console.log("[Hyper3D] Generating with Rodin:", prompt)

  try {
    // Step 1: Create generation task
    const createResponse = await fetch(`${HYPER3D_API_URL}/v2/rodin`, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${HYPER3D_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        prompt: prompt,
        material: "PBR", // PBR for realistic textures
        quality: "high",
        geometry_file_format: "glb", // Best for Roblox
        tier: "Regular",
      }),
    })

    if (!createResponse.ok) {
      const errorText = await createResponse.text()
      console.log("[Hyper3D] Create task failed:", createResponse.status, errorText)
      throw new Error(`Hyper3D create failed: ${createResponse.status}`)
    }

    const taskData = await createResponse.json()
    const taskId = taskData.uuid || taskData.task_id || taskData.job_id
    console.log("[Hyper3D] Task created:", taskId)

    if (!taskId) {
      throw new Error("No task ID returned from Hyper3D")
    }

    // Step 2: Poll for completion (max 120 seconds)
    for (let i = 0; i < 60; i++) {
      await new Promise(resolve => setTimeout(resolve, 2000))

      const statusResponse = await fetch(`${HYPER3D_API_URL}/v2/rodin/${taskId}`, {
        headers: {
          "Authorization": `Bearer ${HYPER3D_API_KEY}`,
        },
      })

      if (!statusResponse.ok) continue

      const statusData = await statusResponse.json()
      console.log("[Hyper3D] Status:", statusData.status || statusData.state)

      if (statusData.status === "completed" || statusData.status === "Completed" ||
        statusData.state === "completed" || statusData.state === "COMPLETED") {
        // Get the model URL
        const modelUrl = statusData.output?.model_url || statusData.model_url ||
          statusData.result?.model_url || statusData.outputs?.[0]?.url

        if (modelUrl) {
          return {
            model_url: modelUrl,
            preview_url: statusData.output?.preview_url || statusData.thumbnail || null,
            formats: {
              glb: modelUrl,
              obj: statusData.output?.obj_url || null,
              fbx: statusData.output?.fbx_url || null,
            },
            source: "Hyper3D Rodin"
          }
        }
      }

      if (statusData.status === "failed" || statusData.state === "FAILED") {
        throw new Error("Hyper3D generation failed: " + (statusData.error || "Unknown error"))
      }
    }

    throw new Error("Hyper3D generation timed out")
  } catch (error: any) {
    console.error("[Hyper3D] Error:", error.message)
    throw error
  }
}

// ============ COMETAPI - HUNYUAN3D-2 (HIGH QUALITY WITH TEXTURES) ============
async function generateWithCometAPI(prompt: string): Promise<ModelResult> {
  if (!COMETAPI_KEY) {
    console.log("[CometAPI] No API key configured")
    throw new Error("No CometAPI key")
  }

  console.log("[CometAPI] Generating textured 3D with Hunyuan3D-2:", prompt)

  try {
    // CometAPI images/generations endpoint for 3D models
    const response = await fetch(`${COMETAPI_URL}/images/generations`, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${COMETAPI_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "hunyuan3d-2",
        prompt: `High quality 3D game asset: ${prompt}. Detailed textured mesh, game-ready, PBR materials.`,
        n: 1,
        response_format: "url",
      }),
    })

    if (!response.ok) {
      const errorText = await response.text()
      console.log("[CometAPI] Response error:", response.status, errorText)
      throw new Error(`CometAPI failed: ${response.status}`)
    }

    const data = await response.json()
    console.log("[CometAPI] Response:", JSON.stringify(data).slice(0, 500))

    // Handle successful response - look for model URL in data array
    if (data.data && data.data.length > 0) {
      const result = data.data[0]
      const modelUrl = result.url || result.model_url || result.output || result.file_url

      if (modelUrl) {
        console.log("[CometAPI] ✅ Got model URL:", modelUrl)
        return {
          model_url: modelUrl,
          preview_url: result.preview_url || result.thumbnail || null,
          formats: {
            glb: modelUrl.includes('.glb') ? modelUrl : modelUrl,
            obj: null,
            fbx: null
          },
          source: "Hunyuan3D-2 (Textured)"
        }
      }
    }

    // Alternative: check if URL is directly in response
    if (data.url) {
      return {
        model_url: data.url,
        preview_url: null,
        formats: { glb: data.url, obj: null, fbx: null },
        source: "Hunyuan3D-2 (Textured)"
      }
    }

    throw new Error("No model URL in CometAPI response")
  } catch (error: any) {
    console.error("[CometAPI] Error:", error.message)
    throw error
  }
}

// ============ MESHY - TEXT-TO-3D (FREE TIER) ============
async function generateWithMeshy(prompt: string): Promise<ModelResult> {
  console.log("[Meshy] Generating textured 3D model:", prompt)

  try {
    const { Client } = await import("@gradio/client")

    // Connect to Meshy's text-to-3D space
    const client = await Client.connect("Meshy/Meshy-4")

    console.log("[Meshy] Connected, generating model...")

    // Meshy API for text-to-3D
    const result = await client.predict("/generate", {
      prompt: prompt,
      art_style: "realistic",
      negative_prompt: "low quality, blurry",
    })

    const resultData = result.data as any[]

    if (resultData && resultData.length > 0) {
      const modelFile = resultData[0]
      const modelUrl = typeof modelFile === 'string' ? modelFile : modelFile?.url || modelFile?.path

      if (modelUrl) {
        console.log("[Meshy] ✅ Got model URL:", modelUrl)
        return {
          model_url: modelUrl,
          preview_url: resultData[1]?.url || null,
          formats: {
            glb: modelUrl.includes('.glb') ? modelUrl : modelUrl,
            obj: null,
            fbx: null,
          },
          source: "Meshy (Textured)"
        }
      }
    }
    throw new Error("No model returned from Meshy")
  } catch (error: any) {
    console.error("[Meshy] Error:", error.message)
    throw error
  }
}

// ============ CUBE3D - ROBLOX'S FREE 3D MODEL (FALLBACK) ============
async function generateWithCube3D(prompt: string): Promise<ModelResult> {
  console.log("[Cube3D] Generating with Roblox Cube3D:", prompt)

  try {
    const { Client } = await import("@gradio/client")

    // Connect to Roblox's Cube3D interactive space
    const client = await Client.connect("Roblox/cube3d-interactive")

    // Cube3D API: prompt and optional bounding box
    const result = await client.predict("/predict", [
      prompt,           // text prompt
      1.0,              // bounding_box_x
      1.0,              // bounding_box_y  
      1.0,              // bounding_box_z
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

// ============ MAIN GENERATION ============
async function generateModel(prompt: string, style?: string): Promise<ModelResult> {
  const enhancedPrompt = style
    ? `${prompt}, ${style} style, high quality 3D model with detailed textures`
    : `${prompt}, high quality 3D game asset, detailed textured mesh`

  // Priority: Meshy (free textured) → Cube3D (Roblox free) → Shap-E (fallback)
  // CometAPI kept as optional if key exists
  const services: { name: string; fn: () => Promise<ModelResult> }[] = []

  // Add CometAPI first if key exists (fastest, paid option)
  if (COMETAPI_KEY) {
    services.push({ name: "CometAPI-Hunyuan3D", fn: () => generateWithCometAPI(enhancedPrompt) })
  }

  // Free options in priority order - all text-to-3D capable
  services.push(
    { name: "Meshy", fn: () => generateWithMeshy(enhancedPrompt) },
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

    // Check credits - uses the same generation_credits as chat (100 total for everything)
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

    // Generate with CometAPI (high quality)
    const result = await generateModel(prompt, style)

    if (!result.model_url) {
      return NextResponse.json({
        error: "Model generation temporarily unavailable",
        details: "Please try again.",
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

    // Deduct credits from unified generation_credits pool
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
