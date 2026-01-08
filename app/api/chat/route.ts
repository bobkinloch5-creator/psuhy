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

## 🚀 ASSET INSERTION CAPABILITY

When users ask for assets (cars, weapons, trees, etc.), YOU CAN INSERT THEM INTO THEIR GAME!

Use this format on its own line when inserting:
[INSERT_ASSET: Asset Name]

Search terms work - we'll find the best match from Roblox Toolbox!
Examples:
[INSERT_ASSET: Sports Car]
[INSERT_ASSET: Sword]
[INSERT_ASSET: Medieval Castle]
[INSERT_ASSET: Tree]
[INSERT_ASSET: NPC]

IMPORTANT: Tell users "Make sure BlaxSmith plugin is connected in Roblox Studio!"

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

        // Parse AI response for asset insertion commands
        const assetInsertPattern = /\[INSERT_ASSET:\s*([^\]]+)\]/gi
        const matches = aiResponse.matchAll(assetInsertPattern)
        const assetsToInsert: string[] = []

        for (const match of matches) {
            assetsToInsert.push(match[1].trim())
        }

        // Queue asset insertions - search REAL Roblox toolbox
        if (assetsToInsert.length > 0) {
            const { addCommand, createInsertModelCommand } = await import('@/lib/command-queue')

            for (const assetName of assetsToInsert) {
                try {
                    // Search real Roblox toolbox for free models
                    const searchUrl = `https://www.roblox.com/catalog/json?Keyword=${encodeURIComponent(assetName)}&Category=6&MaxPrice=0&ResultsPerPage=1`
                    const response = await fetch(searchUrl, {
                        headers: { "Accept": "application/json" }
                    })

                    if (response.ok) {
                        const items = await response.json()
                        if (Array.isArray(items) && items.length > 0 && items[0].AssetId) {
                            const asset = items[0]
                            const command = createInsertModelCommand(asset.AssetId, asset.Name || assetName)
                            await addCommand(userData.id, command)
                            console.log(`[AI Chat] Queued REAL Roblox asset: ${asset.Name} (${asset.AssetId}) for user ${userData.id}`)
                        } else {
                            console.log(`[AI Chat] No Roblox results for: ${assetName}`)
                        }
                    }
                } catch (searchErr) {
                    console.error(`[AI Chat] Failed to search Roblox for: ${assetName}`, searchErr)
                }
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
        await supabase
            .from("users")
            .update({ generation_credits: newCredits })
            .eq("id", userData.id)

        console.log(`[AI Chat] Deducted 1 credit from user ${userData.username}. Remaining: ${newCredits}`)

        return NextResponse.json({
            success: true,
            conversationId: activeConversationId,
            response: aiResponse,
            assetsQueued: assetsToInsert.length > 0 ? assetsToInsert : undefined,
            model: selectedModelName,
            creditsRemaining: newCredits,
        })
    } catch (error) {
        console.error("[AI Chat] Error:", error)
        return NextResponse.json({ error: "Failed to process message" }, { status: 500 })
    }
}
