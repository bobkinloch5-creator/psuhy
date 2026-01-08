import { createClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"

// CometAPI Configuration for Hunyuan3D-2
const COMETAPI_URL = "https://api.cometapi.com/v1"
const COMETAPI_KEY = process.env.COMETAPI_KEY || ""

// Max duration for Vercel Pro
export const maxDuration = 300

// Helper to call CometAPI for 3D model generation
async function generateWithCometAPI(prompt: string, style?: string): Promise<{
  model_url: string | null;
  preview_url: string | null;
  formats: { glb: string | null; obj: string | null; fbx: string | null };
}> {
  console.log("[CometAPI] Generating 3D model with Hunyuan3D-2:", prompt)

  // Enhance prompt for better 3D generation
  const enhancedPrompt = style
    ? `${prompt}, ${style} style, high quality 3D model, detailed textures`
    : `${prompt}, high quality 3D model, detailed textures, game asset`

  try {
    // CometAPI uses OpenAI-compatible format for some models
    // For Hunyuan3D-2, we need to use their specific endpoint
    const response = await fetch(`${COMETAPI_URL}/images/generations`, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${COMETAPI_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "hunyuan3d-2",
        prompt: enhancedPrompt,
        n: 1,
        response_format: "url",
        // Hunyuan3D-2 specific parameters
        output_format: "glb", // GLB format for Roblox compatibility
        quality: "high",
      }),
    })

    if (!response.ok) {
      const errorText = await response.text()
      console.error("[CometAPI] Error response:", errorText)

      // Try alternate endpoint format
      console.log("[CometAPI] Trying alternate 3D generation endpoint...")
      return await generateWith3DEndpoint(enhancedPrompt)
    }

    const data = await response.json()
    console.log("[CometAPI] Response:", JSON.stringify(data))

    if (data.data && data.data[0]) {
      const result = data.data[0]
      return {
        model_url: result.url || result.model_url || null,
        preview_url: result.preview_url || result.thumbnail || null,
        formats: {
          glb: result.url?.includes('.glb') ? result.url : null,
          obj: result.url?.includes('.obj') ? result.url : null,
          fbx: result.url?.includes('.fbx') ? result.url : null,
        }
      }
    }

    throw new Error("No model data in response")
  } catch (error: any) {
    console.error("[CometAPI] Error:", error.message)
    // Fallback to alternate method
    return await generateWith3DEndpoint(prompt)
  }
}

// Alternate 3D generation endpoint
async function generateWith3DEndpoint(prompt: string): Promise<{
  model_url: string | null;
  preview_url: string | null;
  formats: { glb: string | null; obj: string | null; fbx: string | null };
}> {
  console.log("[CometAPI] Using alternate 3D endpoint...")

  try {
    // Try the chat completions endpoint with 3D model
    const response = await fetch(`${COMETAPI_URL}/chat/completions`, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${COMETAPI_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "hunyuan3d-2",
        messages: [
          {
            role: "user",
            content: `Generate a 3D model: ${prompt}`
          }
        ],
        max_tokens: 1024,
      }),
    })

    if (!response.ok) {
      const errorText = await response.text()
      console.error("[CometAPI] Alternate endpoint error:", errorText)

      // Fall back to Meshy API if available, otherwise use placeholder
      return await fallbackGeneration(prompt)
    }

    const data = await response.json()
    console.log("[CometAPI] Alternate response:", JSON.stringify(data))

    // Parse response for model URL
    if (data.choices && data.choices[0]) {
      const content = data.choices[0].message?.content || ""
      // Extract URL from response if present
      const urlMatch = content.match(/https?:\/\/[^\s"]+\.(glb|obj|fbx)/i)
      if (urlMatch) {
        return {
          model_url: urlMatch[0],
          preview_url: null,
          formats: {
            glb: urlMatch[0].toLowerCase().includes('.glb') ? urlMatch[0] : null,
            obj: urlMatch[0].toLowerCase().includes('.obj') ? urlMatch[0] : null,
            fbx: urlMatch[0].toLowerCase().includes('.fbx') ? urlMatch[0] : null,
          }
        }
      }
    }

    return await fallbackGeneration(prompt)
  } catch (error: any) {
    console.error("[CometAPI] Alternate endpoint error:", error.message)
    return await fallbackGeneration(prompt)
  }
}

// Fallback using Gradio Shap-E (original implementation)
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
        fbx: null, // Shap-E doesn't support FBX
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

    const { prompt, style, boundingBox } = body

    if (!prompt) {
      return NextResponse.json({ error: "Prompt is required" }, { status: 400 })
    }

    console.log("[3D-Gen] User:", user.id, "Prompt:", prompt)

    // Look up user by auth ID
    let { data: userData, error: userError } = await supabase
      .from("users")
      .select("id, discord_id, generation_credits, model_credits, subscription_tier")
      .eq("id", user.id)
      .single()

    // If not found by id, try discord_id for backwards compatibility
    if (userError || !userData) {
      console.log("[3D-Gen] User not found by id, trying discord_id...")
      const result = await supabase
        .from("users")
        .select("id, discord_id, generation_credits, model_credits, subscription_tier")
        .eq("discord_id", user.id)
        .single()

      userData = result.data
      userError = result.error
    }

    if (userError || !userData) {
      console.error("[3D-Gen] User lookup error:", userError)
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
        console.error("[3D-Gen] Failed to create user:", createError)
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

    console.log("[3D-Gen] Generating with CometAPI Hunyuan3D-2...")

    try {
      // Generate 3D model using CometAPI
      const generationResult = await generateWithCometAPI(prompt, style)

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
              supabase,
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

      const enhancedModelData: {
        prompt: string;
        style: string;
        model_url: any;
        preview_url: any;
        formats: { glb: any; obj: any; fbx: any };
        source: string;
        original_url?: string;
        auto_queued?: boolean;
      } = {
        prompt: prompt,
        style: style || "realistic",
        model_url: finalModelUrl,
        preview_url: generationResult.preview_url,
        formats: {
          glb: generationResult.formats.glb || (finalModelUrl?.includes('.glb') ? finalModelUrl : null),
          obj: generationResult.formats.obj || (finalModelUrl?.includes('.obj') ? finalModelUrl : null),
          fbx: generationResult.formats.fbx || (finalModelUrl?.includes('.fbx') ? finalModelUrl : null),
        },
        source: "Hunyuan3D-2",
        original_url: generationResult.model_url,
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
            console.log("[3D-Gen] Auto-queued model to Studio for user:", userDiscordId)
          }
        }
      } catch (error) {
        console.error("[3D-Gen] Auto-queue error:", error)
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
        console.error("[3D-Gen] Creation insert error:", creationError)
      }

      // Deduct credits for non-premium users
      if (!isPremium) {
        const balanceBefore = userData.model_credits
        const balanceAfter = balanceBefore - 1

        await supabase.from("users").update({ model_credits: balanceAfter }).eq("id", userData.id)

        try {
          await supabase
            .from("credit_transactions")
            .insert({
              user_id: userData.id,
              transaction_type: "deduction",
              credit_type: "model",
              amount: 1,
              balance_before: balanceBefore,
              balance_after: balanceAfter,
              reason: "Hunyuan3D-2 model generation",
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
