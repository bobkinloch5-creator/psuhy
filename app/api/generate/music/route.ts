import { createClient } from "@/lib/supabase/server"
import { createClient as createServiceClient } from "@supabase/supabase-js"
import { NextResponse } from "next/server"

export const maxDuration = 120

interface MusicResult {
    audio_url: string
    title: string
    duration: number
    style: string
}

// Generate music using CometAPI Suno
async function generateWithSuno(prompt: string, style?: string): Promise<MusicResult> {
    console.log("[Music-Gen] Generating with CometAPI Suno:", prompt)

    const apiKey = process.env.COMETAPI_KEY
    if (!apiKey) {
        throw new Error("No CometAPI key configured")
    }

    try {
        // Enhanced music prompt with style
        const musicStyle = style || "cinematic"
        const enhancedPrompt = `${prompt}, ${musicStyle} style, high quality, professional production, suitable for video games`

        const response = await fetch("https://api.cometapi.com/v1/audio/generations", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${apiKey}`,
            },
            body: JSON.stringify({
                model: "suno-v4",  // Suno V4 for high quality
                prompt: enhancedPrompt,
                duration: 30,  // 30 seconds default
            }),
        })

        if (!response.ok) {
            const errorText = await response.text()
            console.error("[Music-Gen] Suno API failed:", errorText)
            throw new Error(`Suno API failed: ${response.status}`)
        }

        const data = await response.json()
        console.log("[Music-Gen] Suno response:", JSON.stringify(data).slice(0, 300))

        if (data.data?.[0]?.url) {
            return {
                audio_url: data.data[0].url,
                title: prompt.slice(0, 50),
                duration: 30,
                style: musicStyle
            }
        }

        throw new Error("No audio URL in response")
    } catch (error: any) {
        console.error("[Music-Gen] Error:", error.message)
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
        if (!body?.prompt) {
            return NextResponse.json({ error: "Prompt is required" }, { status: 400 })
        }

        const { prompt, style } = body
        console.log("[Music-Gen] User:", user.id, "Prompt:", prompt, "Style:", style)

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

        // Check credits
        const credits = userData.generation_credits ?? 0
        if (credits <= 0) {
            return NextResponse.json({
                error: "No credits remaining!",
                message: "Upgrade to Pro for more credits!",
                creditsRemaining: 0,
            }, { status: 403 })
        }

        // Generate music
        const result = await generateWithSuno(prompt, style)

        if (!result.audio_url) {
            return NextResponse.json({
                error: "Music generation failed",
                details: "Please try again",
            }, { status: 503 })
        }

        // Save creation
        const { data: creation } = await serviceClient
            .from("creations")
            .insert({
                user_id: userData.id,
                type: "music",
                name: result.title,
                description: prompt,
                prompt,
                preview_url: result.audio_url,
                asset_data: {
                    audio_url: result.audio_url,
                    duration: result.duration,
                    style: result.style,
                },
                status: "ready",
            })
            .select()
            .single()

        // Auto-queue to Roblox Studio
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
                    asset_id: result.audio_url,
                    asset_type: "GeneratedMusic",
                    asset_name: result.title,
                    status: "pending",
                    metadata: {
                        audio_url: result.audio_url,
                        duration: result.duration,
                        style: result.style,
                        prompt,
                    },
                })
            }
        } catch { }

        // Deduct credits
        const newCredits = credits - 1
        await serviceClient.from("users").update({ generation_credits: newCredits }).eq("id", userData.id)

        return NextResponse.json({
            success: true,
            creation,
            music: {
                audio_url: result.audio_url,
                title: result.title,
                duration: result.duration,
                style: result.style,
                download_url: result.audio_url,
            },
            creditsRemaining: newCredits,
        })

    } catch (error: any) {
        console.error("[Music-Gen] Error:", error)
        return NextResponse.json({
            error: "Generation failed",
            details: error.message,
        }, { status: 500 })
    }
}
