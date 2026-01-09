import { NextResponse } from "next/server"

// Fetch all available models from CometAPI
export async function GET() {
    const apiKey = process.env.COMETAPI_KEY || process.env.OPENAI_API_KEY

    if (!apiKey) {
        return NextResponse.json({ error: "No CometAPI key configured" }, { status: 500 })
    }

    try {
        const response = await fetch("https://api.cometapi.com/v1/models", {
            headers: {
                "Authorization": `Bearer ${apiKey}`,
            },
        })

        if (!response.ok) {
            const errorText = await response.text()
            return NextResponse.json({
                error: "Failed to fetch models",
                status: response.status,
                details: errorText
            }, { status: response.status })
        }

        const data = await response.json()

        // Filter and categorize models
        const allModels = data.data || []

        // Find 3D-related models
        const models3D = allModels.filter((m: any) => {
            const id = (m.id || "").toLowerCase()
            const owned = (m.owned_by || "").toLowerCase()
            return (
                id.includes("3d") ||
                id.includes("mesh") ||
                id.includes("hunyuan") ||
                id.includes("tripo") ||
                id.includes("point-e") ||
                id.includes("shap-e") ||
                id.includes("instant3d") ||
                id.includes("trellis") ||
                id.includes("lgm") ||
                owned.includes("3d")
            )
        })

        // Find image models (for reference image generation)
        const imageModels = allModels.filter((m: any) => {
            const id = (m.id || "").toLowerCase()
            return (
                id.includes("flux") ||
                id.includes("dall-e") ||
                id.includes("stable-diffusion") ||
                id.includes("midjourney") ||
                id.includes("imagen")
            )
        })

        return NextResponse.json({
            total: allModels.length,
            models_3d: {
                count: models3D.length,
                models: models3D.map((m: any) => ({
                    id: m.id,
                    owned_by: m.owned_by,
                    created: m.created,
                })),
            },
            image_models: {
                count: imageModels.length,
                models: imageModels.slice(0, 20).map((m: any) => ({
                    id: m.id,
                    owned_by: m.owned_by,
                })),
            },
            all_model_ids: allModels.map((m: any) => m.id).sort(),
        })

    } catch (error: any) {
        return NextResponse.json({
            error: "Failed to fetch models",
            message: error.message
        }, { status: 500 })
    }
}
