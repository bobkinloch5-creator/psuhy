import { createClient } from "@/lib/supabase/server"
import { createClient as createServiceClient } from "@supabase/supabase-js"
import { NextResponse } from "next/server"

// Max duration for Vercel Pro
export const maxDuration = 300

interface ModelResult {
  model_url: string | null
  preview_url: string | null
  formats: { glb: string | null; obj: string | null; fbx: string | null }
  source: string
}

// ============ HUNYUAN3D-2 (FREE - OFFICIAL TENCENT SPACE) ============
async function generateWithHunyuan3D(prompt: string): Promise<ModelResult> {
  console.log("[Hunyuan3D-2] Generating with official Tencent space:", prompt)

  try {
    const { Client } = await import("@gradio/client")

    // Connect to the official Tencent Hunyuan3D-2 space with timeout
    const client = await Promise.race([
      Client.connect("tencent/Hunyuan3D-2"),
      new Promise((_, reject) => setTimeout(() => reject(new Error("Connection timeout")), 30000))
    ]) as any

    console.log("[Hunyuan3D-2] Connected to Hugging Face space")

    // Try to get API info first
    let result: any
    try {
      // Try the main predict endpoint with index 0
      result = await Promise.race([
        client.predict(0, [prompt]),
        new Promise((_, reject) => setTimeout(() => reject(new Error("Generation timeout")), 120000))
      ])
    } catch {
      // Fallback: try with named endpoint
      result = await Promise.race([
        client.predict("/run", { text: prompt }),
        new Promise((_, reject) => setTimeout(() => reject(new Error("Generation timeout")), 120000))
      ])
    }

    console.log("[Hunyuan3D-2] Raw result:", JSON.stringify(result.data).slice(0, 500))

    const resultData = result.data as any[]

    if (resultData && resultData.length > 0) {
      // Find the GLB file in the outputs
      let modelUrl: string | null = null
      let previewUrl: string | null = null

      for (const item of resultData) {
        if (typeof item === 'string') {
          if (item.includes('.glb') || item.includes('.obj')) {
            modelUrl = item
          } else if (item.includes('.png') || item.includes('.jpg')) {
            previewUrl = item
          }
        } else if (item?.url) {
          if (item.url.includes('.glb') || item.url.includes('.obj')) {
            modelUrl = item.url
          } else if (item.url.includes('.png') || item.url.includes('.jpg')) {
            previewUrl = item.url
          }
        } else if (item?.path) {
          if (item.path.includes('.glb') || item.path.includes('.obj')) {
            modelUrl = item.path
          }
        }
      }

      // If no specific file found, try the first output
      if (!modelUrl && resultData[0]) {
        const first = resultData[0]
        modelUrl = typeof first === 'string' ? first : first?.url || first?.path
      }

      if (modelUrl) {
        console.log("[Hunyuan3D-2] ✅ Got model URL:", modelUrl)
        return {
          model_url: modelUrl,
          preview_url: previewUrl,
          formats: {
            glb: modelUrl.includes('.glb') ? modelUrl : null,
            obj: modelUrl.includes('.obj') ? modelUrl : modelUrl,
            fbx: null,
          },
          source: "Hunyuan3D-2 (Free)"
        }
      }
    }
    throw new Error("No model returned from Hunyuan3D-2")
  } catch (error: any) {
    console.error("[Hunyuan3D-2] Error:", error.message)
    throw error
  }
}

// ============ CUBE3D FALLBACK (FREE - ROBLOX) ============
async function generateWithCube3D(prompt: string): Promise<ModelResult> {
  console.log("[Cube3D] Generating with Roblox Cube3D:", prompt)

  try {
    const { Client } = await import("@gradio/client")

    const client = await Promise.race([
      Client.connect("Roblox/cube3d-interactive"),
      new Promise((_, reject) => setTimeout(() => reject(new Error("Connection timeout")), 30000))
    ]) as any

    const result = await Promise.race([
      client.predict("/predict", [
        prompt,
        1.0,
        1.0,
        1.0,
      ]),
      new Promise((_, reject) => setTimeout(() => reject(new Error("Generation timeout")), 120000))
    ]) as any

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

// ============ SHAP-E FALLBACK (FREE) ============
async function generateWithShapE(prompt: string): Promise<ModelResult> {
  console.log("[Shap-E] Using free fallback:", prompt)

  try {
    const { Client } = await import("@gradio/client")

    const client = await Promise.race([
      Client.connect("hysts/Shap-E"),
      new Promise((_, reject) => setTimeout(() => reject(new Error("Connection timeout")), 30000))
    ]) as any

    const result = await Promise.race([
      client.predict("text-to-3d", [
        prompt,
        0,        // seed
        15.0,     // guidance_scale
        64,       // num_steps
      ]),
      new Promise((_, reject) => setTimeout(() => reject(new Error("Generation timeout")), 120000))
    ]) as any

    const resultData = result.data as any[]

    if (resultData && resultData.length > 0) {
      const modelFile = resultData[0]
      const modelUrl = typeof modelFile === 'string' ? modelFile : modelFile?.url || modelFile?.path
      const previewUrl = resultData[1] ? (typeof resultData[1] === 'string' ? resultData[1] : resultData[1]?.url) : null

      if (modelUrl) {
        console.log("[Shap-E] ✅ Got model URL:", modelUrl)
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
    throw new Error("No model returned from Shap-E")
  } catch (error: any) {
    console.error("[Shap-E] Error:", error.message)
    throw error
  }
}

// ============ MAIN GENERATION ============
async function generateModel(prompt: string, style?: string): Promise<ModelResult> {
  const enhancedPrompt = style
    ? `${prompt}, ${style} style, high quality 3D model`
    : `${prompt}, high quality 3D game asset`

  // Priority: Hunyuan3D-2 (best quality, free) → Cube3D → Shap-E
  const services: { name: string; fn: () => Promise<ModelResult> }[] = [
    { name: "Hunyuan3D-2", fn: () => generateWithHunyuan3D(enhancedPrompt) },
    { name: "Cube3D", fn: () => generateWithCube3D(prompt) },
    { name: "Shap-E", fn: () => generateWithShapE(prompt) },
  ]

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
