import { type NextRequest, NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { token, commandId, success, error } = body

    if (!token || !commandId) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 })
    }

    // Verify token
    const { data: user } = await supabase.from("users").select("id").eq("plugin_token", token).single()

    if (!user) {
      return NextResponse.json({ error: "Invalid token" }, { status: 401 })
    }

    // Update command status
    await supabase
      .from("plugin_commands")
      .update({
        status: success ? "completed" : "failed",
        completed_at: new Date().toISOString(),
        payload: error ? { error } : undefined,
      })
      .eq("id", commandId)
      .eq("user_id", user.id)

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("[Command Complete Error]:", error)
    return NextResponse.json({ success: false }, { status: 500 })
  }
}
