import { NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

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
    let pluginUserId = searchParams.get("userId")
    const pairingCode = searchParams.get("code")

    // If using pairing code, look up the paired user ID
    if (pairingCode && !pluginUserId) {
      try {
        // Import the pairing codes map from register endpoint
        const { pairingCodes } = await import("../register/route")
        const codeData = pairingCodes.get(pairingCode)
        if (codeData?.user_id) {
          pluginUserId = codeData.user_id
          console.log(`[Poll] Code ${pairingCode} mapped to user ${pluginUserId}`)
        } else {
          // Code exists but not yet paired - return empty but register it
          console.log(`[Poll] Code ${pairingCode} not yet paired`)
          return NextResponse.json([], { headers: corsHeaders })
        }
      } catch (importErr) {
        console.log("[Poll] Could not import pairing codes:", importErr)
      }
    }

    if (!pluginUserId) {
      return NextResponse.json({ error: "userId or code required" }, { status: 400, headers: corsHeaders })
    }

    // Use service client for plugin (no cookie auth)
    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    // Find the user's Supabase auth ID from their discord_id
    // The pluginUserId could be the discord_id OR the auth user id
    const { data: userData } = await supabase
      .from("users")
      .select("id, discord_id")
      .or(`discord_id.eq.${pluginUserId},id.eq.${pluginUserId}`)
      .single()

    // List of possible user IDs to check (plugin ID + any found user IDs)
    const userIds = [pluginUserId]
    if (userData) {
      if (userData.discord_id && !userIds.includes(userData.discord_id)) {
        userIds.push(userData.discord_id)
      }
      if (userData.id && !userIds.includes(userData.id)) {
        userIds.push(userData.id)
      }
    }

    console.log(`[Poll] Checking for user IDs: ${userIds.join(", ")}`)

    // Update last poll timestamp
    await supabase.from("plugin_connections").update({ last_poll: new Date().toISOString() }).eq("user_id", pluginUserId)

    const commands: any[] = []

    // Check asset_queue for ALL possible user IDs
    const { data: assets, error: assetsError } = await supabase
      .from("asset_queue")
      .select("*")
      .in("user_id", userIds)
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

    // Get pending commands from command_queue for ALL possible user IDs
    const { data: queueCommands, error: commandsError } = await supabase
      .from("command_queue")
      .select("*")
      .in("user_id", userIds)
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

    if (commands.length > 0) {
      console.log(`[Poll] Returning ${commands.length} commands for user ${pluginUserId}`)
    }

    return NextResponse.json(commands, { headers: corsHeaders })
  } catch (error: any) {
    console.error("[Poll] Plugin poll error:", error)
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

    // Use service client for plugin (no cookie auth)
    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    // Add command to queue
    const { error } = await supabase.from("command_queue").insert({
      user_id: userId,
      type: command.type,
      data: command.data || null,
      code: command.code || null,
      status: "pending",
    })

    if (error) {
      console.error("[Poll] Queue error:", error)
      throw error
    }

    console.log(`[Poll] Command queued for user ${userId}:`, command.type)

    return NextResponse.json({ success: true }, { headers: corsHeaders })
  } catch (error: any) {
    console.error("[Poll] Queue command error:", error)
    return NextResponse.json({ error: "Failed to queue command" }, { status: 500, headers: corsHeaders })
  }
}
