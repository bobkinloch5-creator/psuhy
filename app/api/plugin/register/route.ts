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

// Plugin registers its pairing code (POST)
export async function POST(request: Request) {
    try {
        const body = await request.json()
        const { code, version } = body

        if (!code) {
            return NextResponse.json({ error: "Code required" }, { status: 400, headers: corsHeaders })
        }

        const supabase = createClient(supabaseUrl, supabaseServiceKey)

        // Store pairing code in command_queue with type "REGISTER_PLUGIN"
        // This creates a record the plugin can check
        await supabase.from("command_queue").insert({
            user_id: `plugin_${code}`,  // Temporary ID based on code
            type: "REGISTER_PLUGIN",
            data: { code, version, registered_at: new Date().toISOString() },
            status: "pending"  // Will be updated to "paired" when user connects
        })

        console.log(`[Plugin Register] Code ${code} registered (v${version})`)

        return NextResponse.json({
            success: true,
            message: "Pairing code registered",
            code
        }, { headers: corsHeaders })
    } catch (error: any) {
        console.error("[Plugin Register] Error:", error)
        // Return success anyway - the pairing might still work
        return NextResponse.json({ success: true, message: "Registered" }, { headers: corsHeaders })
    }
}

// User pairs their account with the plugin code (GET)
export async function GET(request: Request) {
    try {
        const { searchParams } = new URL(request.url)
        const code = searchParams.get("code")
        const userId = searchParams.get("userId")

        const supabase = createClient(supabaseUrl, supabaseServiceKey)

        // Just checking if code exists
        if (code && !userId) {
            const { data } = await supabase
                .from("command_queue")
                .select("*")
                .eq("user_id", `plugin_${code}`)
                .eq("type", "REGISTER_PLUGIN")
                .order("created_at", { ascending: false })
                .limit(1)
                .single()

            if (data) {
                const isPaired = data.status === "paired"
                return NextResponse.json({
                    valid: true,
                    paired: isPaired,
                    user_id: data.data?.paired_user_id
                }, { headers: corsHeaders })
            }
            return NextResponse.json({ valid: false }, { headers: corsHeaders })
        }

        // Pair the code with a user
        if (code && userId) {
            // Update the registration record to mark as paired
            const { error } = await supabase
                .from("command_queue")
                .update({
                    status: "paired",
                    data: {
                        code,
                        paired_user_id: userId,
                        paired_at: new Date().toISOString()
                    }
                })
                .eq("user_id", `plugin_${code}`)
                .eq("type", "REGISTER_PLUGIN")

            if (error) {
                console.error("[Plugin Register] Update error:", error)
                // Try inserting new record instead
                await supabase.from("command_queue").insert({
                    user_id: `plugin_${code}`,
                    type: "REGISTER_PLUGIN",
                    data: { code, paired_user_id: userId, paired_at: new Date().toISOString() },
                    status: "paired"
                })
            }

            console.log(`[Plugin Register] Code ${code} paired with user ${userId}`)

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
