import { type NextRequest, NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { token, studioId, pluginVersion, game } = body

    if (!token) {
      return NextResponse.json({ error: "Missing authentication token" }, { status: 400 })
    }

    // Find user by plugin_token (secure, auto-generated token)
    const { data: user, error } = await supabase
      .from("users")
      .select("id, username, email, generation_credits, model_credits, world_credits, subscription_tier")
      .eq("plugin_token", token)
      .single()

    if (error || !user) {
      return NextResponse.json(
        {
          success: false,
          error: "Invalid token. Get your token from the BlaxSmith dashboard.",
          connected: false,
        },
        { status: 401 },
      )
    }

    // Update connection status and heartbeat
    await supabase
      .from("users")
      .update({
        plugin_connected: true,
        plugin_last_heartbeat: new Date().toISOString(),
      })
      .eq("id", user.id)

    // Log activity
    await supabase.from("activity_log").insert({
      user_id: user.id,
      action: "plugin_connected",
      details: { studioId, pluginVersion, game },
    })

    return NextResponse.json({
      success: true,
      connected: true,
      message: `Welcome back, ${user.username}! Magic Sync is active.`,
      user: {
        username: user.username,
        credits: user.generation_credits,
        modelCredits: user.model_credits,
        worldCredits: user.world_credits,
        tier: user.subscription_tier,
      },
    })
  } catch (error) {
    console.error("[Plugin Connect Error]:", error)
    return NextResponse.json({ success: false, error: "Connection failed" }, { status: 500 })
  }
}
