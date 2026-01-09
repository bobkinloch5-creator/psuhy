import { createClient } from "@/lib/supabase/server"
import { createClient as createServiceClient } from "@supabase/supabase-js"
import { NextRequest, NextResponse } from "next/server"

export async function DELETE(request: NextRequest) {
    try {
        // Get user from session
        const supabase = await createClient()
        const { data: { user } } = await supabase.auth.getUser()

        if (!user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
        }

        const { conversationId } = await request.json()

        if (!conversationId) {
            return NextResponse.json({ error: "Conversation ID required" }, { status: 400 })
        }

        // Use service client to bypass RLS
        const serviceClient = createServiceClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            process.env.SUPABASE_SERVICE_ROLE_KEY!,
            { auth: { autoRefreshToken: false, persistSession: false } }
        )

        // Get user's discord_id
        const { data: userData } = await serviceClient
            .from("users")
            .select("id")
            .eq("discord_id", user.id)
            .single()

        if (!userData) {
            return NextResponse.json({ error: "User not found" }, { status: 404 })
        }

        // Verify the conversation belongs to this user
        const { data: conversation } = await serviceClient
            .from("conversations")
            .select("id, user_id")
            .eq("id", conversationId)
            .single()

        if (!conversation) {
            return NextResponse.json({ error: "Conversation not found" }, { status: 404 })
        }

        if (conversation.user_id !== userData.id) {
            return NextResponse.json({ error: "Not authorized to delete this conversation" }, { status: 403 })
        }

        // Delete messages first (foreign key constraint)
        const { error: msgError } = await serviceClient
            .from("chat_messages")
            .delete()
            .eq("conversation_id", conversationId)

        if (msgError) {
            console.error("[API] Error deleting messages:", msgError)
        }

        // Delete conversation
        const { error: convError } = await serviceClient
            .from("conversations")
            .delete()
            .eq("id", conversationId)

        if (convError) {
            console.error("[API] Error deleting conversation:", convError)
            return NextResponse.json({ error: "Failed to delete conversation" }, { status: 500 })
        }

        console.log(`[API] Deleted conversation ${conversationId} for user ${userData.id}`)

        return NextResponse.json({ success: true })
    } catch (error) {
        console.error("[API] Delete conversation error:", error)
        return NextResponse.json({ error: "Internal server error" }, { status: 500 })
    }
}
