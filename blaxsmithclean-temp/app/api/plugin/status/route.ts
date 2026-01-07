import { NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"

// Use Node runtime to access Supabase
export const runtime = "nodejs"

const HEARTBEAT_TIMEOUT = 60000 // 60 seconds

// CORS headers for Roblox Studio plugin
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
  "Cache-Control": "no-cache, no-store, must-revalidate",
}

// Handle OPTIONS preflight
export async function OPTIONS() {
  return new NextResponse(null, { headers: corsHeaders })
}

// Create Supabase client for checking heartbeats
function getSupabaseClient() {
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!)
}

export async function GET(request: Request) {
  try {
    const url = new URL(request.url)
    const userId = url.searchParams.get("userId")

    if (!userId) {
      return NextResponse.json({ connected: false, success: true }, { headers: corsHeaders })
    }

    const supabase = getSupabaseClient()
    const cutoffTime = new Date(Date.now() - HEARTBEAT_TIMEOUT).toISOString()

    const [heartbeatResult, connectionResult, assetsResult] = await Promise.all([
      supabase
        .from("plugin_heartbeats")
        .select("last_heartbeat")
        .eq("user_id", userId)
        .gte("last_heartbeat", cutoffTime)
        .single(),

      supabase
        .from("plugin_connections")
        .select("*")
        .eq("user_id", userId)
        .eq("is_active", true)
        .gte("last_poll", cutoffTime)
        .order("last_poll", { ascending: false })
        .limit(1)
        .single(),

      supabase.from("asset_queue").select("id").eq("user_id", userId).eq("status", "pending"),
    ])

    const connected = !heartbeatResult.error || !connectionResult.error
    const studioInfo = connectionResult.data || null
    const pendingAssets = assetsResult.data?.length || 0

    return NextResponse.json(
      {
        connected,
        success: true,
        studioInfo: studioInfo
          ? {
              game_name: studioInfo.game_name,
              place_id: studioInfo.place_id,
              plugin_version: studioInfo.plugin_version,
              last_poll: studioInfo.last_poll,
            }
          : null,
        pendingAssets,
      },
      { headers: corsHeaders },
    )
  } catch (error) {
    console.error("[v0] Plugin Status GET error:", error)
    return NextResponse.json({ connected: false, success: false, error: "Server error" }, { headers: corsHeaders })
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { userId } = body

    if (!userId) {
      return NextResponse.json({ success: false, error: "userId required" }, { status: 400, headers: corsHeaders })
    }

    // Update heartbeat in Supabase
    const supabase = getSupabaseClient()

    const { error } = await supabase.from("plugin_heartbeats").upsert(
      {
        user_id: userId,
        last_heartbeat: new Date().toISOString(),
      },
      {
        onConflict: "user_id",
      },
    )

    if (error) {
      console.error("[v0] Plugin Status Supabase error:", error)
    }

    return NextResponse.json(
      {
        success: true,
        message: "Heartbeat received",
        connected: true,
        timestamp: Date.now(),
      },
      { headers: corsHeaders },
    )
  } catch (error) {
    console.error("[v0] Plugin Status POST error:", error)
    return NextResponse.json({ success: false, error: "Invalid request" }, { status: 400, headers: corsHeaders })
  }
}
