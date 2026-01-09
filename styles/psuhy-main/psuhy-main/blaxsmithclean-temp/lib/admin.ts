// Admin access check utility
import { createClient } from "@/lib/supabase/server"

export async function isAdmin(): Promise<boolean> {
    try {
        const supabase = await createClient()
        const {
            data: { user },
        } = await supabase.auth.getUser()

        if (!user) return false

        const { data: userData } = await supabase
            .from("users")
            .select("is_admin, username")
            .eq("discord_id", user.id)
            .single()

        // Double check: must be admin flag AND username goldbergjoe100
        return userData?.is_admin === true && userData?.username?.toLowerCase() === "goldbergjoe100"
    } catch (error) {
        console.error("[Admin Check] Error:", error)
        return false
    }
}

export async function getAdminUser() {
    const supabase = await createClient()
    const {
        data: { user },
    } = await supabase.auth.getUser()

    if (!user) return null

    const { data: userData } = await supabase
        .from("users")
        .select("*")
        .eq("discord_id", user.id)
        .single()

    if (userData?.is_admin && userData?.username?.toLowerCase() === "goldbergjoe100") {
        return userData
    }

    return null
}
