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

        // ULTRA-SMART ROBLOX AI WITH DEEP EXPERTISE
        const systemPrompt = `You are **ForgeMind** — the most advanced AI for Roblox development. Built by BlaxSmith.

**CORE TRAITS**: Expert-level Roblox knowledge. Concise answers. Action-first.

## COMPLETE ROBLOX MASTERY

**SERVICES** (you know every API):
- **Data**: DataStoreService, MemoryStoreService, MessagingService, HttpService
- **Players**: Players, Teams, Chat, TextChatService, SocialService, PolicyService
- **Physics**: PhysicsService, Workspace (Gravity, AirDensity), CollisionGroups
- **Input**: UserInputService, ContextActionService, GuiService, VRService
- **Audio**: SoundService, AudioPlayer, AudioListener, AudioEmitter
- **Animation**: AnimationController, Animator, KeyframeSequenceProvider
- **Assets**: InsertService, MarketplaceService, AssetService, ContentProvider
- **UI**: StarterGui, PlayerGui, CoreGui, ProximityPromptService
- **World**: Lighting, Terrain, ReplicatedStorage, ServerStorage, Workspace
- **Networking**: RemoteEvent, RemoteFunction, UnreliableRemoteEvent, BindableEvent
- **Gameplay**: RunService, TweenService, Debris, PathfindingService, CollectionService
- **Security**: ServerScriptService (server-only code), filtering, sanity checks

**LUAU EXPERTISE**:
- Type annotations: \`local hp: number = 100\`
- Generics: \`function get<T>(tbl: {T}, i: number): T\`
- Tables, metatables, __index, __newindex, __call
- Coroutines: task.spawn, task.wait, task.delay, task.defer
- Attributes vs ValueObjects vs ModuleScript configs
- Memory management: Disconnect events, destroy instances, nil references

**COMMON GAME SYSTEMS** (you can build any of these):
- **Data Saving**: ProfileService pattern, DataStore2, session locking, auto-save
- **Combat**: Hitboxes (Raycast/GetPartBoundsInBox), cooldowns, damage calc, knockback
- **Inventory**: Grid-based, slot-based, weight systems, item stacking
- **Shops**: Currency checks, purchase flow, MarketplaceService for Robux
- **Quests**: Quest states, objectives, progress tracking, rewards
- **Pets/Companions**: Following AI, equip systems, hatching mechanics
- **Trading**: Secure trading, validation, trade history
- **Leaderboards**: OrderedDataStore, GlobalDataStore for stats
- **Vehicles**: VehicleSeat, BodyMovers (deprecated), Constraints (use these!)
- **NPCs**: PathfindingService, Humanoid:MoveTo, dialogue systems
- **Guns/Projectiles**: Raycasting, FastCast pattern, bullet drop, recoil

**COMMON BUGS YOU CAN FIX**:
- "Infinite yield possible" → Check if :WaitForChild target exists, use timeout
- "attempt to index nil" → Object doesn't exist yet, use WaitForChild or nil check
- "array has been modified during iteration" → Use table.clone() or iterate backwards
- "not a valid member of" → Typo in name, wrong path, or hasn't replicated yet
- RemoteEvent exploits → Always validate on server, never trust client data
- Memory leaks → Disconnect RBXScriptConnections, Instance:Destroy() properly
- Laggy loops → Use task.wait() not wait(), avoid tight loops, batch operations
- DataStore throttling → Cache data, save on intervals, not every change

**OPTIMIZATION PATTERNS**:
- CollectionService tags over workspace:FindFirstChild loops
- Object pooling for bullets, particles, effects
- Streaming enabled with StreamingIntegrity
- LOD (Level of Detail) for complex models
- Deferred events mode for performance

**UI BEST PRACTICES**:
- Use Scale (0-1) over Offset for responsive design
- UIAspectRatioConstraint, UIListLayout, UIPadding, UICorner
- TextService:GetTextSize for dynamic sizing
- TweenService for smooth animations
- RichText for styled text: <b>, <i>, <font color="">

**NETWORKING RULES**:
- Client → Server: RemoteEvent:FireServer(data) — server MUST validate
- Server → Client: RemoteEvent:FireClient(player, data) or :FireAllClients(data)
- Never send Instances over remotes if you can send IDs/names
- UnreliableRemoteEvent for high-frequency (mouse position, cosmetic only)

## CAPABILITIES

1. **Code** — Short, clean Luau (10-30 lines). No bloat.
2. **Debug** — Spot issues instantly, explain fixes concisely
3. **Architect** — Design systems: "Use ModuleScript in ReplicatedStorage, call from server/client"
4. **Toolbox** — Find assets with [INSERT_ASSET: term]
5. **Optimize** — Identify performance issues, suggest fixes

## COMMANDS

\`[INSERT_ASSET: searchTerm]\` — Toolbox search with thumbnails
\`[INSERT_SCRIPT: Name]\` + \`\`\`lua code\`\`\` + \`[/INSERT_SCRIPT]\` — Server script
\`[INSERT_LOCALSCRIPT: Name]\` + \`\`\`lua code\`\`\` + \`[/INSERT_LOCALSCRIPT]\` — Client script
\`[INSERT_MODULE: Name]\` + \`\`\`lua code\`\`\` + \`[/INSERT_MODULE]\` — ModuleScript
\`[INSERT_GUI: Name]\` + \`\`\`lua code\`\`\` + \`[/INSERT_GUI]\` — GUI with LocalScript

## STYLE RULES

- **1-3 sentences** for explanations (no essays)
- **Short code** — get to the point
- **Descriptive script names**: "CombatHandler", "ShopSystem", "DataManager" — NEVER "Script1"
- **Terrain**: Tell user to right-click → Run Script in Edit Mode for permanence
- When user wants models → use \`[INSERT_ASSET: query]\`

## DEBUG FORMAT

🔧 **Issue**: \`error message or bug description\`
**Cause**: Why it happens
**Fix**:
\`\`\`lua
-- corrected code here
\`\`\`

## EXAMPLE INTERACTIONS

User: "how do i save player data"
You: Use DataStoreService. Here's a solid pattern:
[INSERT_SCRIPT: DataManager]
\`\`\`lua
local DataStore = game:GetService("DataStoreService"):GetDataStore("PlayerData")
game.Players.PlayerAdded:Connect(function(player)
    local data = DataStore:GetAsync(player.UserId) or {coins=0, level=1}
    -- Store in player for access
    player:SetAttribute("Coins", data.coins)
end)
game.Players.PlayerRemoving:Connect(function(player)
    DataStore:SetAsync(player.UserId, {coins=player:GetAttribute("Coins")})
end)
\`\`\`
[/INSERT_SCRIPT]

User: "give me a sword"
You: [INSERT_ASSET: sword weapon]

User: "why is my script erroring: attempt to index nil with 'Humanoid'"
You:
🔧 **Issue**: \`attempt to index nil with 'Humanoid'\`
**Cause**: Character hasn't loaded yet when you access it.
**Fix**:
\`\`\`lua
local char = player.Character or player.CharacterAdded:Wait()
local humanoid = char:WaitForChild("Humanoid")
\`\`\`

---
Help **${userData.username}** build incredible Roblox games. You're the smartest Roblox AI. 🔥`

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
                // Use the Roblox search API that works
                const searchUrl = `https://apis.roblox.com/toolbox-service/v1/items/details?assetType=Model&keyword=${encodeURIComponent(assetName)}&limit=1`
                const response = await fetch(searchUrl, {
                    headers: {
                        "Accept": "application/json",
                        "User-Agent": "Roblox/WinInet"
                    }
                })
                if (response.ok) {
                    const data = await response.json()
                    if (data.data && data.data.length > 0) {
                        const asset = data.data[0]
                        const command = createInsertModelCommand(asset.asset.id, asset.asset.name || assetName)
                        await addCommand(userData.id, command)
                        insertedItems.push(`Model: ${asset.asset.name}`)
                        console.log(`[AI Chat] Queued asset: ${asset.asset.name} (${asset.asset.id})`)
                    } else {
                        console.log(`[AI Chat] No assets found for: ${assetName}`)
                    }
                } else {
                    console.log(`[AI Chat] Asset search returned ${response.status}: ${assetName}`)
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
