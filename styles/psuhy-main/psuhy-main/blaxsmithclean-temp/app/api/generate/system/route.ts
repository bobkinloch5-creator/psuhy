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

    // Generate game system using tier-appropriate model
    const userTier = userData.subscription_tier === "free" ? "free" :
      (userData.subscription_tier === "enterprise" || userData.is_admin) ? "masterforge" : "pro"
    const model = getModelForTask("system", userTier)

    const text = await generateWithCometAPI(
      model,
      `You are the SMARTEST Roblox game systems architect with EXPERT knowledge of the Creator Store. Design a COMPLETE, PRODUCTION-READY system for: "${prompt}"

🏗️ SYSTEM ARCHITECTURE:
1. Create MODULAR, SCALABLE systems that work in any game
2. Use MODERN patterns - OOP, MVC, ECS, or state machines
3. Include CLIENT-SERVER sync with RemoteEvents/Functions
4. Integrate CREATOR STORE ASSETS - tools, models, effects from https://create.roblox.com/store
5. Provide EXACT Asset IDs for automatic integration
6. Design for MULTIPLAYER - handle replication, ownership, authority
7. Optimize for PERFORMANCE - object pooling, efficient loops, lazy loading
8. Add CONFIGURATION - easy customization without code changes

📦 CREATOR STORE INTEGRATION:
- Recommend specific Creator Store assets by Asset ID
- Include tools, models, sounds, effects that enhance the system
- Provide insertion code using InsertService
- Suggest asset categories: Combat, UI, Effects, Tools, Economy, Social
- Mix free and popular paid assets when relevant

🔧 COMPONENTS:
- Break system into logical modules (Manager, Handler, Controller, etc.)
- Each component should have clear responsibility
- Use composition over inheritance
- Include data models and state management
- Add event handlers and lifecycle methods

💡 INTELLIGENCE:
- Anticipate edge cases (player leaving mid-action, server lag, etc.)
- Add fallbacks and error recovery
- Include admin commands for testing
- Provide scaling strategies for large player counts
- Suggest monetization opportunities if relevant

🚀 AUTOMATION:
- System should auto-initialize on game start
- Auto-create necessary folders and configuration
- Auto-load Creator Store assets via Asset IDs
- Include setup instructions and dependencies

📊 COMPREHENSIVE OUTPUT:
Return JSON:
{
  "name": "System name",
  "description": "Detailed system description and purpose",
  "architecture": "pattern used (OOP/MVC/ECS/etc)",
  "components": [
    {
      "name": "Component name",
      "type": "Script/ModuleScript/LocalScript",
      "location": "ServerScriptService/ReplicatedStorage/etc",
      "purpose": "What this component does",
      "script": "-- Full Lua code with comments",
      "dependencies": ["other components needed"]
    }
  ],
  "creatorStoreAssets": [
    {
      "assetId": 12345,
      "name": "Asset name",
      "type": "tool/model/sound",
      "purpose": "How it's used in the system",
      "insertionCode": "InsertService code"
    }
  ],
  "configuration": {
    "settingName": {"value": "default", "description": "What it does"}
  },
  "remoteEvents": [{"name": "EventName", "direction": "Server→Client/Client→Server", "parameters": []}],
  "dataStores": [{"name": "StoreName", "keys": [], "purpose": ""}],
  "setupInstructions": ["Step 1", "Step 2"],
  "scalability": "How system handles 10, 50, 100+ players",
  "monetization": "Optional monetization opportunities"
}

Return ONLY valid JSON.`,
      `You are an ELITE Roblox systems architect with 10+ years experience. You have COMPLETE knowledge of the Roblox Creator Store catalog, game design patterns, networking, optimization, and scalable architecture. You create systems used by thousands of players.`
    )

    let systemPlan
    try {
      systemPlan = JSON.parse(text)
    } catch {
      systemPlan = {
        name: prompt.slice(0, 30),
        description: prompt,
        components: [],
        configuration: {},
        dependencies: [],
        toolboxAssets: [],
      }
    }

    const { data: creation, error: creationError } = await supabase
      .from("creations")
      .insert({
        user_id: userData.id,
        type: "system",
        name: systemPlan.name,
        description: systemPlan.description || prompt,
        prompt: prompt,
        asset_data: systemPlan,
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
    console.error("[v0] System generation error:", error)
    return NextResponse.json({ error: "Generation failed" }, { status: 500 })
  }
}
