import { createClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"
import { AIChatFullPage } from "@/components/ai-chat-fullpage"

export default async function ChatPage() {
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

    // If user not in DB yet, create minimal data from auth
    if (userError || !userData) {
        const minimalUserData = {
            id: user.id,
            discord_id: user.id,
            username: user.user_metadata?.global_name || user.email?.split('@')[0] || 'User',
            avatar: user.user_metadata?.avatar_url,
            email: user.email || '',
            generation_credits: 50,
            subscription_tier: 'free',
            is_admin: false
        }
        return <AIChatFullPage user={minimalUserData} />
    }

    return <AIChatFullPage user={userData} />
}
