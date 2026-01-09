import { createClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"
import AIChatFullPage from "@/components/ai-chat-fullpage"

export default async function ForgeChatPage() {
    const supabase = await createClient()
    const {
        data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
        redirect("/")
    }

    const { data: userData } = await supabase
        .from("users")
        .select("*")
        .eq("auth_id", user.id)
        .single()

    if (!userData) {
        redirect("/")
    }

    return <AIChatFullPage user={userData} />
}
