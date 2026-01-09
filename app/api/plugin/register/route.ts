import { NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

// CORS headers for plugin
const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
}

// In-memory fallback for pairing codes (works for short sessions)
// Key: code, Value: { user_id, created_at }
const pairingCodes = new Map<string, { user_id?: string; created_at: Date }>()

export async function OPTIONS() {
    return new NextResponse(null, { headers: corsHeaders })
}

// Plugin registers its pairing code
export async function POST(request: Request) {
    try {
        const body = await request.json()
        const { code, version } = body

        if (!code) {
            return NextResponse.json({ error: "Code required" }, { status: 400, headers: corsHeaders })
        }

        // Store in memory (works for immediate pairing)
        pairingCodes.set(code, { created_at: new Date() })
        console.log(`[Plugin Register] Code ${code} registered (v${version})`)

        // Clean up old codes (older than 10 minutes)
        const tenMinutesAgo = Date.now() - 10 * 60 * 1000
        for (const [key, value] of pairingCodes.entries()) {
            if (value.created_at.getTime() < tenMinutesAgo) {
                pairingCodes.delete(key)
            }
        }

        return NextResponse.json({
            success: true,
            message: "Pairing code registered",
            code
        }, { headers: corsHeaders })
    } catch (error: any) {
        console.error("[Plugin Register] Error:", error)
        return NextResponse.json({ error: "Registration failed" }, { status: 500, headers: corsHeaders })
    }
}

// User pairs their account with the plugin code
export async function GET(request: Request) {
    try {
        const { searchParams } = new URL(request.url)
        const code = searchParams.get("code")
        const userId = searchParams.get("userId")

        // Check if code is registered (just checking)
        if (code && !userId) {
            const codeData = pairingCodes.get(code)
            if (codeData) {
                return NextResponse.json({
                    valid: true,
                    paired: !!codeData.user_id,
                    user_id: codeData.user_id
                }, { headers: corsHeaders })
            }
            return NextResponse.json({ valid: false }, { headers: corsHeaders })
        }

        // Pair the code with a user
        if (code && userId) {
            // Check if code exists in memory
            let codeData = pairingCodes.get(code)

            if (!codeData) {
                // Code not found in memory - create it now (user might pair before plugin fully loads)
                codeData = { created_at: new Date() }
                pairingCodes.set(code, codeData)
            }

            // Update with user ID
            codeData.user_id = userId
            pairingCodes.set(code, codeData)

            console.log(`[Plugin Register] Code ${code} paired with user ${userId}`)

            // Also try to store in database for persistence
            try {
                const supabase = createClient(supabaseUrl, supabaseServiceKey)
                await supabase.from("command_queue").insert({
                    user_id: userId,
                    type: "PLUGIN_PAIRED",
                    data: { code, paired_at: new Date().toISOString() },
                    status: "completed"
                })
            } catch (dbErr) {
                console.log("[Plugin Register] DB insert optional, skipping")
            }

            return NextResponse.json({
                success: true,
                message: "Plugin paired successfully"
            }, { headers: corsHeaders })
        }

        return NextResponse.json({ error: "Code and/or userId required" }, { status: 400, headers: corsHeaders })
    } catch (error: any) {
        console.error("[Plugin Register] Error:", error)
        return NextResponse.json({ error: "Failed" }, { status: 500, headers: corsHeaders })
    }
}

// Export for poll endpoint
export { pairingCodes }
