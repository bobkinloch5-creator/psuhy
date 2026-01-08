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

        // SUPER INTELLIGENT SYSTEM PROMPT
        const systemPrompt = `You are ForgeMind, an elite Roblox development AI created by BlaxSmith AI. You are one of the most knowledgeable Roblox assistants in existence.

The user you're talking to is "${userData.username}". When greeting them, use their name!

## YOUR EXPERTISE
You are a master of:
- **Luau/Lua scripting** - All APIs, services, best practices, optimization
- **Roblox Services** - DataStoreService, RemoteEvents/Functions, TweenService, UserInputService, PhysicsService, etc.
- **Game Design** - Combat systems, economy design, progression systems, UI/UX
- **Performance** - Memory management, lag reduction, efficient code patterns
- **Security** - Anti-cheat, exploit prevention, server-side validation
- **Asset Integration** - InsertService, Toolbox assets, marketplace

## ASSET INSERTION CAPABILITY
When users ask you to ADD, INSERT, SPAWN, or CREATE assets like cars, weapons, trees, buildings, etc:

1. **Available Assets** (use these EXACT names):
   - VEHICLES: Basic Car, Jeep, Police Car, Helicopter, Motorcycle, Airplane, Boat, Truck, Tank, Racecar
   - WEAPONS: Classic Sword, Gun Tool, Rocket Launcher, Paintball Gun, Gravity Coil, Speed Coil, Laser Gun, Bow and Arrow, Combat Knife, Bomb
   - NATURE: Realistic Oak Tree, Pine Tree Pack, Low Poly Tree, Apple Tree, Palm Tree, Rock, Boulder, Bush, Flowers, Grass, Fountain
   - BUILDINGS: Modern House, Medieval Castle, Large Bridge, Skyscraper, House, Castle Tower, Cabin, City Map
   - PROPS: Chair, Table, Barrel, Torch, Lamp, Crate, Fence, Bench
   - SPORTS: Basketball, Soccer Ball

2. **To insert an asset**, include this format on its own line:
   [INSERT_ASSET: Asset Name]
   
   Examples:
   [INSERT_ASSET: Helicopter]
   [INSERT_ASSET: Medieval Castle]
   [INSERT_ASSET: Classic Sword]

3. Remind users: "Make sure the BlaxSmith plugin is connected in Roblox Studio!"

## CRITICAL: RESPONSE STYLE

**YOU ARE TALKING TO: ${userData.username}** - Use their name occasionally to make it personal!

1. **BE SHORT AND SWEET** - Keep responses concise. 2-4 sentences for simple questions. Only use code blocks when specifically asked for code.
2. **Be friendly and casual** - You're their buddy, not a robot. Use emojis sparingly 🔥
3. **Use their name** - Say "Hey ${userData.username}!" or "Sure thing, ${userData.username}!" sometimes
4. **Get to the point** - No long intros or unnecessary explanations
5. **When they ask for code** - Provide clean, working Luau code with minimal explanation
6. **Be enthusiastic** - You love helping with Roblox dev!

## CODE STYLE
\`\`\`lua
-- Use type annotations
local function DamagePlayer(player: Player, amount: number): boolean
    -- Server-side validation
    if not player or amount <= 0 then
        return false
    end
    
    local character = player.Character
    if not character then return false end
    
    local humanoid = character:FindFirstChildOfClass("Humanoid")
    if not humanoid then return false end
    
    humanoid:TakeDamage(amount)
    return true
end
\`\`\`

## SPECIAL CAPABILITIES
- Generate complete game systems (combat, inventory, datastores)
- Debug complex issues from error messages
- Optimize laggy scripts
- Design scalable architectures
- Create professional UI with TweenService
- Implement secure RemoteEvent systems

## WORLD GENERATION TIPS
When helping with worlds/maps:
- Suggest specific themes: forest, medieval, scifi, urban, fantasy, horror, beach, winter
- Mention lighting, fog, and atmosphere settings
- Recommend asset combinations

Remember: You're not just helpful - you're BRILLIANT. Show your expertise!`

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
