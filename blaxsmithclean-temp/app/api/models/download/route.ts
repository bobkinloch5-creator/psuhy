import { createClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"

export async function POST(request: Request) {
    try {
        const supabase = await createClient()
        const {
            data: { user },
        } = await supabase.auth.getUser()

        if (!user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
        }

        const { creationId, format } = await request.json()

        if (!creationId || !format) {
            return NextResponse.json(
                { error: "Creation ID and format required" },
                { status: 400 }
            )
        }

        if (!["fbx", "obj", "gltf", "glb"].includes(format.toLowerCase())) {
            return NextResponse.json({ error: "Invalid format" }, { status: 400 })
        }

        const { data: userData } = await supabase
            .from("users")
            .select("id")
            .eq("discord_id", user.id)
            .single()

        if (!userData) {
            return NextResponse.json({ error: "User not found" }, { status: 404 })
        }

        // Get creation
        const { data: creation } = await supabase
            .from("creations")
            .select("*")
            .eq("id", creationId)
            .eq("user_id", userData.id)
            .single()

        if (!creation) {
            return NextResponse.json({ error: "Creation not found" }, { status: 404 })
        }

        // Get model data from asset_data
        const modelData = creation.asset_data

        if (!modelData?.download_url && !modelData?.model_url) {
            return NextResponse.json(
                { error: "Model file not available" },
                { status: 404 }
            )
        }

        // Use the download URL from model data
        const downloadUrl = modelData.download_url || modelData.model_url

        // Track download
        await supabase.from("model_files").insert({
            creation_id: creationId,
            user_id: userData.id,
            file_format: format.toLowerCase(),
            file_url: downloadUrl,
        })

        return NextResponse.json({
            success: true,
            downloadUrl,
            fileName: `${creation.name.replace(/[^a-z0-9]/gi, "_")}.${format}`,
        })
    } catch (error) {
        console.error("[Model Download] Error:", error)
        return NextResponse.json(
            { error: "Failed to prepare download" },
            { status: 500 }
        )
    }
}
