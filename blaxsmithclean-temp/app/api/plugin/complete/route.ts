import { createClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"

export async function POST(request: Request) {
  try {
    const { commandId } = await request.json()

    if (!commandId) {
      return NextResponse.json({ error: "Command ID required" }, { status: 400 })
    }

    const supabase = await createClient()

    // Mark command as completed
    await supabase
      .from("command_queue")
      .update({
        status: "completed",
        executed_at: new Date().toISOString(),
      })
      .eq("id", commandId)

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("[v0] Complete command error:", error)
    return NextResponse.json({ error: "Failed to mark command as completed" }, { status: 500 })
  }
}
