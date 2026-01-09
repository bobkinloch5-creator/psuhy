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

        const { userId, banned } = await request.json()

        if (!userId) {
            return NextResponse.json({ error: "userId required" }, { status: 400 })
        }

        const { error } = await supabase
            .from("users")
            .update({ is_banned: banned })
            .eq("id", userId)

        if (error) throw error

        return NextResponse.json({ success: true })
    } catch (error) {
        console.error("[Admin] Ban user error:", error)
        return NextResponse.json({ error: "Failed to update ban status" }, { status: 500 })
    }
}
