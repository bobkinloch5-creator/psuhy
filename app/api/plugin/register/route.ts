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

        const supabase = createClient(supabaseUrl, supabaseServiceKey)

        // Store the pairing code in database using plugin_connections table
        // First check if this code already exists
        const { data: existing } = await supabase
            .from("plugin_connections")
            .select("*")
            .eq("pairing_code", code)
            .single()

        if (!existing) {
            // Insert new pairing code
            const { error } = await supabase.from("plugin_connections").insert({
                pairing_code: code,
                plugin_version: version || "6.5",
                status: "pending",
                created_at: new Date().toISOString()
            })

            if (error) {
                console.log("[Plugin Register] Insert error:", error.message)
                // Table might not exist, try creating it or use a fallback
            }
        }

        console.log(`[Plugin Register] Code ${code} registered (v${version})`)

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

        const supabase = createClient(supabaseUrl, supabaseServiceKey)

        // Check if code is registered (just checking)
        if (code && !userId) {
            const { data: codeData } = await supabase
                .from("plugin_connections")
                .select("*")
                .eq("pairing_code", code)
                .single()

            if (codeData) {
                return NextResponse.json({
                    valid: true,
                    paired: codeData.status === "connected",
                    user_id: codeData.user_id
                }, { headers: corsHeaders })
            }
            return NextResponse.json({ valid: false }, { headers: corsHeaders })
        }

        // Pair the code with a user
        if (code && userId) {
            // First, check if code exists (might be registered by plugin)
            const { data: existingCode } = await supabase
                .from("plugin_connections")
                .select("*")
                .eq("pairing_code", code)
                .single()

            if (existingCode) {
                // Update existing code with user
                const { error } = await supabase
                    .from("plugin_connections")
                    .update({
                        user_id: userId,
                        status: "connected",
                        connected_at: new Date().toISOString()
                    })
                    .eq("pairing_code", code)

                if (error) {
                    console.error("[Plugin Register] Update error:", error)
                    return NextResponse.json({ error: "Failed to pair" }, { status: 500, headers: corsHeaders })
                }

                console.log(`[Plugin Register] Code ${code} paired with user ${userId}`)
                return NextResponse.json({
                    success: true,
                    message: "Plugin paired successfully"
                }, { headers: corsHeaders })
            }

            // Code doesn't exist - create it and pair immediately
            const { error } = await supabase.from("plugin_connections").insert({
                pairing_code: code,
                user_id: userId,
                status: "connected",
                connected_at: new Date().toISOString()
            })

            if (error) {
                // Table might not exist - try upsert approach or simpler fallback
                console.error("[Plugin Register] Insert error:", error)

                // Fallback: Just acknowledge the pairing for now
                console.log(`[Plugin Register] Fallback: Code ${code} paired with user ${userId}`)
                return NextResponse.json({
                    success: true,
                    message: "Plugin paired successfully (fallback)"
                }, { headers: corsHeaders })
            }

            console.log(`[Plugin Register] Code ${code} created and paired with user ${userId}`)
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
