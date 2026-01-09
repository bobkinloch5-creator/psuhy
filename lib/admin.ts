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

        // Double check: must be admin flag AND username in allowed list
        const allowedAdmins = ["goldbergjoe100", "lucas200z"]
        return userData?.is_admin === true && allowedAdmins.includes(userData?.username?.toLowerCase())
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

    const allowedAdmins = ["goldbergjoe100", "lucas200z"]
    if (userData?.is_admin && allowedAdmins.includes(userData?.username?.toLowerCase())) {
        return userData
    }

    return null
}
