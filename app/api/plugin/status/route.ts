import { NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"

// Use Node runtime to access Supabase
export const runtime = 'nodejs'

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
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
}

export async function GET(request: Request) {
  try {
    const url = new URL(request.url)
    const userId = url.searchParams.get("userId")

    if (!userId) {
      return NextResponse.json({ connected: false, success: true }, { headers: corsHeaders })
    }

    // Check Supabase for recent heartbeat
    const supabase = getSupabaseClient()
    const cutoffTime = new Date(Date.now() - HEARTBEAT_TIMEOUT).toISOString()

    const { data, error } = await supabase
      .from("plugin_heartbeats")
      .select("last_heartbeat")
      .eq("user_id", userId)
      .gte("last_heartbeat", cutoffTime)
      .single()

    const connected = !error && !!data

    return NextResponse.json({ connected, success: true }, { headers: corsHeaders })
  } catch (error) {
    console.error("[Plugin Status] GET error:", error)
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

    const { error } = await supabase
      .from("plugin_heartbeats")
      .upsert({
        user_id: userId,
        last_heartbeat: new Date().toISOString()
      }, {
        onConflict: "user_id"
      })

    if (error) {
      console.error("[Plugin Status] Supabase error:", error)
    }

    return NextResponse.json({
      success: true,
      message: "Heartbeat received",
      connected: true,
      timestamp: Date.now()
    }, { headers: corsHeaders })
  } catch (error) {
    console.error("[Plugin Status] POST error:", error)
    return NextResponse.json({ success: false, error: "Invalid request" }, { status: 400, headers: corsHeaders })
  }
}
