import { Client } from "@gradio/client"
import { createClient } from "@/lib/supabase/server"
import { createClient as createServiceClient } from "@supabase/supabase-js"
import { NextResponse } from "next/server"

export const maxDuration = 180

// Animation presets for common game animations
const ANIMATION_PRESETS = {
    idle: "Character standing idle, subtle breathing motion, weight shifting",
    walk: "Character walking forward, natural arm swing, steady pace",
    run: "Character running fast, dynamic arm pumping, athletic movement",
    jump: "Character jumping up, arms raised, landing with impact",
    attack: "Character sword slash attack, aggressive motion, follow through",
    punch: "Character throwing a punch, boxing stance, powerful strike",
    kick: "Character kicking forward, martial arts style, high energy",
    dance: "Character dancing, fun rhythmic movement, party vibes",
    wave: "Character waving hello, friendly gesture, arm raised",
    sit: "Character sitting down, relaxed pose, casual",
    crouch: "Character crouching low, stealth position, ready to move",
    death: "Character falling down defeated, dramatic collapse",
    victory: "Character celebrating victory, arms raised, triumphant pose",
    emote: "Character doing an expressive emote, exaggerated movement",
}

interface AnimateResult {
    animated_model_url: string | null
    animation_name: string
    source: string
}

// Apply animation to rigged model using Wan2.2-Animate or similar
async function animateWithWan(riggedModelUrl: string, animationPrompt: string): Promise<AnimateResult> {
    console.log("[Animate] Starting Wan animation with prompt:", animationPrompt)

    try {
        const client = await Client.connect("Wan-AI/Wan2.2-Animate")

        const result = await client.predict("/animate", {
            input_mesh: riggedModelUrl,
            motion_prompt: animationPrompt,
        })

        if (result?.data) {
            const data = result.data as any[]
            const animatedFile = data[0]

            if (animatedFile?.url || typeof animatedFile === "string") {
                return {
                    animated_model_url: animatedFile?.url || animatedFile,
                    animation_name: animationPrompt.slice(0, 30),
                    source: "Wan-Animate"
                }
            }
        }

        throw new Error("No animated model in response")
    } catch (error: any) {
        console.error("[Animate] Wan error:", error.message)
        throw error
    }
}

// Alternative: Generate animation data for Roblox
async function generateRobloxAnimation(animationType: string): Promise<{
    keyframes: any[]
    duration: number
    name: string
}> {
    // Pre-built Roblox animation keyframes for common animations
    const robloxAnimations: Record<string, any> = {
        idle: {
            name: "Idle",
            duration: 2,
            keyframes: [
                { time: 0, pose: { torso: { y: 0 }, leftArm: { angle: 0 }, rightArm: { angle: 0 } } },
                { time: 1, pose: { torso: { y: 0.1 }, leftArm: { angle: 5 }, rightArm: { angle: -5 } } },
                { time: 2, pose: { torso: { y: 0 }, leftArm: { angle: 0 }, rightArm: { angle: 0 } } },
            ]
        },
        walk: {
            name: "Walk",
            duration: 1,
            keyframes: [
                { time: 0, pose: { leftLeg: { angle: -30 }, rightLeg: { angle: 30 }, leftArm: { angle: 20 }, rightArm: { angle: -20 } } },
                { time: 0.5, pose: { leftLeg: { angle: 30 }, rightLeg: { angle: -30 }, leftArm: { angle: -20 }, rightArm: { angle: 20 } } },
                { time: 1, pose: { leftLeg: { angle: -30 }, rightLeg: { angle: 30 }, leftArm: { angle: 20 }, rightArm: { angle: -20 } } },
            ]
        },
        run: {
            name: "Run",
            duration: 0.6,
            keyframes: [
                { time: 0, pose: { leftLeg: { angle: -45 }, rightLeg: { angle: 45 }, leftArm: { angle: 35 }, rightArm: { angle: -35 }, torso: { lean: 15 } } },
                { time: 0.3, pose: { leftLeg: { angle: 45 }, rightLeg: { angle: -45 }, leftArm: { angle: -35 }, rightArm: { angle: 35 }, torso: { lean: 15 } } },
                { time: 0.6, pose: { leftLeg: { angle: -45 }, rightLeg: { angle: 45 }, leftArm: { angle: 35 }, rightArm: { angle: -35 }, torso: { lean: 15 } } },
            ]
        },
        jump: {
            name: "Jump",
            duration: 1.2,
            keyframes: [
                { time: 0, pose: { torso: { y: 0 }, leftArm: { angle: -20 }, rightArm: { angle: -20 }, leftLeg: { angle: 0 }, rightLeg: { angle: 0 } } },
                { time: 0.3, pose: { torso: { y: -0.5 }, leftLeg: { angle: 30 }, rightLeg: { angle: 30 } } },
                { time: 0.6, pose: { torso: { y: 2 }, leftArm: { angle: 45 }, rightArm: { angle: 45 }, leftLeg: { angle: -15 }, rightLeg: { angle: -15 } } },
                { time: 1.2, pose: { torso: { y: 0 }, leftArm: { angle: -20 }, rightArm: { angle: -20 }, leftLeg: { angle: 0 }, rightLeg: { angle: 0 } } },
            ]
        },
        attack: {
            name: "SwordSlash",
            duration: 0.8,
            keyframes: [
                { time: 0, pose: { rightArm: { angle: -90 }, torso: { rotation: -30 } } },
                { time: 0.2, pose: { rightArm: { angle: 0 }, torso: { rotation: 0 } } },
                { time: 0.4, pose: { rightArm: { angle: 90 }, torso: { rotation: 45 } } },
                { time: 0.8, pose: { rightArm: { angle: 0 }, torso: { rotation: 0 } } },
            ]
        },
        dance: {
            name: "Dance",
            duration: 2,
            keyframes: [
                { time: 0, pose: { torso: { y: 0 }, leftArm: { angle: 45 }, rightArm: { angle: -45 } } },
                { time: 0.5, pose: { torso: { y: 0.3 }, leftArm: { angle: -45 }, rightArm: { angle: 45 }, leftLeg: { angle: 20 } } },
                { time: 1, pose: { torso: { y: 0 }, leftArm: { angle: 45 }, rightArm: { angle: -45 }, rightLeg: { angle: 20 } } },
                { time: 1.5, pose: { torso: { y: 0.3 }, leftArm: { angle: 90 }, rightArm: { angle: 90 } } },
                { time: 2, pose: { torso: { y: 0 }, leftArm: { angle: 45 }, rightArm: { angle: -45 } } },
            ]
        },
    }

    return robloxAnimations[animationType] || robloxAnimations.idle
}

