import { createClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"

export async function POST(request: Request) {
    try {
        const supabase = await createClient()
        const { data: { user } } = await supabase.auth.getUser()

        if (!user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
        }

        // Check if current user is admin
        const { data: adminUser } = await supabase
            .from("users")
            .select("is_admin")
            .eq("discord_id", user.id)
            .single()

        if (!adminUser?.is_admin) {
            return NextResponse.json({ error: "Admin access required" }, { status: 403 })
        }

        const { userId, tier } = await request.json()

        if (!userId || !tier) {
            return NextResponse.json({ error: "userId and tier required" }, { status: 400 })
        }

        // Set default credits based on tier
        const tierCredits: Record<string, number> = {
            free: 50,
            pro: 100,
            enterprise: 500
        }

        const { error } = await supabase
            .from("users")
            .update({
                subscription_tier: tier,
                subscription_status: tier === "free" ? "inactive" : "active",
                generation_credits: tierCredits[tier] || 50
            })
            .eq("id", userId)

        if (error) throw error

        return NextResponse.json({ success: true })
    } catch (error) {
        console.error("[Admin] Change tier error:", error)
        return NextResponse.json({ error: "Failed to change tier" }, { status: 500 })
    }
}
