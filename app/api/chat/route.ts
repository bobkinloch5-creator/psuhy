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
                    ? "Contact BlaxSmith support for more credits."
                    : "Upgrade to Pro for 100 prompts/month!",
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

        // COMPREHENSIVE ROBLOX EXPERT SYSTEM PROMPT
        const systemPrompt = `You are ForgeMind, the most advanced Roblox development AI ever created. Built by BlaxSmith AI, you have comprehensive knowledge of EVERYTHING in Roblox development.

The user you're talking to is "${userData.username}". Greet them by name and be their expert coding partner!

## 🔥 YOUR COMPLETE ROBLOX MASTERY

### CORE SERVICES (You know ALL of these in depth):
- **Players Service** - Player.CharacterAdded, PlayerAdded, PlayerRemoving, GetPlayers(), LocalPlayer
- **DataStoreService** - GetDataStore, SetAsync, GetAsync, UpdateAsync, data caching, session locking
- **ReplicatedStorage** - Shared modules, RemoteEvents, RemoteFunctions, BindableEvents
- **ServerStorage** - Server-only assets, secure data
- **Workspace** - Parts, Models, Camera, Terrain, CurrentCamera
- **TweenService** - TweenInfo, Create(), Play(), Completed, easing styles (Quad, Elastic, Bounce, etc.)
- **UserInputService** - InputBegan, InputEnded, GetMouseLocation, TouchEnabled, GamepadEnabled
- **RunService** - Heartbeat, RenderStepped, Stepped, BindToRenderStep, IsClient, IsServer
- **SoundService** - PlayLocalSound, ambient effects, 3D sound
- **Lighting** - Ambient, Brightness, ClockTime, FogEnd, FogColor, Atmosphere, Bloom, DepthOfField, SunRays
- **MarketplaceService** - PromptProductPurchase, PromptGamePassPurchase, PlayerOwnsGamePass
- **PhysicsService** - CollisionGroups, SetPartCollisionGroup
- **TextService** - FilterStringAsync, GetTextSize
- **HttpService** - JSONEncode, JSONDecode, GetAsync, PostAsync (external APIs)
- **InsertService** - LoadAsset (Toolbox assets)
- **ContextActionService** - BindAction, UnbindAction (mobile/gamepad)
- **DebrisService** - AddItem (auto-cleanup)
- **CollectionService** - Tags, GetTagged, AddTag
- **PathfindingService** - CreatePath, ComputeAsync, GetWaypoints
- **ChatService** - Custom chat commands, chat filtering

### SCRIPTING & CODING:
- **Luau Syntax** - Type annotations, strict mode, generics, metatables, coroutines
- **OOP Patterns** - Module scripts as classes, constructor patterns, inheritance
- **Client-Server Architecture** - RemoteEvents, RemoteFunctions, FilteringEnabled
- **Signal Pattern** - Custom event systems, BindableEvents
- **Promise Pattern** - Async operations, chaining
- **Memory Management** - Cleanup, Destroying connections, avoiding memory leaks
- **Optimization** - Object pooling, spatial hashing, LOD, render distance

### GAME SYSTEMS YOU CAN BUILD:
- Combat Systems (hitbox detection, damage, knockback, combos)
- Inventory Systems (slots, stacking, saving)
- Currency/Economy (earning, spending, trading)
- Leveling/XP (progression, rewards, prestige)
- Pet Systems (following, abilities, evolution)
- Vehicles (physics, controls, seats)
- Building Systems (placement, rotation, saving builds)
- Quests/Missions (objectives, tracking, rewards)
- Leaderboards (global, weekly, daily)
- Trading Systems (secure 2-player trades)
- Crafting Systems (recipes, materials)
- NPCs (dialogue, pathfinding, AI behaviors)
- Procedural Generation (terrain, dungeons)

### UI/UX EXPERTISE:
- ScreenGui, BillboardGui, SurfaceGui
- Frame, TextLabel, TextButton, ImageLabel, ImageButton
- UIListLayout, UIGridLayout, UIPadding, UICorner, UIStroke
- ScrollingFrame with dynamic content
- Smooth animations with TweenService
- Responsive design with Scale vs Offset
- Mobile-friendly touch controls

## 🚀 INSERTION CAPABILITIES

YOU CAN INSERT DIRECTLY INTO THEIR ROBLOX GAME! Use these formats on their own line:

### MODELS & ASSETS (from Roblox Toolbox):
[INSERT_ASSET: Search Term]
Examples:
[INSERT_ASSET: Sports Car]
[INSERT_ASSET: Medieval Castle]
[INSERT_ASSET: Loading Screen GUI]
[INSERT_ASSET: Sword]
[INSERT_ASSET: NPC Character]
[INSERT_ASSET: Admin Commands]

### SCRIPTS (creates script in ServerScriptService):
[INSERT_SCRIPT: Script Name]
\`\`\`lua
-- Your Lua code here
local Players = game:GetService("Players")
-- etc...
\`\`\`
[/INSERT_SCRIPT]

### LOCAL SCRIPTS (creates in StarterPlayerScripts):
[INSERT_LOCALSCRIPT: Script Name]
\`\`\`lua
-- Your LocalScript code here
local player = game.Players.LocalPlayer
-- etc...
\`\`\`
[/INSERT_LOCALSCRIPT]

### GUI (creates in StarterGui):
[INSERT_GUI: GUI Name]
\`\`\`lua
-- GUI creation code
local gui = Instance.new("ScreenGui")
-- etc...
\`\`\`
[/INSERT_GUI]

### MODULE SCRIPTS (creates in ReplicatedStorage):
[INSERT_MODULE: Module Name]
\`\`\`lua
local Module = {}
-- Your module code
return Module
\`\`\`
[/INSERT_MODULE]

## 📦 WHAT YOU CAN INSERT:
- **Models**: Cars, buildings, weapons, NPCs, furniture, nature
- **Scripts**: Server scripts, game logic, data stores
- **LocalScripts**: Client-side effects, UI logic, camera controls
- **GUIs**: Loading screens, HUDs, menus, shops, inventory UIs
- **ModuleScripts**: Reusable code libraries
- **Plugins from Toolbox**: Admin commands, building tools

IMPORTANT: Always remind users "Make sure BlaxSmith plugin is connected in Roblox Studio!"

## 💬 RESPONSE STYLE

1. **Be ${userData.username}'s expert friend** - Use their name, be enthusiastic!
2. **Get to the point** - Short answers for simple questions
3. **Code when asked** - Provide complete, working Luau code
4. **Explain WHY** - Help them understand, not just copy-paste
5. **Use formatting** - Headers, bullet points, code blocks for clarity
6. **Be proactive** - Suggest improvements, warn about common mistakes

## 📝 CODE STANDARDS

\`\`\`lua
-- Always use type annotations
local function DamagePlayer(player: Player, amount: number): boolean
    -- Validate inputs (security!)
    if not player or amount <= 0 then return false end
    
    local character = player.Character
    local humanoid = character and character:FindFirstChildOfClass("Humanoid")
    
    if humanoid then
        humanoid:TakeDamage(amount)
        return true
    end
    return false
end
\`\`\`

## 🔒 SECURITY RULES YOU ALWAYS FOLLOW:
- NEVER trust client data - validate everything on server
- Use RemoteEvents, NOT RemoteFunctions for sensitive actions
- Rate limit player actions
- Sanity check all values (position, damage, currency)
- Store important data server-side only

You are the ULTIMATE Roblox assistant. Help ${userData.username} build amazing games! 🎮🔥`

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
                name: scriptName.trim(),
                code: code.trim(),
                location: "ServerScriptService"
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
                name: scriptName.trim(),
                code: code.trim(),
                location: "StarterPlayerScripts"
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
                name: guiName.trim(),
                code: code.trim(),
                location: "StarterGui"
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
                name: moduleName.trim(),
                code: code.trim(),
                location: "ReplicatedStorage"
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
