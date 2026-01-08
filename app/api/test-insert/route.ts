import { NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

// CORS headers
const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
}

export async function OPTIONS() {
    return new NextResponse(null, { headers: corsHeaders })
}

// Test endpoint to queue a command for a user
export async function GET(request: Request) {
    try {
        const { searchParams } = new URL(request.url)
        const userId = searchParams.get("userId") || "b2ff408b-30e8-44d9-b7e9-3e4576061149"
        const assetId = searchParams.get("assetId") || "121391740"
        const assetName = searchParams.get("name") || "Classic Sword"

        const supabase = createClient(supabaseUrl, supabaseServiceKey)

        // Insert into command_queue
        const { data, error } = await supabase
            .from("command_queue")
            .insert({
                user_id: userId,
                type: "INSERT_MODEL",
                data: { assetId: parseInt(assetId), name: assetName },
                status: "pending",
            })
            .select()

        if (error) {
            console.error("[Test] Insert error:", error)
            return NextResponse.json(
                { error: "Failed to queue", details: error.message, code: error.code },
                { status: 500, headers: corsHeaders }
            )
        }

        return NextResponse.json(
            {
                success: true,
                message: `Queued INSERT_MODEL command for asset ${assetName} (${assetId})`,
                userId,
                data,
            },
            { headers: corsHeaders }
        )
    } catch (error: any) {
        console.error("[Test] Error:", error)
        return NextResponse.json(
            { error: "Internal error", details: error.message },
            { status: 500, headers: corsHeaders }
        )
    }
}
