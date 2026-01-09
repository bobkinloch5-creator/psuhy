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

// ============ COMETAPI HUNYUAN3D-2 (PAID - $0.08/REQUEST - MOST RELIABLE) ============
async function generateWithCometAPI(prompt: string): Promise<ModelResult> {
  console.log("[CometAPI-3D] Generating with CometAPI Hunyuan3D-2:", prompt)

  const apiKey = process.env.COMETAPI_KEY || process.env.OPENAI_API_KEY
  if (!apiKey) {
    throw new Error("No CometAPI key configured")
  }

  try {
    // Step 1: Generate a reference image from the prompt using CometAPI image generation
    console.log("[CometAPI-3D] Step 1: Generating HD reference image...")

    const imageResponse = await fetch("https://api.cometapi.com/v1/images/generations", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: "flux-schnell",  // Fast image generation
        prompt: `${prompt}, 3D render, single object, isometric view, centered, studio lighting, white background, high quality`,
        n: 1,
        size: "1024x1024",
      }),
    })

    if (!imageResponse.ok) {
      const errorText = await imageResponse.text()
      console.error("[CometAPI-3D] Image generation failed:", errorText)
      throw new Error(`Image generation failed: ${imageResponse.status}`)
    }

    const imageData = await imageResponse.json()
    const imageUrl = imageData.data?.[0]?.url

    if (!imageUrl) {
      throw new Error("No image URL returned from CometAPI")
    }

    console.log("[CometAPI-3D] Got reference image:", imageUrl.slice(0, 100))

    // Step 2: Generate 3D model using Hunyuan3D-2 via same endpoint (OpenAI-compatible)
    console.log("[CometAPI-3D] Step 2: Generating 3D model with Hunyuan3D-2...")

    const modelResponse = await fetch("https://api.cometapi.com/v1/images/generations", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: "Hunyuan3D-2",  // CometAPI's Hunyuan3D-2 model
        prompt: prompt,       // Text description for the 3D model
        image: imageUrl,      // Reference image URL
      }),
    })

    if (!modelResponse.ok) {
      const errorText = await modelResponse.text()
      console.error("[CometAPI-3D] 3D generation failed:", errorText)
      throw new Error(`3D generation failed: ${modelResponse.status}`)
    }

    const modelData = await modelResponse.json()
    console.log("[CometAPI-3D] Response:", JSON.stringify(modelData).slice(0, 500))

    // Handle response - CometAPI returns data array with url or b64_json
    if (modelData.data && modelData.data.length > 0) {
      const data = modelData.data[0]

      // Check for direct URL
      if (data.url) {
        console.log("[CometAPI-3D] ✅ Got 3D model URL:", data.url)
        return {
          model_url: data.url,
          preview_url: imageUrl,
          formats: {
            glb: data.url,
            obj: null,
            fbx: null,
          },
          source: "CometAPI Hunyuan3D-2 (Premium HD)"
        }
      }

      // Handle base64 response - upload to Supabase
      if (data.b64_json) {
        console.log("[CometAPI-3D] Got base64 data, converting...")
        // Return with base64 data for the caller to handle storage
        const modelBuffer = Buffer.from(data.b64_json, 'base64')
        const blob = new Blob([modelBuffer], { type: 'model/gltf-binary' })
        // Create a data URL for now - will be stored in Supabase later
        const dataUrl = `data:model/gltf-binary;base64,${data.b64_json}`

        return {
          model_url: dataUrl,
          preview_url: imageUrl,
          formats: {
            glb: dataUrl,
            obj: null,
            fbx: null,
          },
          source: "CometAPI Hunyuan3D-2 (Premium HD)"
        }
      }
    }

    throw new Error("No model data in response")
  } catch (error: any) {
    console.error("[CometAPI-3D] Error:", error.message)
    throw error
  }
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

    // Use the correct /generation_all endpoint with 13 parameters:
    // [caption, image, mv_front, mv_back, mv_left, mv_right, steps, guidance_scale, seed, octree_res, rembg, num_chunks, randomize_seed]
    // HIGH QUALITY: maximum settings for sharp, detailed models
    const result = await Promise.race([
      client.predict("/generation_all", [
        prompt,     // caption (text prompt)
        null,       // image (null for text-to-3D)
        null,       // mv_image_front
        null,       // mv_image_back
        null,       // mv_image_left
        null,       // mv_image_right
        30,         // steps (MAXIMUM for best quality)
        7,          // guidance_scale (increased for sharper details)
        1234,       // seed
        128,        // octree_res (MAXIMUM for sharp mesh)
        true,       // rembg (remove background)
        8000,       // num_chunks (MAXIMUM for detail)
        true,       // randomize_seed
      ]),
      new Promise((_, reject) => setTimeout(() => reject(new Error("Generation timeout")), 90000))
    ]) as any

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

