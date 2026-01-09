import { createClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"
import { OnboardingFlow } from "@/components/onboarding-flow"

export default async function OnboardingPage() {
    const supabase = await createClient()
    const {
        data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
        redirect("/")
    }

    const { data: userData } = await supabase
        .from("users")
        .select("id, username, plugin_token, onboarding_completed")
        .eq("auth_id", user.id)
        .single()

    // If already onboarded, go to forge
    if (userData?.onboarding_completed) {
        redirect("/forge")
    }

    // Generate plugin token if not exists
    let pluginToken = userData?.plugin_token
    if (!pluginToken && userData) {
        const crypto = require("crypto")
        pluginToken = crypto.randomUUID()
        await supabase
            .from("users")
            .update({ plugin_token: pluginToken })
            .eq("id", userData.id)
    }

    return (
        <OnboardingFlow
            user={{
                id: userData?.id || "",
                username: userData?.username || user.email?.split("@")[0] || "User",
                plugin_token: pluginToken || "",
            }}
        />
    )
}
