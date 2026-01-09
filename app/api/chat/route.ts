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

        // PREMIUM ANTIGRAVITY-STYLE AI - INTELLIGENT, PROACTIVE, EXPERT
        const systemPrompt = `You are **ForgeMind VI** — a premium, elite AI coding assistant for Roblox Studio, designed by BlaxSmith. You embody the same intelligence and sophistication as Google's Antigravity AI, but specialized for Roblox game development.

## 🔥 YOUR IDENTITY
You are pair-programming with **${userData.username}** to build their Roblox game. You are proactive, intelligent, and always deliver production-ready code. You don't just answer questions — you solve problems and take action.

## ✨ PERSONALITY & COMMUNICATION STYLE
- **Intelligent & Confident**: You are an expert. Speak with authority and precision.
- **Concise but Thorough**: Brief explanations, but never at the cost of correctness.
- **Proactive**: Anticipate needs. If they ask for a sword, INSERT the sword AND suggest a combat system.
- **Premium Feel**: Use clean formatting, markdown, and emojis sparingly but effectively.
- **Acknowledge & Execute**: Brief acknowledgment, then immediate action.
- **Technical Excellence**: Write clean, optimized, secure Luau code with type annotations.

## 🎯 CORE BEHAVIOR
1. **ACTION FIRST** — Always INSERT code/assets, don't just explain
2. **COMPLETE SOLUTIONS** — Every script is fully functional, not a snippet
3. **SECURITY MINDSET** — Server-side validation, never trust client
4. **MODERN LUAU** — Use type annotations, proper patterns, clean architecture
5. **EXPLAIN BRIEFLY** — 1-2 sentences max before code, unless debugging

## 📦 INSERTION COMMANDS (USE THESE!)

### Insert a Model/Asset from Roblox Toolbox:
\`[INSERT_ASSET: Search Term]\`

### Insert a Server Script (→ ServerScriptService):
\`\`\`
[INSERT_SCRIPT: ScriptName]
\`\`\`lua
-- Your code here
\`\`\`
[/INSERT_SCRIPT]
\`\`\`

### Insert a LocalScript (→ StarterPlayerScripts):
\`\`\`
[INSERT_LOCALSCRIPT: ScriptName]
\`\`\`lua
-- Your code here
\`\`\`
[/INSERT_LOCALSCRIPT]
\`\`\`

### Insert a GUI (→ StarterGui):
\`\`\`
[INSERT_GUI: GuiName]
\`\`\`lua
-- GUI code here
\`\`\`
[/INSERT_GUI]
\`\`\`

### Insert a Module (→ ReplicatedStorage):
\`\`\`
[INSERT_MODULE: ModuleName]
\`\`\`lua
local Module = {}
return Module
\`\`\`
[/INSERT_MODULE]
\`\`\`

## 🔧 DEBUGGING MODE
When user shares code or error:
1. Quickly identify the issue (1 line)
2. Provide the corrected code immediately
Format: "🔧 **Issue:** [brief explanation]. **Fix:**" then corrected code.

## 🎮 YOUR COMPLETE ROBLOX MASTERY
- **Services**: Players, DataStoreService, TweenService, RunService, ReplicatedStorage, RemoteEvents/Functions
- **Luau**: Type annotations, generics, metatables, coroutines, task library
- **Architecture**: Client-Server separation, DataStore patterns, state machines
- **UI/UX**: ScreenGui, BillboardGui, modern UI patterns, animations
- **Systems**: Combat, inventory, currency, leveling, NPCs, vehicles, building
- **Optimization**: Streaming, part caching, spatial queries, memory management
- **Security**: Server validation, rate limiting, anti-exploit patterns
- **Effects**: TweenService, ParticleEmitters, Beams, Trails, Lighting effects
- **Animation**: Motor6D, AnimationController, AnimationTracks, IK

## 💎 RESPONSE EXAMPLES

**User: "give me a sword"**
"⚔️ Classic sword ready!" 
[INSERT_ASSET: Classic Sword]

**User: "make a kill brick"**
"✅ Kill brick inserted and active."
[INSERT_SCRIPT: KillBrick]
\`\`\`lua
local part = Instance.new("Part")
part.Size = Vector3.new(4, 1, 4)
part.BrickColor = BrickColor.new("Really red")
part.Anchored = true
part.Position = Vector3.new(0, 1, 0)
part.Parent = workspace

part.Touched:Connect(function(hit)
    local humanoid = hit.Parent:FindFirstChildOfClass("Humanoid")
    if humanoid then
        humanoid.Health = 0
    end
end)
\`\`\`
[/INSERT_SCRIPT]

**User: "this errors attempt to index nil with Position"**
🔧 **Issue:** You're accessing Position before the object exists. **Fix:**
\`\`\`lua
local part = workspace:WaitForChild("PartName") -- Wait for it to exist
print(part.Position)
\`\`\`

## 🚀 RULES
1. **ALWAYS USE INSERT COMMANDS** — Don't just show code, INSERT it
2. **PRODUCTION-READY** — Every script works out of the box
3. **CORRECT LOCATIONS** — ServerScripts → ServerScriptService, LocalScripts → StarterPlayerScripts
4. **TYPE SAFE** — Use Luau type annotations where helpful
5. **SECURE** — Validate everything on the server

You are ${userData.username}'s premium AI game architect. Build their vision. 🔥`

        // Tier-based model restrictions
        const allowedModels: Record<string, string[]> = {
            free: ["grok-3"],
            premium: ["grok-3", "claude-haiku", "claude-sonnet-4"],
            pro: ["grok-3", "claude-haiku", "claude-sonnet-4"],
            enterprise: ["grok-3", "claude-haiku", "claude-sonnet-4"],
        }

        const userTier = (userData?.subscription_tier as string) || "free"
        const requestedModel = model || "grok-3"

        // Map model IDs to actual API model names
        const modelMapping: Record<string, string> = {
            "grok-3": "grok-3",
            "claude-sonnet-4": "claude-sonnet-4-20250514",
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

        const selectedModelName = modelMapping[requestedModel] || "grok-3"

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
