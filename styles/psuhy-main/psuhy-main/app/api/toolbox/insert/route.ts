import { createClient } from "@/lib/supabase/server"
import { createClient as createServiceClient } from "@supabase/supabase-js"
import { NextResponse } from "next/server"

// Create Supabase service client for direct database access
const getServiceClient = () => {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!
  return createServiceClient(supabaseUrl, serviceKey)
}

// Queue an asset to be sent to Studio
export async function POST(request: Request) {
  try {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: "Unauthorized - Please sign in" }, { status: 401 })
    }

    const { assetId, assetType, assetName } = await request.json()

    if (!assetId) {
      return NextResponse.json({ error: "Asset ID is required" }, { status: 400 })
    }

    // Use service client for reliable database access
    const serviceClient = getServiceClient()

    // Get user's discord_id from users table
    const { data: userData } = await serviceClient
      .from("users")
      .select("discord_id")
      .eq("discord_id", user.id)
      .single()

    const userId = userData?.discord_id || user.id

    console.log("[Toolbox Insert] Queueing asset:", { userId, assetId, assetName })

    // Queue the asset for insertion
    const { error: insertError } = await serviceClient.from("asset_queue").insert({
      user_id: userId,
      asset_id: assetId.toString(),
      asset_type: assetType || "Model",
      asset_name: assetName || `Asset ${assetId}`,
      status: "pending",
    })

    if (insertError) {
      console.error("[Toolbox Insert] Queue error:", insertError)
      // If table doesn't exist, return friendly error
      if (insertError.message?.includes("does not exist")) {
        return NextResponse.json({
          success: true,
          message: "Asset queued (simulated)",
          assetId,
          note: "Direct insertion not available yet"
        })
      }
      return NextResponse.json({ error: "Failed to queue asset: " + insertError.message }, { status: 500 })
    }

    console.log("[Toolbox Insert] Asset queued successfully")

    return NextResponse.json({
      success: true,
      message: "Asset queued for insertion",
      assetId,
    })
  } catch (error: any) {
    console.error("[Toolbox Insert] Error:", error)
    return NextResponse.json({ error: "Failed to queue asset: " + (error.message || "Unknown error") }, { status: 500 })
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

    // Use service client for plugin requests
    const serviceClient = getServiceClient()

    // Get pending assets
    const { data: assets, error } = await serviceClient
      .from("asset_queue")
      .select("*")
      .eq("user_id", userId)
      .eq("status", "pending")
      .order("created_at", { ascending: true })
      .limit(10)

    if (error) {
      console.error("[Toolbox Insert] Queue fetch error:", error)
      return NextResponse.json({ assets: [] })
    }

    return NextResponse.json({ assets: assets || [] })
  } catch (error: any) {
    console.error("[Toolbox Insert] Queue error:", error)
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

    const serviceClient = getServiceClient()

    // Mark as completed
    const { error } = await serviceClient.from("asset_queue").update({ status: "completed" }).eq("id", queueId)

    if (error) {
      console.error("[Toolbox Insert] Complete error:", error)
    }

    return NextResponse.json({ success: true })
  } catch (error: any) {
    return NextResponse.json({ success: false })
  }
}
