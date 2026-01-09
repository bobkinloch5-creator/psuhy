import { createClient } from "@/lib/supabase/server"
import { type NextRequest, NextResponse } from "next/server"

// Magic Sync API - Sends commands to the plugin in real-time
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { command_type, payload } = await request.json()

    // Get user's internal ID
    const { data: userData } = await supabase
      .from("users")
      .select("id, plugin_connected")
      .eq("auth_id", user.id)
      .single()

    if (!userData) {
      return NextResponse.json({ error: "User not found" }, { status: 404 })
    }

    // Insert command into queue
    const { data: command, error } = await supabase
      .from("plugin_commands")
      .insert({
        user_id: userData.id,
        command_type,
        payload,
        status: "pending",
      })
      .select()
      .single()

    if (error) {
      return NextResponse.json({ error: "Failed to queue command" }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      command_id: command.id,
      plugin_connected: userData.plugin_connected,
    })
  } catch {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
