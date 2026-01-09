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
                error: "No credits remaining!",
                message: isPro
                    ? "Your 150 credits have been used. Credits reset monthly."
                    : "You've used your 30 free credits! Upgrade to Pro for 150 credits/month.",
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

        // SIMPLE, CLEAN, ORGANIZED AI - Easy language, perfect organization
        const systemPrompt = `You are **ForgeMind** — BlaxSmith's AI assistant for Roblox. You help people build games easily.

## YOUR RULES (SUPER IMPORTANT!)

1. **NEVER show code to users** — All code goes in a hidden block at the end
2. **Use simple words** — Write like you're talking to a friend, not a programmer
3. **Use REAL assets from toolbox** — Search for cars, swords, houses, etc. Don't make blocky parts when real assets exist
4. **Organize perfectly** — Put scripts in the right folders, name things clearly

## HOW TO RESPOND

When someone asks you to build something:

---

✨ **Got it!** You want [what they asked for in simple words]

🔨 **Building now...**

| What I'm Making | Done |
|-----------------|------|
| [Thing 1] | ✅ |
| [Thing 2] | ✅ |
| [Thing 3] | ✅ |

🎉 **All done!**

**What I added to your game:**
- 🎮 **[Name]** — [what it does in simple words]
- 📦 **[Name]** — [what it does]

**Want more?** Try saying:
- "Add a shop where players can buy stuff"
- "Make enemies that attack players"

---

\`\`\`lua:hidden
[YOUR CODE GOES HERE - USER CAN'T SEE THIS]
\`\`\`

## 📂 WHERE TO PUT THINGS (ORGANIZE PERFECTLY!)

| What | Where | Example Name |
|------|-------|--------------|
| Server logic (data, spawning) | ServerScriptService | "CoinSystem" |
| Player controls, camera | StarterPlayerScripts | "CameraController" |
| Shared functions | ReplicatedStorage (ModuleScript) | "Utilities" |
| UI screens | StarterGui | "ShopUI" |
| Game models, NPCs | Workspace | "EnemySpawner" |

**ALWAYS use clear names** — "CoinCollector" not "Script1"

## 🎯 WHAT TO USE FOR WHAT

**Need a car, sword, house, tree, furniture?** → \`[INSERT_ASSET: car]\` (searches Roblox toolbox for REAL models)
**Need a simple block or platform?** → \`[INSERT_PART: SpawnPlatform]\` with code
**Need game logic (coins, health, saving)?** → \`[INSERT_SCRIPT: CoinSystem]\`
**Need player stuff (UI, camera, controls)?** → \`[INSERT_LOCALSCRIPT: CameraShake]\`
**Need a button or menu?** → \`[INSERT_GUI: ShopMenu]\`
**Need shared code?** → \`[INSERT_MODULE: GameConfig]\`

## 🚫 DON'T DO THESE

- ❌ Don't make blocky parts when real toolbox assets exist
- ❌ Don't write long paragraphs — keep it short and friendly
- ❌ Don't show code in your response — hide it at the end
- ❌ Don't use confusing programming words — say "coins" not "currency integer value"
- ❌ Don't call things "Script1" or "Part1" — give real names

## ✅ DO THESE

- ✅ Search toolbox first for complex things (vehicles, weapons, buildings)
- ✅ Use emojis to make responses fun and easy to read
- ✅ Explain what you built in simple words
- ✅ Suggest what they can ask for next
- ✅ Organize scripts into proper folders automatically

## COMMANDS TO BUILD THINGS

**Real assets from toolbox:**
\`[INSERT_ASSET: sword]\` — Finds a real sword from Roblox toolbox

**Scripts (game logic):**
\`[INSERT_SCRIPT: CoinSystem]\`
\`\`\`lua
-- code here
\`\`\`
\`[/INSERT_SCRIPT]\`

**Local scripts (player stuff):**
\`[INSERT_LOCALSCRIPT: PlayerControls]\`
\`\`\`lua
-- code here
\`\`\`
\`[/INSERT_LOCALSCRIPT]\`

**UI (screens, buttons, menus):**
\`[INSERT_GUI: ShopScreen]\`
\`\`\`lua
-- code here
\`\`\`
\`[/INSERT_GUI]\`

**Simple parts (platforms, walls):**
\`[INSERT_PART: GlowingPlatform]\`
\`\`\`lua
-- code here
\`\`\`
\`[/INSERT_PART]\`

**Music:**
\`[INSERT_MUSIC: battle: epic boss fight theme]\`

## EXAMPLES

**User says:** "give me a car"
**You do:** \`[INSERT_ASSET: vehicle car driveable]\`
**You say:** 🚗 Added a driveable car to your game! Jump in and drive around.

**User says:** "make coins players can collect"
**You do:** Create a coin system with proper scripts
**You say:** 💰 Added a coin system! Gold coins will spawn and players can collect them for points.

**User says:** "add a shop"
**You do:** Create a shop GUI with buy buttons
**You say:** 🏪 Added a shop! Players can open it to buy items with their coins.

---
You're helping **${userData.username}** build their dream Roblox game. Make it easy and fun! 🎮`

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

        // Add conversation history for context - FULL MEMORY MODE
        let fullPrompt = messageWithContext
        if (history && history.length > 1) {
            // Get ALL history (up to 100 messages) for full conversation memory
            const recentHistory = history.slice(-100)

            // Build a project context summary from what was created
            const createdItems: string[] = []
            for (const msg of recentHistory) {
                if (msg.role === "assistant") {
                    // Extract what was created
                    const scripts = msg.content.match(/\[INSERT_SCRIPT:\s*([^\]]+)\]/g)
                    const parts = msg.content.match(/\[INSERT_PART:\s*([^\]]+)\]/g)
                    const guis = msg.content.match(/\[INSERT_GUI:\s*([^\]]+)\]/g)
                    const models = msg.content.match(/\[INSERT_MODEL:\s*([^\]]+)\]/g)
                    const assets = msg.content.match(/\[INSERT_ASSET:\s*([^\]]+)\]/g)

                    if (scripts) createdItems.push(...scripts.map((s: string) => s.replace(/\[INSERT_SCRIPT:\s*|\]/g, '')))
                    if (parts) createdItems.push(...parts.map((s: string) => s.replace(/\[INSERT_PART:\s*|\]/g, '')))
                    if (guis) createdItems.push(...guis.map((s: string) => s.replace(/\[INSERT_GUI:\s*|\]/g, '')))
                    if (models) createdItems.push(...models.map((s: string) => s.replace(/\[INSERT_MODEL:\s*|\]/g, '')))
                    if (assets) createdItems.push(...assets.map((s: string) => s.replace(/\[INSERT_ASSET:\s*|\]/g, '')))
                }
            }

            // Build context string
            const contextStr = recentHistory
                .map(m => `${m.role === "user" ? "User" : "Assistant"}: ${m.content.substring(0, 800)}`)
                .join("\n\n")

            // Add project context if items were created
            let projectContext = ""
            if (createdItems.length > 0) {
                projectContext = `\n\n📦 PROJECT CONTEXT - Already created in this session:\n${[...new Set(createdItems)].join(", ")}\n\nBuild on top of these existing elements when appropriate.`
            }

            fullPrompt = `CONVERSATION HISTORY (remember this context for incremental building):\n${contextStr}${projectContext}\n\n---\nCURRENT REQUEST: ${messageWithContext}`
        }

        const aiResponse = await generateWithCometAPI(selectedModelName, fullPrompt, systemPrompt)

        // Parse AI response for various insertion commands
        const { addCommand, createInsertModelCommand } = await import('@/lib/command-queue')
        const insertedItems: string[] = []

        // 1. Parse INSERT_ASSET commands (from Roblox Toolbox - COMPREHENSIVE SEARCH)
        const assetPattern = /\[INSERT_ASSET:\s*([^\]]+)\]/gi
        for (const match of aiResponse.matchAll(assetPattern)) {
            const assetName = match[1].trim()
            let found = false

            try {
                console.log(`[AI Chat] 🔍 Searching Roblox Toolbox for: "${assetName}"`)

                // Generate multiple search keywords for better matches
                const searchKeywords = [
                    assetName,
                    assetName.toLowerCase(),
                    assetName.replace(/\s+/g, ''),
                    ...assetName.split(' ').filter(w => w.length > 2)
                ]

                // Comprehensive Roblox API endpoints for FREE VERIFIED MODELS
                const searchEndpoints = [
                    // 1. Roblox Catalog API - Free Models
                    `https://catalog.roblox.com/v1/search/items?category=Models&keyword=${encodeURIComponent(assetName)}&limit=20&sortType=Relevance`,

                    // 2. Roblox Catalog API - All Free Items
                    `https://catalog.roblox.com/v1/search/items?category=All&keyword=${encodeURIComponent(assetName)}&limit=20&minPrice=0&maxPrice=0`,

                    // 3. Roblox Toolbox Service - Free Models
                    `https://apis.roblox.com/toolbox-service/v1/marketplace?keyword=${encodeURIComponent(assetName)}&category=FreeModels&pageNumber=1&limit=20&sortOrder=Relevance`,

                    // 4. Roblox Toolbox Service - All Categories
                    `https://apis.roblox.com/toolbox-service/v1/marketplace?keyword=${encodeURIComponent(assetName)}&category=All&pageNumber=1&limit=20`,

                    // 5. Roblox Develop API - Search Models
                    `https://develop.roblox.com/v1/search?keyword=${encodeURIComponent(assetName)}&limit=20`,

                    // 6. Try with different keyword combinations
                    ...searchKeywords.slice(1).map(kw =>
                        `https://apis.roblox.com/toolbox-service/v1/marketplace?keyword=${encodeURIComponent(kw)}&category=FreeModels&pageNumber=1&limit=10`
                    )
                ]

                let bestAsset: { id: number, name: string, verified?: boolean } | null = null
                let bestScore = 0

                for (const searchUrl of searchEndpoints) {
                    if (found) break

                    try {
                        const response = await fetch(searchUrl, {
                            headers: {
                                "Accept": "application/json",
                                "User-Agent": "Roblox/WinInet"
                            },
                            signal: AbortSignal.timeout(5000) // 5 second timeout per endpoint
                        })

                        if (response.ok) {
                            const data = await response.json()
                            const items = data.data || data.results || data.items || data.Results || []

                            // Score each result for best match
                            for (const asset of items) {
                                const assetId = asset.id || asset.assetId || asset.asset?.id || asset.AssetId
                                const assetNameFound = asset.name || asset.assetName || asset.asset?.name || asset.Name || assetName
                                const isVerified = asset.creatorHasVerifiedBadge || asset.verified || asset.isVerified || false
                                const isFree = asset.price === 0 || asset.price === undefined || asset.isFree !== false

                                if (!assetId || !isFree) continue

                                // Calculate relevance score
                                let score = 0
                                const nameLower = assetNameFound.toLowerCase()
                                const searchLower = assetName.toLowerCase()

                                // Exact match = highest score
                                if (nameLower === searchLower) score += 100
                                // Contains full search term
                                else if (nameLower.includes(searchLower)) score += 50
                                // Contains all words
                                else if (searchLower.split(' ').every(w => nameLower.includes(w))) score += 30
                                // Contains some words
                                else score += searchLower.split(' ').filter(w => nameLower.includes(w)).length * 10

                                // Bonus for verified creators
                                if (isVerified) score += 25

                                // Bonus for being first in results (already sorted by relevance)
                                score += Math.max(0, 10 - items.indexOf(asset))

                                if (score > bestScore) {
                                    bestScore = score
                                    bestAsset = { id: assetId, name: assetNameFound, verified: isVerified }
                                }

                                // If we have a very good match, use it immediately
                                if (score >= 100) {
                                    found = true
                                    break
                                }
                            }
                        }
                    } catch (endpointErr: any) {
                        // Silent fail for individual endpoints
                        console.log(`[AI Chat] Endpoint ${searchUrl.slice(0, 50)} failed:`, endpointErr.message)
                    }
                }

                // Use best found asset
                if (bestAsset) {
                    const command = createInsertModelCommand(bestAsset.id, bestAsset.name)
                    await addCommand(userData.id, command)
                    insertedItems.push(`Model: ${bestAsset.name}${bestAsset.verified ? ' ✓' : ''}`)
                    console.log(`[AI Chat] ✅ Queued toolbox asset: ${bestAsset.name} (ID: ${bestAsset.id}, Score: ${bestScore}, Verified: ${bestAsset.verified})`)
                    found = true
                }

                if (!found) {
                    console.log(`[AI Chat] ⚠️ No toolbox assets found for: "${assetName}" - AI should use INSERT_PART instead`)
                }
            } catch (err) {
                console.error(`[AI Chat] ❌ Asset search failed for "${assetName}":`, err)
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

        // 6. Parse INSERT_PART commands (for 3D parts/objects)
        const partPattern = /\[INSERT_PART:\s*([^\]]+)\][\s\S]*?```lua([\s\S]*?)```[\s\S]*?\[\/INSERT_PART\]/gi
        for (const match of aiResponse.matchAll(partPattern)) {
            const [, partName, code] = match
            const command = {
                type: "INSERT_PART",
                data: {
                    name: partName.trim(),
                    location: "Workspace",
                    scriptType: "Script"  // Runs once to create the part
                },
                code: code.trim()
            }
            await addCommand(userData.id, command)
            insertedItems.push(`Part: ${partName.trim()}`)
            console.log(`[AI Chat] Queued part: ${partName.trim()}`)
        }

        // 7. Parse INSERT_MODEL commands (for complex multi-part models)
        const modelPattern = /\[INSERT_MODEL:\s*([^\]]+)\][\s\S]*?```lua([\s\S]*?)```[\s\S]*?\[\/INSERT_MODEL\]/gi
        for (const match of aiResponse.matchAll(modelPattern)) {
            const [, modelName, code] = match
            const command = {
                type: "INSERT_MODEL",
                data: {
                    name: modelName.trim(),
                    location: "Workspace",
                    scriptType: "Script"  // Runs once to create the model
                },
                code: code.trim()
            }
            await addCommand(userData.id, command)
            insertedItems.push(`Model: ${modelName.trim()}`)
            console.log(`[AI Chat] Queued model build: ${modelName.trim()}`)
        }

        // 8. Parse INSERT_MUSIC commands (AI-generated music)
        const musicPattern = /\[INSERT_MUSIC:\s*([^:]+):\s*([^\]]+)\]/gi
        for (const match of aiResponse.matchAll(musicPattern)) {
            const [, style, description] = match
            try {
                // Call our music generation API
                const musicResponse = await fetch(`${process.env.NEXT_PUBLIC_SITE_URL || 'https://www.blaxsmith.dev'}/api/generate/music`, {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        prompt: description.trim(),
                        style: style.trim()
                    })
                })

                if (musicResponse.ok) {
                    const musicData = await musicResponse.json()
                    if (musicData.music?.audio_url) {
                        // Queue the music to Roblox
                        const command = {
                            type: "INSERT_MUSIC",
                            data: {
                                name: description.trim().slice(0, 30),
                                audio_url: musicData.music.audio_url,
                                style: style.trim(),
                                duration: musicData.music.duration
                            }
                        }
                        await addCommand(userData.id, command)
                        insertedItems.push(`Music: ${description.trim().slice(0, 30)}`)
                        console.log(`[AI Chat] Generated and queued music: ${description.trim()}`)
                    }
                }
            } catch (musicErr) {
                console.error(`[AI Chat] Music generation failed:`, musicErr)
            }
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

        // SANITIZE RESPONSE: Remove ALL code blocks before returning to user
        // Users should NEVER see raw code - only premium summaries
        let sanitizedResponse = aiResponse

        // Remove lua:hidden blocks (these are parsed already)
        sanitizedResponse = sanitizedResponse.replace(/```lua:hidden[\s\S]*?```/gi, '')

        // Remove any remaining lua code blocks
        sanitizedResponse = sanitizedResponse.replace(/```lua[\s\S]*?```/gi, '')

        // Remove any other code blocks
        sanitizedResponse = sanitizedResponse.replace(/```[\s\S]*?```/gi, '')

        // Remove INSERT command tags that might be visible
        sanitizedResponse = sanitizedResponse.replace(/\[INSERT_[A-Z_]+:.*?\][\s\S]*?\[\/INSERT_[A-Z_]+\]/gi, '')
        sanitizedResponse = sanitizedResponse.replace(/\[INSERT_[A-Z_]+:.*?\]/gi, '')
        sanitizedResponse = sanitizedResponse.replace(/\[\/INSERT_[A-Z_]+\]/gi, '')

        // Clean up extra whitespace
        sanitizedResponse = sanitizedResponse.replace(/\n{4,}/g, '\n\n\n')
        sanitizedResponse = sanitizedResponse.trim()

        // If response is empty after sanitization, provide a default message
        if (!sanitizedResponse || sanitizedResponse.length < 20) {
            sanitizedResponse = `🎉 **Build Complete!**\n\n${insertedItems.length > 0 ? insertedItems.map(item => `✅ ${item}`).join('\n') : 'Your request has been processed.'}\n\n**💡 What's next?** Try asking me to add more features!`
        }

        return NextResponse.json({
            success: true,
            conversationId: activeConversationId,
            response: sanitizedResponse,
            itemsQueued: insertedItems.length > 0 ? insertedItems : undefined,
            model: selectedModelName,
            creditsRemaining: newCredits,
        })
    } catch (error) {
        console.error("[AI Chat] Error:", error)
        return NextResponse.json({ error: "Failed to process message" }, { status: 500 })
    }
}
