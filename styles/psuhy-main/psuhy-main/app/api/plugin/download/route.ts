import { NextResponse } from "next/server"
import fs from "fs"
import path from "path"

export async function GET() {
    try {
        // Read from public folder where the plugin is stored
        const filePath = path.join(process.cwd(), "public", "BlaxSmithPlugin.lua")
        const fileContent = fs.readFileSync(filePath, "utf-8")

        return new NextResponse(fileContent, {
            headers: {
                "Content-Type": "application/x-lua",
                "Content-Disposition": "attachment; filename=\"BlaxSmithPlugin.lua\""
            }
        })
    } catch (error) {
        console.error("Plugin download error:", error)
        return NextResponse.json({ error: "File not found" }, { status: 404 })
    }
}
