import { createClient } from "@/lib/supabase/server"
import { generateWithCometAPI, getModelForTask } from "@/lib/cometapi"
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

        const { conversationId, message, files, model } = await request.json()

        if (!message?.trim()) {
            return NextResponse.json({ error: "Message is required" }, { status: 400 })
        }

        // Get user data
        const { data: userData } = await supabase
            .from("users")
            .select("id, username, subscription_tier, generation_credits")
            .eq("discord_id", user.id)
            .single()

        if (!userData) {
            return NextResponse.json({ error: "User not found" }, { status: 404 })
        }

        // Check if user has credits
        const currentCredits = userData.generation_credits ?? 0
        if (currentCredits <= 0) {
            const isPro = userData.subscription_tier && ["pro", "premium", "enterprise"].includes(userData.subscription_tier)
            return NextResponse.json({
                error: "No prompt credits remaining!",
                message: isPro
                    ? "Your 100 prompt credits have been used. Credits reset monthly."
                    : "You've used your 50 free prompts! Upgrade to Pro for 100 prompts/month.",
                creditsRemaining: 0
            }, { status: 403 })
        }

        let activeConversationId = conversationId

        // Create new conversation if none provided
        if (!conversationId) {
            const { data: newConversation } = await supabase
                .from("conversations")
                .insert({
                    user_id: userData.id,
                    title: message.slice(0, 50) + (message.length > 50 ? "..." : ""),
                })
                .select()
                .single()

            if (!newConversation) {
                throw new Error("Failed to create conversation")
            }
            activeConversationId = newConversation.id
        }

        // Save user message
        const { data: userMessage } = await supabase
            .from("chat_messages")
            .insert({
                conversation_id: activeConversationId,
                role: "user",
                content: message,
            })
            .select()
            .single()

        // Handle file attachments
        if (files && files.length > 0) {
            const attachments = files.map((file: any) => ({
                conversation_id: activeConversationId,
                message_id: userMessage.id,
                file_name: file.name,
                file_type: file.type,
                file_size: file.size,
                file_url: file.url,
            }))
            await supabase.from("file_attachments").insert(attachments)
        }

        // Get conversation history for context
        const { data: history } = await supabase
            .from("chat_messages")
            .select("role, content")
            .eq("conversation_id", activeConversationId)
            .order("created_at", { ascending: true })
            .limit(20)

        // CONCISE ANTIGRAVITY-STYLE AI
        const systemPrompt = `You are **ForgeMind** — an elite, concise AI for Roblox. Built by BlaxSmith.

**STYLE**: Ultra-concise. 1-2 sentences max. No walls of text. Action-first.

**COMMANDS**:
- \`[INSERT_ASSET: term]\` — Insert from Toolbox
- \`[INSERT_SCRIPT: Name]\` + lua code + \`[/INSERT_SCRIPT]\` — Server script
- \`[INSERT_LOCALSCRIPT: Name]\` + lua code + \`[/INSERT_LOCALSCRIPT]\` — Client script

**RULES**:
1. Short scripts only (5-15 lines). No bloat.
2. Don't explain unless asked. Just do it.
3. For terrain: say "Right-click script → Run Script for permanent terrain"
4. Be confident. You're an expert.

**EXAMPLE**:
User: "grass terrain"
You: "🌿 Done."
[INSERT_SCRIPT: Grass]
\\\`\\\`\\\`lua
workspace.Terrain:FillBlock(CFrame.new(0,-2,0), Vector3.new(200,4,200), Enum.Material.Grass)
\\\`\\\`\\\`
[/INSERT_SCRIPT]
"Right-click → Run Script to make permanent."

Help **${userData.username}**. Keep it short. 🔥`

        // Tier-based model restrictions
        const allowedModels: Record<string, string[]> = {
            free: ["grok-3", "gemini-3-flash"],
            premium: ["grok-3", "gemini-3-flash", "claude-haiku", "claude-sonnet-4", "claude-sonnet-4-5-20250929"],
            pro: ["grok-3", "gemini-3-flash", "claude-haiku", "claude-sonnet-4", "claude-sonnet-4-5-20250929"],
            enterprise: ["grok-3", "gemini-3-flash", "claude-haiku", "claude-sonnet-4", "claude-sonnet-4-5-20250929"],
        }

        const userTier = (userData?.subscription_tier as string) || "free"
        const requestedModel = model || "gemini-3-flash"

        // Map model IDs to actual API model names
        const modelMapping: Record<string, string> = {
            "grok-3": "grok-3",
            "gemini-3-flash": "gemini-3-flash",
            "claude-sonnet-4": "claude-sonnet-4-20250514",
            "claude-sonnet-4-5-20250929": "claude-sonnet-4-5-20250929",
            "claude-haiku": "claude-3-5-haiku-20241022",
        }

        // Validate tier permissions
        const allowed = allowedModels[userTier as keyof typeof allowedModels] || allowedModels.free
        if (!allowed.includes(requestedModel)) {
            return NextResponse.json({
                error: "Upgrade to premium to use this model",
                availableModels: allowed
            }, { status: 403 })
        }

        const selectedModelName = modelMapping[requestedModel] || "gemini-3-flash"

        // Build message with context
        let messageWithContext = message
        if (files && files.length > 0) {
            messageWithContext +=
                "\n\nAttached files:\n" + files.map((f: any) => `- ${f.name} (${f.type})`).join("\n")
        }

        // Add conversation history for context
        let fullPrompt = messageWithContext
        if (history && history.length > 1) {
            const recentHistory = history.slice(-6) // Last 3 exchanges
            const contextStr = recentHistory
                .map(m => `${m.role === "user" ? "User" : "Assistant"}: ${m.content.substring(0, 500)}`)
                .join("\n\n")
            fullPrompt = `Previous conversation:\n${contextStr}\n\nCurrent message: ${messageWithContext}`
        }

        const aiResponse = await generateWithCometAPI(selectedModelName, fullPrompt, systemPrompt)

        // Parse AI response for various insertion commands
        const { addCommand, createInsertModelCommand } = await import('@/lib/command-queue')
        const insertedItems: string[] = []

        // 1. Parse INSERT_ASSET commands (from Roblox Toolbox)
        const assetPattern = /\[INSERT_ASSET:\s*([^\]]+)\]/gi
        for (const match of aiResponse.matchAll(assetPattern)) {
            const assetName = match[1].trim()
            try {
                const searchUrl = `https://www.roblox.com/catalog/json?Keyword=${encodeURIComponent(assetName)}&Category=6&MaxPrice=0&ResultsPerPage=1`
                const response = await fetch(searchUrl, { headers: { "Accept": "application/json" } })
                if (response.ok) {
                    const items = await response.json()
                    if (Array.isArray(items) && items.length > 0 && items[0].AssetId) {
                        const asset = items[0]
                        const command = createInsertModelCommand(asset.AssetId, asset.Name || assetName)
                        await addCommand(userData.id, command)
                        insertedItems.push(`Model: ${asset.Name}`)
                        console.log(`[AI Chat] Queued asset: ${asset.Name} (${asset.AssetId})`)
                    }
                }
            } catch (err) {
                console.error(`[AI Chat] Asset search failed: ${assetName}`, err)
            }
        }

        // 2. Parse INSERT_SCRIPT commands
        const scriptPattern = /\[INSERT_SCRIPT:\s*([^\]]+)\][\s\S]*?```lua([\s\S]*?)```[\s\S]*?\[\/INSERT_SCRIPT\]/gi
        for (const match of aiResponse.matchAll(scriptPattern)) {
            const [, scriptName, code] = match
            const command = {
                type: "INSERT_SCRIPT",
                data: {
                    name: scriptName.trim(),
                    location: "ServerScriptService",
                    scriptType: "Script"
                },
                code: code.trim()
            }
            await addCommand(userData.id, command)
            insertedItems.push(`Script: ${scriptName.trim()}`)
            console.log(`[AI Chat] Queued script: ${scriptName.trim()}`)
        }

        // 3. Parse INSERT_LOCALSCRIPT commands
        const localScriptPattern = /\[INSERT_LOCALSCRIPT:\s*([^\]]+)\][\s\S]*?```lua([\s\S]*?)```[\s\S]*?\[\/INSERT_LOCALSCRIPT\]/gi
        for (const match of aiResponse.matchAll(localScriptPattern)) {
            const [, scriptName, code] = match
            const command = {
                type: "INSERT_LOCALSCRIPT",
                data: {
                    name: scriptName.trim(),
                    location: "StarterPlayerScripts",
                    scriptType: "LocalScript"
                },
                code: code.trim()
            }
            await addCommand(userData.id, command)
            insertedItems.push(`LocalScript: ${scriptName.trim()}`)
            console.log(`[AI Chat] Queued local script: ${scriptName.trim()}`)
        }

        // 4. Parse INSERT_GUI commands
        const guiPattern = /\[INSERT_GUI:\s*([^\]]+)\][\s\S]*?```lua([\s\S]*?)```[\s\S]*?\[\/INSERT_GUI\]/gi
        for (const match of aiResponse.matchAll(guiPattern)) {
            const [, guiName, code] = match
            const command = {
                type: "INSERT_GUI",
                data: {
                    name: guiName.trim(),
                    location: "StarterGui",
                    scriptType: "LocalScript"
                },
                code: code.trim()
            }
            await addCommand(userData.id, command)
            insertedItems.push(`GUI: ${guiName.trim()}`)
            console.log(`[AI Chat] Queued GUI: ${guiName.trim()}`)
        }

        // 5. Parse INSERT_MODULE commands
        const modulePattern = /\[INSERT_MODULE:\s*([^\]]+)\][\s\S]*?```lua([\s\S]*?)```[\s\S]*?\[\/INSERT_MODULE\]/gi
        for (const match of aiResponse.matchAll(modulePattern)) {
            const [, moduleName, code] = match
            const command = {
                type: "INSERT_MODULE",
                data: {
                    name: moduleName.trim(),
                    location: "ReplicatedStorage",
                    scriptType: "ModuleScript"
                },
                code: code.trim()
            }
            await addCommand(userData.id, command)
            insertedItems.push(`Module: ${moduleName.trim()}`)
            console.log(`[AI Chat] Queued module: ${moduleName.trim()}`)
        }

        // Save AI response
        await supabase.from("chat_messages").insert({
            conversation_id: activeConversationId,
            role: "assistant",
            content: aiResponse,
        })

        // Update conversation timestamp
        await supabase
            .from("conversations")
            .update({ updated_at: new Date().toISOString() })
            .eq("id", activeConversationId)

        // DEDUCT 1 CREDIT after successful generation
        const newCredits = currentCredits - 1
        const { error: creditError } = await supabase
            .from("users")
            .update({ generation_credits: newCredits })
            .eq("discord_id", user.id) // Match by auth user ID which maps to discord_id

        if (creditError) {
            console.error(`[AI Chat] Failed to deduct credit:`, creditError)
        } else {
            console.log(`[AI Chat] Deducted 1 credit from user ${userData.username}. Remaining: ${newCredits}`)
        }

        return NextResponse.json({
            success: true,
            conversationId: activeConversationId,
            response: aiResponse,
            itemsQueued: insertedItems.length > 0 ? insertedItems : undefined,
            model: selectedModelName,
            creditsRemaining: newCredits,
        })
    } catch (error) {
        console.error("[AI Chat] Error:", error)
        return NextResponse.json({ error: "Failed to process message" }, { status: 500 })
    }
}
