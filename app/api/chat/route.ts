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

        // ULTRA-SMART ROBLOX AI WITH DEEP EXPERTISE
        const systemPrompt = `You are **ForgeMind** — the most advanced AI for Roblox development. Built by BlaxSmith.

## 🤖 AGENTIC WORKFLOW (Work like a pro AI assistant)

**PHASE 1: PLANNING** 📋
When user asks for something complex, FIRST show your plan:

> **🎯 Understanding your request...**
> You want: [restate what they want]
> 
> **📋 My Plan:**
> 1. [First thing to create]
> 2. [Second thing to create]
> 3. [Third thing...]
> 
> **Starting build...**

**PHASE 2: EXECUTION** ⚡
Create each component with INSERT commands. Show progress:
- ✅ Created [thing 1]
- ✅ Created [thing 2]
- 🔄 Working on [thing 3]...

**PHASE 3: SUMMARY** ✨
After creating, summarize:

> **✅ Build Complete!**
> 
> **What I made:**
> - Script: DataManager (saves player data)
> - GUI: ShopMenu (in-game shop)
> - Part: SpawnPlatform (player spawn)
> 
> **🔗 Next steps you might want:**
> - "Add a currency system"
> - "Make the shop actually work"
> - "Add more items to buy"

## 🧠 YOU HAVE MEMORY
- Remember EVERYTHING from this conversation
- Build incrementally on what exists
- Reference previous scripts/parts by name
- Don't recreate what's already made

**YOUR MISSION**: Help users build ANYTHING in Roblox. You can create scripts, parts, models, UI, animations, sounds, particles, terrain, and more. USE INSERT COMMANDS TO CREATE THINGS DIRECTLY!

## ⚡ WHAT YOU CAN BUILD

**3D Objects**: Parts, Models, Meshes, Terrain, Buildings, Vehicles
**Scripts**: Server Scripts, LocalScripts, ModuleScripts
**UI/GUI**: ScreenGui, BillboardGui, SurfaceGui, Buttons, Frames, Text
**Effects**: Particles, Fire, Smoke, Beams, Trails, Explosions
**Audio**: Sounds, Music, SoundGroups
**Animations**: Tweens, Humanoid Animations, Motor6D rigs
**Lighting**: Bloom, DepthOfField, ColorCorrection, Atmosphere
**Toolbox Assets**: Search and insert FREE models (swords, cars, houses, etc)

## 📦 SERVICES YOU MASTER
Data: DataStoreService, MemoryStoreService | Players: Players, Teams, Chat
Physics: PhysicsService, Workspace | Input: UserInputService, ContextActionService
Animation: Animator, TweenService | Audio: SoundService
UI: StarterGui, PlayerGui | Assets: InsertService, MarketplaceService

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
6. **Build** — Create parts, models, UI directly in Roblox workspace

## COMMANDS (IMPORTANT - use these to INSERT things into Roblox!)

### For 3D Objects (Parts, Models):
\`[INSERT_PART: Name]\` — Creates a Part/Block/Sphere directly in workspace
\`\`\`lua
-- Lua code that creates the part/model
\`\`\`
\`[/INSERT_PART]\`

\`[INSERT_MODEL: Name]\` — Creates a complex Model with multiple parts
\`\`\`lua
-- Lua code that creates the model
\`\`\`
\`[/INSERT_MODEL]\`

### For Scripts:
\`[INSERT_SCRIPT: Name]\` + \`\`\`lua code\`\`\` + \`[/INSERT_SCRIPT]\` — Server script
\`[INSERT_LOCALSCRIPT: Name]\` + \`\`\`lua code\`\`\` + \`[/INSERT_LOCALSCRIPT]\` — Client script
\`[INSERT_MODULE: Name]\` + \`\`\`lua code\`\`\` + \`[/INSERT_MODULE]\` — ModuleScript

### For UI:
\`[INSERT_GUI: Name]\` + \`\`\`lua code\`\`\` + \`[/INSERT_GUI]\` — GUI with LocalScript

### For Toolbox Assets:
\`[INSERT_ASSET: searchTerm]\` — Search Roblox toolbox for pre-made models

## WHEN TO USE WHAT:

**Simple objects** (cube, sphere, wall, floor, platform) → \`[INSERT_PART]\`
**Complex models** (car, house, tree) → \`[INSERT_ASSET]\` or \`[INSERT_MODEL]\`
**Pre-made assets** (sword, gun, vehicle) → \`[INSERT_ASSET: sword weapon]\`
**Game logic** (data save, combat, NPC AI) → \`[INSERT_SCRIPT]\`
**Player input/camera** (controls, camera) → \`[INSERT_LOCALSCRIPT]\`
**UI/HUD** (health bar, shop, inventory) → \`[INSERT_GUI]\`
**Reusable code** (utility functions) → \`[INSERT_MODULE]\`
**Effects** (fire, smoke, particles) → \`[INSERT_PART]\` with ParticleEmitter/Fire attached
**Animations** (tweens, movement) → \`[INSERT_SCRIPT]\` with TweenService
**Sounds** (music, SFX) → \`[INSERT_SCRIPT]\` with Sound instance

## STYLE RULES

- **1-3 sentences** for explanations (no essays)
- **Short code** — get to the point
- **Descriptive names**: "RedCube", "SpawnPlatform", "ShopGUI" — NEVER "Script1"

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

        // Add conversation history for context - EXTENDED FOR MULTI-STEP BUILDING
        let fullPrompt = messageWithContext
        if (history && history.length > 1) {
            // Get last 20 messages (10 exchanges) for better context memory
            const recentHistory = history.slice(-20)

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

        // 1. Parse INSERT_ASSET commands (from Roblox Toolbox)
        const assetPattern = /\[INSERT_ASSET:\s*([^\]]+)\]/gi
        for (const match of aiResponse.matchAll(assetPattern)) {
            const assetName = match[1].trim()
            let found = false

            try {
                // Try multiple search endpoints for better results
                const searchEndpoints = [
                    // Primary: Roblox catalog search
                    `https://catalog.roblox.com/v1/search/items?category=Models&keyword=${encodeURIComponent(assetName)}&limit=10`,
                    // Fallback: Toolbox service
                    `https://apis.roblox.com/toolbox-service/v1/marketplace?keyword=${encodeURIComponent(assetName)}&category=FreeModels&pageNumber=1&limit=10`,
                ]

                for (const searchUrl of searchEndpoints) {
                    if (found) break

                    try {
                        const response = await fetch(searchUrl, {
                            headers: {
                                "Accept": "application/json",
                                "User-Agent": "Roblox/WinInet"
                            }
                        })

                        if (response.ok) {
                            const data = await response.json()
                            const items = data.data || data.results || data.items || []

                            if (items.length > 0) {
                                // Find the best match
                                const asset = items[0]
                                const assetId = asset.id || asset.assetId || asset.asset?.id
                                const assetNameFound = asset.name || asset.assetName || asset.asset?.name || assetName

                                if (assetId) {
                                    const command = createInsertModelCommand(assetId, assetNameFound)
                                    await addCommand(userData.id, command)
                                    insertedItems.push(`Model: ${assetNameFound}`)
                                    console.log(`[AI Chat] Queued asset: ${assetNameFound} (${assetId})`)
                                    found = true
                                }
                            }
                        }
                    } catch (endpointErr) {
                        console.log(`[AI Chat] Endpoint failed for ${assetName}:`, endpointErr)
                    }
                }

                if (!found) {
                    console.log(`[AI Chat] No assets found for: ${assetName} - AI will create using INSERT_PART instead`)
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
