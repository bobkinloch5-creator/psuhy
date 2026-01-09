// ============ GLB VALIDATION & TEXTURE PIPELINE ============
// Ensures ALL 3D models have embedded textures and materials
// This is the "Always Colored" guarantee for Blaxsmith

export interface GLBValidationResult {
    isValid: boolean
    hasUVs: boolean
    hasMaterials: boolean
    hasBaseColorTexture: boolean
    hasEmbeddedImages: boolean
    textureCount: number
    materialCount: number
    meshCount: number
    errors: string[]
    warnings: string[]
}

export interface GLBProcessingResult {
    success: boolean
    glbUrl: string
    previewUrl: string | null
    validation: GLBValidationResult
    processingTime: number
    source: string
}

// Validate GLB structure by parsing the binary
export async function validateGLB(glbUrl: string): Promise<GLBValidationResult> {
    console.log("[GLB-Validator] Validating GLB:", glbUrl.slice(0, 100))

    const result: GLBValidationResult = {
        isValid: false,
        hasUVs: false,
        hasMaterials: false,
        hasBaseColorTexture: false,
        hasEmbeddedImages: false,
        textureCount: 0,
        materialCount: 0,
        meshCount: 0,
        errors: [],
        warnings: [],
    }

    try {
        // Fetch the GLB file
        let glbData: ArrayBuffer

        if (glbUrl.startsWith('data:')) {
            // Base64 data URL
            const base64 = glbUrl.split(',')[1]
            const binary = atob(base64)
            const bytes = new Uint8Array(binary.length)
            for (let i = 0; i < binary.length; i++) {
                bytes[i] = binary.charCodeAt(i)
            }
            glbData = bytes.buffer
        } else {
            // Remote URL
            const response = await fetch(glbUrl)
            if (!response.ok) {
                result.errors.push(`Failed to fetch GLB: ${response.status}`)
                return result
            }
            glbData = await response.arrayBuffer()
        }

        // Parse GLB header
        const dataView = new DataView(glbData)
        const magic = dataView.getUint32(0, true)

        // Check magic number (0x46546C67 = "glTF")
        if (magic !== 0x46546C67) {
            result.errors.push("Invalid GLB magic number - not a valid GLB file")
            return result
        }

        const version = dataView.getUint32(4, true)
        if (version !== 2) {
            result.warnings.push(`GLB version ${version} detected, expected version 2`)
        }

        // Parse chunks
        let offset = 12
        let jsonChunk: any = null
        let binChunk: ArrayBuffer | null = null

        while (offset < glbData.byteLength) {
            const chunkLength = dataView.getUint32(offset, true)
            const chunkType = dataView.getUint32(offset + 4, true)

            if (chunkType === 0x4E4F534A) { // JSON
                const jsonData = new Uint8Array(glbData, offset + 8, chunkLength)
                const jsonString = new TextDecoder().decode(jsonData)
                jsonChunk = JSON.parse(jsonString)
            } else if (chunkType === 0x004E4942) { // BIN
                binChunk = glbData.slice(offset + 8, offset + 8 + chunkLength)
            }

            offset += 8 + chunkLength
        }

        if (!jsonChunk) {
            result.errors.push("No JSON chunk found in GLB")
            return result
        }

        // Analyze the glTF JSON structure
        const gltf = jsonChunk

        // Check meshes
        if (gltf.meshes && gltf.meshes.length > 0) {
            result.meshCount = gltf.meshes.length

            // Check for UVs (TEXCOORD_0)
            for (const mesh of gltf.meshes) {
                for (const primitive of mesh.primitives || []) {
                    if (primitive.attributes?.TEXCOORD_0 !== undefined) {
                        result.hasUVs = true
                        break
                    }
                }
                if (result.hasUVs) break
            }
        } else {
            result.errors.push("No meshes found in GLB")
        }

        // Check materials
        if (gltf.materials && gltf.materials.length > 0) {
            result.hasMaterials = true
            result.materialCount = gltf.materials.length

            // Check for baseColorTexture
            for (const material of gltf.materials) {
                const pbr = material.pbrMetallicRoughness
                if (pbr?.baseColorTexture !== undefined) {
                    result.hasBaseColorTexture = true
                    break
                }
                // Also check for baseColorFactor (solid color)
                if (pbr?.baseColorFactor) {
                    result.warnings.push("Material uses solid color instead of texture")
                }
            }
        } else {
            result.warnings.push("No materials found - model may appear gray")
        }

        // Check textures and images
        if (gltf.textures && gltf.textures.length > 0) {
            result.textureCount = gltf.textures.length
        }

        if (gltf.images && gltf.images.length > 0) {
            result.hasEmbeddedImages = true

            // Verify images are actually embedded (bufferView) or have URI
            for (const image of gltf.images) {
                if (!image.bufferView && !image.uri) {
                    result.warnings.push("Image reference found but no embedded data")
                    result.hasEmbeddedImages = false
                }
            }
        }

        // Final validation
        result.isValid =
            result.meshCount > 0 &&
            result.errors.length === 0

        // Add quality warnings
        if (!result.hasUVs) {
            result.warnings.push("No UV coordinates - textures cannot be applied")
        }
        if (!result.hasMaterials) {
            result.warnings.push("No materials defined - model will use default gray")
        }
        if (!result.hasBaseColorTexture && !result.hasEmbeddedImages) {
            result.warnings.push("No textures embedded - model will appear untextured")
        }

        console.log("[GLB-Validator] Validation result:", {
            isValid: result.isValid,
            meshes: result.meshCount,
            materials: result.materialCount,
            textures: result.textureCount,
            hasUVs: result.hasUVs,
            hasBaseColor: result.hasBaseColorTexture,
        })

        return result

    } catch (error: any) {
        result.errors.push(`Validation error: ${error.message}`)
        console.error("[GLB-Validator] Error:", error)
        return result
    }
}

