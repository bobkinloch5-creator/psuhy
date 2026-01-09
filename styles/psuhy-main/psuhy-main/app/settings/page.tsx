import { createClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"
import { SettingsInterface } from "@/components/settings-interface"

export default async function SettingsPage() {
    const supabase = await createClient()
    const {
        data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
        redirect("/")
    }

    const { data: userData, error: userError } = await supabase
        .from("users")
        .select("*")
        .eq("discord_id", user.id)
        .single()

    if (userError || !userData) {
        console.error("[v0] Settings page - user not found:", userError)
        redirect("/?error=user_not_found")
    }

    // Get subscription info
    const { data: subscription } = await supabase
        .from("subscriptions")
        .select("*")
        .eq("user_id", userData.id)
        .eq("status", "active")
        .single()

    return <SettingsInterface user={userData} subscription={subscription} />
}

