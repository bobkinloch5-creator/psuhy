import { type NextRequest, NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const token = searchParams.get("token")

    if (!token) {
      return NextResponse.json({ commands: [], error: "Missing token" })
    }

    // Get user by token
    const { data: user, error: userError } = await supabase
      .from("users")
      .select("id")
      .eq("plugin_token", token)
      .single()

    if (userError || !user) {
      return NextResponse.json({ commands: [], error: "Invalid token" })
    }

    // Get pending commands (Magic Sync queue)
    const { data: commands, error } = await supabase
      .from("plugin_commands")
      .select("*")
      .eq("user_id", user.id)
      .eq("status", "pending")
      .order("created_at", { ascending: true })
      .limit(10)

    if (error) {
      console.error("[Plugin Poll Error]:", error)
      return NextResponse.json({ commands: [] })
    }

    if (!commands || commands.length === 0) {
      return NextResponse.json({ commands: [] })
    }

    // Mark commands as delivered
    const commandIds = commands.map((c) => c.id)
    await supabase
      .from("plugin_commands")
      .update({ status: "delivered", delivered_at: new Date().toISOString() })
      .in("id", commandIds)

    // Transform commands for the plugin
    const pluginCommands = commands.map((cmd) => ({
      id: cmd.id,
      type: cmd.command_type,
      payload: cmd.payload,
      createdAt: cmd.created_at,
    }))

    return NextResponse.json({ commands: pluginCommands })
  } catch (error) {
    console.error("[Plugin Poll Error]:", error)
    return NextResponse.json({ commands: [] })
  }
}