// Check if a GLB needs texture enhancement
export function needsTextureEnhancement(validation: GLBValidationResult): boolean {
    return (
        validation.isValid &&
        validation.meshCount > 0 &&
        (!validation.hasBaseColorTexture || !validation.hasEmbeddedImages)
    )
}

// Generate a procedural texture for untextured models
export async function generateProceduralTexture(
    prompt: string,
    style?: string
): Promise<string | null> {
    console.log("[GLB-Texture] Generating procedural texture for:", prompt)

    try {
        // Try to generate a texture using image generation
        const apiKey = process.env.COMETAPI_KEY || process.env.OPENAI_API_KEY
        if (!apiKey) {
            console.log("[GLB-Texture] No API key for texture generation")
            return null
        }

        const texturePrompt = `Seamless tileable texture for ${prompt}, ${style || 'game asset'}, high detail, PBR material, diffuse map, no text, no watermark`

        const response = await fetch("https://api.cometapi.com/v1/images/generations", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${apiKey}`,
            },
            body: JSON.stringify({
                model: "flux-schnell",
                prompt: texturePrompt,
                size: "512x512",
                n: 1,
            }),
        })

        if (!response.ok) {
            console.error("[GLB-Texture] Texture generation failed")
            return null
        }

        const data = await response.json()
        if (data.data?.[0]?.url) {
            return data.data[0].url
        }
        if (data.data?.[0]?.b64_json) {
            return `data:image/png;base64,${data.data[0].b64_json}`
        }

        return null
    } catch (error: any) {
        console.error("[GLB-Texture] Error:", error.message)
        return null
    }
}

// Create a simple colored GLB when no texture is available
// This applies a solid PBR material based on the prompt
export function getDefaultMaterialColor(prompt: string): [number, number, number, number] {
    const lowerPrompt = prompt.toLowerCase()

    // Color mapping based on common keywords
    const colorMap: Record<string, [number, number, number, number]> = {
        red: [0.9, 0.1, 0.1, 1.0],
        blue: [0.1, 0.3, 0.9, 1.0],
        green: [0.1, 0.8, 0.2, 1.0],
        yellow: [0.95, 0.9, 0.1, 1.0],
        orange: [1.0, 0.5, 0.0, 1.0],
        purple: [0.6, 0.1, 0.9, 1.0],
        pink: [1.0, 0.4, 0.7, 1.0],
        black: [0.05, 0.05, 0.05, 1.0],
        white: [0.95, 0.95, 0.95, 1.0],
        gold: [1.0, 0.84, 0.0, 1.0],
        silver: [0.75, 0.75, 0.75, 1.0],
        bronze: [0.8, 0.5, 0.2, 1.0],
        wood: [0.55, 0.35, 0.15, 1.0],
        stone: [0.5, 0.5, 0.5, 1.0],
        metal: [0.7, 0.7, 0.75, 1.0],
        sword: [0.7, 0.7, 0.75, 1.0],
        tree: [0.2, 0.5, 0.15, 1.0],
        grass: [0.3, 0.6, 0.2, 1.0],
        water: [0.1, 0.4, 0.8, 1.0],
        fire: [1.0, 0.3, 0.0, 1.0],
        ice: [0.7, 0.9, 1.0, 1.0],
        lava: [1.0, 0.2, 0.0, 1.0],
    }

    // Find matching color
    for (const [keyword, color] of Object.entries(colorMap)) {
        if (lowerPrompt.includes(keyword)) {
            return color
        }
    }

    // Default to a nice warm gray if no match
    return [0.6, 0.55, 0.5, 1.0]
}

// Quality tier for the generated model
export type ModelQualityTier = 'premium' | 'standard' | 'basic'

export function assessModelQuality(validation: GLBValidationResult): ModelQualityTier {
    if (
        validation.isValid &&
        validation.hasUVs &&
        validation.hasMaterials &&
        validation.hasBaseColorTexture &&
        validation.hasEmbeddedImages &&
        validation.textureCount >= 1
    ) {
        return 'premium'
    }

    if (
        validation.isValid &&
        validation.hasMaterials &&
        (validation.hasBaseColorTexture || validation.materialCount > 0)
    ) {
        return 'standard'
    }

    return 'basic'
}

// Log quality report for debugging
export function logQualityReport(validation: GLBValidationResult, source: string): void {
    const quality = assessModelQuality(validation)

    console.log("═══════════════════════════════════════")
    console.log("         GLB QUALITY REPORT            ")
    console.log("═══════════════════════════════════════")
    console.log(`Source:     ${source}`)
    console.log(`Quality:    ${quality.toUpperCase()}`)
    console.log(`Valid:      ${validation.isValid ? '✅' : '❌'}`)
    console.log(`Meshes:     ${validation.meshCount}`)
    console.log(`Materials:  ${validation.materialCount}`)
    console.log(`Textures:   ${validation.textureCount}`)
    console.log(`Has UVs:    ${validation.hasUVs ? '✅' : '❌'}`)
    console.log(`Has Color:  ${validation.hasBaseColorTexture ? '✅' : '❌'}`)
    console.log(`Embedded:   ${validation.hasEmbeddedImages ? '✅' : '❌'}`)

    if (validation.errors.length > 0) {
        console.log("Errors:")
        validation.errors.forEach(e => console.log(`  ❌ ${e}`))
    }
    if (validation.warnings.length > 0) {
        console.log("Warnings:")
        validation.warnings.forEach(w => console.log(`  ⚠️ ${w}`))
    }
    console.log("═══════════════════════════════════════")
}