// ============ CUBE3D WITH TEXTURE (FREE - ROBLOX OPTIMIZED + AI TEXTURES) ============
async function generateWithCube3DTextured(prompt: string): Promise<ModelResult> {
  console.log("[Cube3D+Tex] Generating textured Roblox model:", prompt)

  try {
    const { Client } = await import("@gradio/client")

    // Step 1: Generate geometry with Cube3D
    const cube3dClient = await Promise.race([
      Client.connect("Roblox/cube3d-interactive"),
      new Promise((_, reject) => setTimeout(() => reject(new Error("Connection timeout")), 30000))
    ]) as any

    console.log("[Cube3D+Tex] Step 1: Generating geometry...")

    const geometryResult = await Promise.race([
      cube3dClient.predict("/handle_text_prompt", [
        prompt,
        false,
        1.0,
        1.0,
        1.0,
        true,
      ]),
      new Promise((_, reject) => setTimeout(() => reject(new Error("Geometry generation timeout")), 180000))
    ]) as any

    const geometryData = geometryResult.data as any[]
    if (!geometryData?.[0]) {
      throw new Error("No geometry from Cube3D")
    }

    const meshUrl = typeof geometryData[0] === 'string' ? geometryData[0] : geometryData[0]?.url || geometryData[0]?.path
    console.log("[Cube3D+Tex] Got mesh:", meshUrl)

    // Step 2: Apply textures using Hunyuan3D-Paint (texture generation for meshes)
    console.log("[Cube3D+Tex] Step 2: Applying AI textures...")

    try {
      const textureClient = await Promise.race([
        Client.connect("tencent/Hunyuan3D-2"),
        new Promise((_, reject) => setTimeout(() => reject(new Error("Texture client timeout")), 30000))
      ]) as any

      // Use the /texgen endpoint to apply textures to existing mesh
      // Download the mesh first
      const meshResponse = await fetch(meshUrl)
      const meshBlob = await meshResponse.blob()

      const textureResult = await Promise.race([
        textureClient.predict("/texgen", [
          meshBlob,     // mesh file
          prompt,       // text prompt for texture style
          42,           // seed
          512,          // texture_size (lower for speed)
        ]),
        new Promise((_, reject) => setTimeout(() => reject(new Error("Texture generation timeout")), 120000))
      ]) as any

      console.log("[Cube3D+Tex] Texture result:", JSON.stringify(textureResult.data).slice(0, 300))

      if (textureResult.data?.[0]) {
        const texturedUrl = typeof textureResult.data[0] === 'string' ?
          textureResult.data[0] : textureResult.data[0]?.url || textureResult.data[0]?.path

        if (texturedUrl) {
          console.log("[Cube3D+Tex] ✅ Got textured model:", texturedUrl)
          return {
            model_url: texturedUrl,
            preview_url: null,
            formats: {
              glb: texturedUrl.includes('.glb') ? texturedUrl : null,
              obj: texturedUrl,
              fbx: null,
            },
            source: "Cube3D + AI Texture (Roblox)"
          }
        }
      }
    } catch (texError: any) {
      console.log("[Cube3D+Tex] Texture step failed, returning geometry only:", texError.message)
    }

    // If texturing fails, return the untextured mesh
    console.log("[Cube3D+Tex] Returning geometry-only model")
    return {
      model_url: meshUrl,
      preview_url: null,
      formats: {
        glb: meshUrl.includes('.glb') ? meshUrl : null,
        obj: meshUrl.includes('.obj') ? meshUrl : meshUrl,
        fbx: null,
      },
      source: "Cube3D (Geometry Only)"
    }
  } catch (error: any) {
    console.error("[Cube3D+Tex] Error:", error.message)
    throw error
  }
}

