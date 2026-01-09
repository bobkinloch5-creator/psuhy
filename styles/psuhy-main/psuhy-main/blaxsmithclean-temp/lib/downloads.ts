// Download utility functions for models and worlds

export function downloadModelFile(modelUrl: string, filename: string) {
    const link = document.createElement('a')
    link.href = modelUrl
    link.download = filename
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
}

export function downloadWorldScript(worldData: any, worldName: string) {
    const script = generateWorldLuaScript(worldData)
    const blob = new Blob([script], { type: 'text/plain' })
    const url = URL.createObjectURL(blob)

    const link = document.createElement('a')
    link.href = url
    link.download = `${worldName.replace(/[^a-z0-9]/gi, '_')}_WorldGen.lua`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
}

function generateWorldLuaScript(worldData: any): string {
    return `-- BlaxSmith AI Generated World: ${worldData.name}
-- Generated: ${new Date().toISOString()}
-- Description: ${worldData.description}

local InsertService = game:GetService("InsertService")
local Lighting = game:GetService("Lighting")
local Terrain = workspace.Terrain

print("[BlaxSmith] Starting world generation: ${worldData.name}")

-- Setup Lighting
${generateLightingScript(worldData.lighting || {})}

-- Setup Terrain
${generateTerrainScript(worldData.terrain || {})}

-- Insert Assets from Creator Store
local assetsFolder = Instance.new("Folder")
assetsFolder.Name = "${worldData.name}_Assets"
assetsFolder.Parent = workspace

${generateAssetsScript(worldData.assets || [])}

-- Add Spawn Points
${generateSpawnScript(worldData.spawnPoints || [])}

-- Add Sounds
${generateSoundsScript(worldData.sounds || [])}

print("[BlaxSmith] World generation complete!")
print("[BlaxSmith] Assets imported: " .. #assetsFolder:GetChildren())
`
}

function generateLightingScript(lighting: any): string {
    if (!lighting || Object.keys(lighting).length === 0) {
        return '-- Using default lighting'
    }

    return `Lighting.Ambient = Color3.fromRGB(${lighting.ambient?.r || 128}, ${lighting.ambient?.g || 128}, ${lighting.ambient?.b || 128})
Lighting.Brightness = ${lighting.brightness || 1}
Lighting.TimeOfDay = "${lighting.timeOfDay || '14:00:00'}"
${lighting.atmosphere ? `Lighting.FogEnd = ${lighting.atmosphere === 'fog' ? 500 : 10000}` : ''}`
}

function generateTerrainScript(terrain: any): string {
    if (!terrain || !terrain.type) {
        return '-- No terrain modifications'
    }

    return `-- Terrain: ${terrain.type}
-- Note: Use Roblox Studio's Terrain Editor for detailed terrain
-- This script sets up the basic environment`
}

function generateAssetsScript(assets: any[]): string {
    if (!assets || assets.length === 0) {
        return '-- No assets to insert'
    }

    return assets.map((asset, index) => {
        const pos = asset.position || { x: 0, y: 0, z: 0 }
        const rot = asset.rotation || { x: 0, y: 0, z: 0 }
        const scale = asset.scale || 1

        return `
-- Asset ${index + 1}: ${asset.name}
local success${index}, model${index} = pcall(function()
  local asset = InsertService:LoadAsset(${asset.assetId})
  local model = asset:GetChildren()[1]
  if model then
    model:SetPrimaryPartCFrame(CFrame.new(${pos.x}, ${pos.y}, ${pos.z}) * CFrame.Angles(math.rad(${rot.x}), math.rad(${rot.y}), math.rad(${rot.z})))
    if model:IsA("Model") and model.PrimaryPart then
      local currentSize = model:GetExtentsSize()
      local scaleFactor = ${scale}
      for _, part in pairs(model:GetDescendants()) do
        if part:IsA("BasePart") then
          part.Size = part.Size * scaleFactor
        end
      end
    end
    model.Parent = assetsFolder
    print("[BlaxSmith] Inserted: ${asset.name}")
    return model
  end
end)
if not success${index} then
  warn("[BlaxSmith] Failed to insert asset ${asset.assetId}: ${asset.name}")
end`
    }).join('\n')
}

function generateSpawnScript(spawnPoints: any[]): string {
    if (!spawnPoints || spawnPoints.length === 0) {
        return '-- No custom spawn points'
    }

    return spawnPoints.map((spawn, index) => {
        const pos = spawn.position || { x: 0, y: 5, z: 0 }
        return `
local spawn${index} = Instance.new("SpawnLocation")
spawn${index}.Position = Vector3.new(${pos.x}, ${pos.y}, ${pos.z})
spawn${index}.Anchored = true
spawn${index}.CanCollide = false
spawn${index}.Transparency = 0.5
spawn${index}.BrickColor = BrickColor.new("Bright green")
spawn${index}.Parent = workspace`
    }).join('\n')
}

function generateSoundsScript(sounds: any[]): string {
    if (!sounds || sounds.length === 0) {
        return '-- No sounds to add'
    }

    return sounds.map((sound, index) => {
        const pos = sound.position || { x: 0, y: 0, z: 0 }
        return `
local soundPart${index} = Instance.new("Part")
soundPart${index}.Position = Vector3.new(${pos.x}, ${pos.y}, ${pos.z})
soundPart${index}.Anchored = true
soundPart${index}.CanCollide = false
soundPart${index}.Transparency = 1
soundPart${index}.Parent = workspace

local sound${index} = Instance.new("Sound")
sound${index}.SoundId = "rbxassetid://${sound.assetId}"
sound${index}.Volume = ${sound.volume || 0.5}
sound${index}.Looped = ${sound.looped || false}
sound${index}.Parent = soundPart${index}
sound${index}:Play()`
    }).join('\n')
}

export function copyToClipboard(text: string) {
    navigator.clipboard.writeText(text).then(() => {
        console.log('[BlaxSmith] Copied to clipboard')
    }).catch(err => {
        console.error('[BlaxSmith] Failed to copy:', err)
    })
}
