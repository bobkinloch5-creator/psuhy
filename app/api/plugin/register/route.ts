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

// In-memory store for pairing codes (in production, use Redis or database)
// Map: code -> { registered_at, user_id (when paired), version }
const pairingCodes = new Map<string, { registered_at: Date; user_id?: string; version?: string }>()

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

        // Store the pairing code
        pairingCodes.set(code, {
            registered_at: new Date(),
            version: version || "unknown"
        })

        console.log(`[Plugin Register] Code ${code} registered (v${version})`)

        // Clean up old codes (older than 1 hour)
        const oneHourAgo = Date.now() - 60 * 60 * 1000
        for (const [key, value] of pairingCodes.entries()) {
            if (value.registered_at.getTime() < oneHourAgo) {
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

        // Check if code is registered
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
            const codeData = pairingCodes.get(code)
            if (codeData) {
                codeData.user_id = userId
                pairingCodes.set(code, codeData)
                console.log(`[Plugin Register] Code ${code} paired with user ${userId}`)
                return NextResponse.json({
                    success: true,
                    message: "Plugin paired successfully"
                }, { headers: corsHeaders })
            }
            return NextResponse.json({ error: "Invalid code" }, { status: 400, headers: corsHeaders })
        }

        return NextResponse.json({ error: "Code and/or userId required" }, { status: 400, headers: corsHeaders })
    } catch (error: any) {
        console.error("[Plugin Register] Error:", error)
        return NextResponse.json({ error: "Failed" }, { status: 500, headers: corsHeaders })
    }
}

// Export the pairing codes map so poll endpoint can access it
export { pairingCodes }
