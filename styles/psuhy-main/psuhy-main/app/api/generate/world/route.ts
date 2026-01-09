import { createClient } from "@/lib/supabase/server"
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

    const { prompt } = await request.json()

    if (!prompt) {
      return NextResponse.json({ error: "Prompt is required" }, { status: 400 })
    }

    console.log("[World Gen] User:", user.id, "Prompt:", prompt)

    let { data: userData, error: userError } = await supabase
      .from("users")
      .select("id, discord_id, world_credits, subscription_tier")
      .eq("id", user.id)
      .single()

    if (userError || !userData) {
      const result = await supabase
        .from("users")
        .select("id, discord_id, world_credits, subscription_tier")
        .eq("discord_id", user.id)
        .single()

      userData = result.data
      userError = result.error
    }

    if (userError || !userData) {
      console.error("[World Gen] User lookup error:", userError)
      return NextResponse.json({ error: "User not found" }, { status: 404 })
    }

    // Check credits (unlimited for premium)
    const isPremium =
      userData.subscription_tier && ["pro", "premium", "enterprise"].includes(userData.subscription_tier)
    if (!isPremium && userData.world_credits <= 0) {
      return NextResponse.json({ error: "No world generation credits remaining" }, { status: 403 })
    }

    // Import verified assets
    const { getRandomAssets } = await import("@/lib/roblox-assets")

    // SMART theme detection from prompt
    const detectedThemes = detectThemesFromPrompt(prompt)
    const primaryTheme = detectedThemes[0] || "nature"

    console.log("[World Gen] Detected themes:", detectedThemes)

    // Get assets for all detected themes
    let allAssets: any[] = []
    for (const theme of detectedThemes.slice(0, 3)) {
      const themeAssets = getRandomAssets(8, theme)
      allAssets.push(...themeAssets)
    }

    // If we didn't get enough assets, add more from primary theme
    if (allAssets.length < 15) {
      const extraAssets = getRandomAssets(15 - allAssets.length, primaryTheme)
      allAssets.push(...extraAssets)
    }

    // Deduplicate by id
    const seen = new Set()
    allAssets = allAssets.filter((a) => {
      if (seen.has(a.id)) return false
      seen.add(a.id)
      return true
    })

    // Generate world configuration based on prompt analysis
    const worldConfig = generateWorldConfig(prompt, primaryTheme, detectedThemes)

    // Create world plan
    const worldPlan = {
      name: generateWorldName(prompt),
      description: `AI-generated world based on: "${prompt}"`,
      theme: primaryTheme,
      themes: detectedThemes,
      assets: allAssets.map((asset, index) => ({
        assetId: asset.id,
        name: asset.name,
        category: asset.category,
        position: asset.position || generateSmartPosition(index, allAssets.length, worldConfig),
        rotation: { x: 0, y: Math.random() * 360, z: 0 },
        scale: worldConfig.assetScale + (Math.random() - 0.5) * 0.2,
      })),
      lighting: worldConfig.lighting,
      terrain: worldConfig.terrain,
      atmosphere: worldConfig.atmosphere,
      spawnPoints: [{ position: { x: 0, y: 5, z: 0 } }, { position: { x: 20, y: 5, z: 20 } }],
      generatedAt: new Date().toISOString(),
      prompt: prompt,
    }

    console.log(`[World Gen] Created world with ${allAssets.length} assets for themes: ${detectedThemes.join(", ")}`)

    let autoQueued = false
    const userDiscordId = userData.discord_id || user.id

    try {
      const { data: connection } = await supabase
        .from("plugin_connections")
        .select("*")
        .eq("user_id", userDiscordId)
        .eq("is_active", true)
        .single()

      if (connection) {
        // Generate the world creation script
        const worldScript = generateWorldScript(worldPlan)

        // Queue the world script as a command
        const { error: queueError } = await supabase.from("command_queue").insert({
          user_id: userDiscordId,
          type: "EXECUTE_WORLD",
          code: worldScript,
          data: {
            name: worldPlan.name,
            theme: primaryTheme,
            assetCount: allAssets.length,
          },
          status: "pending",
        })

        if (!queueError) {
          autoQueued = true
          console.log("[World Gen] Auto-queued world script to Studio for user:", userDiscordId)
        }
      }
    } catch (error) {
      console.error("[World Gen] Auto-queue error:", error)
      // Don't fail the generation if auto-queue fails
    }

    worldPlan.auto_queued = autoQueued

    // Save creation
    const { data: creation, error: creationError } = await supabase
      .from("creations")
      .insert({
        user_id: userData.id,
        type: "world",
        name: worldPlan.name,
        description: worldPlan.description,
        prompt: prompt,
        asset_data: worldPlan,
        status: "ready",
      })
      .select()
      .single()

    if (creationError) {
      console.error("[World Gen] Creation insert error:", creationError)
      throw creationError
    }

    // Deduct credits for non-premium
    if (!isPremium) {
      await supabase
        .from("users")
        .update({ world_credits: userData.world_credits - 1 })
        .eq("id", userData.id)
    }

    return NextResponse.json({
      success: true,
      creation: creation,
      worldCreditsRemaining: isPremium ? "unlimited" : userData.world_credits - 1,
    })
  } catch (error) {
    console.error("[World Gen] Error:", error)
    return NextResponse.json({ error: "World generation failed" }, { status: 500 })
  }
}

