import { createClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"

export async function GET() {
    try {
        const supabase = await createClient()
        const {
            data: { user },
        } = await supabase.auth.getUser()

        if (!user) {
            return NextResponse.json({ user: null }, { status: 200 })
        }

        // Get full user data from users table
        const { data: userData } = await supabase
            .from("users")
            .select("id, discord_id, username, subscription_tier")
            .eq("discord_id", user.id)
            .single()

        return NextResponse.json({
            user: {
                id: userData?.discord_id || user.id,
                username: userData?.username || user.user_metadata?.full_name || "User",
                tier: userData?.subscription_tier || "free",
                authId: user.id,
                dbId: userData?.id
            }
        })
    } catch (error: any) {
        console.error("[Auth Me] Error:", error)
        return NextResponse.json({ error: "Auth check failed" }, { status: 500 })
    }
}
