import { createClient } from "@/lib/supabase/server"
import { createClient as createServiceClient } from "@supabase/supabase-js"
import { NextResponse } from "next/server"

// CometAPI for high-quality 3D models (Hunyuan3D-2)
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

// ============ COMETAPI - HUNYUAN3D-2 (HIGH QUALITY) ============
async function generateWithCometAPI(prompt: string): Promise<ModelResult> {
  if (!COMETAPI_KEY) {
    console.log("[CometAPI] No API key configured")
    throw new Error("No CometAPI key")
  }

  console.log("[CometAPI] Generating with Hunyuan3D-2:", prompt)

  try {
    // CometAPI uses OpenAI-compatible format
    const response = await fetch(`${COMETAPI_URL}/chat/completions`, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${COMETAPI_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "hunyuan3d-3",
        messages: [
          {
            role: "user",
            content: `Generate a high-quality 3D model: ${prompt}. Output detailed textured mesh in GLB format.`
          }
        ],
        max_tokens: 4096,
      }),
    })

    if (!response.ok) {
      const errorText = await response.text()
      console.log("[CometAPI] Response error:", response.status, errorText)

      // Try alternate generation endpoint
      return await tryAlternateEndpoint(prompt)
    }

    const data = await response.json()
    console.log("[CometAPI] Response:", JSON.stringify(data).slice(0, 500))

    // Extract model URL from response
    if (data.choices && data.choices[0]?.message?.content) {
      const content = data.choices[0].message.content

      // Look for model URL in response
      const urlMatch = content.match(/https?:\/\/[^\s"']+\.(glb|obj|fbx|gltf)/i)
      if (urlMatch) {
        return {
          model_url: urlMatch[0],
          preview_url: null,
          formats: {
            glb: urlMatch[0].toLowerCase().includes('.glb') ? urlMatch[0] : null,
            obj: urlMatch[0].toLowerCase().includes('.obj') ? urlMatch[0] : null,
            fbx: urlMatch[0].toLowerCase().includes('.fbx') ? urlMatch[0] : null,
          },
          source: "Hunyuan3D-2"
        }
      }

      // Check for base64 or other format
      if (content.includes('data:') || content.includes('model_url')) {
        const jsonMatch = content.match(/\{[^}]+model_url[^}]+\}/i)
        if (jsonMatch) {
          try {
            const parsed = JSON.parse(jsonMatch[0])
            if (parsed.model_url) {
              return {
                model_url: parsed.model_url,
                preview_url: parsed.preview_url || null,
                formats: { glb: parsed.model_url, obj: null, fbx: null },
                source: "Hunyuan3D-2"
              }
            }
          } catch { }
        }
      }
    }

    // Try data field
    if (data.data && data.data[0]) {
      const result = data.data[0]
      const modelUrl = result.url || result.model_url || result.output
      if (modelUrl) {
        return {
          model_url: modelUrl,
          preview_url: result.preview_url || result.thumbnail || null,
          formats: { glb: modelUrl, obj: null, fbx: null },
          source: "Hunyuan3D-2"
        }
      }
    }

    throw new Error("No model URL in response")
  } catch (error: any) {
    console.error("[CometAPI] Error:", error.message)
    throw error
  }
}

// Try alternate CometAPI endpoint for 3D generation
async function tryAlternateEndpoint(prompt: string): Promise<ModelResult> {
  console.log("[CometAPI] Trying alternate endpoint...")

  try {
    const response = await fetch(`${COMETAPI_URL}/images/generations`, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${COMETAPI_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "hunyuan3d-2",
        prompt: `3D model: ${prompt}, high quality textured mesh`,
        n: 1,
        response_format: "url",
      }),
    })

    if (!response.ok) {
      throw new Error(`Alternate endpoint failed: ${response.status}`)
    }

    const data = await response.json()

    if (data.data && data.data[0]) {
      const result = data.data[0]
      return {
        model_url: result.url || result.model_url,
        preview_url: result.preview_url || null,
        formats: { glb: result.url, obj: null, fbx: null },
        source: "Hunyuan3D-2"
      }
    }

    throw new Error("No data in alternate response")
  } catch (error: any) {
    console.error("[CometAPI] Alternate error:", error.message)
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

  // Try CometAPI first (high quality), then free fallback
  const services = [
    { name: "CometAPI", fn: () => generateWithCometAPI(enhancedPrompt) },
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

    // Check credits for ALL users (premium gets 50, free gets 5)
    const modelCredits = userData.model_credits ?? 0

    if (modelCredits <= 0) {
      const isPremium = userData.subscription_tier && ["pro", "premium", "enterprise"].includes(userData.subscription_tier)
      return NextResponse.json({
        error: "No model generation credits remaining!",
        message: isPremium
          ? "Your 50 model credits have been used. Credits reset monthly."
          : "Upgrade to Pro for 50 model generations per month!",
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

    // Deduct credits for ALL users
    const newCredits = modelCredits - 1
    await serviceClient.from("users").update({ model_credits: newCredits }).eq("id", userData.id)

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
