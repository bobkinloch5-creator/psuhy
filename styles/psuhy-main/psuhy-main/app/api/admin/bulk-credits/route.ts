import { createClient } from "@/lib/supabase/server"
import { createClient as createServiceClient } from "@supabase/supabase-js"
import { NextResponse } from "next/server"

// POST - Bulk credit operations
export async function POST(request: Request) {
    try {
        const supabase = await createClient()
        const { data: { user } } = await supabase.auth.getUser()

        if (!user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
        }

        const { action, tier, amount, userIds } = await request.json()

        const serviceClient = createServiceClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            process.env.SUPABASE_SERVICE_ROLE_KEY!,
            { auth: { autoRefreshToken: false, persistSession: false } }
        )

        // Check admin
        const { data: userData } = await serviceClient
            .from("users")
            .select("is_admin")
            .eq("discord_id", user.id)
            .single()

        if (!userData?.is_admin) {
            return NextResponse.json({ error: "Forbidden" }, { status: 403 })
        }

        let affectedCount = 0

        if (action === "gift_all") {
            // Gift credits to all users
            const { data: users } = await serviceClient
                .from("users")
                .select("id, generation_credits")

            for (const u of users || []) {
                await serviceClient
                    .from("users")
                    .update({ generation_credits: (u.generation_credits || 0) + amount })
                    .eq("id", u.id)
                affectedCount++
            }
        } else if (action === "gift_tier") {
            // Gift credits to users of a specific tier
            const { data: users } = await serviceClient
                .from("users")
                .select("id, generation_credits")
                .eq("subscription_tier", tier)

            for (const u of users || []) {
                await serviceClient
                    .from("users")
                    .update({ generation_credits: (u.generation_credits || 0) + amount })
                    .eq("id", u.id)
                affectedCount++
            }
        } else if (action === "reset_tier") {
            // Reset credits for a tier to default
            const defaultCredits: Record<string, number> = {
                free: 30,
                pro: 150,
                premium: 150,
                enterprise: 500
            }

            const { error } = await serviceClient
                .from("users")
                .update({ generation_credits: defaultCredits[tier] || 30 })
                .eq("subscription_tier", tier)

            if (!error) {
                const { count } = await serviceClient
                    .from("users")
                    .select("*", { count: "exact", head: true })
                    .eq("subscription_tier", tier)
                affectedCount = count || 0
            }
        } else if (action === "gift_selected" && userIds?.length) {
            // Gift to selected users
            for (const uid of userIds) {
                const { data: u } = await serviceClient
                    .from("users")
                    .select("generation_credits")
                    .eq("id", uid)
                    .single()

                if (u) {
                    await serviceClient
                        .from("users")
                        .update({ generation_credits: (u.generation_credits || 0) + amount })
                        .eq("id", uid)
                    affectedCount++
                }
            }
        }

        return NextResponse.json({
            success: true,
            affected: affectedCount,
            message: `${action} completed for ${affectedCount} users`
        })
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 })
    }
}
