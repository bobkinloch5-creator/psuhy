import { createClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"

export async function POST(request: Request) {
  try {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { creationId } = await request.json()

    if (!creationId) {
      return NextResponse.json({ error: "Creation ID required" }, { status: 400 })
    }

    // Get the creation
    const { data: creation } = await supabase.from("creations").select("*").eq("id", creationId).single()

    if (!creation) {
      return NextResponse.json({ error: "Creation not found" }, { status: 404 })
    }

    // Get user's active studio session
    const { data: userData } = await supabase.from("users").select("id").eq("discord_id", user.id).single()

    const { data: session } = await supabase
      .from("studio_sessions")
      .select("id")
      .eq("user_id", userData?.id)
      .eq("is_active", true)
      .order("last_poll", { ascending: false })
      .limit(1)
      .single()

    if (!session) {
      return NextResponse.json({ error: "No active Studio session found" }, { status: 404 })
    }

    // Create command based on creation type
    let commandData: any = {}

    if (creation.type === "model") {
      commandData = {
        command_type: "insert_model",
        command_data: {
          modelName: creation.name,
          assetData: creation.asset_data,
          position: { x: 0, y: 5, z: 0 },
        },
      }
    } else if (creation.type === "world") {
      commandData = {
        command_type: "generate_world",
        command_data: {
          worldName: creation.name,
          worldPlan: creation.asset_data,
        },
      }
    } else if (creation.type === "script") {
      commandData = {
        command_type: "insert_script",
        command_data: {
          scriptName: creation.name,
          code: creation.asset_data.code,
        },
      }
    }

    // Add to command queue
    const { error: cmdError } = await supabase.from("command_queue").insert({
      session_id: session.id,
      ...commandData,
    })

    if (cmdError) {
      throw cmdError
    }

    return NextResponse.json({ success: true, message: "Sent to Roblox Studio" })
  } catch (error) {
    console.error("[v0] Send to studio error:", error)
    return NextResponse.json({ error: "Failed to send to studio" }, { status: 500 })
  }
}
