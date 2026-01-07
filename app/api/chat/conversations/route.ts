import { createClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"

// GET all user conversations
export async function GET() {
    try {
        const supabase = await createClient()
        const {
            data: { user },
        } = await supabase.auth.getUser()

        if (!user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
        }

        const { data: userData } = await supabase
            .from("users")
            .select("id")
            .eq("discord_id", user.id)
            .single()

        if (!userData) {
            return NextResponse.json({ error: "User not found" }, { status: 404 })
        }

        const { data: conversations } = await supabase
            .from("conversations")
            .select("*")
            .eq("user_id", userData.id)
            .order("updated_at", { ascending: false })

        return NextResponse.json({ conversations })
    } catch (error) {
        console.error("[Conversations] GET error:", error)
        return NextResponse.json({ error: "Failed to fetch conversations" }, { status: 500 })
    }
}

// POST create new conversation
export async function POST(request: Request) {
    try {
        const supabase = await createClient()
        const {
            data: { user },
        } = await supabase.auth.getUser()

        if (!user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
        }

        const { title, projectId } = await request.json()

        const { data: userData } = await supabase
            .from("users")
            .select("id")
            .eq("discord_id", user.id)
            .single()

        if (!userData) {
            return NextResponse.json({ error: "User not found" }, { status: 404 })
        }

        const { data: conversation } = await supabase
            .from("conversations")
            .insert({
                user_id: userData.id,
                project_id: projectId || null,
                title: title || "New Conversation",
            })
            .select()
            .single()

        return NextResponse.json({ conversation })
    } catch (error) {
        console.error("[Conversations] POST error:", error)
        return NextResponse.json({ error: "Failed to create conversation" }, { status: 500 })
    }
}

// DELETE conversation
export async function DELETE(request: Request) {
    try {
        const supabase = await createClient()
        const {
            data: { user },
        } = await supabase.auth.getUser()

        if (!user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
        }

        const { conversationId } = await request.json()

        const { data: userData } = await supabase
            .from("users")
            .select("id")
            .eq("discord_id", user.id)
            .single()

        if (!userData) {
            return NextResponse.json({ error: "User not found" }, { status: 404 })
        }

        // Delete conversation (cascade will delete messages)
        await supabase
            .from("conversations")
            .delete()
            .eq("id", conversationId)
            .eq("user_id", userData.id)

        return NextResponse.json({ success: true })
    } catch (error) {
        console.error("[Conversations] DELETE error:", error)
        return NextResponse.json({ error: "Failed to delete conversation" }, { status: 500 })
    }
}
