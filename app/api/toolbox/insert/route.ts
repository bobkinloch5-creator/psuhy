import { createClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"

// Queue an asset to be sent to Studio
export async function POST(request: Request) {
  try {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { assetId, assetType, assetName } = await request.json()

    if (!assetId) {
      return NextResponse.json({ error: "Asset ID is required" }, { status: 400 })
    }

    // Get user's discord_id
    const { data: userData } = await supabase.from("users").select("discord_id").eq("discord_id", user.id).single()

    const userId = userData?.discord_id || user.id

    console.log("[v0] Queueing asset:", { userId, assetId, assetName })

    // Queue the asset for insertion
    const { error: insertError } = await supabase.from("asset_queue").insert({
      user_id: userId,
      asset_id: assetId.toString(),
      asset_type: assetType || "Model",
      asset_name: assetName || `Asset ${assetId}`,
      status: "pending",
    })

    if (insertError) {
      console.error("[v0] Queue error:", insertError)
      return NextResponse.json({ error: "Failed to queue asset" }, { status: 500 })
    }

    console.log("[v0] Asset queued successfully")

    return NextResponse.json({
      success: true,
      message: "Asset queued for insertion",
      assetId,
    })
  } catch (error: any) {
    console.error("[v0] Insert error:", error)
    return NextResponse.json({ error: "Failed to queue asset" }, { status: 500 })
  }
}

// Get pending assets for the plugin
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const userId = searchParams.get("userId")

    if (!userId) {
      return NextResponse.json({ error: "User ID required" }, { status: 400 })
    }

    const supabase = await createClient()

    // Get pending assets
    const { data: assets, error } = await supabase
      .from("asset_queue")
      .select("*")
      .eq("user_id", userId)
      .eq("status", "pending")
      .order("created_at", { ascending: true })
      .limit(10)

    if (error) {
      console.error("[v0] Queue fetch error:", error)
      return NextResponse.json({ assets: [] })
    }

    return NextResponse.json({ assets: assets || [] })
  } catch (error: any) {
    console.error("[v0] Queue error:", error)
    return NextResponse.json({ assets: [] })
  }
}

// Mark asset as inserted (called by plugin)
export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const queueId = searchParams.get("id")

    if (!queueId) {
      return NextResponse.json({ error: "Queue ID required" }, { status: 400 })
    }

    const supabase = await createClient()

    // Mark as completed
    const { error } = await supabase.from("asset_queue").update({ status: "completed" }).eq("id", queueId)

    if (error) {
      console.error("[v0] Complete error:", error)
    }

    return NextResponse.json({ success: true })
  } catch (error: any) {
    return NextResponse.json({ success: false })
  }
}