// Smart theme detection from prompt
function detectThemesFromPrompt(prompt: string): string[] {
  const lowerPrompt = prompt.toLowerCase()
  const themes: string[] = []

  const themeKeywords: Record<string, string[]> = {
    // Natural themes
    nature: ["forest", "woods", "tree", "nature", "garden", "park", "outdoor", "wilderness"],
    forest: ["forest", "woods", "jungle", "trees", "woodland"],
    water: ["ocean", "sea", "lake", "river", "water", "beach", "island", "underwater"],
    beach: ["beach", "tropical", "island", "sand", "coast", "shore"],
    tropical: ["tropical", "jungle", "rainforest", "palm"],
    winter: ["winter", "snow", "ice", "frozen", "cold", "arctic", "christmas"],
    mountain: ["mountain", "cliff", "rock", "canyon", "cave"],
    desert: ["desert", "sand", "dune", "oasis", "arid"],

    // Building themes
    urban: ["city", "town", "street", "urban", "downtown", "metropolitan"],
    modern: ["modern", "contemporary", "skyscraper", "office", "apartment"],
    medieval: ["castle", "medieval", "kingdom", "knight", "fortress", "dungeon"],
    fantasy: ["fantasy", "magical", "dragon", "wizard", "enchanted", "fairy"],

    // Action themes
    military: ["military", "army", "war", "base", "camp", "battlefield"],
    combat: ["combat", "fight", "battle", "arena", "pvp"],
    racing: ["racing", "race", "track", "speedway", "circuit", "car"],
    sports: ["sports", "stadium", "arena", "field", "court", "gym"],
    adventure: ["adventure", "exploration", "quest", "treasure", "expedition"],

    // Sci-fi & Horror
    scifi: ["scifi", "sci-fi", "space", "futuristic", "cyber", "robot", "alien", "spaceship"],
    horror: ["horror", "scary", "haunted", "dark", "creepy", "spooky", "zombie"],

    // Fun themes
    fun: ["fun", "playground", "party", "carnival", "amusement", "obby"],
    magical: ["magic", "spell", "potion", "enchant", "mystical"],

    // Specific types
    farm: ["farm", "barn", "crop", "animal", "ranch", "countryside"],
    industrial: ["factory", "industrial", "warehouse", "manufacture"],
  }

  // Find all matching themes
  for (const [theme, keywords] of Object.entries(themeKeywords)) {
    for (const keyword of keywords) {
      if (lowerPrompt.includes(keyword)) {
        if (!themes.includes(theme)) {
          themes.push(theme)
        }
        break
      }
    }
  }

  // Default to nature if no themes detected
  if (themes.length === 0) {
    themes.push("nature")
  }

  return themes
}

