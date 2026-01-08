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

// ============ FREE HUGGING FACE SPACES - UNLIMITED GENERATIONS ============

// LGM (Large Multimodal Model) - Good quality text-to-3D
async function generateWithLGM(prompt: string): Promise<ModelResult> {
  console.log("[LGM] Generating with LGM:", prompt)

  try {
    const { Client } = await import("@gradio/client")
    const client = await Client.connect("ashawkey/LGM")

    // LGM accepts text prompt directly
    const result = await client.predict("run", [
      prompt,     // text prompt
      42,         // seed
      40,         // num_steps  
    ])

    const resultData = result.data as any[]

    if (resultData && resultData.length > 0) {
      const modelFile = resultData[0]
      const modelUrl = typeof modelFile === 'string' ? modelFile : modelFile?.url || modelFile?.path

      if (modelUrl) {
        return {
          model_url: modelUrl,
          preview_url: resultData[1]?.url || resultData[1] || null,
          formats: {
            glb: modelUrl.includes('.glb') ? modelUrl : modelUrl,
            obj: null,
            fbx: null
          },
          source: "LGM"
        }
      }
    }
    throw new Error("No model returned")
  } catch (error: any) {
    console.error("[LGM] Error:", error.message)
    throw error
  }
}

// OpenLRM - High quality 3D reconstruction
async function generateWithOpenLRM(prompt: string): Promise<ModelResult> {
  console.log("[OpenLRM] Generating:", prompt)

  try {
    const { Client } = await import("@gradio/client")
    const client = await Client.connect("zxhezexin/OpenLRM")

    const result = await client.predict("process", [
      prompt,
    ])

    const resultData = result.data as any[]

    if (resultData && resultData.length > 0) {
      const modelFile = resultData[0]
      const modelUrl = typeof modelFile === 'string' ? modelFile : modelFile?.url || modelFile?.path

      if (modelUrl) {
        return {
          model_url: modelUrl,
          preview_url: null,
          formats: { glb: modelUrl, obj: null, fbx: null },
          source: "OpenLRM"
        }
      }
    }
    throw new Error("No model returned")
  } catch (error: any) {
    console.error("[OpenLRM] Error:", error.message)
    throw error
  }
}

// Shap-E by OpenAI - Reliable text-to-3D
async function generateWithShapE(prompt: string): Promise<ModelResult> {
  console.log("[Shap-E] Generating:", prompt)

  try {
    const { Client } = await import("@gradio/client")

    // Try multiple Shap-E hosts
    const hosts = ["hysts/Shap-E", "radames/Shap-E"]
    let client = null

    for (const host of hosts) {
      try {
        client = await Client.connect(host)
        break
      } catch {
        continue
      }
    }

    if (!client) throw new Error("No Shap-E host available")

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

// Point-E by OpenAI - Fast point cloud to mesh
async function generateWithPointE(prompt: string): Promise<ModelResult> {
  console.log("[Point-E] Generating:", prompt)

  try {
    const { Client } = await import("@gradio/client")
    const client = await Client.connect("openai/point-e")

    const result = await client.predict("generate", [
      prompt,
    ])

    const resultData = result.data as any[]

    if (resultData && resultData.length > 0) {
      const modelFile = resultData[0]
      const modelUrl = typeof modelFile === 'string' ? modelFile : modelFile?.url || modelFile?.path

      if (modelUrl) {
        return {
          model_url: modelUrl,
          preview_url: null,
          formats: { glb: modelUrl, obj: null, fbx: null },
          source: "Point-E"
        }
      }
    }
    throw new Error("No model returned")
  } catch (error: any) {
    console.error("[Point-E] Error:", error.message)
    throw error
  }
}

// ============ MAIN GENERATION - ALL FREE, UNLIMITED ============
async function generateModel(prompt: string, style?: string): Promise<ModelResult> {
  // Enhanced prompt for better quality
  const enhancedPrompt = style
    ? `${prompt}, ${style} style, 3D model, detailed`
    : `${prompt}, 3D model, game asset, detailed mesh`

  // All free services - try in order of quality
  const services = [
    { name: "LGM", fn: () => generateWithLGM(enhancedPrompt) },
    { name: "Shap-E", fn: () => generateWithShapE(enhancedPrompt) },
    { name: "OpenLRM", fn: () => generateWithOpenLRM(enhancedPrompt) },
    { name: "Point-E", fn: () => generateWithPointE(prompt) },
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

// ============ STORAGE HELPER ============
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

    // Service client for database
    const serviceClient = createServiceClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      { auth: { autoRefreshToken: false, persistSession: false } }
    )

    // Find user
    let { data: userData } = await serviceClient
      .from("users")
      .select("id, discord_id, model_credits, subscription_tier")
      .eq("discord_id", user.id)
      .single()

    if (!userData) {
      const result = await serviceClient
        .from("users")
        .select("id, discord_id, model_credits, subscription_tier")
        .eq("id", user.id)
        .single()
      userData = result.data
    }

    if (!userData) {
      return NextResponse.json({ error: "User not found" }, { status: 404 })
    }

    // Check credits (but for you, we make it unlimited below)
    const isPremium = userData.subscription_tier && ["pro", "premium", "enterprise"].includes(userData.subscription_tier)
    const modelCredits = userData.model_credits ?? 0

    // For non-premium users, check credits
    if (!isPremium && modelCredits <= 0) {
      return NextResponse.json({
        error: "No model generation credits remaining!",
        creditsRemaining: 0,
      }, { status: 403 })
    }

    // Generate model (FREE - unlimited)
    const result = await generateModel(prompt, style)

    if (!result.model_url) {
      return NextResponse.json({
        error: "Model generation temporarily unavailable",
        details: "Please try again in a moment.",
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

    // Deduct credits for non-premium (but services are free so this is just for tracking)
    if (!isPremium && modelCredits > 0) {
      const newCredits = modelCredits - 1
      await serviceClient.from("users").update({ model_credits: newCredits }).eq("id", userData.id)

      return NextResponse.json({
        success: true,
        creation,
        model: modelData,
        source: result.source,
        creditsRemaining: newCredits,
        freeGeneration: true,
      })
    }

    return NextResponse.json({
      success: true,
      creation,
      model: modelData,
      source: result.source,
      creditsRemaining: "unlimited",
      freeGeneration: true,
    })

  } catch (error: any) {
    console.error("[3D-Gen] Error:", error)
    return NextResponse.json({
      error: "Generation failed",
      details: error.message,
    }, { status: 500 })
  }
}
