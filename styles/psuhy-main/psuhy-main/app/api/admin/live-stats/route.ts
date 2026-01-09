import { createClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"
import { isAdmin } from "@/lib/admin"

export async function GET() {
    try {
        // Verify admin access
        const adminCheck = await isAdmin()
        if (!adminCheck) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 403 })
        }

        const supabase = await createClient()
        const now = new Date()
        const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString()
        const oneMinuteAgo = new Date(now.getTime() - 60 * 1000).toISOString()

        // Get live statistics in parallel
        const [
            usersResult,
            activePluginsResult,
            pendingCommandsResult,
            todayGenerationsResult,
            todayChatMessagesResult,
            recentActivityResult
        ] = await Promise.all([
            // Total users
            supabase.from("users").select("*", { count: "exact", head: true }),

            // Active plugin connections (heartbeat within 60 seconds)
            supabase
                .from("plugin_heartbeats")
                .select("*", { count: "exact", head: true })
                .gte("last_heartbeat", oneMinuteAgo),

            // Pending commands in queue
            supabase
                .from("command_queue")
                .select("*", { count: "exact", head: true })
                .eq("status", "pending"),

            // Generations today
            supabase
                .from("creations")
                .select("*", { count: "exact", head: true })
                .gte("created_at", oneDayAgo),

            // Chat messages today
            supabase
                .from("chat_messages")
                .select("*", { count: "exact", head: true })
                .gte("created_at", oneDayAgo),

            // Recent activity (last 10 actions)
            supabase
                .from("creations")
                .select("id, name, type, created_at, users(username)")
                .order("created_at", { ascending: false })
                .limit(10)
        ])

        return NextResponse.json({
            success: true,
            stats: {
                totalUsers: usersResult.count || 0,
                activePlugins: activePluginsResult.count || 0,
                pendingCommands: pendingCommandsResult.count || 0,
                generationsToday: todayGenerationsResult.count || 0,
                chatMessagesToday: todayChatMessagesResult.count || 0,
            },
            recentActivity: recentActivityResult.data || [],
            timestamp: now.toISOString()
        })
    } catch (error) {
        console.error("[Admin Live Stats] Error:", error)
        return NextResponse.json({ error: "Failed to fetch stats" }, { status: 500 })
    }
}