// Generate world configuration based on themes
function generateWorldConfig(prompt: string, primaryTheme: string, themes: string[]) {
  const lowerPrompt = prompt.toLowerCase()

  // Default config
  const config = {
    lighting: {
      ambient: "Daylight",
      brightness: 1.5,
      timeOfDay: "14:00:00",
      colorShift: { r: 255, g: 255, b: 255 },
    },
    terrain: {
      type: "Grass",
      size: "large",
      color: { r: 76, g: 153, b: 76 },
    },
    atmosphere: {
      fog: false,
      fogColor: { r: 200, g: 200, b: 200 },
      fogDensity: 0,
    },
    assetScale: 1.0,
    worldSize: 200,
  }

  // Customize based on theme
  if (themes.includes("horror") || themes.includes("dark")) {
    config.lighting = {
      ambient: "Night",
      brightness: 0.5,
      timeOfDay: "23:00:00",
      colorShift: { r: 100, g: 100, b: 150 },
    }
    config.atmosphere = { fog: true, fogColor: { r: 50, g: 50, b: 60 }, fogDensity: 0.3 }
  } else if (themes.includes("fantasy") || themes.includes("magical")) {
    config.lighting = {
      ambient: "Magical",
      brightness: 1.2,
      timeOfDay: "18:00:00",
      colorShift: { r: 200, g: 150, b: 255 },
    }
    config.atmosphere = { fog: true, fogColor: { r: 150, g: 100, b: 200 }, fogDensity: 0.1 }
  } else if (themes.includes("scifi")) {
    config.lighting = {
      ambient: "ColdLight",
      brightness: 1.0,
      timeOfDay: "12:00:00",
      colorShift: { r: 150, g: 200, b: 255 },
    }
    config.terrain = { type: "Metal", size: "large", color: { r: 100, g: 100, b: 120 } }
  } else if (themes.includes("winter")) {
    config.lighting = {
      ambient: "Overcast",
      brightness: 1.3,
      timeOfDay: "10:00:00",
      colorShift: { r: 220, g: 230, b: 255 },
    }
    config.terrain = { type: "Snow", size: "large", color: { r: 240, g: 240, b: 255 } }
    config.atmosphere = { fog: true, fogColor: { r: 230, g: 235, b: 250 }, fogDensity: 0.15 }
  } else if (themes.includes("desert")) {
    config.lighting = {
      ambient: "HotLight",
      brightness: 2.0,
      timeOfDay: "13:00:00",
      colorShift: { r: 255, g: 230, b: 180 },
    }
    config.terrain = { type: "Sand", size: "large", color: { r: 210, g: 180, b: 140 } }
  } else if (themes.includes("beach") || themes.includes("tropical")) {
    config.lighting = {
      ambient: "Sunny",
      brightness: 1.8,
      timeOfDay: "11:00:00",
      colorShift: { r: 255, g: 250, b: 230 },
    }
    config.terrain = { type: "Sand", size: "large", color: { r: 240, g: 220, b: 180 } }
  } else if (themes.includes("water") || themes.includes("underwater")) {
    config.lighting = {
      ambient: "Underwater",
      brightness: 0.8,
      timeOfDay: "12:00:00",
      colorShift: { r: 100, g: 180, b: 220 },
    }
    config.atmosphere = { fog: true, fogColor: { r: 50, g: 100, b: 150 }, fogDensity: 0.4 }
  } else if (themes.includes("urban") || themes.includes("modern")) {
    config.terrain = { type: "Concrete", size: "large", color: { r: 130, g: 130, b: 130 } }
  } else if (themes.includes("medieval")) {
    config.lighting = {
      ambient: "Torch",
      brightness: 1.0,
      timeOfDay: "17:00:00",
      colorShift: { r: 255, g: 200, b: 150 },
    }
    config.terrain = { type: "Cobblestone", size: "large", color: { r: 100, g: 90, b: 80 } }
  }

  // Time of day from prompt
  if (lowerPrompt.includes("night") || lowerPrompt.includes("dark")) {
    config.lighting.timeOfDay = "22:00:00"
    config.lighting.brightness = 0.4
  } else if (lowerPrompt.includes("sunset") || lowerPrompt.includes("evening")) {
    config.lighting.timeOfDay = "18:30:00"
    config.lighting.colorShift = { r: 255, g: 180, b: 100 }
  } else if (lowerPrompt.includes("sunrise") || lowerPrompt.includes("dawn")) {
    config.lighting.timeOfDay = "06:30:00"
    config.lighting.colorShift = { r: 255, g: 200, b: 150 }
  }

  // Size from prompt
  if (lowerPrompt.includes("large") || lowerPrompt.includes("massive") || lowerPrompt.includes("huge")) {
    config.worldSize = 400
    config.assetScale = 1.2
  } else if (lowerPrompt.includes("small") || lowerPrompt.includes("tiny") || lowerPrompt.includes("mini")) {
    config.worldSize = 100
    config.assetScale = 0.8
  }

  return config
}

