import { NextResponse } from "next/server"
import fs from "fs"
import path from "path"

export async function GET() {
    try {
        const filePath = path.join(process.cwd(), "roblox-plugin", "BlaxSmithPlugin.lua")
        const fileContent = fs.readFileSync(filePath, "utf-8")

        return new NextResponse(fileContent, {
            headers: {
                "Content-Type": "text/plain",
                "Content-Disposition": "attachment; filename=BlaxSmithPlugin.lua"
            }
        })
    } catch (error) {
        console.error("Plugin download error:", error)
        return NextResponse.json({ error: "File not found" }, { status: 404 })
    }
}
