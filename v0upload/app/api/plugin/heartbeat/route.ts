import { type NextRequest, NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { token, studioId, game } = body

    if (!token) {
      return NextResponse.json({ error: "Missing token" }, { status: 400 })
    }

    // Update user's heartbeat
    const { data: user, error } = await supabase
      .from("users")
      .update({
        plugin_connected: true,
        plugin_last_heartbeat: new Date().toISOString(),
      })
      .eq("plugin_token", token)
      .select("id, generation_credits, model_credits")
      .single()

    if (error || !user) {
      return NextResponse.json({ success: false, error: "Invalid token" }, { status: 401 })
    }

    return NextResponse.json({
      success: true,
      timestamp: new Date().toISOString(),
      credits: {
        chat: user.generation_credits,
        models: user.model_credits,
      },
    })
  } catch (error) {
    console.error("[Plugin Heartbeat Error]:", error)
    return NextResponse.json({ success: false }, { status: 500 })
  }
}
