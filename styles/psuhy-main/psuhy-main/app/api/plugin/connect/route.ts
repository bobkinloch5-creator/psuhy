import { createClient } from "@supabase/supabase-js"
import { NextResponse } from "next/server"

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

// CORS headers for plugin
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
}

export async function OPTIONS() {
  return new NextResponse(null, { headers: corsHeaders })
}

export async function POST(request: Request) {
  try {
    const { userId, studioId, pluginVersion, game, placeId } = await request.json()

    if (!userId || !studioId) {
      return NextResponse.json({ error: "userId and studioId required" }, { status: 400, headers: corsHeaders })
    }

    // Use service client for plugin connections (no cookie auth for Roblox plugin)
    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    console.log("[Plugin] Connecting:", { userId, studioId, game })

    // Create or update plugin connection
    const { data: connection, error } = await supabase
      .from("plugin_connections")
      .upsert(
        {
          user_id: userId,
          studio_id: studioId,
          plugin_version: pluginVersion || "1.0.0",
          game_name: game || "Untitled Game",
          place_id: placeId,
          is_active: true,
          last_poll: new Date().toISOString(),
        },
        { onConflict: "studio_id" },
      )
      .select()
      .single()

    if (error) {
      console.error("[Plugin] Connection error:", error)
      throw error
    }

    console.log("[Plugin] Connected successfully:", connection.id)

    return NextResponse.json(
      {
        success: true,
        connectionId: connection.id,
        message: "Connected to BlaxSmith",
      },
      { headers: corsHeaders },
    )
  } catch (error: any) {
    console.error("[Plugin] Connect error:", error)
    return NextResponse.json(
      { error: "Connection failed", details: error.message },
      { status: 500, headers: corsHeaders },
    )
  }
}
