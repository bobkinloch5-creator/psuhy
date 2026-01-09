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

        const { userId, amount, reset } = await request.json()

        if (!userId) {
            return NextResponse.json({ error: "userId required" }, { status: 400 })
        }

        // Get current credits if not resetting
        if (reset) {
            // Reset to provided amount
            const { error } = await supabase
                .from("users")
                .update({ generation_credits: amount })
                .eq("id", userId)

            if (error) throw error
        } else {
            // Add to existing credits
            const { data: targetUser } = await supabase
                .from("users")
                .select("generation_credits")
                .eq("id", userId)
                .single()

            const newCredits = (targetUser?.generation_credits || 0) + amount

            const { error } = await supabase
                .from("users")
                .update({ generation_credits: newCredits })
                .eq("id", userId)

            if (error) throw error
        }

        return NextResponse.json({ success: true })
    } catch (error) {
        console.error("[Admin] Gift credits error:", error)
        return NextResponse.json({ error: "Failed to gift credits" }, { status: 500 })
    }
}
