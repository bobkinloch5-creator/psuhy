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

    // Try multiple endpoints - the API may have changed
    let result: any
    const endpoints = [
      // Try named endpoints first
      { endpoint: "/generation", args: { prompt } },
      { endpoint: "/generate", args: { prompt } },
      { endpoint: "/text_to_3d", args: { prompt } },
      { endpoint: "/predict", args: [prompt] },
      // Try function indices
      { endpoint: 1, args: [prompt] },
      { endpoint: 2, args: [prompt] },
      { endpoint: 3, args: [prompt] },
    ]

    for (const ep of endpoints) {
      try {
        console.log(`[Hunyuan3D-2] Trying endpoint: ${ep.endpoint}`)
        result = await Promise.race([
          Array.isArray(ep.args)
            ? client.predict(ep.endpoint, ep.args)
            : client.predict(ep.endpoint, ep.args),
          new Promise((_, reject) => setTimeout(() => reject(new Error("Endpoint timeout")), 30000))
        ])
        if (result?.data) {
          console.log("[Hunyuan3D-2] Found working endpoint:", ep.endpoint)
          break
        }
      } catch (e: any) {
        console.log(`[Hunyuan3D-2] Endpoint ${ep.endpoint} failed:`, e.message?.slice(0, 100))
        continue
      }
    }

    if (!result?.data) {
      throw new Error("No working endpoint found")
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

// ============ SHAP-E FALLBACK (FREE - UNTEXTURED) ============
async function generateWithShapE(prompt: string): Promise<ModelResult> {
  console.log("[Shap-E] Using untextured fallback:", prompt)

  try {
    const { Client } = await import("@gradio/client")

    const client = await Promise.race([
      Client.connect("hysts/Shap-E"),
      new Promise((_, reject) => setTimeout(() => reject(new Error("Connection timeout")), 30000))
    ]) as any

    const result = await Promise.race([
      client.predict("/text-to-3d", [
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
          source: "Shap-E (Untextured)"
        }
      }
    }
    throw new Error("No model returned from Shap-E")
  } catch (error: any) {
    console.error("[Shap-E] Error:", error.message)
    throw error
  }
}

// ============ INSTANTMESH (FREE - TEXTURED) ============
async function generateWithInstantMesh(prompt: string): Promise<ModelResult> {
  console.log("[InstantMesh] Generating textured model:", prompt)

  try {
    const { Client } = await import("@gradio/client")

    // Try TencentARC's InstantMesh which creates textured models
    const client = await Promise.race([
      Client.connect("TencentARC/InstantMesh"),
      new Promise((_, reject) => setTimeout(() => reject(new Error("Connection timeout")), 30000))
    ]) as any

    console.log("[InstantMesh] Connected")

    // InstantMesh takes an image, so we first need to generate an image from prompt
    // Use a text-to-image model first
    const imageClient = await Client.connect("stabilityai/stable-diffusion-3-medium")
    const imageResult = await Promise.race([
      imageClient.predict("/infer", [
        prompt + ", 3D render, isometric view, white background, centered object, high quality",
        "(blurry, deformed, ugly, nsfw):1.2",
        0,
        true,
        512,
        512,
        5.0,
        28,
      ]),
      new Promise((_, reject) => setTimeout(() => reject(new Error("Image generation timeout")), 60000))
    ]) as any

    if (!imageResult.data?.[0]) {
      throw new Error("Failed to generate reference image")
    }

    const imageUrl = typeof imageResult.data[0] === 'string' ? imageResult.data[0] : imageResult.data[0]?.url

    console.log("[InstantMesh] Got reference image, generating 3D...")

    // Now run InstantMesh with the image
    const result = await Promise.race([
      client.predict("/generate_mvs", [
        { url: imageUrl },
        75,  // sample_steps
        45,  // sample_seed
      ]),
      new Promise((_, reject) => setTimeout(() => reject(new Error("3D generation timeout")), 120000))
    ]) as any

    if (result.data?.[0]) {
      const modelUrl = typeof result.data[0] === 'string' ? result.data[0] : result.data[0]?.url || result.data[0]?.path

      if (modelUrl) {
        console.log("[InstantMesh] ✅ Got textured model:", modelUrl)
        return {
          model_url: modelUrl,
          preview_url: imageUrl,
          formats: {
            glb: modelUrl.includes('.glb') ? modelUrl : null,
            obj: modelUrl.includes('.obj') ? modelUrl : modelUrl,
            fbx: null,
          },
          source: "InstantMesh (Textured)"
        }
      }
    }
    throw new Error("No model returned from InstantMesh")
  } catch (error: any) {
    console.error("[InstantMesh] Error:", error.message)
    throw error
  }
}

// ============ TRIPOSR (FREE - TEXTURED) ============
async function generateWithTripoSR(prompt: string): Promise<ModelResult> {
  console.log("[TripoSR] Generating textured model:", prompt)

  try {
    const { Client } = await import("@gradio/client")

    // First generate an image from the prompt
    const imageClient = await Promise.race([
      Client.connect("black-forest-labs/FLUX.1-schnell"),
      new Promise((_, reject) => setTimeout(() => reject(new Error("Connection timeout")), 30000))
    ]) as any

    const imageResult = await Promise.race([
      imageClient.predict("/infer", [
        prompt + ", 3D render, single object, isometric view, centered, studio lighting, white background",
        0,
        true,
        512,
        512,
        4,
      ]),
      new Promise((_, reject) => setTimeout(() => reject(new Error("Image generation timeout")), 60000))
    ]) as any

    let imageUrl = null
    if (imageResult.data?.[0]) {
      imageUrl = typeof imageResult.data[0] === 'string' ? imageResult.data[0] : imageResult.data[0]?.url
    }

    if (!imageUrl) {
      throw new Error("Failed to generate reference image")
    }

    console.log("[TripoSR] Got reference image, running TripoSR...")

    // Connect to TripoSR
    const client = await Promise.race([
      Client.connect("stabilityai/TripoSR"),
      new Promise((_, reject) => setTimeout(() => reject(new Error("Connection timeout")), 30000))
    ]) as any

    console.log("[TripoSR] Connected")

    const result = await Promise.race([
      client.predict("/run", [
        { url: imageUrl },
        true,   // do_remove_background
        0.5,    // foreground_ratio
        32,     // mc_resolution
      ]),
      new Promise((_, reject) => setTimeout(() => reject(new Error("3D generation timeout")), 120000))
    ]) as any

    if (result.data?.[0]) {
      const modelUrl = typeof result.data[0] === 'string' ? result.data[0] : result.data[0]?.url || result.data[0]?.path

      if (modelUrl) {
        console.log("[TripoSR] ✅ Got textured model:", modelUrl)
        return {
          model_url: modelUrl,
          preview_url: imageUrl,
          formats: {
            glb: modelUrl.includes('.glb') ? modelUrl : null,
            obj: modelUrl.includes('.obj') ? modelUrl : modelUrl,
            fbx: null,
          },
          source: "TripoSR (Textured)"
        }
      }
    }
    throw new Error("No model returned from TripoSR")
  } catch (error: any) {
    console.error("[TripoSR] Error:", error.message)
    throw error
  }
}

// ============ LGM (FREE - TEXTURED) ============
async function generateWithLGM(prompt: string): Promise<ModelResult> {
  console.log("[LGM] Generating textured model with Large Gaussian Model:", prompt)

  try {
    const { Client } = await import("@gradio/client")

    const client = await Promise.race([
      Client.connect("ashawkey/LGM"),
      new Promise((_, reject) => setTimeout(() => reject(new Error("Connection timeout")), 30000))
    ]) as any

    console.log("[LGM] Connected")

    // LGM can take a text prompt directly
    const result = await Promise.race([
      client.predict("/process", [
        prompt,
        null,  // image (optional)
        true,  // use_text
        256,   // resolution
      ]),
      new Promise((_, reject) => setTimeout(() => reject(new Error("Generation timeout")), 180000))
    ]) as any

    if (result.data) {
      // Find GLB in results
      for (const item of result.data) {
        if (item) {
          const url = typeof item === 'string' ? item : item?.url || item?.path
          if (url && (url.includes('.glb') || url.includes('.ply') || url.includes('.obj'))) {
            console.log("[LGM] ✅ Got textured model:", url)
            return {
              model_url: url,
              preview_url: null,
              formats: {
                glb: url.includes('.glb') ? url : null,
                obj: url,
                fbx: null,
              },
              source: "LGM (Textured)"
            }
          }
        }
      }
    }
    throw new Error("No model returned from LGM")
  } catch (error: any) {
    console.error("[LGM] Error:", error.message)
    throw error
  }
}

// ============ MAIN GENERATION (PRIORITIZE TEXTURED) ============
async function generateModel(prompt: string, style?: string): Promise<ModelResult> {
  // Try textured model generators first, then fall back to untextured
  // Expanded variety of generators for more reliable 3D model generation
  const generators = [
    { name: "Hunyuan3D-2", fn: generateWithHunyuan3D },  // Tencent - high quality
    { name: "TripoSR", fn: generateWithTripoSR },        // Stability AI - textured
    { name: "InstantMesh", fn: generateWithInstantMesh }, // TencentARC - textured
    { name: "LGM", fn: generateWithLGM },                 // Large Gaussian Model
    { name: "Cube3D", fn: generateWithCube3D },           // Roblox optimized
    { name: "Shap-E", fn: generateWithShapE },            // OpenAI - fallback
  ]

  for (const gen of generators) {
    console.log(`[3D-Gen] Trying ${gen.name}...`)
    try {
      const result = await gen.fn(prompt)
      if (result.model_url) {
        console.log(`[3D-Gen] ✅ Success with ${gen.name}`)
        return result
      }
    } catch (error: any) {
      console.log(`[3D-Gen] ${gen.name} failed:`, error.message)
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
