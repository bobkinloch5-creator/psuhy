import { NextResponse } from "next/server"

const FORGE_API_BASE = "https://forgemind.onrender.com/api"

export async function POST(request: Request) {
    try {
        const { key } = await request.json()

        if (!key) {
            return NextResponse.json({ error: "License key required" }, { status: 400 })
        }

        // Validate license with Forge API
        const response = await fetch(`${FORGE_API_BASE}/validate`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ key }),
        })

        const data = await response.json()

        if (response.ok && data.valid) {
            // Store license info in session/database if needed
            return NextResponse.json({
                success: true,
                tier: data.tier,
                credits: data.credits,
                username: data.username,
                discordId: data.discord_id,
            })
        } else {
            return NextResponse.json(
                {
                    success: false,
                    error: data.error || "Invalid license key",
                },
                { status: 401 }
            )
        }
    } catch (error) {
        console.error("[License Validation] Error:", error)
        return NextResponse.json(
            { success: false, error: "Failed to validate license" },
            { status: 500 }
        )
    }
}
