import { NextResponse } from "next/server"

const FORGE_API_BASE = "https://forgemind.onrender.com/api"

export async function POST(request: Request) {
    try {
        const { key, type = "forgemind", amount = 1 } = await request.json()

        if (!key) {
            return NextResponse.json({ error: "License key required" }, { status: 400 })
        }

        // Consume credits via Forge API
        const response = await fetch(`${FORGE_API_BASE}/consume`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ key, type, amount }),
        })

        const data = await response.json()

        if (response.ok && data.success) {
            return NextResponse.json({
                success: true,
                remaining: data.remaining,
            })
        } else {
            return NextResponse.json(
                {
                    success: false,
                    error: data.error || "Insufficient credits",
                },
                { status: 402 }
            )
        }
    } catch (error) {
        console.error("[License Consume] Error:", error)
        return NextResponse.json(
            { success: false, error: "Failed to consume credits" },
            { status: 500 }
        )
    }
}