// ============ CUBE3D (FREE - ROBLOX OPTIMIZED - GEOMETRY ONLY FALLBACK) ============
async function generateWithCube3D(prompt: string): Promise<ModelResult> {
  console.log("[Cube3D] Generating with Roblox Cube3D:", prompt)

  try {
    const { Client } = await import("@gradio/client")

    const client = await Promise.race([
      Client.connect("Roblox/cube3d-interactive"),
      new Promise((_, reject) => setTimeout(() => reject(new Error("Connection timeout")), 30000))
    ]) as any

    console.log("[Cube3D] Connected to Roblox space")

    // Use the handle_text_prompt function with correct parameters:
    // [input_prompt, use_bbox, bbox_x, bbox_y, bbox_z, hi_res]
    const result = await Promise.race([
      client.predict("/handle_text_prompt", [
        prompt,       // input_prompt - the text description
        false,        // use_bbox - whether to constrain dimensions
        1.0,          // bbox_x - length (if use_bbox is true)
        1.0,          // bbox_y - height (if use_bbox is true)
        1.0,          // bbox_z - depth (if use_bbox is true)
        false,        // hi_res - disabled for faster generation
      ]),
      new Promise((_, reject) => setTimeout(() => reject(new Error("Generation timeout")), 180000))
    ]) as any

    console.log("[Cube3D] Raw result:", JSON.stringify(result.data).slice(0, 500))

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
          source: "Cube3D (Geometry Only)"
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

// ============ TRELLIS (FREE - HIGH QUALITY TEXTURED) ============
async function generateWithTrellis(prompt: string): Promise<ModelResult> {
  console.log("[TRELLIS] Generating textured model with Microsoft TRELLIS:", prompt)

  try {
    const { Client } = await import("@gradio/client")

    const client = await Promise.race([
      Client.connect("JeffreyXiang/TRELLIS"),
      new Promise((_, reject) => setTimeout(() => reject(new Error("Connection timeout")), 30000))
    ]) as any

    console.log("[TRELLIS] Connected")

    // TRELLIS takes a text prompt and generates textured 3D
    const result = await Promise.race([
      client.predict("/text_to_3d", [
        prompt,
        12345,      // seed
        12,         // ss_guidance_strength
        7.5,        // ss_sampling_steps
        3,          // slat_guidance_strength
        12,         // slat_sampling_steps
      ]),
      new Promise((_, reject) => setTimeout(() => reject(new Error("Generation timeout")), 180000))
    ]) as any

    console.log("[TRELLIS] Raw result:", JSON.stringify(result.data).slice(0, 500))

    if (result.data) {
      // Find GLB in results
      for (const item of result.data) {
        if (item) {
          const url = typeof item === 'string' ? item : item?.url || item?.path
          if (url && (url.includes('.glb') || url.includes('.gltf') || url.includes('.obj'))) {
            console.log("[TRELLIS] ✅ Got textured model:", url)
            return {
              model_url: url,
              preview_url: null,
              formats: {
                glb: url.includes('.glb') ? url : null,
                obj: url,
                fbx: null,
              },
              source: "TRELLIS (Textured)"
            }
          }
        }
      }
      // If no model file found directly, check first result
      if (result.data[0]) {
        const first = result.data[0]
        const url = typeof first === 'string' ? first : first?.url || first?.path
        if (url) {
          console.log("[TRELLIS] ✅ Got model from first result:", url)
          return {
            model_url: url,
            preview_url: null,
            formats: {
              glb: url.includes('.glb') ? url : null,
              obj: url,
              fbx: null,
            },
            source: "TRELLIS (Textured)"
          }
        }
      }
    }
    throw new Error("No model returned from TRELLIS")
  } catch (error: any) {
    console.error("[TRELLIS] Error:", error.message)
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

// ============ MAIN GENERATION (TEXTURED MODELS ONLY - COLORED OUTPUT) ============
async function generateModel(prompt: string, style?: string): Promise<ModelResult> {
  // ONLY TEXTURED GENERATORS - so models come with colors/textures built-in
  console.log("[3D-Gen] Generating TEXTURED model (with colors)...")

  // Helper to safely wrap generator calls and prevent unhandled rejections
  const safeGenerate = async (name: string, fn: (p: string) => Promise<ModelResult>, timeout: number): Promise<ModelResult> => {
    return new Promise(async (resolve, reject) => {
      const timeoutId = setTimeout(() => {
        reject(new Error(`${name} timeout`))
      }, timeout)

      try {
        const result = await fn(prompt)
        clearTimeout(timeoutId)
        if (result?.model_url) {
          console.log(`[3D-Gen] ✅ ${name} succeeded with TEXTURED model!`)
          resolve(result)
        } else {
          reject(new Error("No model URL"))
        }
      } catch (error: any) {
        clearTimeout(timeoutId)
        console.log(`[3D-Gen] ${name} failed:`, error.message)
        reject(error)
      }
    })
  }

  // Primary generators - try CometAPI first (paid), then free fallbacks
  // CometAPI Hunyuan3D-2: $0.08/model - reliable, high quality
  console.log("[3D-Gen] Trying CometAPI Hunyuan3D-2 (Premium)...")
  try {
    const cometResult = await safeGenerate("CometAPI-3D", generateWithCometAPI, 90000)
    if (cometResult?.model_url) return cometResult
  } catch (error: any) {
    console.log("[3D-Gen] CometAPI failed, trying free generators...", error.message)
  }

  // Fallback to free HuggingFace generators (race them)
  const texturedGenerators = [
    { name: "Hunyuan3D-2-Free", fn: generateWithHunyuan3D, timeout: 75000 },   // Tencent - TEXTURED (75s for quality)
    { name: "TRELLIS", fn: generateWithTrellis, timeout: 60000 },         // Microsoft - TEXTURED (60s)
  ]

  // Create racing promises with safe wrappers
  const racePromises = texturedGenerators.map(gen => {
    console.log(`[3D-Gen] Starting ${gen.name}...`)
    return safeGenerate(gen.name, gen.fn, gen.timeout)
  })

  // Return the first successful textured result
  try {
    const firstSuccess = await Promise.any(racePromises)
    if (firstSuccess?.model_url) return firstSuccess
  } catch (aggregateError) {
    console.log("[3D-Gen] Primary textured generators all failed:", aggregateError)
  }

  console.log("[3D-Gen] Trying backup generators...")

  // Backup generators (sequential - only fast ones with 45s timeout)
  const backupGenerators = [
    { name: "LGM", fn: generateWithLGM, timeout: 45000 },
    { name: "Shap-E", fn: generateWithShapE, timeout: 45000 },  // Fast geometry fallback
  ]

  for (const gen of backupGenerators) {
    console.log(`[3D-Gen] Trying backup: ${gen.name}...`)
    try {
      const result = await safeGenerate(gen.name, gen.fn, gen.timeout)
      if (result.model_url) {
        return result
      }
    } catch (error: any) {
      console.log(`[3D-Gen] Backup ${gen.name} failed:`, error.message)
    }
  }

  // Final fallback - try geometry-only as last resort
  console.log("[3D-Gen] All textured generators failed, trying geometry fallback...")
  try {
    const cubeResult = await safeGenerate("Cube3D", generateWithCube3D, 90000)
    if (cubeResult.model_url) {
      return cubeResult
    }
  } catch {
    console.log("[3D-Gen] Geometry fallback also failed")
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
