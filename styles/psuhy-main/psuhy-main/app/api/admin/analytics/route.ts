import { createClient as createServiceClient } from "@supabase/supabase-js"
import { NextResponse } from "next/server"

export async function GET(request: Request) {
    try {
        const serviceClient = createServiceClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            process.env.SUPABASE_SERVICE_ROLE_KEY!,
            { auth: { autoRefreshToken: false, persistSession: false } }
        )

        // Get user signups by day (last 30 days)
        const thirtyDaysAgo = new Date()
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)

        const { data: users } = await serviceClient
            .from("users")
            .select("created_at, subscription_tier")
            .gte("created_at", thirtyDaysAgo.toISOString())
            .order("created_at", { ascending: true })

        // Group by day
        const usersByDay: Record<string, number> = {}
        const proUsersByDay: Record<string, number> = {}

        users?.forEach(u => {
            const day = new Date(u.created_at).toISOString().split("T")[0]
            usersByDay[day] = (usersByDay[day] || 0) + 1
            if (u.subscription_tier === "pro" || u.subscription_tier === "premium") {
                proUsersByDay[day] = (proUsersByDay[day] || 0) + 1
            }
        })

        // Get generation stats (last 30 days)
        const { data: creations } = await serviceClient
            .from("creations")
            .select("created_at, type")
            .gte("created_at", thirtyDaysAgo.toISOString())

        const creationsByDay: Record<string, number> = {}
        const creationsByType: Record<string, number> = {}

        creations?.forEach(c => {
            const day = new Date(c.created_at).toISOString().split("T")[0]
            creationsByDay[day] = (creationsByDay[day] || 0) + 1
            creationsByType[c.type] = (creationsByType[c.type] || 0) + 1
        })

        // Get tier distribution
        const { data: tierData } = await serviceClient
            .from("users")
            .select("subscription_tier")

        const tierDistribution: Record<string, number> = { free: 0, pro: 0, enterprise: 0 }
        tierData?.forEach(u => {
            const tier = u.subscription_tier || "free"
            tierDistribution[tier] = (tierDistribution[tier] || 0) + 1
        })

        // Get API success rates from recent creations
        const { data: recentCreations } = await serviceClient
            .from("creations")
            .select("status, type, created_at")
            .gte("created_at", new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString())

        const apiStats = {
            total: recentCreations?.length || 0,
            successful: recentCreations?.filter(c => c.status === "ready")?.length || 0,
            failed: recentCreations?.filter(c => c.status === "failed")?.length || 0,
        }

        return NextResponse.json({
            userGrowth: Object.entries(usersByDay).map(([date, count]) => ({ date, count })),
            proGrowth: Object.entries(proUsersByDay).map(([date, count]) => ({ date, count })),
            generations: Object.entries(creationsByDay).map(([date, count]) => ({ date, count })),
            creationsByType,
            tierDistribution,
            apiStats,
        })
    } catch (error: any) {
        console.error("[Analytics] Error:", error)
        return NextResponse.json({ error: error.message }, { status: 500 })
    }
}
