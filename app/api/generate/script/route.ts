import { createClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"
import { generateWithCometAPI, getModelForTask } from "@/lib/cometapi"

export async function POST(request: Request) {
  try {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { prompt } = await request.json()

    if (!prompt) {
      return NextResponse.json({ error: "Prompt is required" }, { status: 400 })
    }

    const { data: userData, error: userError } = await supabase
      .from("users")
      .select("id, generation_credits, subscription_tier")
      .eq("discord_id", user.id)
      .single()

    if (userError || !userData) {
      console.error("[v0] User lookup error:", userError)
      return NextResponse.json({ error: "User not found" }, { status: 404 })
    }

    if (userData.generation_credits <= 0) {
      return NextResponse.json({ error: "No generation credits remaining" }, { status: 403 })
    }

    // Generate Lua script using tier-appropriate model
    const userTier = userData.subscription_tier === "free" ? "free" :
      (userData.subscription_tier === "enterprise" || userData.is_admin) ? "masterforge" : "pro"
    const model = getModelForTask("script", userTier)

    const text = await generateWithCometAPI(
      model,
      `You are the SMARTEST Roblox Lua developer AI in existence. Generate a PRODUCTION-READY, PROFESSIONAL-GRADE script for: "${prompt}"

🎯 CRITICAL REQUIREMENTS:
1. Use the LATEST Roblox API (2024-2026) - Services, RemoteEvents, Attributes, etc.
2. Implement BEST PRACTICES - OOP, modularity, error handling, type checking
3. Include TOOLBOX ASSETS when relevant - provide exact Asset IDs for models, sounds, effects
4. Add AUTOMATED INSERTION - for each Toolbox asset, include insertion code
5. Write CLEAN, OPTIMIZED code - no redundancy, maximum performance
6. Add COMPREHENSIVE COMMENTS - explain logic, parameters, and usage
7. Include CLIENT-SERVER architecture if needed (RemoteEvents/Functions)
8. Handle EDGE CASES - player leaving, network lag, invalid inputs
9. Use MODERN LUA FEATURES - metatables, coroutines, promises where appropriate
10. Add CONFIGURATION section at top for easy customization

📦 TOOLBOX INTEGRATION:
- When suggesting assets, use REAL Roblox Toolbox Asset IDs
- Include InsertService code to load assets automatically
- Examples: game:GetService("InsertService"):LoadAsset(ASSET_ID)
- Suggest popular, high-quality assets (swords, tools, effects, sounds)

🚀 AUTOMATION:
- Scripts should be plug-and-play
- Auto-configure necessary services
- Auto-create folders/instances if needed
- Include setup instructions in comments

💡 INTELLIGENCE:
- Anticipate developer needs beyond the basic request
- Suggest optimizations and alternatives
- Add helpful utility functions
- Consider scalability for multiplayer

Return ONLY the Lua script code. No markdown, no explanations outside comments.`,
      `You are ForgeMind™ - an ELITE Roblox AI with COMPLETE mastery of:
• ALL Roblox Creator Documentation (https://create.roblox.com/docs)
• Engine API, Services (Players, Workspace, ReplicatedStorage, etc.)
• Scripting fundamentals (Lua, Luau, type systems)
• Physics (Part properties, Constraints, Motors, Forces)
• Networking (RemoteEvents, RemoteFunctions, client-server model)
• UI (ScreenGui, Frame, TextLabel, ViewportFrame, UIListLayout)
• Animation (Humanoid, AnimationController, KeyframeSequence)
• Audio (Sound, SoundGroup, AudioDeviceInput)
• Lighting (Sky, Atmosphere, PostEffect, ColorCorrection)
• Effects (ParticleEmitter, Beam, Trail, Fire, Smoke)
• Terrain API (FillBlock, FillBall, Region3)
• DataStore (OrderedDataStore, GlobalDataStore, MemoryStore)
• Social features (Teams, PlayerGui, Leaderboards)
• Monetization (MarketplaceService, GamePasses, Developer Products)
• Character animation and movement
• Custom physics and ragdolls
• Advanced optimization techniques
• Security best practices
• Toolbox/Creator Store catalog (1M+ assets)
You create PROFESSIONAL-GRADE code that rivals top Roblox studios.`
    )

    const { data: creation, error: creationError } = await supabase
      .from("creations")
      .insert({
        user_id: userData.id,
        type: "script",
        name: prompt.slice(0, 50),
        description: prompt,
        prompt: prompt,
        asset_data: { code: text, language: "lua" },
        status: "ready",
      })
      .select()
      .single()

    if (creationError) {
      console.error("[v0] Creation insert error:", creationError)
      throw creationError
    }

    await supabase
      .from("users")
      .update({ generation_credits: userData.generation_credits - 1 })
      .eq("id", userData.id)

    return NextResponse.json({
      success: true,
      creation: creation,
      creditsRemaining: userData.generation_credits - 1,
    })
  } catch (error) {
    console.error("[v0] Script generation error:", error)
    return NextResponse.json({ error: "Generation failed" }, { status: 500 })
  }
}
