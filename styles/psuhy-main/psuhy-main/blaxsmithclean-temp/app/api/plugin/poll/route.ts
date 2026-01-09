import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

// CORS headers for plugin
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
}

export async function OPTIONS() {
  return new NextResponse(null, { headers: corsHeaders })
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const userId = searchParams.get("userId")

    if (!userId) {
      return NextResponse.json({ error: "userId required" }, { status: 400, headers: corsHeaders })
    }

    const supabase = await createClient()

    // Update last poll timestamp
    await supabase.from("plugin_connections").update({ last_poll: new Date().toISOString() }).eq("user_id", userId)

    const commands: any[] = []

    const { data: assets, error: assetsError } = await supabase
      .from("asset_queue")
      .select("*")
      .eq("user_id", userId)
      .eq("status", "pending")
      .order("created_at", { ascending: true })
      .limit(10)

    if (!assetsError && assets) {
      for (const asset of assets) {
        // Check if this is a generated model (has metadata)
        if (asset.asset_type === "GeneratedModel" && asset.metadata) {
          commands.push({
            type: "INSERT_GENERATED_MODEL",
            data: {
              name: asset.asset_name,
              modelUrl: asset.metadata.model_url,
              previewUrl: asset.metadata.preview_url,
              formats: asset.metadata.formats,
            },
          })
        } else {
          // Regular Roblox asset
          commands.push({
            type: "INSERT_MODEL",
            data: {
              assetId: Number.parseInt(asset.asset_id),
              name: asset.asset_name,
            },
          })
        }

        // Mark as completed
        await supabase
          .from("asset_queue")
          .update({ status: "completed", completed_at: new Date().toISOString() })
          .eq("id", asset.id)
      }
    }

    // Get pending commands from command_queue
    const { data: queueCommands, error: commandsError } = await supabase
      .from("command_queue")
      .select("*")
      .eq("user_id", userId)
      .eq("status", "pending")
      .order("created_at", { ascending: true })
      .limit(5)

    if (!commandsError && queueCommands) {
      for (const cmd of queueCommands) {
        commands.push({
          type: cmd.type,
          data: cmd.data,
          code: cmd.code,
        })

        // Mark as completed
        await supabase.from("command_queue").update({ status: "completed" }).eq("id", cmd.id)
      }
    }

    console.log(`[v0] Plugin poll: ${commands.length} commands for user ${userId}`)

    return NextResponse.json(commands, { headers: corsHeaders })
  } catch (error: any) {
    console.error("[v0] Plugin poll error:", error)
    return NextResponse.json({ error: "Poll failed" }, { status: 500, headers: corsHeaders })
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { userId, command } = body

    if (!userId || !command) {
      return NextResponse.json({ error: "userId and command required" }, { status: 400, headers: corsHeaders })
    }

    const supabase = await createClient()

    // Add command to queue
    const { error } = await supabase.from("command_queue").insert({
      user_id: userId,
      type: command.type,
      data: command.data || null,
      code: command.code || null,
      status: "pending",
    })

    if (error) {
      console.error("[v0] Queue error:", error)
      throw error
    }

    console.log(`[v0] Command queued for user ${userId}:`, command.type)

    return NextResponse.json({ success: true }, { headers: corsHeaders })
  } catch (error: any) {
    console.error("[v0] Queue command error:", error)
    return NextResponse.json({ error: "Failed to queue command" }, { status: 500, headers: corsHeaders })
  }
}
