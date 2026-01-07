import { createClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"

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

    const supabase = await createClient()

    console.log("[v0] Plugin connecting:", { userId, studioId, game })

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
      console.error("[v0] Connection error:", error)
      throw error
    }

    console.log("[v0] Plugin connected successfully:", connection.id)

    return NextResponse.json(
      {
        success: true,
        connectionId: connection.id,
        message: "Connected to BlaxSmith",
      },
      { headers: corsHeaders },
    )
  } catch (error: any) {
    console.error("[v0] Plugin connect error:", error)
    return NextResponse.json(
      { error: "Connection failed", details: error.message },
      { status: 500, headers: corsHeaders },
    )
  }
}
