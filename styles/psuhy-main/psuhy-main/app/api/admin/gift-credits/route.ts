import { createClient } from "@/lib/supabase/server"
import { createClient as createServiceClient } from "@supabase/supabase-js"
import { NextResponse } from "next/server"

export async function POST(request: Request) {
    try {
        const supabase = await createClient()
        const { data: { user } } = await supabase.auth.getUser()

        if (!user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
        }

        // Use service client for admin operations
        const serviceClient = createServiceClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            process.env.SUPABASE_SERVICE_ROLE_KEY!,
            { auth: { autoRefreshToken: false, persistSession: false } }
        )

        // Check if current user is admin
        const { data: adminUser } = await serviceClient
            .from("users")
            .select("is_admin, id")
            .eq("discord_id", user.id)
            .single()

        if (!adminUser?.is_admin) {
            return NextResponse.json({ error: "Admin access required" }, { status: 403 })
        }

        const { userId, amount, reset } = await request.json()

        if (!userId) {
            return NextResponse.json({ error: "userId required" }, { status: 400 })
        }

        if (amount === undefined || (typeof amount !== 'number' && !reset)) {
            return NextResponse.json({ error: "Valid amount required" }, { status: 400 })
        }

        // Get target user info
        const { data: targetUser } = await serviceClient
            .from("users")
            .select("username, generation_credits")
            .eq("id", userId)
            .single()

        if (!targetUser) {
            return NextResponse.json({ error: "User not found" }, { status: 404 })
        }

        const oldCredits = targetUser.generation_credits || 0
        let newCredits: number

        if (reset) {
            // Reset to provided amount
            newCredits = amount
            const { error } = await serviceClient
                .from("users")
                .update({ generation_credits: amount })
                .eq("id", userId)

            if (error) throw error
        } else {
            // Add to existing credits
            newCredits = oldCredits + amount

            const { error } = await serviceClient
                .from("users")
                .update({ generation_credits: newCredits })
                .eq("id", userId)

            if (error) throw error
        }

        // Log the credit action
        try {
            await serviceClient
                .from("credit_transactions")
                .insert({
                    user_id: userId,
                    amount: reset ? amount : amount,
                    type: reset ? "admin_reset" : "admin_gift",
                    reason: reset
                        ? `Admin reset credits to ${amount}`
                        : `Admin gifted ${amount} credits`,
                    metadata: {
                        admin_id: adminUser.id,
                        old_balance: oldCredits,
                        new_balance: newCredits
                    }
                })
        } catch (logError) {
            // Don't fail if logging fails (table might not exist)
            console.warn("[Admin] Credit transaction logging failed:", logError)
        }

        // Log to security logs as well
        try {
            await serviceClient
                .from("security_logs")
                .insert({
                    event_type: "credit_gift",
                    user_id: userId,
                    details: {
                        admin_id: adminUser.id,
                        amount,
                        reset,
                        old_balance: oldCredits,
                        new_balance: newCredits,
                        username: targetUser.username
                    }
                })
        } catch (logError) {
            console.warn("[Admin] Security log failed:", logError)
        }

        return NextResponse.json({
            success: true,
            message: reset
                ? `Reset ${targetUser.username}'s credits to ${newCredits}`
                : `Gifted ${amount} credits to ${targetUser.username}`,
            data: {
                username: targetUser.username,
                oldCredits,
                newCredits,
                amountGifted: reset ? (newCredits - oldCredits) : amount
            }
        })
    } catch (error) {
        console.error("[Admin] Gift credits error:", error)
        return NextResponse.json({ error: "Failed to gift credits" }, { status: 500 })
    }
}
