import { Client } from "@gradio/client"
import { createClient } from "@/lib/supabase/server"
import { createClient as createServiceClient } from "@supabase/supabase-js"
import { NextResponse } from "next/server"

export const maxDuration = 180  // 3 minutes for rigging

interface RigResult {
    rigged_model_url: string | null
    skeleton_info: string | null
    source: string
}

// Auto-rig a 3D model using UniRig (VAST-AI) - FREE on Hugging Face
async function rigWithUniRig(modelUrl: string): Promise<RigResult> {
    console.log("[Rig] Starting UniRig auto-rigging...")

    try {
        const client = await Client.connect("VAST-AI/UniRig")

        console.log("[Rig] Connected to UniRig, processing model...")

        // UniRig takes a 3D model file and returns a rigged version
        const result = await client.predict("/process", {
            input_mesh: modelUrl,  // URL to the GLB/OBJ model
        })

        console.log("[Rig] UniRig response:", JSON.stringify(result).slice(0, 500))

        if (result?.data) {
            const data = result.data as any[]
            // UniRig typically returns [rigged_model_file, skeleton_info]
            const riggedFile = data[0]
            const skeletonInfo = data[1] || null

            if (riggedFile?.url || typeof riggedFile === "string") {
                const riggedUrl = riggedFile?.url || riggedFile
                console.log("[Rig] ✅ UniRig success:", riggedUrl)
                return {
                    rigged_model_url: riggedUrl,
                    skeleton_info: typeof skeletonInfo === "string" ? skeletonInfo : JSON.stringify(skeletonInfo),
                    source: "UniRig"
                }
            }
        }

        throw new Error("No rigged model in response")
    } catch (error: any) {
        console.error("[Rig] UniRig error:", error.message)
        throw error
    }
}

// Alternative: Try Puppeteer rigging space
async function rigWithPuppeteer(modelUrl: string): Promise<RigResult> {
    console.log("[Rig] Trying Puppeteer rigging...")

    try {
        const client = await Client.connect("Puppeteer-3D/Puppeteer")

        const result = await client.predict("/rig", {
            mesh_file: modelUrl,
        })

        if (result?.data) {
            const data = result.data as any[]
            const riggedFile = data[0]

            if (riggedFile?.url || typeof riggedFile === "string") {
                return {
                    rigged_model_url: riggedFile?.url || riggedFile,
                    skeleton_info: null,
                    source: "Puppeteer"
                }
            }
        }

        throw new Error("No rigged model")
    } catch (error: any) {
        console.error("[Rig] Puppeteer error:", error.message)
        throw error
    }
}

export async function POST(request: Request) {
    try {
        const supabase = await createClient()
        const { data: { user } } = await supabase.auth.getUser()

        if (!user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
        }

        const body = await request.json().catch(() => null)
        if (!body?.modelUrl) {
            return NextResponse.json({ error: "Model URL is required" }, { status: 400 })
        }

        const { modelUrl, modelName } = body
        console.log("[Rig] User:", user.id, "Model:", modelUrl)

        const serviceClient = createServiceClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            process.env.SUPABASE_SERVICE_ROLE_KEY!,
            { auth: { autoRefreshToken: false, persistSession: false } }
        )

        // Find user
        let { data: userData } = await serviceClient
            .from("users")
            .select("id, discord_id, generation_credits")
            .eq("discord_id", user.id)
            .single()

        if (!userData) {
            const result = await serviceClient
                .from("users")
                .select("id, discord_id, generation_credits")
                .eq("id", user.id)
                .single()
            userData = result.data
        }

        if (!userData) {
            return NextResponse.json({ error: "User not found" }, { status: 404 })
        }

        // Check credits (rigging costs 1 credit)
        const credits = userData.generation_credits ?? 0
        if (credits <= 0) {
            return NextResponse.json({
                error: "No credits remaining!",
                message: "Upgrade to Pro for more credits!",
                creditsRemaining: 0,
            }, { status: 403 })
        }

        // Try rigging with UniRig first, then Puppeteer as fallback
        let result: RigResult | null = null

        try {
            result = await rigWithUniRig(modelUrl)
        } catch {
            console.log("[Rig] UniRig failed, trying Puppeteer...")
            try {
                result = await rigWithPuppeteer(modelUrl)
            } catch {
                console.log("[Rig] All rigging methods failed")
            }
        }

        if (!result?.rigged_model_url) {
            return NextResponse.json({
                error: "Rigging failed",
                details: "Could not auto-rig the model. Try a different model or use manual rigging.",
            }, { status: 503 })
        }

        // Save rigged model as creation
        const { data: creation } = await serviceClient
            .from("creations")
            .insert({
                user_id: userData.id,
                type: "rigged_model",
                name: modelName ? `${modelName}_Rigged` : "Rigged_Model",
                description: "Auto-rigged 3D model with skeleton",
                preview_url: result.rigged_model_url,
                asset_data: {
                    original_url: modelUrl,
                    rigged_url: result.rigged_model_url,
                    skeleton_info: result.skeleton_info,
                    source: result.source,
                },
                status: "ready",
            })
            .select()
            .single()

        // Deduct credit
        const newCredits = credits - 1
        await serviceClient.from("users").update({ generation_credits: newCredits }).eq("id", userData.id)

        return NextResponse.json({
            success: true,
            creation,
            rigged: {
                rigged_model_url: result.rigged_model_url,
                skeleton_info: result.skeleton_info,
                source: result.source,
                download_url: result.rigged_model_url,
            },
            creditsRemaining: newCredits,
        })

    } catch (error: any) {
        console.error("[Rig] Error:", error)
        return NextResponse.json({
            error: "Rigging failed",
            details: error.message,
        }, { status: 500 })
    }
}
