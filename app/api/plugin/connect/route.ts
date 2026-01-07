import { createClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"

export async function POST(request: Request) {
  try {
    const { studioId, pluginVersion, sdkVersion, game, placeId } = await request.json()

    if (!studioId) {
      return NextResponse.json({ error: "Studio ID required" }, { status: 400 })
    }

    const supabase = await createClient()

    // For now, create or update session without user auth
    // In production, you'd validate the user from a token
    const { data: session, error } = await supabase
      .from("studio_sessions")
      .upsert(
        {
          studio_id: studioId,
          plugin_version: pluginVersion,
          game_name: game,
          place_id: placeId,
          is_active: true,
          last_poll: new Date().toISOString(),
        },
        { onConflict: "studio_id" },
      )
      .select()
      .single()

    if (error) {
      throw error
    }

    return NextResponse.json({ success: true, sessionId: session.id })
  } catch (error) {
    console.error("[v0] Plugin connect error:", error)
    return NextResponse.json({ error: "Connection failed" }, { status: 500 })
  }
}