export async function POST(request: Request) {
    try {
        const supabase = await createClient()
        const { data: { user } } = await supabase.auth.getUser()

        if (!user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
        }

        const body = await request.json().catch(() => null)
        if (!body?.animationType && !body?.customPrompt) {
            return NextResponse.json({
                error: "Animation type or custom prompt required",
                presets: Object.keys(ANIMATION_PRESETS)
            }, { status: 400 })
        }

        const { riggedModelUrl, animationType, customPrompt } = body

        // Determine animation prompt
        const animationPrompt = customPrompt || ANIMATION_PRESETS[animationType as keyof typeof ANIMATION_PRESETS] || ANIMATION_PRESETS.idle

        console.log("[Animate] Animation:", animationType || "custom", "Prompt:", animationPrompt)

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

        // Generate Roblox-compatible animation data
        const robloxAnim = await generateRobloxAnimation(animationType || "idle")

        // Try to animate with Wan if we have a rigged model URL
        let animatedResult: AnimateResult | null = null
        if (riggedModelUrl) {
            try {
                animatedResult = await animateWithWan(riggedModelUrl, animationPrompt)
            } catch {
                console.log("[Animate] AI animation failed, using Roblox keyframes only")
            }
        }

        // Save animation as creation
        const { data: creation } = await serviceClient
            .from("creations")
            .insert({
                user_id: userData.id,
                type: "animation",
                name: robloxAnim.name,
                description: animationPrompt,
                asset_data: {
                    animation_type: animationType || "custom",
                    prompt: animationPrompt,
                    roblox_keyframes: robloxAnim.keyframes,
                    duration: robloxAnim.duration,
                    animated_model_url: animatedResult?.animated_model_url || null,
                    source: animatedResult?.source || "Roblox-Keyframes",
                },
                status: "ready",
            })
            .select()
            .single()

        return NextResponse.json({
            success: true,
            creation,
            animation: {
                name: robloxAnim.name,
                type: animationType || "custom",
                prompt: animationPrompt,
                duration: robloxAnim.duration,
                keyframes: robloxAnim.keyframes,
                animated_model_url: animatedResult?.animated_model_url,
            },
            presets: Object.keys(ANIMATION_PRESETS),
        })

    } catch (error: any) {
        console.error("[Animate] Error:", error)
        return NextResponse.json({
            error: "Animation failed",
            details: error.message,
            presets: Object.keys(ANIMATION_PRESETS),
        }, { status: 500 })
    }
}

// GET endpoint to list available animation presets
export async function GET() {
    return NextResponse.json({
        presets: Object.entries(ANIMATION_PRESETS).map(([id, description]) => ({
            id,
            name: id.charAt(0).toUpperCase() + id.slice(1),
            description,
        })),
    })
}