// Generate smart positions for assets
function generateSmartPosition(index: number, total: number, config: any) {
  const worldSize = config.worldSize / 2
  const angle = (index / total) * Math.PI * 2
  const radius = 20 + (index / total) * worldSize * 0.7

  // Create varied placement
  const variation = 0.3
  const randomAngle = angle + (Math.random() - 0.5) * variation
  const randomRadius = radius * (0.9 + Math.random() * 0.2)

  return {
    x: Math.cos(randomAngle) * randomRadius,
    y: 0,
    z: Math.sin(randomAngle) * randomRadius,
  }
}

// Generate a cool name for the world
function generateWorldName(prompt: string): string {
  const words = prompt
    .split(" ")
    .slice(0, 3)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())

  if (words.length === 0) {
    return "AI Generated World"
  }

  return words.join(" ").substring(0, 50)
}

function generateWorldScript(worldPlan: any): string {
  return `
-- BlaxSmith AI Generated World: ${worldPlan.name}
-- Generated at: ${worldPlan.generatedAt}
-- Prompt: "${worldPlan.prompt}"

local InsertService = game:GetService("InsertService")
local Lighting = game:GetService("Lighting")

print("🔨 BlaxSmith AI: Creating world '${worldPlan.name}'...")

-- Configure lighting
Lighting.Ambient = Color3.fromRGB(${worldPlan.lighting.colorShift.r}, ${worldPlan.lighting.colorShift.g}, ${worldPlan.lighting.colorShift.b})
Lighting.Brightness = ${worldPlan.lighting.brightness}
Lighting.ClockTime = "${worldPlan.lighting.timeOfDay}"

-- Configure atmosphere
${
  worldPlan.atmosphere.fog
    ? `Lighting.FogEnabled = true
Lighting.FogColor = Color3.fromRGB(${worldPlan.atmosphere.fogColor.r}, ${worldPlan.atmosphere.fogColor.g}, ${worldPlan.atmosphere.fogColor.b})
Lighting.FogEnd = ${500 * (1 - worldPlan.atmosphere.fogDensity)}`
    : "Lighting.FogEnabled = false"
}

-- Create world container
local worldFolder = Instance.new("Folder")
worldFolder.Name = "${worldPlan.name}"
worldFolder.Parent = workspace

-- Insert assets
local assets = {
${worldPlan.assets
  .map(
    (asset: any) =>
      `  {id = ${asset.assetId}, name = "${asset.name}", pos = Vector3.new(${asset.position.x}, ${asset.position.y}, ${asset.position.z}), rot = ${asset.rotation.y}, scale = ${asset.scale}}`,
  )
  .join(",\n")}
}

local successCount = 0
for i, assetData in ipairs(assets) do
    local success, model = pcall(function()
        return InsertService:LoadAsset(assetData.id)
    end)
    
    if success and model then
        local primaryPart = model:FindFirstChildWhichIsA("Model") or model:FindFirstChildWhichIsA("Part")
        if primaryPart then
            primaryPart.Parent = worldFolder
            primaryPart:SetPrimaryPartCFrame(CFrame.new(assetData.pos) * CFrame.Angles(0, math.rad(assetData.rot), 0))
            
            -- Scale
            if assetData.scale ~= 1 then
                for _, descendant in ipairs(primaryPart:GetDescendants()) do
                    if descendant:IsA("BasePart") then
                        descendant.Size = descendant.Size * assetData.scale
                    end
                end
            end
            
            successCount = successCount + 1
        end
        model:Destroy()
    else
        warn("Failed to load asset " .. assetData.id .. ": " .. tostring(model))
    end
    
    if i % 5 == 0 then
        print("Progress: " .. i .. "/" .. #assets .. " assets loaded")
        wait(0.1)
    end
end

print("✅ BlaxSmith AI: World created! Loaded " .. successCount .. "/" .. #assets .. " assets")
print("Theme: ${worldPlan.theme}")
print("Location: workspace.${worldPlan.name}")
`.trim()
}
