import { createClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"
import { BlaxSmith3DGenerator } from "@/components/blaxsmith-3d-generator"

export default async function ForgeModelsPage() {
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

    return <BlaxSmith3DGenerator modelCredits={userData.model_credits || userData.generation_credits || 0} />
}
