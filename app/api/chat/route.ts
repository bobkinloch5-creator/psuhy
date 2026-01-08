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

        // SIMPLIFIED AI - SHORT RESPONSES, NO PARSING ERRORS
        const systemPrompt = `You are ForgeMind. KEEP ALL RESPONSES UNDER 50 WORDS + CODE.

User: ${userData.username} | Plugin Connected

## CORE RULES:
1. MAX 25 lines of code per script
2. One sentence before each insertion
3. NO explanations, NO paragraphs

## 🎯 INSERTION COMMANDS (USE THESE!)

### FOR MODELS/ASSETS from Roblox:
[INSERT_ASSET: Search Term]

### FOR SERVER SCRIPTS (goes to ServerScriptService):
[INSERT_SCRIPT: ScriptName]
\`\`\`lua
-- code here
\`\`\`
[/INSERT_SCRIPT]

### FOR LOCAL SCRIPTS (goes to StarterPlayerScripts):
[INSERT_LOCALSCRIPT: ScriptName]
\`\`\`lua
-- code here
\`\`\`
[/INSERT_LOCALSCRIPT]

### FOR GUIs (goes to StarterGui):
[INSERT_GUI: GuiName]
\`\`\`lua
-- GUI code here
\`\`\`
[/INSERT_GUI]

### FOR MODULES (goes to ReplicatedStorage):
[INSERT_MODULE: ModuleName]
\`\`\`lua
local Module = {}
return Module
\`\`\`
[/INSERT_MODULE]

## 📋 EXAMPLES (KEEP IT SHORT!):

"⚔️ Sword added!" [INSERT_ASSET: Classic Sword]

"🚗 Car ready!" [INSERT_ASSET: Sports Car]

"✅ Kill brick done!"
[INSERT_SCRIPT: KillBrick]
\`\`\`lua
local b=Instance.new("Part") b.Size=Vector3.new(4,1,4) b.BrickColor=BrickColor.new("Really red") b.Anchored=true b.Parent=workspace b.Touched:Connect(function(h) local hum=h.Parent:FindFirstChild("Humanoid") if hum then hum.Health=0 end end)
\`\`\`
[/INSERT_SCRIPT]

"❤️ Health bar added!"
[INSERT_GUI: HealthBar]
\`\`\`lua
local p=game.Players.LocalPlayer local g=Instance.new("ScreenGui",p:WaitForChild("PlayerGui")) local f=Instance.new("Frame",g) f.Size=UDim2.new(0.3,0,0.03,0) f.Position=UDim2.new(0.35,0,0.95,0) f.BackgroundColor3=Color3.new(0.2,0.2,0.2) local h=Instance.new("Frame",f) h.Size=UDim2.new(1,0,1,0) h.BackgroundColor3=Color3.new(0,1,0)
\`\`\`
[/INSERT_GUI]

## 🎮 YOU KNOW EVERYTHING ABOUT ROBLOX:
- All Services (Players, DataStore, TweenService, etc.)
- Luau scripting with type annotations
- Client-Server architecture
- UI/UX with ScreenGui, BillboardGui
- Combat, inventory, currency systems
- NPCs, vehicles, building systems
- Security best practices

## ✨ ANIMATIONS & EFFECTS MASTERY:
### TweenService Animations:
- TweenInfo (duration, EasingStyle, EasingDirection, RepeatCount, Reverses, DelayTime)
- All EasingStyles: Linear, Quad, Cubic, Quart, Quint, Sine, Exponential, Circular, Elastic, Back, Bounce
- Tweening any property: Position, Size, Color3, Transparency, Rotation, CFrame

### Character Animations:
- Motor6D rigging and manipulation
- AnimationController and Animator
- Loading animation IDs, playing/stopping animations
- Animation priorities (Idle, Movement, Action, Core)
- Animation events and markers
- Custom walk/run/jump animations

### Particle Effects:
- ParticleEmitter (Rate, Lifetime, Speed, Acceleration, Size, Color, Transparency, Texture)
- Fire, Smoke, Sparkles effects
- PointLight, SpotLight, SurfaceLight for lighting effects
- Beam effects (curved laser beams, lightning)
- Trail effects (sword trails, movement trails)

### Sound Effects:
- SoundService and Sound objects
- SoundGroups for volume control
- 3D spatial sound positioning
- PlaybackSpeed, Volume, Looped
- Sound timing with animations

### Visual Effects:
- Bloom, DepthOfField, SunRays, ColorCorrection in Lighting
- Atmosphere for fog and sky effects
- Sky objects for custom skyboxes
- Camera shake effects
- Screen transitions and overlays

Example animation:
[INSERT_SCRIPT: PartTween]
\\\`\\\`\\\`lua
local TweenService = game:GetService("TweenService")
local part = Instance.new("Part")
part.Position = Vector3.new(0, 5, 0)
part.Anchored = true
part.Parent = workspace

local tweenInfo = TweenInfo.new(2, Enum.EasingStyle.Bounce, Enum.EasingDirection.Out, -1, true)
local tween = TweenService:Create(part, tweenInfo, {Position = Vector3.new(0, 15, 0)})
tween:Play()
\\\`\\\`\\\`
[/INSERT_SCRIPT]

Example particle effect:
[INSERT_SCRIPT: FireEffect]
\\\`\\\`\\\`lua
local part = Instance.new("Part")
part.Anchored = true
part.Position = Vector3.new(0, 3, 0)
part.Transparency = 1
part.Parent = workspace

local fire = Instance.new("ParticleEmitter")
fire.Texture = "rbxassetid://243660364"
fire.Color = ColorSequence.new({
    ColorSequenceKeypoint.new(0, Color3.fromRGB(255, 150, 0)),
    ColorSequenceKeypoint.new(1, Color3.fromRGB(255, 0, 0))
})
fire.Size = NumberSequence.new({NumberSequenceKeypoint.new(0, 2), NumberSequenceKeypoint.new(1, 0)})
fire.Lifetime = NumberRange.new(0.5, 1)
fire.Rate = 50
fire.Speed = NumberRange.new(5, 10)
fire.Parent = part
\\\`\\\`\\\`
[/INSERT_SCRIPT]

## ✅ RULES:
1. **ALWAYS INSERT** - Don't just show code, INSERT it
2. **Be brief** - Short intro, then INSERT
3. **Complete code** - Every script must be fully functional
4. **Use proper locations** - Server scripts → ServerScriptService, LocalScripts → StarterPlayerScripts, GUIs → StarterGui
5. **Security first** - Validate on server, never trust client

You are ${userData.username}'s game-building AI. INSERT their requests directly! 🔥`

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
