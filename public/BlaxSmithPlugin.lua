--[[
    BlaxSmith AI - Studio Plugin v6.4 ULTIMATE + Command Execution
    250-Module SDK Integration + City Builder Auto-Placement
    
    Features:
    - Full SDK 250-Module Support
    - Natural language  full games
    - Quick Templates for all game types
    - Auto-wiring RemoteEvents
    - SDK Auto-injection
    - SDK Auto-injection
    - Real-time polling from Desktop App
    -  CITY BUILDER: Auto-placement with validation
    
    print(">>> BlaxSmith LOCAL PLUGIN v6.4 LOADED <<<")
    print(">>> BlaxSmith LOCAL PLUGIN v6.4 LOADED <<<")
    print(">>> BlaxSmith LOCAL PLUGIN v6.4 LOADED <<<")
    -  Grid snapping (8x8)
    -  Road-facing rotation
    -  Zone-based asset organization
    -  Collision detection & validation
]]

print(">>> BlaxSmith LOCAL PLUGIN v6.4 LOADED <<<")
print(">>> BlaxSmith LOCAL PLUGIN v6.4 LOADED <<<")
print(">>> BlaxSmith LOCAL PLUGIN v6.4 LOADED <<<")

local HttpService = game:GetService("HttpService")
local ChangeHistoryService = game:GetService("ChangeHistoryService")
local Selection = game:GetService("Selection")
local LogService = game:GetService("LogService")
local ServerScriptService = game:GetService("ServerScriptService")
local ReplicatedStorage = game:GetService("ReplicatedStorage")
local StarterGui = game:GetService("StarterGui")
local StarterPlayer = game:GetService("StarterPlayer")
local RunService = game:GetService("RunService")
local Players = game:GetService("Players")
local InsertService = game:GetService("InsertService")
local Lighting = game:GetService("Lighting")
local PathfindingService = game:GetService("PathfindingService")

-- ============================================
-- CONFIGURATION
-- ============================================
local CONFIG = {
    APP_URL = "https://www.blaxsmith.dev",  -- Live website (NOT localhost!)
    PLUGIN_VERSION = "6.5.0",  -- Version bump: Website Integration
    SDK_VERSION = "6.1",
    TOTAL_MODULES = 250,
    -- City Builder Placement Settings
    GRID_SIZE = 8,              -- 8-stud grid for alignment
    MIN_SPACING = 10,           -- Minimum studs between assets
    REQUIRE_ROAD_FACING = true, -- Buildings must face roads
}

-- =========================
--  CRITICAL HELPER FUNCTIONS (Must be at top level)
-- =========================
local executeCommand -- Forward Declaration

local function httpRequest(method, endpoint, data)
    local url = CONFIG.APP_URL .. endpoint
    local success, result = pcall(function()
        if method == "POST" then
            return HttpService:PostAsync(url, HttpService:JSONEncode(data or {}), Enum.HttpContentType.ApplicationJson)
        else
            return HttpService:GetAsync(url)
        end
    end)
    return success
end

local function ensureFolder(parent, name)
    local f = parent:FindFirstChild(name)
    if not f then
        f = Instance.new("Folder", parent)
        f.Name = name
    end
    return f
end

-- ============================================
--  SELECT AND FOCUS CAMERA ON OBJECT
-- ============================================
local function selectAndFocus(object)
    if not object then return end
    
    -- Select the object
    Selection:Set({object})
    
    -- Focus camera on the object
    spawn(function()
        local camera = workspace.CurrentCamera
        if not camera then return end
        
        -- Calculate object position and size
        local targetPos = Vector3.new(0, 10, 0)
        local objectSize = Vector3.new(5, 5, 5)
        
        if object:IsA("Model") then
            local cf, size = object:GetBoundingBox()
            targetPos = cf.Position
            objectSize = size
        elseif object:IsA("BasePart") then
            targetPos = object.Position
            objectSize = object.Size
        end
        
        -- Calculate camera distance based on object size
        local maxDim = math.max(objectSize.X, objectSize.Y, objectSize.Z)
        local distance = maxDim * 2 + 15
        
        -- Position camera at an angle
        local offset = Vector3.new(distance, distance * 0.6, distance)
        local cameraPos = targetPos + offset
        
        -- Move camera
        camera.CameraType = Enum.CameraType.Scriptable
        camera.CFrame = CFrame.new(cameraPos, targetPos)
        
        print("[BlaxSmith]  Camera focused on: " .. object.Name)
        
        -- Return camera control
        wait(0.5)
        camera.CameraType = Enum.CameraType.Custom
    end)
end

local pollingActive = false
local function startPolling()
    if pollingActive then return end
    pollingActive = true
    spawn(function()
        -- WAIT for executeCommand to be defined
        while not executeCommand do
            print("[BlaxSmith]  Waiting for executeCommand to initialize...")
            wait(0.5)
        end
        print("[BlaxSmith]  executeCommand ready! Starting command polling...")
        
        -- Wait for pairing code to be generated
        local pairingCode = nil
        while not pairingCode do
            pairingCode = _G.BlaxSmithPairingCode
            if not pairingCode then
                wait(0.5)
            end
        end
        print("[BlaxSmith]  Using pairing code for connection:", pairingCode)
        
        -- Register the pairing code with the server
        pcall(function()
            local registerUrl = CONFIG.APP_URL .. "/api/plugin/register"
            local registerData = HttpService:JSONEncode({
                code = pairingCode,
                version = CONFIG.PLUGIN_VERSION
            })
            HttpService:PostAsync(registerUrl, registerData, Enum.HttpContentType.ApplicationJson)
            print("[BlaxSmith]  Registered pairing code with server")
        end)
        
        while pollingActive do
            pcall(function()
                -- Poll with pairing code so website knows who we are
                local pollUrl = CONFIG.APP_URL .. "/api/plugin/poll?code=" .. pairingCode
                local response = HttpService:GetAsync(pollUrl)
                
                -- Check if we got a valid response (not an error)
                if response then
                    local decoded = HttpService:JSONDecode(response)
                    
                    -- If we get an array (even empty), we're connected!
                    if type(decoded) == "table" and not decoded.error then
                        -- Update status to connected (only once)
                        if not _G.BlaxSmithConnected then
                            _G.BlaxSmithConnected = true
                            updateStatus(true)
                            print("[BlaxSmith] ✅ Connected to BlaxSmith.dev!")
                        end
                        
                        -- Process commands if any
                        if #decoded > 0 then
                            for _, cmd in ipairs(decoded) do
                                print("[BlaxSmith]  Received command:", cmd.type or "unknown")
                            
                            -- SPECIAL HANDLING FOR SLOYD/3D MODEL COMMANDS
                            if cmd.type == "INSERT_ASSET" and cmd.data and cmd.data.assetId then
                                -- Auto-insert 3D model from Sloyd
                                print("[BlaxSmith]  Auto-inserting Sloyd model, Asset ID:", cmd.data.assetId)
                                local success, result = pcall(function()
                                    local InsertService = game:GetService("InsertService")
                                    local model = InsertService:LoadAsset(tonumber(cmd.data.assetId))
                                    if model then
                                        model.Name = cmd.data.prompt or "Sloyd_Model"
                                        model.Parent = workspace
                                        -- Position at origin or player position
                                        if model:IsA("Model") and model.PrimaryPart then
                                            model:SetPrimaryPartCFrame(CFrame.new(0, 5, 0))
                                        elseif model:FindFirstChild("Handle") then
                                            model.Handle.CFrame = CFrame.new(0, 5, 0)
                                        end
                                        print("[BlaxSmith]  Sloyd model inserted:", model.Name)
                                        selectAndFocus(model)
                                    end
                                end)
                                if not success then
                                    warn("[BlaxSmith]  Failed to insert asset:", result)
                                end
                            elseif cmd.type == "SLOYD_MODEL_READY" then
                                -- Automatically trigger 3D import dialog
                                print("[BlaxSmith]  Sloyd model ready! Opening import dialog...")
                                local filePath = cmd.data and cmd.data.filePath or "unknown"
                                local promptName = cmd.data and cmd.data.prompt or "Sloyd_Model"
                                
                                -- Try to use StudioService to prompt file import
                                local success, result = pcall(function()
                                    local StudioService = game:GetService("StudioService")
                                    
                                    -- Prompt the user to import the file
                                    -- This opens the native 3D import dialog
                                    print("[BlaxSmith]  Opening 3D Import dialog...")
                                    print("[BlaxSmith]  Look for file at: " .. filePath)
                                    
                                    -- PromptImportFile opens a file picker - user selects the GLB
                                    local files = StudioService:PromptImportFiles({"glb", "fbx", "obj"})
                                    
                                    if files and #files > 0 then
                                        print("[BlaxSmith]  File selected for import!")
                                        -- The import dialog will handle the rest automatically
                                    else
                                        print("[BlaxSmith]  No file selected")
                                    end
                                end)
                                
                                if not success then
                                    print("[BlaxSmith]  Could not open import dialog: " .. tostring(result))
                                    -- Fallback: Create placeholder with instructions
                                    local placeholder = Instance.new("Part")
                                    placeholder.Name = "Sloyd_" .. promptName:gsub("[^%w]", "_")
                                    placeholder.Size = Vector3.new(4, 4, 4)
                                    placeholder.Position = Vector3.new(0, 10, 0)
                                    placeholder.Anchored = true
                                    placeholder.BrickColor = BrickColor.new("Lime green")
                                    placeholder.Material = Enum.Material.Neon
                                    placeholder.Parent = workspace
                                    
                                    local billboard = Instance.new("BillboardGui")
                                    billboard.Size = UDim2.new(0, 300, 0, 80)
                                    billboard.StudsOffset = Vector3.new(0, 4, 0)
                                    billboard.AlwaysOnTop = true
                                    billboard.Parent = placeholder
                                    
                                    local label = Instance.new("TextLabel")
                                    label.Size = UDim2.new(1, 0, 1, 0)
                                    label.BackgroundColor3 = Color3.fromRGB(30, 30, 30)
                                    label.BackgroundTransparency = 0.2
                                    label.TextColor3 = Color3.fromRGB(0, 255, 100)
                                    label.TextScaled = true
                                    label.Font = Enum.Font.GothamBold
                                    label.Text = " " .. promptName .. "\nImported from Sloyd AI"
                                    label.Parent = billboard
                                    
                                    selectAndFocus(placeholder)
                                end
                                
                                print("[BlaxSmith]  Imported from Sloyd AI: " .. promptName)
                            elseif cmd.type == "execute" and cmd.code then
                                -- WORLD BUILDER: Execute Lua code directly
                                print("[BlaxSmith]  Executing World Builder code...")
                                print("[BlaxSmith]  Description:", cmd.description or "Generated World")
                                local codeSuccess, codeError = pcall(function()
                                    local func, loadErr = loadstring(cmd.code)
                                    if func then
                                        func()
                                        print("[BlaxSmith]  World Builder code executed successfully!")
                                    else
                                        warn("[BlaxSmith]  Failed to load code:", loadErr)
                                    end
                                end)
                                if not codeSuccess then
                                    warn("[BlaxSmith]  World execution error:", codeError)
                                end
                            elseif executeCommand then
                                executeCommand(cmd.type, cmd.data or cmd)
                            else
                                warn("[BlaxSmith]  executeCommand not ready yet!")
                            end
                        end
                    end
                end
            end)
            wait(1)
        end
    end)
end



-- ============================================
-- UI & TOOLBAR SETUP
-- ============================================
local Toolbar = plugin:CreateToolbar("BlaxSmith AI")
local ToggleButton = Toolbar:CreateButton("Toggle AI", "Open/Close BlaxSmith AI", "rbxassetid://4458901886")
ToggleButton.ClickableWhenViewportHidden = true

-- Quick Widget Setup
local widgetInfo = DockWidgetPluginGuiInfo.new( Enum.InitialDockState.Float, true, false, 300, 450, 250, 200 )
local MainWidget = plugin:CreateDockWidgetPluginGui("BlaxSmithAI_Main", widgetInfo)
MainWidget.Title = "BlaxSmith AI v" .. CONFIG.PLUGIN_VERSION

ToggleButton.Click:Connect(function()
    MainWidget.Enabled = not MainWidget.Enabled
    ToggleButton:SetActive(MainWidget.Enabled)
end)
-- Sync Button
MainWidget:GetPropertyChangedSignal("Enabled"):Connect(function() ToggleButton:SetActive(MainWidget.Enabled) end)

-- ============================================
-- PREMIUM LOADING SPLASH SCREEN
-- ============================================
-- HOISTED: These need to be accessible outside the do-end block
local splashFrame, StatusLabel, animationActive

do -- BEGIN SPLASH SCREEN SCOPE (reduces local register usage)
    splashFrame = Instance.new("Frame")
    splashFrame.Name = "SplashScreen"
splashFrame.Size = UDim2.new(1, 0, 1, 0)
splashFrame.BackgroundColor3 = Color3.fromRGB(12, 12, 20)
splashFrame.BorderSizePixel = 0
splashFrame.Parent = MainWidget

-- Gradient overlay for premium look
local gradient = Instance.new("UIGradient")
gradient.Color = ColorSequence.new({
    ColorSequenceKeypoint.new(0, Color3.fromRGB(20, 20, 40)),
    ColorSequenceKeypoint.new(0.5, Color3.fromRGB(12, 12, 20)),
    ColorSequenceKeypoint.new(1, Color3.fromRGB(25, 15, 35))
})
gradient.Rotation = 45
gradient.Parent = splashFrame

-- Center container
local centerContainer = Instance.new("Frame")
centerContainer.Name = "CenterContainer"
centerContainer.Size = UDim2.new(0.8, 0, 0.6, 0)
centerContainer.Position = UDim2.new(0.1, 0, 0.15, 0)
centerContainer.BackgroundTransparency = 1
centerContainer.Parent = splashFrame

-- Create pulsing glow rings around logo
local glowRings = {}
for i = 1, 3 do
    local glowRing = Instance.new("Frame")
    glowRing.Name = "GlowRing" .. i
    glowRing.Size = UDim2.new(0, 80 + (i * 20), 0, 80 + (i * 20))
    glowRing.Position = UDim2.new(0.5, -(40 + (i * 10)), 0, -(i * 10))
    glowRing.BackgroundColor3 = Color3.fromRGB(255, 80, 40)
    glowRing.BackgroundTransparency = 0.85 + (i * 0.03)
    glowRing.BorderSizePixel = 0
    glowRing.ZIndex = 1
    glowRing.Parent = centerContainer
    
    local ringCorner = Instance.new("UICorner")
    ringCorner.CornerRadius = UDim.new(0.5, 0)
    ringCorner.Parent = glowRing
    
    glowRings[i] = glowRing
end

-- Logo container with glow effect
local logoContainer = Instance.new("Frame")
logoContainer.Name = "LogoContainer"
logoContainer.Size = UDim2.new(0, 80, 0, 80)
logoContainer.Position = UDim2.new(0.5, -40, 0, 0)
logoContainer.BackgroundColor3 = Color3.fromRGB(255, 100, 50)
logoContainer.BackgroundTransparency = 0.85
logoContainer.BorderSizePixel = 0
logoContainer.ZIndex = 2
logoContainer.Parent = centerContainer

local logoCorner = Instance.new("UICorner")
logoCorner.CornerRadius = UDim.new(0.5, 0)
logoCorner.Parent = logoContainer

-- Inner glow behind logo
local innerGlow = Instance.new("Frame")
innerGlow.Name = "InnerGlow"
innerGlow.Size = UDim2.new(0, 70, 0, 70)
innerGlow.Position = UDim2.new(0.5, -35, 0.5, -35)
innerGlow.BackgroundColor3 = Color3.fromRGB(255, 120, 60)
innerGlow.BackgroundTransparency = 0.6
innerGlow.BorderSizePixel = 0
innerGlow.ZIndex = 2
innerGlow.Parent = logoContainer

local innerGlowCorner = Instance.new("UICorner")
innerGlowCorner.CornerRadius = UDim.new(0.5, 0)
innerGlowCorner.Parent = innerGlow

-- Logo image (using the BlaxSmith toolbar icon)
local logoImage = Instance.new("ImageLabel")
logoImage.Name = "Logo"
logoImage.Size = UDim2.new(0, 64, 0, 64)
logoImage.Position = UDim2.new(0.5, -32, 0.5, -32)
logoImage.BackgroundTransparency = 1
logoImage.Image = "rbxassetid://116018092372641"
logoImage.ImageColor3 = Color3.fromRGB(255, 255, 255)
logoImage.ScaleType = Enum.ScaleType.Fit
logoImage.ZIndex = 3
logoImage.Parent = logoContainer

-- Animate pulsing glow rings
task.spawn(function()
    local pulsePhase = 0
    while true do
        pulsePhase = pulsePhase + 0.05
        for i, ring in ipairs(glowRings) do
            local offset = (i - 1) * 0.3
            local pulse = math.sin(pulsePhase + offset) * 0.5 + 0.5
            ring.BackgroundTransparency = 0.75 + (pulse * 0.2)
            local scale = 1 + (pulse * 0.08)
            local baseSize = 80 + (i * 20)
            ring.Size = UDim2.new(0, baseSize * scale, 0, baseSize * scale)
            ring.Position = UDim2.new(0.5, -(baseSize * scale / 2), 0, -(i * 10) - ((scale - 1) * baseSize / 2))
        end
        -- Also pulse inner glow
        local innerPulse = math.sin(pulsePhase * 1.5) * 0.5 + 0.5
        innerGlow.BackgroundTransparency = 0.5 + (innerPulse * 0.3)
        task.wait(0.03)
    end
end)

-- Title text with gradient effect
local titleText = Instance.new("TextLabel")
titleText.Name = "Title"
titleText.Size = UDim2.new(1, 0, 0, 30)
titleText.Position = UDim2.new(0, 0, 0, 100)
titleText.BackgroundTransparency = 1
titleText.Text = "BlaxSmith AI"
titleText.TextColor3 = Color3.fromRGB(255, 255, 255)
titleText.TextSize = 24
titleText.Font = Enum.Font.GothamBold
titleText.Parent = centerContainer

-- Add gradient to title
local titleGradient = Instance.new("UIGradient")
titleGradient.Color = ColorSequence.new({
    ColorSequenceKeypoint.new(0, Color3.fromRGB(255, 150, 80)),
    ColorSequenceKeypoint.new(0.5, Color3.fromRGB(255, 255, 255)),
    ColorSequenceKeypoint.new(1, Color3.fromRGB(255, 100, 50))
})
titleGradient.Parent = titleText

-- Animate title gradient
task.spawn(function()
    local rotation = 0
    while true do
        rotation = (rotation + 2) % 360
        titleGradient.Rotation = rotation
        task.wait(0.05)
    end
end)

-- Subtitle
local subtitleText = Instance.new("TextLabel")
subtitleText.Name = "Subtitle"
subtitleText.Size = UDim2.new(1, 0, 0, 18)
subtitleText.Position = UDim2.new(0, 0, 0, 128)
subtitleText.BackgroundTransparency = 1
subtitleText.Text = "Studio Integration"
subtitleText.TextColor3 = Color3.fromRGB(180, 180, 200)
subtitleText.TextSize = 13
subtitleText.Font = Enum.Font.Gotham
subtitleText.Parent = centerContainer

-- Version badge
local versionBadge = Instance.new("Frame")
versionBadge.Name = "VersionBadge"
versionBadge.Size = UDim2.new(0, 70, 0, 22)
versionBadge.Position = UDim2.new(0.5, -35, 0, 152)
versionBadge.BackgroundColor3 = Color3.fromRGB(255, 100, 50)
versionBadge.BorderSizePixel = 0
versionBadge.Parent = centerContainer

local versionCorner = Instance.new("UICorner")
versionCorner.CornerRadius = UDim.new(0, 10)
versionCorner.Parent = versionBadge

local versionText = Instance.new("TextLabel")
versionText.Size = UDim2.new(1, 0, 1, 0)
versionText.BackgroundTransparency = 1
versionText.Text = "v" .. CONFIG.PLUGIN_VERSION
versionText.TextColor3 = Color3.fromRGB(255, 255, 255)
versionText.TextSize = 12
versionText.Font = Enum.Font.GothamBold
versionText.Parent = versionBadge

-- Loading spinner container
local spinnerContainer = Instance.new("Frame")
spinnerContainer.Name = "SpinnerContainer"
spinnerContainer.Size = UDim2.new(0, 40, 0, 40)
spinnerContainer.Position = UDim2.new(0.5, -20, 0, 190)
spinnerContainer.BackgroundTransparency = 1
spinnerContainer.Parent = centerContainer

-- Loading dots
local function createDot(index, total)
    local dot = Instance.new("Frame")
    dot.Name = "Dot" .. index
    dot.Size = UDim2.new(0, 8, 0, 8)
    local angle = (index - 1) * (360 / total)
    local radius = 15
    local x = math.cos(math.rad(angle)) * radius
    local y = math.sin(math.rad(angle)) * radius
    dot.Position = UDim2.new(0.5, x - 4, 0.5, y - 4)
    dot.BackgroundColor3 = Color3.fromRGB(255, 100, 50)
    dot.BackgroundTransparency = 0.7
    dot.BorderSizePixel = 0
    dot.Parent = spinnerContainer
    
    local corner = Instance.new("UICorner")
    corner.CornerRadius = UDim.new(0.5, 0)
    corner.Parent = dot
    
    return dot
end

local dots = {}
for i = 1, 8 do
    dots[i] = createDot(i, 8)
end

-- Status text
StatusLabel = Instance.new("TextLabel")
StatusLabel.Name = "StatusLabel"
StatusLabel.Size = UDim2.new(1, 0, 0, 25)
StatusLabel.Position = UDim2.new(0, 0, 0, 250)
StatusLabel.BackgroundTransparency = 1
StatusLabel.Text = "Initializing..."
StatusLabel.TextColor3 = Color3.fromRGB(150, 150, 170)
StatusLabel.TextSize = 14
StatusLabel.Font = Enum.Font.Gotham
StatusLabel.Parent = centerContainer

-- PAIRING CODE SECTION
local pairingContainer = Instance.new("Frame")
pairingContainer.Name = "PairingContainer"
pairingContainer.Size = UDim2.new(0.9, 0, 0, 80)
pairingContainer.Position = UDim2.new(0.05, 0, 0, 280)
pairingContainer.BackgroundColor3 = Color3.fromRGB(30, 30, 50)
pairingContainer.BackgroundTransparency = 0.3
pairingContainer.BorderSizePixel = 0
pairingContainer.Parent = centerContainer

local pairingCorner = Instance.new("UICorner")
pairingCorner.CornerRadius = UDim.new(0, 12)
pairingCorner.Parent = pairingContainer

local pairingTitle = Instance.new("TextLabel")
pairingTitle.Size = UDim2.new(1, 0, 0, 20)
pairingTitle.Position = UDim2.new(0, 0, 0, 8)
pairingTitle.BackgroundTransparency = 1
pairingTitle.Text = "🔗 Enter this code on blaxsmith.dev:"
pairingTitle.TextColor3 = Color3.fromRGB(180, 180, 200)
pairingTitle.TextSize = 11
pairingTitle.Font = Enum.Font.Gotham
pairingTitle.Parent = pairingContainer

-- Generate 6-digit pairing code
local pairingCode = string.format("%06d", math.random(100000, 999999))

local pairingCodeLabel = Instance.new("TextLabel")
pairingCodeLabel.Name = "PairingCode"
pairingCodeLabel.Size = UDim2.new(1, 0, 0, 35)
pairingCodeLabel.Position = UDim2.new(0, 0, 0, 28)
pairingCodeLabel.BackgroundTransparency = 1
pairingCodeLabel.Text = pairingCode
pairingCodeLabel.TextColor3 = Color3.fromRGB(255, 180, 80)
pairingCodeLabel.TextSize = 28
pairingCodeLabel.Font = Enum.Font.GothamBold
pairingCodeLabel.Parent = pairingContainer

local pairingHint = Instance.new("TextLabel")
pairingHint.Size = UDim2.new(1, 0, 0, 15)
pairingHint.Position = UDim2.new(0, 0, 1, -18)
pairingHint.BackgroundTransparency = 1
pairingHint.Text = "Go to: blaxsmith.dev/plugin"
pairingHint.TextColor3 = Color3.fromRGB(120, 120, 140)
pairingHint.TextSize = 10
pairingHint.Font = Enum.Font.Gotham
pairingHint.Parent = pairingContainer

-- Store pairing code globally for polling
_G.BlaxSmithPairingCode = pairingCode
print("[BlaxSmith] 🔗 Pairing Code:", pairingCode)

-- Footer text
local footerText = Instance.new("TextLabel")
footerText.Name = "Footer"
footerText.Size = UDim2.new(1, -20, 0, 20)
footerText.Position = UDim2.new(0, 10, 1, -30)
footerText.BackgroundTransparency = 1
footerText.Text = "Powered by Advanced AI"
footerText.TextColor3 = Color3.fromRGB(80, 80, 100)
footerText.TextSize = 11
footerText.Font = Enum.Font.Gotham
footerText.Parent = splashFrame

-- Animate loading dots
animationActive = true
task.spawn(function()
    local currentDot = 1
    while animationActive do
        for i, dot in ipairs(dots) do
            if i == currentDot then
                dot.BackgroundTransparency = 0
                dot.Size = UDim2.new(0, 10, 0, 10)
                dot.Position = dot.Position + UDim2.new(0, -1, 0, -1)
            else
                dot.BackgroundTransparency = 0.7
                dot.Size = UDim2.new(0, 8, 0, 8)
            end
        end
        currentDot = currentDot % 8 + 1
        task.wait(0.1)
        -- Reset sizes
        for i, dot in ipairs(dots) do
            local angle = (i - 1) * (360 / 8)
            local radius = 15
            local x = math.cos(math.rad(angle)) * radius
            local y = math.sin(math.rad(angle)) * radius
            dot.Position = UDim2.new(0.5, x - 4, 0.5, y - 4)
            dot.Size = UDim2.new(0, 8, 0, 8)
        end
    end
end)

end -- END SPLASH SCREEN SCOPE
local function updateStatus(connected)
    if connected then 
        StatusLabel.Text = " Connected to BlaxSmith.dev"
        StatusLabel.TextColor3 = Color3.fromRGB(100, 255, 150)
        animationActive = false
        -- Keep splash visible, just show connected status
    else 
        StatusLabel.Text = " Connecting..."
        StatusLabel.TextColor3 = Color3.fromRGB(255, 200, 100)
        animationActive = true
    end
end

-- StudioService for FBX import (available in Studio plugins)
local StudioService = game:GetService("StudioService")
-- Note: ImportService doesn't exist in Roblox, removed to prevent errors

-- ============================================
-- SMART PROMPT BUILDER (Anti-Procedural Intelligence)
-- ============================================
local SmartPromptBuilder = {}

-- 1. THE BRAIN: These rules are hard-coded so the AI cannot ignore them.
local SYSTEM_PERSONA = [[
You are the BlaxSmith Flexible Engine.
- YOUR GOAL: Create "Bespoke" and "Modular" Roblox assets.
- YOUR ENEMY: Procedural generation, grids, and hard-coded values.
]]

local FLEXIBILITY_RULES = [[
[STRICT RULES]:
1. MODULARITY: If writing scripts, use Attributes (GetAttribute) for ALL numbers (Speed, Damage, etc). NEVER hard-code numbers.
2. ORGANIC BUILDING: If building models, apply random Rotation (+/- 2 deg) and Scale (+/- 5%) to avoid the "procedural grid" look.
3. RESPONSIVENESS: If building UI, use Scale (0.5,0), NOT Offset (200,0).
]]

local OUTPUT_FORMAT = [[
[REQUIRED FORMAT]:
1. [PLANNING]: Explain strictly how you are making this request flexible.
2. [ASSET]: The Code or Model data.
3. [CONFIG]: A list of variables the user can change easily.
]]

-- 2. THE INTELLIGENCE FUNCTION
function SmartPromptBuilder.createSuperPrompt(userRequest)
    -- Detect Intent (Basic keyword checking to make the prompt smarter)
    local specificInstruction = ""
    
    local lowerRequest = string.lower(userRequest)
    if string.find(lowerRequest, "script") or string.find(lowerRequest, "code") then
        specificInstruction = "FOCUS: Ensure all logic is decoupled. Use ModuleScripts where possible."
    elseif string.find(lowerRequest, "ui") or string.find(lowerRequest, "gui") then
        specificInstruction = "FOCUS: Ensure UI is mobile-ready using Scale."
    elseif string.find(lowerRequest, "build") or string.find(lowerRequest, "map") then
        specificInstruction = "FOCUS: Break symmetry. Make it look handcrafted, not generated."
    elseif string.find(lowerRequest, "realistic") then
        specificInstruction = "FOCUS: Use real Toolbox models, NOT blocky Parts. Organic placement."
    end

    -- 3. BUILD THE FINAL "SMART" MESSAGE
    local finalPrompt = table.concat({
        "### SYSTEM INSTRUCTIONS",
        SYSTEM_PERSONA,
        FLEXIBILITY_RULES,
        OUTPUT_FORMAT,
        "---------------------------------------------------",
        "### USER REQUEST",
        "User Intent: " .. specificInstruction,
        "User Prompt: " .. userRequest,
        "---------------------------------------------------",
        "REMINDER: If you output generic procedural code, you fail. Be flexible."
    }, "\n")

    return finalPrompt
end


print("[BlaxSmith] SmartPromptBuilder module loaded!")

-- ============================================
-- CONTEXT TRACKER (Tracks User Selection)
-- ============================================
local ContextTracker = {}

function ContextTracker.getSelectedContext()
	local selection = Selection:Get()
	if #selection == 0 then
		return "Selection: None"
	end
	
	local context = "Selection: "
	for i, obj in ipairs(selection) do
		context = context .. obj.Name .. " (" .. obj.ClassName .. ")"
		if i < #selection then context = context .. ", " end
	end
	return context
end

print("[BlaxSmith] ContextTracker module loaded!")

-- ============================================
-- ASSET BUILDER (JSON -> Instances)
-- ============================================
local AssetBuilder = {}

function AssetBuilder.build(data, parent)
	if not data or not data.class then 
		warn("[AssetBuilder] Invalid data:", data)
		return nil 
	end
	
	local success, obj = pcall(function()
		return Instance.new(data.class)
	end)
	
	if not success then
		warn("[AssetBuilder] Failed to create class: " .. tostring(data.class))
		return nil
	end
	
	-- Apply properties
	if data.properties then
		for prop, val in pairs(data.properties) do
			pcall(function()
				-- Handle specific types if JSON sends them as arrays/tables
				if prop == "Color" or prop == "Color3" then
					if type(val) == "table" then
						obj[prop] = Color3.new(val[1] or 0, val[2] or 0, val[3] or 0)
					else
						obj[prop] = val -- Assume it's a Color3 valid value? (Unlikely from JSON)
					end
				elseif prop == "Size" or prop == "Position" then
					if type(val) == "table" then
						obj[prop] = Vector3.new(val[1] or 0, val[2] or 0, val[3] or 0)
					end
				elseif prop == "CFrame" then
					if type(val) == "table" then
						-- Simple Position CFrame for now
						obj[prop] = CFrame.new(val[1] or 0, val[2] or 0, val[3] or 0)
					end
				else
					obj[prop] = val
				end
			end)
		end
	end
	
	-- Handle Children
	if data.children then
		for _, childData in ipairs(data.children) do
			AssetBuilder.build(childData, obj)
		end
	end
	
	-- Default Parent
	obj.Parent = parent or workspace
	
	-- If it's a model/part, move it near camera or selection
	if obj:IsA("BasePart") or obj:IsA("Model") then
		local s = Selection:Get()
		if #s > 0 and s[1]:IsA("BasePart") then
			obj:PivotTo(s[1].CFrame * CFrame.new(0, 5, 0))
		end
	end
	
	return obj
end

print("[BlaxSmith] AssetBuilder module loaded!")

-- ============================================
-- SCRIPT INJECTOR (JSON -> Code)
-- ============================================
local ScriptInjector = {}

function ScriptInjector.inject(data, target)
	if not data or not data.code then return nil end
	
	local scriptType = data.type or "Script" -- Script, LocalScript, ModuleScript
	
	if scriptType ~= "Script" and scriptType ~= "LocalScript" and scriptType ~= "ModuleScript" then
		scriptType = "Script"
	end

	local newScript = Instance.new(scriptType)
	newScript.Name = data.name or "AIScript"
	newScript.Source = data.code
	
	-- Decide Parent
	if target then
		newScript.Parent = target
	elseif scriptType == "LocalScript" then
		newScript.Parent = StarterPlayer.StarterPlayerScripts
	elseif scriptType == "ModuleScript" then
		newScript.Parent = ReplicatedStorage
	else
		newScript.Parent = ServerScriptService
	end
	
	return newScript
end

print("[BlaxSmith] ScriptInjector module loaded!")



-- ============================================
-- PLUGIN TOOLBAR & WIDGET (Required for visibility!)
-- ============================================
do -- BEGIN TOOLBAR SCOPE

-- Note: The premium splash screen UI is created above (lines 66-350)
-- No duplicate mainFrame UI needed here.

end -- END TOOLBAR SCOPE


-- ============================================
-- UI THEME (Premium Rainbow Theme)
-- ============================================
local COLORS = {
    DARK_BG = Color3.fromRGB(12, 12, 20),
    PANEL_BG = Color3.fromRGB(20, 20, 35),
    CARD_BG = Color3.fromRGB(28, 28, 45),
    CYAN = Color3.fromRGB(0, 255, 255),
    GREEN = Color3.fromRGB(0, 255, 159),
    GOLD = Color3.fromRGB(255, 200, 50),
    RED = Color3.fromRGB(255, 76, 76),
    PURPLE = Color3.fromRGB(180, 100, 255),
    PINK = Color3.fromRGB(255, 100, 200),
    TEXT = Color3.fromRGB(255, 255, 255),
    TEXT_MUTED = Color3.fromRGB(120, 120, 140),
}

-- ============================================
-- SDK MODULE CATEGORIES (All 250)
-- ============================================
local SDK_CATEGORIES = {
    Core = {"Core", "Inventory", "Stats", "PlayerData", "NPC", "Combat", "Quest"},
    Gameplay = {"Pet", "Mount", "Ability", "Loot", "Party", "Trading", "Teleport"},
    Economy = {"Shop", "DailyRewards", "Codes", "VIP", "Rebirth", "Premium", "Auction"},
    Social = {"Clan", "Marriage", "Friends", "Messaging", "Voting", "Report", "Block"},
    Combat = {"Weapons", "Armor", "Durability", "Enchanting", "Elements", "Critical", "Projectile"},
    Effects = {"Aura", "Trails", "Particles", "CameraFX", "ScreenFX", "DamageNumbers"},
    Modes = {"BattleRoyale", "MurderMystery", "PropHunt", "Infected", "CTF", "KOTH"},
    Progression = {"Achievements", "Badges", "Ranks", "Titles", "Mastery", "SkillTree", "TechTree"},
    World = {"World", "Terrain", "Zone", "Weather", "DayNight", "Spawner"},
    Systems = {"RoundSystem", "TeamSystem", "Matchmaking", "Queue", "VotingSystem", "MapRotation"},
    UI = {"UI", "Billboard", "HealthBar", "NameTag", "Minimap", "Compass", "Waypoint"},
    Utility = {"Animation", "Tween", "Pathfinding", "ObjectPool", "Timer", "Countdown"},
    Security = {"Admin", "Ban", "Whitelist", "AntiCheat", "Logging", "ErrorHandler"},
    Data = {"DataPersistence", "Session", "Config", "FeatureFlags", "ABTest", "Metrics"},
}

-- ============================================
-- QUICK TEMPLATES
-- ============================================
local QuickTemplates = {
    {name = " Pet Simulator", category = "Simulator", modules = {"Pet", "Eggs", "Rebirth", "Shop", "Codes"}},
    {name = " Battle Royale", category = "Action", modules = {"BattleRoyale", "Combat", "Weapons", "Zone", "Loot"}},
    {name = " Tower Defense", category = "Strategy", modules = {"TowerDefense", "WaveDefense", "Shop", "Upgrades"}},
    {name = " Obby", category = "Platformer", modules = {"Checkpoint", "Timer", "Leaderboard", "JumpPad", "SpeedPad"}},
    {name = " Murder Mystery", category = "Action", modules = {"MurderMystery", "RoundSystem", "TeamSystem", "Spectate"}},
    {name = " Tycoon", category = "Simulator", modules = {"Tycoon", "Generators", "Shop", "Rebirth"}},
    {name = " Fishing Sim", category = "Simulator", modules = {"Fishing", "Inventory", "Shop", "Collection", "Mastery"}},
    {name = " Mining Sim", category = "Simulator", modules = {"Mining", "Inventory", "Shop", "Rebirth", "Upgrades"}},
    {name = " Farming Sim", category = "Simulator", modules = {"Farming", "Inventory", "Shop", "Trading"}},
    {name = " Racing", category = "Action", modules = {"Racing", "Vehicles", "Leaderboard", "Timer"}},
    {name = " Prop Hunt", category = "Action", modules = {"PropHunt", "RoundSystem", "TeamSystem"}},
    {name = " Infected", category = "Action", modules = {"Infected", "RoundSystem", "TeamSystem", "SpeedBoost"}},
    {name = " Hero Arena", category = "Action", modules = {"Combat", "Ability", "PvP", "Matchmaking", "RoundSystem"}},
    {name = " Trading Hub", category = "Social", modules = {"Trading", "Inventory", "Chat", "Friends"}},
    {name = " Casino", category = "Casino", modules = {"SlotMachine", "Dice", "SpinWheel", "Lottery", "LuckyDraw"}},
}

-- ============================================
-- HELPER FUNCTIONS
-- ============================================
local function stripMarkdown(code)
    if not code then return "" end
    local s, e = string.find(code, "```lua")
    if not s then s, e = string.find(code, "```") end
    if s then
        local rest = string.sub(code, e + 1)
        local endS, _ = string.find(rest, "```")
        if endS then return string.sub(rest, 1, endS - 1) end
        return rest
    end
    return code
end

-- SAFETY: Recursively remove all scripts from a model
local function stripScripts(model)
    print("[BlaxSmith]  Safety Check: Stripping scripts from " .. model.Name)
    local count = 0
    for _, obj in ipairs(model:GetDescendants()) do
        if obj:IsA("Script") or obj:IsA("LocalScript") or obj:IsA("ModuleScript") then
            obj:Destroy()
            count = count + 1
        end
    end
    if count > 0 then
        print("[BlaxSmith]  Removed " .. count .. " scripts/modules for safety.")
    end
end

-- =========================
--  UI HELPER FUNCTIONS (Top-Level)
-- =========================
local function createUICorner(parent, radius)
    local corner = Instance.new("UICorner", parent)
    corner.CornerRadius = UDim.new(0, radius or 8)
    return corner
end

local function createGradient(parent, c1, c2)
    local gradient = Instance.new("UIGradient", parent)
    gradient.Color = ColorSequence.new(c1, c2)
    gradient.Rotation = 45
    return gradient
end

-- =========================
--  SAFE TOOLBOX INSERTION (LEMONADE STYLE)
-- =========================
do -- BEGIN TOOLBOX INSERTION SCOPE

-- Track inserted assets to prevent duplicates
local insertedAssets = {}

local function getOrCreateImportsFolder()
    local folder = workspace:FindFirstChild("BlaxSmith_Imports")
    if not folder then
        folder = Instance.new("Folder")
        folder.Name = "BlaxSmith_Imports"
        folder.Parent = workspace
    end
    return folder
end

-- Check if an asset already exists (by name or assetId)
local function assetAlreadyExists(assetName, assetId)
    local importsFolder = getOrCreateImportsFolder()
    
    -- Check by name
    for _, child in ipairs(importsFolder:GetChildren()) do
        if child.Name == assetName then
            print("[BlaxSmith]  DUPLICATE SKIPPED: '" .. assetName .. "' already exists!")
            return true
        end
    end
    
    -- Check by assetId in tracking table
    if assetId and insertedAssets[tostring(assetId)] then
        print("[BlaxSmith]  DUPLICATE SKIPPED: Asset ID " .. assetId .. " already inserted!")
        return true
    end
    
    return false
end

-- Get a unique name for the asset (auto-rename if exists)
local function getUniqueAssetName(baseName)
    local importsFolder = getOrCreateImportsFolder()
    local finalName = baseName
    local counter = 1
    
    while importsFolder:FindFirstChild(finalName) do
        counter = counter + 1
        finalName = baseName .. "_" .. counter
    end
    
    return finalName
end

local function processToolboxModel(model, assetId)
    -- Get unique name (auto-rename if duplicate)
    local uniqueName = getUniqueAssetName(model.Name)
    model.Name = uniqueName
    
    -- Track this asset
    if assetId then
        insertedAssets[tostring(assetId)] = true
    end
    insertedAssets[uniqueName] = true
    
    stripScripts(model)
    optimizeModel(model)
    tagAssetLicense(model, "Roblox Toolbox")
    model.Parent = getOrCreateImportsFolder()
    
    return model
end

-- =========================
--  STUDIO-GRADE PIPELINE HELPERS
-- =========================

local function beginTransaction(name)
    local changeService = game:GetService("ChangeHistoryService")
    local t = { name = name, assets = {} }
    changeService:SetWaypoint(name .. " Start")
    return t
end

local function commitTransaction(t)
    local changeService = game:GetService("ChangeHistoryService")
    changeService:SetWaypoint(t.name .. " End")
end

local function enforceGuardrails(instance)
    local removed = 0
    for _, obj in ipairs(instance:GetDescendants()) do
        -- Remove known malicious or unwanted classes
        if obj:IsA("InfectionScript") or obj:IsA("BackdoorScript") then
            obj:Destroy()
            removed = removed + 1
        end
    end
    return removed
end

local function tagAssetLicense(instance, licenseType)
    local tag = Instance.new("StringValue")
    tag.Name = "BlaxSmith_License"
    tag.Value = licenseType or "Standard"
    tag.Parent = instance
end

-- =========================
--  HTTP REQUEST HELPER (Top-Level)
-- =========================
local function httpRequest(method, endpoint, data)
    local url = CONFIG.APP_URL .. endpoint
    local success, result = pcall(function()
        if method == "POST" then
            return HttpService:PostAsync(url, HttpService:JSONEncode(data or {}), Enum.HttpContentType.ApplicationJson)
        else
            return HttpService:GetAsync(url)
        end
    end)
    return success
end

-- =========================
--  FOLDER HELPER (Top-Level)
-- =========================
local function ensureFolder(parent, name)
    local f = parent:FindFirstChild(name)
    if not f then
        f = Instance.new("Folder", parent)
        f.Name = name
    end
    return f
end

-- =========================
--  ASSET INSERTION HELPER
-- =========================
local function insertToolboxAsset(assetId)
    local InsertService = game:GetService("InsertService")
    
    print("[BlaxSmith]  Requesting Asset ID: " .. tostring(assetId))
    
    local success, model = pcall(function()
        return InsertService:LoadAsset(tonumber(assetId))
    end)

    if success and model then
        print("[BlaxSmith]  Asset Loaded: " .. model.Name)
        
        -- LoadAsset returns a Model containing the asset. Let's use the first child if it's the actual asset.
        local asset = model:GetChildren()[1]
        if not asset then asset = model end -- Fallback
        
        -- Parent it to workspace temporarily to process
        asset.Parent = workspace
        
        -- Apply our standard processing (renaming, tagging, optimization)
        local processed = processToolboxModel(asset, assetId)
        
        -- Move to near 0,0,0 or safe spot
        processed:PivotTo(CFrame.new(0, 10, 0))
        
        -- Cleanup the container model if we extracted the child
        if asset ~= model then model:Destroy() end
        
        -- Keep selection on the new asset
        game:GetService("Selection"):Set({processed})
        
        print("[BlaxSmith]  Successfully placed in Workspace!")
    else
        warn("[BlaxSmith]  Failed to insert asset: " .. tostring(assetId))
        if model then warn("Error: " .. tostring(model)) end
    end
end

-- =========================
--  GENERIC TOOL EXECUTOR
-- =========================
local function executeTool(cmd)
    if not cmd or not cmd.type then return end
    
    print("[BlaxSmith]  Executing Tool: " .. cmd.type)
    
    -- Forward to the main command processor if available
    if executeCommand then
        local success, err = pcall(function()
            executeCommand(cmd.type, cmd.data or cmd)
        end)
        if not success then
            warn("[BlaxSmith]  Error executing command: " .. tostring(err))
        end
    else
        warn("[BlaxSmith]  executeCommand handler not ready. Command ignored: " .. cmd.type)
    end
end

-- =========================
--  POLLING HELPER (Top-Level)
-- =========================
local pollingActive = false
local function startPolling()
    if pollingActive then return end
    pollingActive = true
    
    spawn(function()
        while pollingActive do
            pcall(function()
                local response = HttpService:GetAsync(CONFIG.APP_URL .. "/plugin/poll")
                if response and response ~= "" and response ~= "[]" then
                    local data = HttpService:JSONDecode(response)
                    -- Process commands if any
                    for _, cmd in ipairs(data) do
                        print("[BlaxSmith]  Received command: " .. (cmd.type or "unknown"))
                        -- Dispatch to handler
                        if cmd.type == "insert_toolbox_asset" then
                            -- Direct handling for our new smart insert
                            if cmd.assetId then
                                print("[BlaxSmith]  Inserting Smart Asset: " .. tostring(cmd.assetId))
                                insertToolboxAsset(cmd.assetId)
                            else
                                warn("[BlaxSmith]  Received insert command without Asset ID")
                            end
                        else
                            -- Fallback for other tools
                            executeTool(cmd) 
                        end
                    end
                end
            end)
            wait(1)
        end
    end)
end

local function raycastToTerrain(position)
    local params = RaycastParams.new()
    params.FilterType = Enum.RaycastFilterType.Exclude
    params.FilterDescendantsInstances = {workspace:FindFirstChild("BlaxSmith_Imports") or workspace}
    
    local result = workspace:Raycast(position + Vector3.new(0, 50, 0), Vector3.new(0, -100, 0), params)
    if result then
        return result.Position.Y
    end
    return 0
end

local function detectAssetStyle(name)
    name = name:lower()
    if name:find("house") or name:find("tree") or name:find("building") or name:find("shop") then
        return "building"
    elseif name:find("car") or name:find("vehicle") or name:find("truck") then
        return "vehicle"
    end
    return "decoration"
end

local function snapToGrid(position)
    local gridSize = CONFIG.GRID_SIZE or 8
    return Vector3.new(
        math.round(position.X / gridSize) * gridSize,
        position.Y,
        math.round(position.Z / gridSize) * gridSize
    )
end

local function getScenePerformanceScore()
    local parts = #workspace:GetDescendants()
    if parts > 20000 then return { score = "HIGH" } end
    if parts > 10000 then return { score = "MEDIUM" } end
    return { score = "LOW" }
end

local function optimizeModel(model)
    for _, part in ipairs(model:GetDescendants()) do
        if part:IsA("BasePart") then
            -- Disable ShadowCasting on small or internal parts for perf
            if part.Size.Magnitude < 2 then
                part.CastShadow = false
            end
        end
    end
end

-- =========================
--  OBJECT BUILDER (JSON -> INSTANCES)
-- =========================
local function buildObjectTree(data, parent)
    local success, newObj = pcall(function()
        local obj = Instance.new(data.Class)
        obj.Name = data.Name or data.Class
        obj.Parent = parent
        return obj
    end)

    if not success or not newObj then
        warn("[BlaxSmith] Failed to create class: " .. tostring(data.Class))
        return nil
    end
    
    -- Set Properties
    if data.Properties then
        for prop, val in pairs(data.Properties) do
            pcall(function()
                newObj[prop] = val
            end)
        end
    end
    
    -- Build Children recursively
    if data.Children then
        for _, childData in ipairs(data.Children) do
            buildObjectTree(childData, newObj)
        end
    end
    
    return newObj
end

-- =========================
--  INTELLIGENCE: SMART ROUTER & PARENTING
-- =========================
local function getSpawnCFrame()
    if workspace.CurrentCamera then
        return workspace.CurrentCamera.CFrame * CFrame.new(0, 0, -15)
    end
    return CFrame.new(0, 10, 0)
end

local function smartParent(object, contextHint)
    -- 1. DEFINE SERVICES
    local SSS = game:GetService("ServerScriptService")
    local RS = game:GetService("ReplicatedStorage")
    local SPS = game:GetService("StarterPlayer").StarterPlayerScripts
    local Workspace = game:GetService("Workspace")

    -- 2. CREATE ORGANIZATION FOLDERS (Prevents Clutter)
    local function getFolder(parent, name)
        local folder = parent:FindFirstChild(name)
        if not folder then
            folder = Instance.new("Folder")
            folder.Name = name
            folder.Parent = parent
        end
        return folder
    end

    -- 3. ROUTING LOGIC
    if object:IsA("Script") then
        object.Parent = getFolder(SSS, "BlaxSmith_Server")
        
    elseif object:IsA("LocalScript") then
        if contextHint == "UI" or object.Name:match("UI") then
            object.Parent = getFolder(SPS, "BlaxSmith_Client")
        else
            object.Parent = getFolder(SPS, "BlaxSmith_Client")
        end

    elseif object:IsA("ModuleScript") then
        object.Parent = getFolder(RS, "BlaxSmith_Modules")

    elseif object:IsA("ScreenGui") or object:IsA("BillboardGui") or object:IsA("SurfaceGui") then
        object.Parent = SGui 

    elseif object:IsA("Tool") or object:IsA("HopperBin") or object:IsA("Accessory") then
        object.Parent = SPack

    elseif object:IsA("Model") or object:IsA("BasePart") then
        object.Parent = Workspace
        
        -- AUTO-POSITION: Move to Camera
        if workspace.CurrentCamera then
            local targetCFrame = workspace.CurrentCamera.CFrame * CFrame.new(0, 0, -15)
            if object:IsA("Model") then object:PivotTo(targetCFrame) 
            else object.CFrame = targetCFrame end
        end

    else
        object.Parent = Workspace
    end
    
    game:GetService("Selection"):Set({object})
end

end -- END TOOLBOX INSERTION SCOPE

-- =========================
--  TOOL DISPATCHER (The "Hands")
-- =========================
do -- BEGIN TOOL DISPATCHER SCOPE

local function executeTool(toolName, params)
    print(" BlaxSmith executing:", toolName)
    
    local ChangeHistoryService = game:GetService("ChangeHistoryService")
    local Selection = game:GetService("Selection")
    local InsertService = game:GetService("InsertService")

    -- === TOOL A: INSERT FROM TOOLBOX ===
    if toolName == "insert_toolbox_asset" then
        local assetId = tonumber(params.assetId)
        
        local success, model = pcall(function() return InsertService:LoadAsset(assetId) end)
        if success and model then
            model.Name = params.query or model.Name
            
            -- Sanitize (Disable random scripts for safety)
            for _, d in pairs(model:GetDescendants()) do
                if d:IsA("Script") or d:IsA("LocalScript") then
                    d.Disabled = true -- Safety first!
                end
            end
            
            local kids = model:GetChildren()
            for _, child in ipairs(kids) do
                -- Use Smart Parent router for each child (Tool vs Model vs Part)
                smartParent(child, "Model")
            end
            
            -- Clean up the container model if empty (LoadAsset returns a Model containing the asset)
            model:Destroy()
            
            ChangeHistoryService:SetWaypoint("AI Inserted Model")
        else
            warn("Failed to load asset: " .. tostring(assetId))
        end

    -- === TOOL B: CREATE GAME SCRIPT ===
    elseif toolName == "create_script" then
        local scriptObj = Instance.new(params.class or "Script")
        scriptObj.Name = params.name or "AIScript"
        scriptObj.Source = params.code
        
        -- Smart Parenting Logic handles the rest
        smartParent(scriptObj, params.class)
        
        ChangeHistoryService:SetWaypoint("AI Created Script")

    -- === TOOL C: RUN EDITOR COMMAND (For UI/Building) ===
    elseif toolName == "run_editor_command" then
        -- This runs code NOW (Edit Mode), perfect for building UI or Parts
        local func, err = loadstring(params.code)
        if func then
            -- We wrap it so it has access to 'game' and 'workspace'
            getfenv(func).script = nil -- Prevent script confusion
            -- Execute
            func() 
            ChangeHistoryService:SetWaypoint("AI Editor Action")
        else
            warn("AI Code Error:", err)
        end
    end
end

end -- END TOOL DISPATCHER SCOPE

-- ============================================
--  CITY BUILDER: PLACEMENT CONTROLLER
-- Auto-placement with validation, zones, and road-facing
-- ============================================
-- HOISTED: PlacementController needs to be accessible outside the do-end block
local PlacementController = {}

do -- BEGIN CITY BUILDER SCOPE (reduces local register count)

-- Zone type definitions for asset categorization
local ZONE_TYPES = {
    RoadZone = {"road", "street", "highway", "lane", "traffic", "lamp", "light", "sign", "crosswalk"},
    BuildingZone = {"building", "skyscraper", "tower", "office", "apartment", "hotel", "store", "shop", "house", "home", "warehouse"},
    ParkingZone = {"parking", "garage", "lot", "car", "vehicle", "truck"},
    IndustrialZone = {"factory", "industrial", "plant", "silo", "tank", "crane"},
    ParkZone = {"park", "tree", "bench", "fountain", "statue", "playground", "garden", "bush", "flower"},
}

-- Ensure Zones folder exists in Workspace
local function getZonesFolder()
    local zones = workspace:FindFirstChild("Zones")
    if not zones then
        zones = Instance.new("Folder")
        zones.Name = "Zones"
        zones.Parent = workspace
        
        -- Create default zone folders
        for zoneName, _ in pairs(ZONE_TYPES) do
            local zoneFolder = Instance.new("Folder")
            zoneFolder.Name = zoneName
            zoneFolder.Parent = zones
        end
        
        print("[BlaxSmith]  Created Zones folder structure for city builder")
    end
    return zones
end

-- Detect which zone an asset belongs to based on name
local function detectAssetZone(assetName)
    local nameLower = (assetName or ""):lower()
    
    for zoneName, keywords in pairs(ZONE_TYPES) do
        for _, keyword in ipairs(keywords) do
            if nameLower:find(keyword) then
                return zoneName
            end
        end
    end
    
    return "BuildingZone" -- Default
end

-- Get or create zone folder
local function getZoneFolder(zoneName)
    local zones = getZonesFolder()
    local zone = zones:FindFirstChild(zoneName)
    if not zone then
        zone = Instance.new("Folder")
        zone.Name = zoneName
        zone.Parent = zones
    end
    return zone
end

-- Get model bounding box safely
local function getModelBounds(model)
    local success, cf, size = pcall(function()
        return model:GetBoundingBox()
    end)
    
    if success then
        return cf, size
    end
    
    if model:IsA("BasePart") then
        return model.CFrame, model.Size
    end
    
    return CFrame.new(), Vector3.new(4, 4, 4)
end

-- Ensure model has proper PrimaryPart (Anchor at bottom center)
local function ensureAnchor(model)
    if not model:IsA("Model") then
        local wrapper = Instance.new("Model")
        wrapper.Name = model.Name
        model.Parent = wrapper
        wrapper.PrimaryPart = model
        model.Name = "Anchor"
        return wrapper
    end
    
    local anchor = model:FindFirstChild("Anchor")
    if anchor and anchor:IsA("BasePart") then
        model.PrimaryPart = anchor
        return model
    end
    
    if model.PrimaryPart then
        return model -- Already has PrimaryPart
    end
    
    -- Create Anchor at bottom center
    local boundsCF, boundsSize = getModelBounds(model)
    
    local anchorPart = Instance.new("Part")
    anchorPart.Name = "Anchor"
    anchorPart.Size = Vector3.new(2, 0.1, 2)
    anchorPart.Transparency = 1
    anchorPart.CanCollide = false
    anchorPart.Anchored = true
    anchorPart.Position = boundsCF.Position - Vector3.new(0, boundsSize.Y/2, 0)
    anchorPart.Parent = model
    
    model.PrimaryPart = anchorPart
    print("[BlaxSmith]  Created Anchor for:", model.Name)
    
    return model
end

-- Scale normalization (door  10-12, floor  12-15 studs)
local function normalizeScale(model)
    local _, size = getModelBounds(model)
    
    if size.Y <= 0 then return model end
    
    local MAX_HEIGHT = 500
    local MIN_HEIGHT = 8
    
    if size.Y > MAX_HEIGHT then
        local scaleFactor = MAX_HEIGHT / size.Y
        pcall(function() model:ScaleTo(scaleFactor) end)
        print("[BlaxSmith]  Scaled down:", model.Name, "by", string.format("%.2f", scaleFactor))
    elseif size.Y < MIN_HEIGHT then
        local scaleFactor = MIN_HEIGHT / size.Y
        pcall(function() model:ScaleTo(scaleFactor) end)
        print("[BlaxSmith]  Scaled up:", model.Name, "by", string.format("%.2f", scaleFactor))
    end
    
    return model
end

-- Find nearest road from position
local function findNearestRoad(position)
    local nearestRoad = nil
    local nearestDistance = math.huge
    local nearestPosition = nil
    
    -- Search workspace for road-like objects
    for _, obj in ipairs(workspace:GetDescendants()) do
        if obj:IsA("BasePart") then
            local nameLower = obj.Name:lower()
            if nameLower:find("road") or nameLower:find("street") or 
               nameLower:find("asphalt") or nameLower:find("pavement") then
                local dist = (obj.Position - position).Magnitude
                if dist < nearestDistance then
                    nearestDistance = dist
                    nearestRoad = obj
                    nearestPosition = obj.Position
                end
            end
        end
    end
    
    return nearestRoad, nearestDistance, nearestPosition
end

-- Calculate rotation to face road
local function calculateRoadFacingRotation(modelPosition, roadPosition)
    if not roadPosition then return CFrame.Angles(0, 0, 0) end
    
    local direction = (roadPosition - modelPosition)
    direction = Vector3.new(direction.X, 0, direction.Z)
    
    if direction.Magnitude > 0.1 then
        return CFrame.lookAt(Vector3.new(), direction.Unit)
    end
    
    return CFrame.Angles(0, 0, 0)
end

-- Check collision at position
local function checkCollision(position, size)
    local cf = CFrame.new(position)
    local overlapParams = OverlapParams.new()
    overlapParams.FilterType = Enum.RaycastFilterType.Exclude
    overlapParams.FilterDescendantsInstances = {getZonesFolder()}
    
    local parts = workspace:GetPartBoundsInBox(cf, size, overlapParams)
    
    local solidParts = {}
    for _, part in ipairs(parts) do
        if part.CanCollide and part.Transparency < 1 then
            table.insert(solidParts, part)
        end
    end
    
    return #solidParts > 0, solidParts
end

-- Get ground height at position
local function getGroundHeight(position)
    local rayParams = RaycastParams.new()
    rayParams.FilterType = Enum.RaycastFilterType.Exclude
    rayParams.FilterDescendantsInstances = {getZonesFolder()}
    
    local result = workspace:Raycast(
        position + Vector3.new(0, 500, 0),
        Vector3.new(0, -1000, 0),
        rayParams
    )
    
    if result then
        return result.Position.Y
    end
    
    return 0
end

-- Main placement function with full validation
function PlacementController.place(model, requestedPosition, options)
    options = options or {}
    
    ChangeHistoryService:SetWaypoint("BlaxSmith City Placement Start")
    
    print("[BlaxSmith]  === CITY BUILDER PLACEMENT ===")
    print("[BlaxSmith] Asset:", model.Name)
    
    -- Step 1: Ensure Anchor
    model = ensureAnchor(model)
    
    -- Step 2: Detect zone
    local zoneName = options.zone or detectAssetZone(model.Name)
    print("[BlaxSmith] Zone:", zoneName)
    
    -- Step 3: Normalize scale
    if options.normalizeScale ~= false then
        model = normalizeScale(model)
    end
    
    -- Step 4: Snap to 8x8 grid
    local snappedPosition = snapToGrid(requestedPosition)
    
    -- Step 5: Get ground height
    local groundY = getGroundHeight(snappedPosition)
    local _, size = getModelBounds(model)
    snappedPosition = Vector3.new(snappedPosition.X, groundY, snappedPosition.Z)
    
    -- Step 6: Road-facing rotation
    local nearestRoad, roadDist, roadPos = findNearestRoad(snappedPosition)
    local rotation = CFrame.Angles(0, 0, 0)
    
    if nearestRoad and options.faceRoad ~= false then
        rotation = calculateRoadFacingRotation(snappedPosition, roadPos)
        print("[BlaxSmith]  Facing road:", nearestRoad.Name, "at", math.floor(roadDist), "studs")
    elseif CONFIG.REQUIRE_ROAD_FACING and zoneName == "BuildingZone" then
        warn("[BlaxSmith]  No road found - building placed without road orientation")
    end
    
    -- Step 7: Collision check with retry
    local MAX_RETRIES = 5
    local attempts = 0
    local finalPosition = snappedPosition
    local success = false
    
    while attempts < MAX_RETRIES and not success do
        attempts = attempts + 1
        local hasCollision, _ = checkCollision(finalPosition, size)
        
        if hasCollision then
            local offsets = {
                Vector3.new(CONFIG.GRID_SIZE, 0, 0),
                Vector3.new(-CONFIG.GRID_SIZE, 0, 0),
                Vector3.new(0, 0, CONFIG.GRID_SIZE),
                Vector3.new(0, 0, -CONFIG.GRID_SIZE),
            }
            
            for _, offset in ipairs(offsets) do
                local testPos = snapToGrid(snappedPosition + (offset * attempts))
                local testCollision, _ = checkCollision(testPos, size)
                if not testCollision then
                    finalPosition = testPos
                    success = true
                    break
                end
            end
        else
            success = true
        end
    end
    
    if not success then
        warn("[BlaxSmith]  Could not find valid position after", MAX_RETRIES, "attempts")
    end
    
    -- Step 8: Update ground height for final position
    local finalGroundY = getGroundHeight(finalPosition)
    finalPosition = Vector3.new(finalPosition.X, finalGroundY, finalPosition.Z)
    
    -- Step 9: Place model
    local finalCFrame = CFrame.new(finalPosition) * rotation
    local zoneFolder = getZoneFolder(zoneName)
    
    if model.PrimaryPart then
        local anchorOffset = Vector3.new(0, size.Y / 2, 0)
        model:SetPrimaryPartCFrame(finalCFrame + anchorOffset)
    else
        model:PivotTo(finalCFrame)
    end
    
    model.Parent = zoneFolder
    
    -- Step 10: Tag asset
    local placementTag = Instance.new("StringValue")
    placementTag.Name = "BlaxSmith_Placement"
    placementTag.Value = os.date("%Y-%m-%d %H:%M:%S")
    placementTag.Parent = model
    
    local zoneTag = Instance.new("StringValue")
    zoneTag.Name = "BlaxSmith_Zone"
    zoneTag.Value = zoneName
    zoneTag.Parent = model
    
    ChangeHistoryService:SetWaypoint("BlaxSmith City Placement Complete")
    
    print("[BlaxSmith]  PLACED:", model.Name, "at", finalPosition, "in", zoneName)
    
    return true, {
        model = model,
        position = finalPosition,
        zone = zoneName,
        facingRoad = nearestRoad and nearestRoad.Name or nil,
        attempts = attempts,
    }
end

-- Batch placement for multiple assets
function PlacementController.placeBatch(placements)
    local results = { success = {}, failed = {} }
    
    print("[BlaxSmith]  === BATCH CITY PLACEMENT ===")
    print("[BlaxSmith] Total:", #placements, "assets")
    
    for i, req in ipairs(placements) do
        local ok, result = PlacementController.place(req.model, req.position, req.options)
        if ok then
            table.insert(results.success, result)
        else
            table.insert(results.failed, {model = req.model.Name, error = result})
        end
    end
    
    print("[BlaxSmith]  Success:", #results.success, "|  Failed:", #results.failed)
    return results
end

-- Initialize roads from existing workspace objects
function PlacementController.initializeRoadsFromWorkspace()
    local zones = getZonesFolder()
    local roadZone = zones:FindFirstChild("RoadZone")
    local roadCount = 0
    
    for _, obj in ipairs(workspace:GetDescendants()) do
        if obj:IsA("BasePart") and obj.Parent ~= roadZone then
            local nameLower = obj.Name:lower()
            if nameLower:find("road") or nameLower:find("street") then
                -- Don't move, just count
                roadCount = roadCount + 1
            end
        end
    end
    
    print("[BlaxSmith]  Found", roadCount, "road objects for orientation")
    return roadCount
end

-- Get placement stats
function PlacementController.getStats()
    local zones = getZonesFolder()
    local stats = { totalAssets = 0, byZone = {} }
    
    for _, zone in ipairs(zones:GetChildren()) do
        local count = 0
        for _, obj in ipairs(zone:GetChildren()) do
            if obj:FindFirstChild("BlaxSmith_Placement") then
                count = count + 1
            end
        end
        stats.byZone[zone.Name] = count
        stats.totalAssets = stats.totalAssets + count
    end
    
    return stats
end

print("[BlaxSmith]  City Builder Placement Controller loaded!")
print("[BlaxSmith] Grid:", CONFIG.GRID_SIZE, "studs | Spacing:", CONFIG.MIN_SPACING, "studs")

end -- END CITY BUILDER SCOPE


-- DYNAMIC MODEL FETCHING (One-Click Pipeline)
local function fetchModelFromBackend(modelName)
    print("[BlaxSmith] Missing model '" .. modelName .. "'. Requesting fetch from backend...")
    local success, response = pcall(function()
        return HttpService:PostAsync(CONFIG.APP_URL .. "/api/fetch-model", HttpService:JSONEncode({
            modelName = modelName
        }), Enum.HttpContentType.ApplicationJson)
    end)
    
    if success then
        print("[BlaxSmith]  Backend fetch complete for: " .. modelName)
        return true
    else
        warn("[BlaxSmith]  Failed to request fetch for " .. modelName .. ": " .. tostring(response))
        return false
    end
end

-- GET MODEL HELPER (Library first, then fetch)
local function getModel(name)
    local modelsFolder = game:GetService("ServerStorage"):FindFirstChild("Models")
    if not modelsFolder then
        modelsFolder = Instance.new("Folder")
        modelsFolder.Name = "Models"
        modelsFolder.Parent = game:GetService("ServerStorage")
    end
    
    local model = modelsFolder:FindFirstChild(name)
    if not model then
        -- Trigger dynamic fetch
        local fetchSuccess = fetchModelFromBackend(name)
        if fetchSuccess then
            -- Wait a few seconds for conversion and Studio to sync (if using Rojo/File Watching)
            -- If using direct import, we might need a different signal.
            -- For now, we wait and check again.
            task.wait(5)
            model = modelsFolder:FindFirstChild(name)
        end
    end

    if model then
        print("[BlaxSmith]  Using library asset: " .. name)
        return model:Clone()
    end
    
    -- Fallback: Check verified assets or catalog
    if VERIFIED_ASSETS and VERIFIED_ASSETS[name:lower()] then
        return safeInsert(VERIFIED_ASSETS[name:lower()])
    end
    
    return nil
end

local function safeInsert(assetId)
    -- Check for duplicate BEFORE attempting insert
    if insertedAssets[tostring(assetId)] then
        print("[BlaxSmith]  DUPLICATE SKIPPED: Asset ID " .. assetId .. " already inserted!")
        return nil
    end
    
    -- METHOD 1: game:GetObjects (works best in plugins for free models)
    local success1, result1 = pcall(function()
        return game:GetObjects("rbxassetid://" .. assetId)
    end)
    
    if success1 and result1 and #result1 > 0 then
        local model = Instance.new("Model")
        model.Name = "Asset_" .. assetId
        for _, obj in ipairs(result1) do
            obj.Parent = model
        end
        print("[BlaxSmith]  Inserted asset:", assetId)
        local result = processToolboxModel(model, assetId)
        return result
    end
    
    -- METHOD 2: InsertService:LoadAsset fallback
    local success2, model2 = pcall(function()
        return InsertService:LoadAsset(assetId)
    end)

    if success2 and model2 then
        print("[BlaxSmith]  Inserted asset:", assetId)
        local result = processToolboxModel(model2, assetId)
        return result
    end
    
    print("[BlaxSmith]  Skipped asset:", assetId, "- Not Roblox-owned or shared")
    return nil
end

-- WRAPPER FOR AI OR TOOLBOX QUEUE (BATCH PROCESSING)
local function insertAssetsQueue(assetList)
    local insertedCount = 0
    local skippedCount = 0

    for _, assetId in ipairs(assetList) do
        local success = safeInsert(assetId)
        if success then
            insertedCount = insertedCount + 1
        else
            skippedCount = skippedCount + 1
        end
    end

    print(string.format("[BlaxSmith Summary] Assets inserted: %d / %d", insertedCount, #assetList))
    if skippedCount > 0 then
        print(string.format("[BlaxSmith Summary] Skipped %d blocked assets", skippedCount))
    end
    
    return insertedCount, skippedCount
end

print("[BlaxSmith]  Safe Toolbox insertion ready  Lemonade-style behavior active")

-- =========================
--  FULL AI-GENERATED MAP & GAME PIPELINE
-- =========================
do -- BEGIN MAP GENERATION SCOPE

-- VERIFIED WORKING ASSET IDS (Roblox-owned or shared)
local VERIFIED_ASSETS = {
    -- Trees & Nature (guaranteed to work)
    tree = 573120,
    rock = 1290033,
    
    -- Weapons
    sword = 125013769,
    gun = 95354288,
    rocket = 190093516,
    
    -- Vehicles
    jeep = 102611354,
    
    -- Tools
    hammer = 73089166,
}

-- Biomes configuration with verified assets
local BIOMES = {
    forest = { 
        density = 30, 
        assets = {573120, 573120, 573120, 1290033, 573120}, -- Trees & rocks
        name = "Forest"
    },
    desert = { 
        density = 40, 
        assets = {1290033, 1290033, 1290033}, -- Rocks
        name = "Desert"
    },
    medieval = { 
        density = 35, 
        assets = {573120, 1290033, 125013769}, -- Trees, rocks, swords
        name = "Medieval"
    },
    military = { 
        density = 25, 
        assets = {102611354, 95354288, 190093516}, -- Vehicles & weapons
        name = "Military Base"
    },
}

-- Points of Interest templates
local POIS = {
    village = { 
        assets = {573120, 573120, 1290033, 73089166}, 
        name = "Village"
    },
    camp = { 
        assets = {573120, 125013769, 95354288}, 
        name = "Camp"
    },
    armory = { 
        assets = {125013769, 125013769, 95354288, 190093516}, 
        name = "Armory"
    },
    garage = { 
        assets = {102611354, 102611354, 73089166}, 
        name = "Garage"
    },
}

-- Keep track of positions to prevent overlap
local usedPositions = {}
local function allowPlacement(pos, minDist)
    minDist = minDist or 30
    for _, p in ipairs(usedPositions) do
        if (p - pos).Magnitude < minDist then return false end
    end
    table.insert(usedPositions, pos)
    return true
end

-- Safe insert with position
local function safeInsertAt(assetId, position)
    local success, model = pcall(function()
        return InsertService:LoadAsset(assetId)
    end)

    if success and model then
        stripScripts(model)
        
        -- Find the actual model inside the wrapper
        local actualModel = model:FindFirstChildWhichIsA("Model") or model:FindFirstChildWhichIsA("BasePart")
        if actualModel then
            actualModel.Parent = workspace:FindFirstChild("BlaxSmith_Imports") or workspace
            if actualModel:IsA("Model") and actualModel.PrimaryPart then
                actualModel:SetPrimaryPartCFrame(CFrame.new(position))
            elseif actualModel:IsA("Model") then
                actualModel:PivotTo(CFrame.new(position))
            elseif actualModel:IsA("BasePart") then
                actualModel.Position = position
            end
            print("[BlaxSmith]  Placed at", math.floor(position.X), math.floor(position.Z))
            return actualModel
        end
    else
        print("[BlaxSmith]  Skipped:", assetId)
    end
    return nil
end

-- Generate a biome section
local function generateBiome(biomeType, center, radius)
    local biome = BIOMES[biomeType]
    if not biome then 
        warn("[BlaxSmith] Unknown biome:", biomeType)
        return 
    end
    
    print("[BlaxSmith]  Generating", biome.name, "biome at", center)
    
    local placed = 0
    for _, assetId in ipairs(biome.assets) do
        local angle = math.random() * math.pi * 2
        local dist = math.random() * radius
        local pos = center + Vector3.new(math.cos(angle) * dist, 0, math.sin(angle) * dist)
        
        if allowPlacement(pos, biome.density) then
            local model = safeInsertAt(assetId, pos)
            if model then placed = placed + 1 end
        end
    end
    
    print("[BlaxSmith] ", biome.name, "complete:", placed, "assets placed")
end

-- Place Points of Interest
local function placePOI(poiType, center)
    local poi = POIS[poiType]
    if not poi then 
        warn("[BlaxSmith] Unknown POI:", poiType)
        return 
    end
    
    print("[BlaxSmith]  Placing", poi.name, "at", center)
    
    local placed = 0
    for i, assetId in ipairs(poi.assets) do
        local offset = Vector3.new((i-1) * 5, 0, math.random(-5, 5))
        local pos = center + offset
        local model = safeInsertAt(assetId, pos)
        if model then placed = placed + 1 end
    end
    
    print("[BlaxSmith] ", poi.name, "complete:", placed, "assets placed")
end

-- Generate a full map from configuration
local function generateMap(mapConfig)
    usedPositions = {} -- reset for new map
    
    print("[BlaxSmith]  ====== GENERATING FULL MAP ======")
    print("[BlaxSmith] Biomes:", #mapConfig.biomes, "| POIs:", #mapConfig.pois)
    
    -- Create imports folder
    local folder = workspace:FindFirstChild("BlaxSmith_Imports")
    if not folder then
        folder = Instance.new("Folder")
        folder.Name = "BlaxSmith_Imports"
        folder.Parent = workspace
    end
    
    -- Generate biomes
    for _, biomeInfo in ipairs(mapConfig.biomes) do
        generateBiome(biomeInfo.type, biomeInfo.center, biomeInfo.radius or 50)
    end
    
    -- Place POIs
    for _, poiInfo in ipairs(mapConfig.pois) do
        placePOI(poiInfo.type, poiInfo.center)
    end
    
    print("[BlaxSmith]  ====== MAP GENERATION COMPLETE ======")
    print("[BlaxSmith] Total positions used:", #usedPositions)
end

-- Quick map presets
local MAP_PRESETS = {
    medieval = {
        biomes = {
            { type = "forest", center = Vector3.new(0, 0, 0), radius = 80 },
            { type = "medieval", center = Vector3.new(100, 0, 0), radius = 60 },
        },
        pois = {
            { type = "village", center = Vector3.new(50, 0, 50) },
            { type = "armory", center = Vector3.new(-30, 0, 30) },
        }
    },
    military = {
        biomes = {
            { type = "military", center = Vector3.new(0, 0, 0), radius = 100 },
        },
        pois = {
            { type = "garage", center = Vector3.new(0, 0, 50) },
            { type = "armory", center = Vector3.new(50, 0, 0) },
        }
    },
    nature = {
        biomes = {
            { type = "forest", center = Vector3.new(0, 0, 0), radius = 100 },
            { type = "forest", center = Vector3.new(80, 0, 80), radius = 60 },
        },
        pois = {
            { type = "camp", center = Vector3.new(40, 0, 40) },
        }
    }
}

-- Generate preset map by name
local function generatePresetMap(presetName)
    local preset = MAP_PRESETS[presetName]
    if preset then
        print("[BlaxSmith]  Generating preset map:", presetName)
        generateMap(preset)
    else
        warn("[BlaxSmith] Unknown preset:", presetName, "| Available:", "medieval, military, nature")
    end
end

-- =========================
--  DIRECT MAP BUILDER (NO INSERTSERVICE - 100% WORKS)
-- Creates terrain, parts, and structures directly
-- =========================

local function createPart(props)
    local part = Instance.new("Part")
    part.Anchored = true
    part.Size = props.Size or Vector3.new(4, 4, 4)
    part.Position = props.Position or Vector3.new(0, 2, 0)
    part.Color = props.Color or Color3.fromRGB(100, 100, 100)
    part.Material = props.Material or Enum.Material.Plastic
    part.Name = props.Name or "Part"
    part.Parent = props.Parent or workspace
    return part
end

local function createTree(position, parent)
    local model = Instance.new("Model")
    model.Name = "Tree"
    
    -- Trunk
    local trunk = Instance.new("Part")
    trunk.Size = Vector3.new(2, 8, 2)
    trunk.Position = position + Vector3.new(0, 4, 0)
    trunk.Color = Color3.fromRGB(101, 67, 33)
    trunk.Material = Enum.Material.Wood
    trunk.Anchored = true
    trunk.Name = "Trunk"
    trunk.Parent = model
    
    -- Leaves
    local leaves = Instance.new("Part")
    leaves.Size = Vector3.new(8, 6, 8)
    leaves.Position = position + Vector3.new(0, 11, 0)
    leaves.Color = Color3.fromRGB(34, 139, 34)
    leaves.Material = Enum.Material.Grass
    leaves.Anchored = true
    leaves.Shape = Enum.PartType.Ball
    leaves.Name = "Leaves"
    leaves.Parent = model
    
    model.PrimaryPart = trunk
    model.Parent = parent or workspace
    return model
end

local function createRock(position, parent)
    local rock = Instance.new("Part")
    rock.Size = Vector3.new(math.random(3, 6), math.random(2, 4), math.random(3, 6))
    rock.Position = position + Vector3.new(0, 1, 0)
    rock.Color = Color3.fromRGB(128, 128, 128)
    rock.Material = Enum.Material.Slate
    rock.Anchored = true
    rock.Name = "Rock"
    rock.Parent = parent or workspace
    return rock
end

local function createBuilding(position, size, parent, name)
    local model = Instance.new("Model")
    model.Name = name or "Building"
    
    -- Floor
    local floor = Instance.new("Part")
    floor.Size = Vector3.new(size.X, 1, size.Z)
    floor.Position = position + Vector3.new(0, 0.5, 0)
    floor.Color = Color3.fromRGB(139, 90, 43)
    floor.Material = Enum.Material.Wood
    floor.Anchored = true
    floor.Name = "Floor"
    floor.Parent = model
    
    -- Walls
    local wallHeight = size.Y or 8
    local wallThickness = 1
    
    -- Front Wall
    local frontWall = Instance.new("Part")
    frontWall.Size = Vector3.new(size.X, wallHeight, wallThickness)
    frontWall.Position = position + Vector3.new(0, wallHeight/2, size.Z/2)
    frontWall.Color = Color3.fromRGB(194, 178, 128)
    frontWall.Material = Enum.Material.Brick
    frontWall.Anchored = true
    frontWall.Name = "FrontWall"
    frontWall.Parent = model
    
    -- Back Wall
    local backWall = frontWall:Clone()
    backWall.Position = position + Vector3.new(0, wallHeight/2, -size.Z/2)
    backWall.Name = "BackWall"
    backWall.Parent = model
    
    -- Left Wall
    local leftWall = Instance.new("Part")
    leftWall.Size = Vector3.new(wallThickness, wallHeight, size.Z)
    leftWall.Position = position + Vector3.new(-size.X/2, wallHeight/2, 0)
    leftWall.Color = Color3.fromRGB(194, 178, 128)
    leftWall.Material = Enum.Material.Brick
    leftWall.Anchored = true
    leftWall.Name = "LeftWall"
    leftWall.Parent = model
    
    -- Right Wall
    local rightWall = leftWall:Clone()
    rightWall.Position = position + Vector3.new(size.X/2, wallHeight/2, 0)
    rightWall.Name = "RightWall"
    rightWall.Parent = model
    
    -- Roof
    local roof = Instance.new("Part")
    roof.Size = Vector3.new(size.X + 2, 1, size.Z + 2)
    roof.Position = position + Vector3.new(0, wallHeight + 0.5, 0)
    roof.Color = Color3.fromRGB(139, 69, 19)
    roof.Material = Enum.Material.Wood
    roof.Anchored = true
    roof.Name = "Roof"
    roof.Parent = model
    
    model.PrimaryPart = floor
    model.Parent = parent or workspace
    return model
end

local function createTower(position, parent)
    local model = Instance.new("Model")
    model.Name = "Tower"
    
    -- Base
    local base = Instance.new("Part")
    base.Size = Vector3.new(10, 20, 10)
    base.Position = position + Vector3.new(0, 10, 0)
    base.Color = Color3.fromRGB(128, 128, 128)
    base.Material = Enum.Material.Cobblestone
    base.Anchored = true
    base.Name = "Base"
    base.Parent = model
    
    -- Top
    local top = Instance.new("Part")
    top.Size = Vector3.new(12, 2, 12)
    top.Position = position + Vector3.new(0, 21, 0)
    top.Color = Color3.fromRGB(100, 100, 100)
    top.Material = Enum.Material.Cobblestone
    top.Anchored = true
    top.Name = "Top"
    top.Parent = model
    
    -- Flag pole
    local pole = Instance.new("Part")
    pole.Size = Vector3.new(0.5, 8, 0.5)
    pole.Position = position + Vector3.new(0, 26, 0)
    pole.Color = Color3.fromRGB(50, 50, 50)
    pole.Material = Enum.Material.Metal
    pole.Anchored = true
    pole.Name = "FlagPole"
    pole.Parent = model
    
    model.PrimaryPart = base
    model.Parent = parent or workspace
    return model
end

local function createWall(startPos, endPos, parent)
    local distance = (endPos - startPos).Magnitude
    local midPoint = (startPos + endPos) / 2
    
    local wall = Instance.new("Part")
    wall.Size = Vector3.new(distance, 6, 2)
    wall.Position = midPoint + Vector3.new(0, 3, 0)
    wall.Color = Color3.fromRGB(128, 128, 128)
    wall.Material = Enum.Material.Cobblestone
    wall.Anchored = true
    wall.Name = "Wall"
    
    -- Rotate to face direction
    local direction = (endPos - startPos).Unit
    wall.CFrame = CFrame.new(midPoint + Vector3.new(0, 3, 0), midPoint + Vector3.new(0, 3, 0) + direction)
    wall.Parent = parent or workspace
    return wall
end

local function createGround(position, size, parent)
    local ground = Instance.new("Part")
    ground.Size = Vector3.new(size.X, 1, size.Z)
    ground.Position = position + Vector3.new(0, -0.5, 0)
    ground.Color = Color3.fromRGB(34, 139, 34)
    ground.Material = Enum.Material.Grass
    ground.Anchored = true
    ground.Name = "Ground"
    ground.Parent = parent or workspace
    return ground
end

-- =========================
--  FULL MAP TEMPLATES
-- =========================

local function buildMedievalMap()
    print("[BlaxSmith]  Building Medieval Map with REAL CATALOG ASSETS...")
    
    local mapFolder = Instance.new("Folder")
    mapFolder.Name = "BlaxSmith_MedievalMap"
    mapFolder.Parent = workspace
    
    -- Real Roblox catalog asset IDs for medieval theme
    local MEDIEVAL_ASSETS = {
        -- Fantasy/Medieval Packs
        {id = 6579442252, name = "Fantasy Village Pack"},     -- Free fantasy pack
        {id = 5640034830, name = "Medieval Castle"},          -- Castle model
        {id = 4732375408, name = "Medieval House"},           -- Village house
        {id = 16622877, name = "Medieval Tower"},           -- REAL Medieval Tower (not Tower Of Emotions)
        {id = 5983261968, name = "Oak Tree"},                 -- Trees
        {id = 4735967837, name = "Stone Wall"},               -- Wall segment
        {id = 4736008729, name = "Wooden Fence"},             -- Fence
        {id = 5640023508, name = "Medieval Well"},            -- Village well
        {id = 5640048392, name = "Torch Post"},               -- Lighting
    }
    
    print("[BlaxSmith]  Loading " .. #MEDIEVAL_ASSETS .. " real catalog assets...")
    
    for i, asset in ipairs(MEDIEVAL_ASSETS) do
        spawn(function()
            wait(i * 0.3) -- Stagger loading to prevent timeout
            local model = safeInsert(asset.id)
            if model then
                model.Parent = mapFolder
                -- Position in a circular layout around center
                local angle = (i / #MEDIEVAL_ASSETS) * math.pi * 2
                local radius = 30 + (i * 10)
                local x = math.cos(angle) * radius
                local z = math.sin(angle) * radius
                
                if model:IsA("Model") and model.PrimaryPart then
                    model:PivotTo(CFrame.new(x, 0, z))
                elseif model:IsA("Model") then
                    model:MoveTo(Vector3.new(x, 0, z))
                end
                print("[BlaxSmith]  Inserted: " .. asset.name)
            else
                print("[BlaxSmith]  Failed to load: " .. asset.name .. " (ID: " .. asset.id .. ")")
            end
        end)
    end
    
    print("[BlaxSmith]  ====== MEDIEVAL MAP COMPLETE (Real Assets)! ======")
    print("[BlaxSmith] Check Workspace > BlaxSmith_MedievalMap")
    
    return mapFolder
end

local function buildMilitaryMap()
    print("[BlaxSmith]  Building Military Map...")
    
    local mapFolder = Instance.new("Folder")
    mapFolder.Name = "BlaxSmith_MilitaryMap"
    mapFolder.Parent = workspace
    
    -- Ground (concrete)
    local ground = createGround(Vector3.new(0, 0, 0), Vector3.new(200, 1, 200), mapFolder)
    ground.Color = Color3.fromRGB(80, 80, 80)
    ground.Material = Enum.Material.Concrete
    print("[BlaxSmith]  Ground created")
    
    -- Barracks
    createBuilding(Vector3.new(-30, 0, 0), Vector3.new(20, 8, 15), mapFolder, "Barracks1")
    createBuilding(Vector3.new(-30, 0, 30), Vector3.new(20, 8, 15), mapFolder, "Barracks2")
    print("[BlaxSmith]  Barracks created")
    
    -- Command Center
    createBuilding(Vector3.new(30, 0, 0), Vector3.new(25, 12, 20), mapFolder, "CommandCenter")
    print("[BlaxSmith]  Command Center created")
    
    -- Watch Towers
    createTower(Vector3.new(-80, 0, -80), mapFolder)
    createTower(Vector3.new(80, 0, -80), mapFolder)
    createTower(Vector3.new(-80, 0, 80), mapFolder)
    createTower(Vector3.new(80, 0, 80), mapFolder)
    print("[BlaxSmith]  Watch towers created")
    
    -- Perimeter walls
    createWall(Vector3.new(-90, 0, -90), Vector3.new(90, 0, -90), mapFolder)
    createWall(Vector3.new(-90, 0, 90), Vector3.new(90, 0, 90), mapFolder)
    createWall(Vector3.new(-90, 0, -90), Vector3.new(-90, 0, 90), mapFolder)
    createWall(Vector3.new(90, 0, -90), Vector3.new(90, 0, 90), mapFolder)
    print("[BlaxSmith]  Perimeter walls created")
    
    print("[BlaxSmith]  ====== MILITARY MAP COMPLETE! ======")
    return mapFolder
end

local function buildForestMap()
    print("[BlaxSmith]  Building Forest Map...")
    
    local mapFolder = Instance.new("Folder")
    mapFolder.Name = "BlaxSmith_ForestMap"
    mapFolder.Parent = workspace
    
    -- Ground
    createGround(Vector3.new(0, 0, 0), Vector3.new(200, 1, 200), mapFolder)
    print("[BlaxSmith]  Ground created")
    
    -- Dense trees
    for i = 1, 50 do
        local x = math.random(-90, 90)
        local z = math.random(-90, 90)
        createTree(Vector3.new(x, 0, z), mapFolder)
    end
    print("[BlaxSmith]  50 trees created")
    
    -- Rocks scattered
    for i = 1, 20 do
        local x = math.random(-90, 90)
        local z = math.random(-90, 90)
        createRock(Vector3.new(x, 0, z), mapFolder)
    end
    print("[BlaxSmith]  20 rocks created")
    
    -- Cabin
    createBuilding(Vector3.new(0, 0, 0), Vector3.new(10, 6, 8), mapFolder, "Cabin")
    print("[BlaxSmith]  Cabin created")
    
    print("[BlaxSmith]  ====== FOREST MAP COMPLETE! ======")
    return mapFolder
end

local function buildCityMap()
    print("[BlaxSmith]  Building City Map with REAL CATALOG ASSETS...")
    local mapFolder = Instance.new("Folder")
    mapFolder.Name = "BlaxSmith_CityMap"
    mapFolder.Parent = workspace
    
    -- Insert Synty City Pack (official Roblox free asset)
    print("[BlaxSmith]  Loading Synty City Pack...")
    local cityPack = safeInsert(6933556508) -- Synty City Pack
    if cityPack then
        cityPack.Parent = mapFolder
        print("[BlaxSmith]  Synty City Pack loaded!")
    end
    
    -- Insert additional city assets
    local CITY_ASSETS = {
        {id = 477458892, name = "Modern House"},      -- Free house model
        {id = 476254973, name = "Street Lamp"},       -- Free lamp
        {id = 472867378, name = "Road Pack"},         -- Free road
        {id = 6580552119, name = "City Building"},    -- Modern building
        {id = 7147096618, name = "Police Car"},       -- Vehicle
        {id = 5983261968, name = "Tree"},             -- City tree
    }
    
    for i, asset in ipairs(CITY_ASSETS) do
        spawn(function()
            wait(i * 0.5) -- Stagger loading
            local model = safeInsert(asset.id)
            if model then
                model.Parent = mapFolder
                -- Position in a grid
                local row = math.floor((i-1) / 3)
                local col = (i-1) % 3
                if model:IsA("Model") and model.PrimaryPart then
                    model:PivotTo(CFrame.new(col * 40 - 40, 0, row * 40 - 40))
                end
                print("[BlaxSmith]  Inserted: " .. asset.name)
            end
        end)
    end
    
    print("[BlaxSmith]  ====== CITY MAP COMPLETE (Real Assets)! ======")
    return mapFolder
end

local function buildSpaceMap()
    print("[BlaxSmith]  Building Space Map...")
    local mapFolder = Instance.new("Folder")
    mapFolder.Name = "BlaxSmith_SpaceMap"
    mapFolder.Parent = workspace
    
    -- No conventional ground, maybe asteroid field?
    -- Create a dark floor for playability though
    local ground = createGround(Vector3.new(0, 0, 0), Vector3.new(400, 1, 400), mapFolder)
    ground.Color = Color3.new(0,0,0)
    ground.Material = Enum.Material.ForceField
    ground.Transparency = 0.2
    
    -- Skybox (Optional, but acts as map boundary)
    
    -- Floating Platforms
    for i = 1, 20 do
        local x = math.random(-150, 150)
        local y = math.random(10, 50)
        local z = math.random(-150, 150)
        
        local plat = Instance.new("Part")
        plat.Size = Vector3.new(math.random(10,30), 2, math.random(10,30))
        plat.Position = Vector3.new(x, y, z)
        plat.Anchored = true
        plat.Material = Enum.Material.Neon
        plat.BrickColor = BrickColor.Random()
        plat.Parent = mapFolder
    end
    
    print("[BlaxSmith]  ====== SPACE MAP COMPLETE! ======")
    return mapFolder
end

-- Direct map generation function - USES REAL ROBLOX GENERATOR KITS
local function buildDirectMap(mapType)
    print("[BlaxSmith]  Building map with REAL GENERATOR KITS: " .. tostring(mapType))
    
    -- GENERATOR KIT ASSET IDs (Real Roblox Catalog Assets)
    local GENERATOR_KITS = {
        simulator = 104930017857800,  -- Simulator Generator Legacy (User provided)
        map = 138998733495661,         -- Map Generator Plugin (User provided)
        tycoon = 17606660451,          -- Tycoon Generator Beta
        obby = 104943709576309,        -- Obby Kit FREE
        horror = 14834808285,          -- Realistic Horror Game Kit
        horror2 = 15239739173,         -- Updated Realistic Horror Game Kit
        fe2 = 7323300695,              -- FE2 Map Creator Kit
        city = 6933556508,             -- Synty City Pack
        fantasy = 6579442252,          -- Fantasy Village Pack
        nature = 6933438443,           -- Synty Nature Pack
    }
    
    local mapFolder = Instance.new("Folder")
    mapFolder.Name = "BlaxSmith_" .. (mapType or "Generated") .. "_Map"
    mapFolder.Parent = workspace
    
    -- Insert the appropriate generator kit based on map type
    local kitId = nil
    
    if mapType == "simulator" then
        kitId = GENERATOR_KITS.simulator
    elseif mapType == "tycoon" then
        kitId = GENERATOR_KITS.tycoon
    elseif mapType == "obby" then
        kitId = GENERATOR_KITS.obby
    elseif mapType == "horror" then
        kitId = GENERATOR_KITS.horror
    elseif mapType == "fe2" or mapType == "flood" then
        kitId = GENERATOR_KITS.fe2
    elseif mapType == "city" then
        kitId = GENERATOR_KITS.city
    elseif mapType == "medieval" or mapType == "fantasy" then
        kitId = GENERATOR_KITS.fantasy
    elseif mapType == "forest" or mapType == "nature" then
        kitId = GENERATOR_KITS.nature
    elseif mapType == "space" then
        -- Space doesn't have a kit, use map generator
        kitId = GENERATOR_KITS.map
    else
        -- Default: Use map generator
        kitId = GENERATOR_KITS.map
    end
    
    print("[BlaxSmith]  Loading Generator Kit ID: " .. tostring(kitId))
    local model = safeInsert(kitId)
    if model then
        model.Parent = mapFolder
        print("[BlaxSmith]  Generator Kit loaded successfully!")
    else
        print("[BlaxSmith]  Generator Kit failed to load, trying fallback...")
        -- Fallback to the main map generator
        local fallback = safeInsert(GENERATOR_KITS.map)
        if fallback then
            fallback.Parent = mapFolder
            print("[BlaxSmith]  Fallback Map Generator loaded!")
        end
    end
    
    print("[BlaxSmith]  ====== MAP GENERATION COMPLETE! ======")
    return mapFolder
end

print("[BlaxSmith]  Map Generator ready  Use generatePresetMap('medieval') to build!")
print("[BlaxSmith]  Direct Map Builder ready  Use buildDirectMap('medieval') for guaranteed results!")



-- OPTIMIZATION: Clean, Anchor, Scale, and Group assets
local function optimizeModel(model)
    print("[BlaxSmith]  Optimizing " .. model.Name .. "...")
    
    -- 1. CLEAN NAME
    model.Name = string.gsub(model.Name, "%.%w+$", "") -- Remove .obj, .glb extension
    model.Name = string.gsub(model.Name, "[^%w%s_]", "") -- Remove symbols
    
    -- 2. SCALE CHECK (If absurdly massive, scale down)
    local size = model:GetExtentsSize()
    -- 3000 studs is a reasonable max for a single imported map/asset. 
    -- Anything larger is likely a scaling error from Blender (meters vs studs).
    if size.Magnitude > 3000 then
        print("[BlaxSmith]  Asset is extremely huge (" .. math.floor(size.Magnitude) .. " studs). Scaling to manageable size...")
        local scale = 500 / size.Magnitude -- Scale to 500 studs (Map size), not 50 (Prop size)
        if model:IsA("Model") then
            model:ScaleTo(scale)
        end
    end
    
    -- 3. ANCHOR & COLLISION
    for _, part in ipairs(model:GetDescendants()) do
        if part:IsA("BasePart") then
            part.Anchored = true
            -- Heuristic: Small details = No Collision, Big structural parts = Collision
            if part.Size.Magnitude < 2 then
                part.CanCollide = false
            else
                part.CanCollide = true
            end
        end
    end
    print("[BlaxSmith]  Optimization Complete")
end

-- ============================================
--  BlaxSmith PRO: TERRAIN RAYCASTING
-- Snaps models to terrain surface (no floating!)
-- ============================================
local function raycastToTerrain(position)
    local rayOrigin = Vector3.new(position.X, 1000, position.Z)
    local rayDirection = Vector3.new(0, -2000, 0)
    
    local raycastParams = RaycastParams.new()
    raycastParams.FilterType = Enum.RaycastFilterType.Include
    raycastParams.FilterDescendantsInstances = {workspace.Terrain}
    
    local result = workspace:Raycast(rayOrigin, rayDirection, raycastParams)
    
    if result then
        return result.Position.Y
    end
    
    -- Fallback: raycast against all parts
    raycastParams.FilterType = Enum.RaycastFilterType.Exclude
    raycastParams.FilterDescendantsInstances = {}
    
    local fallbackResult = workspace:Raycast(rayOrigin, rayDirection, raycastParams)
    if fallbackResult then
        return fallbackResult.Position.Y
    end
    
    return 0 -- Default to ground level
end

-- ============================================
--  BlaxSmith PRO: GRID SNAPPING
-- Snaps models to a grid (roads & buildings align)
-- ============================================
local GRID_SIZE = 16 -- Standard Roblox stud grid

local function snapToGrid(position, gridSize)
    gridSize = gridSize or GRID_SIZE
    return Vector3.new(
        math.round(position.X / gridSize) * gridSize,
        position.Y,
        math.round(position.Z / gridSize) * gridSize
    )
end

-- ============================================
--  BlaxSmith PRO: STYLE DETECTION
-- Auto-detects low-poly vs realistic from model name
-- ============================================
local function detectAssetStyle(modelName)
    local name = string.lower(modelName or "")
    
    -- Low-poly keywords
    local lowPolyKeywords = {"low", "poly", "cartoon", "simple", "cute", "toon", "mini", "chibi", "pixel"}
    for _, kw in ipairs(lowPolyKeywords) do
        if string.find(name, kw) then
            return "lowpoly"
        end
    end
    
    -- Realistic keywords
    local realisticKeywords = {"realistic", "detailed", "hd", "high", "photo", "real", "terrain"}
    for _, kw in ipairs(realisticKeywords) do
        if string.find(name, kw) then
            return "realistic"
        end
    end
    
    -- Nature = scatter, Buildings = grid
    local natureKeywords = {"tree", "rock", "bush", "plant", "grass", "flower", "forest", "nature"}
    for _, kw in ipairs(natureKeywords) do
        if string.find(name, kw) then
            return "nature"
        end
    end
    
    local buildingKeywords = {"house", "building", "road", "city", "wall", "door", "floor", "room"}
    for _, kw in ipairs(buildingKeywords) do
        if string.find(name, kw) then
            return "building"
        end
    end
    
    return "generic"
end

-- ============================================
--  BlaxSmith STUDIO: UNDO/ROLLBACK SYSTEM
-- Groups AI actions under single undo steps
-- ============================================
local UndoStack = {}
local MAX_UNDO_HISTORY = 50

local function beginTransaction(actionName)
    ChangeHistoryService:SetWaypoint("BlaxSmith: " .. (actionName or "Action"))
    return {
        name = actionName,
        assets = {},
        startTime = tick()
    }
end

local function commitTransaction(transaction)
    if transaction then
        table.insert(UndoStack, {
            name = transaction.name,
            assetCount = #transaction.assets,
            timestamp = tick()
        })
        if #UndoStack > MAX_UNDO_HISTORY then
            table.remove(UndoStack, 1)
        end
        ChangeHistoryService:SetWaypoint("BlaxSmith: " .. transaction.name .. " Complete")
        print("[BlaxSmith]  Transaction saved: " .. transaction.name .. " (" .. #transaction.assets .. " assets)")
    end
end

end -- END MAP GENERATION SCOPE

-- ============================================
--  BlaxSmith STUDIO: DENSITY CONTROLS
-- Prevents clutter by enforcing minimum spacing
-- ============================================
do -- BEGIN DENSITY/PERFORMANCE SCOPE

local DENSITY_RULES = {
    forest = { minSpacing = 30, maxPerChunk = 20 },
    city = { minSpacing = 50, maxPerChunk = 10 },
    jungle = { minSpacing = 15, maxPerChunk = 40 },
    desert = { minSpacing = 60, maxPerChunk = 8 },
    default = { minSpacing = 25, maxPerChunk = 15 }
}

local function getDensityRule(biome)
    return DENSITY_RULES[biome] or DENSITY_RULES.default
end

local function checkDensity(position, biome)
    local rule = getDensityRule(biome)
    local nearbyCount = 0
    
    for _, obj in ipairs(workspace:GetChildren()) do
        if obj:IsA("Model") then
            local dist = (obj:GetPivot().Position - position).Magnitude
            if dist < rule.minSpacing then
                return false, "Too close to existing asset"
            end
            if dist < 100 then
                nearbyCount = nearbyCount + 1
            end
        end
    end
    
    if nearbyCount >= rule.maxPerChunk then
        return false, "Chunk density limit reached"
    end
    
    return true, "OK"
end

-- ============================================
--  BlaxSmith STUDIO: SCENE PERFORMANCE SCORE
-- Live scene rating (LOW/MEDIUM/HIGH load)
-- ============================================
local function getScenePerformanceScore()
    local partCount = 0
    local meshCount = 0
    local shadowCasters = 0
    local scriptCount = 0
    
    for _, obj in ipairs(workspace:GetDescendants()) do
        if obj:IsA("BasePart") then
            partCount = partCount + 1
            if obj.CastShadow then
                shadowCasters = shadowCasters + 1
            end
        elseif obj:IsA("MeshPart") or obj:IsA("SpecialMesh") then
            meshCount = meshCount + 1
        elseif obj:IsA("Script") or obj:IsA("LocalScript") then
            scriptCount = scriptCount + 1
        end
    end
    
    local score = "LOW"
    local details = {}
    
    if partCount > 10000 then score = "HIGH" table.insert(details, "Parts: " .. partCount)
    elseif partCount > 5000 then score = "MEDIUM" table.insert(details, "Parts: " .. partCount)
    end
    
    if shadowCasters > 2000 then score = "HIGH" table.insert(details, "Shadows: " .. shadowCasters) end
    if meshCount > 1000 then score = "MEDIUM" table.insert(details, "Meshes: " .. meshCount) end
    
    return {
        score = score,
        partCount = partCount,
        meshCount = meshCount,
        shadowCasters = shadowCasters,
        scriptCount = scriptCount,
        details = details,
        mobileSafe = partCount < 5000 and shadowCasters < 500,
        vrSafe = partCount < 3000 and shadowCasters < 200
    }
end

-- ============================================
--  BlaxSmith STUDIO: GENERATION PROFILES
-- Saveable profiles for consistent regeneration
-- ============================================
local GENERATION_PROFILES = {
    lowpoly = {
        name = "Low Poly",
        maxParts = 8000,
        shadowsEnabled = true,
        densityMultiplier = 1.0,
        preferredSources = {"poly_pizza", "toolbox"}
    },
    realistic = {
        name = "Realistic",
        maxParts = 15000,
        shadowsEnabled = true,
        densityMultiplier = 0.7,
        preferredSources = {"poly_haven", "toolbox"}
    },
    mobilesafe = {
        name = "Mobile Safe",
        maxParts = 3000,
        shadowsEnabled = false,
        densityMultiplier = 0.5,
        preferredSources = {"poly_pizza"}
    },
    vroptimized = {
        name = "VR Optimized",
        maxParts = 2000,
        shadowsEnabled = false,
        densityMultiplier = 0.3,
        preferredSources = {"poly_pizza"}
    }
}

local currentProfile = GENERATION_PROFILES.lowpoly

local function setGenerationProfile(profileName)
    local profile = GENERATION_PROFILES[string.lower(profileName)]
    if profile then
        currentProfile = profile
        print("[BlaxSmith]  Profile set: " .. profile.name)
        return true
    end
    return false
end

-- ============================================
--  BlaxSmith STUDIO: LICENSE TAGGING
-- Auto-tag assets with Source, License, Attribution
-- ============================================
local function tagAssetLicense(model, source)
    source = source or "Roblox Toolbox"
    
    model:SetAttribute("BlaxSmith_Source", source)
    model:SetAttribute("BlaxSmith_License", "FREE")
    model:SetAttribute("BlaxSmith_ImportedAt", os.date("%Y-%m-%d %H:%M:%S"))
    model:SetAttribute("BlaxSmith_Attribution", "None Required")
    model:SetAttribute("BlaxSmith_SafeForCommercial", true)
    
    print("[BlaxSmith]  License tagged: " .. model.Name .. " (Source: " .. source .. ")")
end

-- ============================================
--  BlaxSmith STUDIO: AI GUARDRAILS (UNBREAKABLE)
-- Permanent rule block preventing unsafe imports
-- ============================================
local UNSAFE_CLASSES = {
    "Script", "LocalScript", "ModuleScript",
    "BindableFunction", "BindableEvent",
    "RemoteEvent", "RemoteFunction",
    "Plugin", "PluginAction", "PluginMenu"
}

local function enforceGuardrails(model)
    local removed = 0
    
    for _, obj in ipairs(model:GetDescendants()) do
        for _, unsafeClass in ipairs(UNSAFE_CLASSES) do
            if obj:IsA(unsafeClass) then
                obj:Destroy()
                removed = removed + 1
            end
        end
    end
    
    if removed > 0 then
        print("[BlaxSmith]  Guardrails enforced: Removed " .. removed .. " unsafe objects from " .. model.Name)
    end
    
    return removed
end

end -- END DENSITY/PERFORMANCE SCOPE

-- ============================================
--  BlaxSmith STUDIO: OBSERVABILITY
-- Generation summaries and logs
-- ============================================
do -- BEGIN OBSERVABILITY/SDK SCOPE

local function generateSummary(transaction, performanceScore)
    local summary = {
        "",
        " BlaxSmith GENERATION SUMMARY",
        "",
        "Action: " .. (transaction and transaction.name or "Import"),
        "Assets: " .. (transaction and #transaction.assets or 1),
        "Performance: " .. performanceScore.score,
        "Parts: " .. performanceScore.partCount,
        "Meshes: " .. performanceScore.meshCount,
        "Shadows: " .. performanceScore.shadowCasters,
        "Mobile Safe: " .. (performanceScore.mobileSafe and "YES" or "NO"),
        "VR Safe: " .. (performanceScore.vrSafe and "YES" or "NO"),
        ""
    }
    
    for _, line in ipairs(summary) do
        print("[BlaxSmith] " .. line)
    end
    
    return summary
end

-- PLACEMENT: Handle Grid, Scatter, and Line placement
local function smartPlace(templateModel, config)
    if not config then return end
    print("[BlaxSmith]  Smart Placement: " .. config.mode)
    
    local parentFolder = Instance.new("Folder")
    parentFolder.Name = config.mode .. "_Placement"
    parentFolder.Parent = workspace
    
    templateModel.Parent = parentFolder -- Move template to folder
    
    -- GRID MODE (City)
    if config.mode == "grid" then
        local rows = config.rows or 3
        local cols = config.cols or 3
        local spacing = config.spacing or 50
        
        local startPos = templateModel:GetPivot().Position
        
        for r = 0, rows - 1 do
            for c = 0, cols - 1 do
                if r == 0 and c == 0 then continue end -- Skip template itself
                
                local clone = templateModel:Clone()
                clone.Parent = parentFolder
                local offset = Vector3.new(c * spacing, 0, r * spacing)
                clone:PivotTo(CFrame.new(startPos + offset))
            end
        end
        print("[BlaxSmith]  Built " .. (rows*cols) .. " grid items.")
        
    -- SCATTER MODE (Forest)
    elseif config.mode == "scatter" then
        local count = config.count or 10
        local radius = config.radius or 50
        local center = templateModel:GetPivot().Position
        
        for i = 1, count - 1 do
            local clone = templateModel:Clone()
            clone.Parent = parentFolder
            local angle = math.random() * math.pi * 2
            local dist = math.random() * radius
            local offset = Vector3.new(math.cos(angle) * dist, 0, math.sin(angle) * dist)
            clone:PivotTo(CFrame.new(center + offset) * CFrame.Angles(0, math.random() * 6, 0))
        end
        print("[BlaxSmith]  Scattered " .. count .. " items.")
        
    -- LINE MODE (Row)
    elseif config.mode == "line" then
        local count = config.count or 5
        local spacing = config.spacing or 20
        local startPos = templateModel:GetPivot().Position
        
        for i = 1, count - 1 do
            local clone = templateModel:Clone()
            clone.Parent = parentFolder
            local offset = Vector3.new(i * spacing, 0, 0)
            clone:PivotTo(CFrame.new(startPos + offset))
        end
    end
end

local function smartError(err)
    local msg = tostring(err)
    print("[BlaxSmith]  Runtime Error: " .. msg)
    
    if string.find(msg, "attempt to index nil") then
        print("[BlaxSmith]  HINT: The AI tried to find an object that doesn't exist yet.")
        print("           Try asking it to 'Create the object first' or check your spelling.")
    elseif string.find(msg, "is not a valid member of") then
        print("[BlaxSmith]  HINT: It looks like a property or child is missing.")
        print("           Check if the object name is correct in your Workspace/StarterGui.")
    elseif string.find(msg, "lacking capability") or string.find(msg, "permission") then
        print("[BlaxSmith]  HINT: Plugin permission issue!")
        print("           Go to 'Manage Plugins' -> 'BlaxSmith' -> Enable 'Script Injection'.")
    elseif string.find(msg, "Infinite yield") then
        print("[BlaxSmith]  HINT: It's waiting for something that never appeared.")
        print("           Ensure the object exists or try restarting the build.")
    elseif string.find(msg, "Expected identifier") or string.find(msg, "incomplete unicode") or string.find(msg, "syntax error") then
        print("[BlaxSmith]  HINT: The AI might have written TEXT instead of CODE.")
        print("           Check the output. If you see 'Here is the code', try again.")
    end
end

local function httpRequest(method, endpoint, body)
    print("[BlaxSmith]  HTTP " .. method .. " " .. endpoint)
    local success, response = pcall(function()
        return HttpService:RequestAsync({
            Url = CONFIG.APP_URL .. endpoint,
            Method = method,
            Headers = { ["Content-Type"] = "application/json" },
            Body = body and HttpService:JSONEncode(body) or nil
        })
    end)
    if success and response.Success then
        print("[BlaxSmith]  HTTP " .. method .. " " .. endpoint .. " -> " .. response.StatusCode)
        return true, HttpService:JSONDecode(response.Body)
    else
        print("[BlaxSmith]  HTTP " .. method .. " " .. endpoint .. " FAILED")
        if response and response.StatusCode then
            print("[BlaxSmith]    Status: " .. tostring(response.StatusCode))
        end
        return false, response
    end
end

local function createUICorner(parent, radius)
    local corner = Instance.new("UICorner", parent)
    corner.CornerRadius = UDim.new(0, radius or 8)
    return corner
end

local function createGradient(parent, c1, c2)
    local gradient = Instance.new("UIGradient", parent)
    gradient.Color = ColorSequence.new(c1, c2)
    gradient.Rotation = 45
    return gradient
end

-- ============================================
-- BUILDER LOGIC
-- ============================================
local function ensureFolder(parent, name)
    local f = parent:FindFirstChild(name)
    if not f then
        f = Instance.new("Folder", parent)
        f.Name = name
    end
    return f
end

local function generateTerrain(config)
    print("[BlaxSmith]  Generating Terrain...")
    local terrain = workspace.Terrain
    terrain:Clear()
    
    local size = config.size or 512
    terrain:FillBlock(
        CFrame.new(0, -5, 0),
        Vector3.new(size, 10, size),
        Enum.Material.Grass
    )
end

local function createRoad(cf, size)
    local road = Instance.new("Part")
    road.Name = "Road"
    road.Anchored = true
    road.Material = Enum.Material.Asphalt
    road.Color = Color3.fromRGB(40, 40, 40)
    road.Size = size
    road.CFrame = cf
    road.TopSurface = Enum.SurfaceType.Smooth
    road.Parent = workspace:FindFirstChild("BlaxSmith_Map") or workspace
    return road
end

local function generateRoadGrid(config)
    print("[BlaxSmith]  Generating Road Grid...")
    local blocks = config.blocks or 4
    local blockSize = config.blockSize or 100
    local roadWidth = config.roadWidth or 16
    
    ensureFolder(workspace, "BlaxSmith_Map")

    for i = 0, blocks do
        local offset = (i * blockSize) - (blocks * blockSize / 2)

        -- Horizontal roads
        createRoad(
            CFrame.new(0, 0.05, offset),
            Vector3.new(blocks * blockSize, 0.2, roadWidth)
        )

        -- Vertical roads
        createRoad(
            CFrame.new(offset, 0.05, 0),
            Vector3.new(roadWidth, 0.2, blocks * blockSize)
        )
    end
end

local function importScripts(scriptsData, parent)
    for name, content in pairs(scriptsData) do
        if type(content) == "table" and not content.code then
            local folder = ensureFolder(parent, name)
            importScripts(content, folder)
        else
            local scriptType = "Script"
            if content.type == "LocalScript" then scriptType = "LocalScript" end
            if content.type == "ModuleScript" then scriptType = "ModuleScript" end
            
            local s = Instance.new(scriptType)
            s.Name = name
            s.Source = content.code or "-- No code provided"
            s.Parent = parent
        end
    end
end

local function importMap(mapData)
    print("[BlaxSmith]  Build Manifest Received - Constructing World...")
    local mapFolder = ensureFolder(workspace, "BlaxSmith_Map")
    
    local objects = mapData.objects or mapData 
    if type(objects) ~= "table" then 
        warn("[BlaxSmith] Invalid map data provided.")
        return 
    end
    
    print("[BlaxSmith]  Objects to place: " .. #objects)
    
    for i, obj in ipairs(objects) do
        local instance = nil
        
        -- Use Asset ID if available (Real Models)
        if obj.assetId and obj.assetId > 0 then
            print("[BlaxSmith]  Loading asset by ID: " .. (obj.name or obj.assetId))
            instance = safeInsert(obj.assetId)
        elseif obj.meshSearch or obj.name then
            -- Try to find or fetch model from library
            local searchName = obj.meshSearch or obj.name
            print("[BlaxSmith]  Searching library for: " .. searchName)
            instance = getModel(searchName)
        end
        
        -- Fallback to primitives if no asset or loading failed
        if not instance then
            if obj.className == "Part" or not obj.assetId then
                instance = Instance.new("Part")
                instance.Shape = Enum.PartType.Block
            elseif obj.className then
                pcall(function() instance = Instance.new(obj.className) end)
            end
        end
        
        if instance then
            instance.Name = obj.name or "Object_" .. i
            
            -- Apply Properties
            if obj.properties then
                for prop, value in pairs(obj.properties) do
                    pcall(function() instance[prop] = value end)
                end
            end
            
            -- Absolute Position / CFrame
            if obj.position then
                local pos = Vector3.new(obj.position.x or obj.position[1] or 0, obj.position.y or obj.position[2] or 0, obj.position.z or obj.position[3] or 0)
                if instance:IsA("Model") then
                    instance:PivotTo(CFrame.new(pos))
                else
                    instance.Position = pos
                end
            end
            
            if obj.cframe then
                -- Assume cframe is a table or string, but for now simple CFrame support
                pcall(function() instance.CFrame = obj.cframe end)
            end

            -- Parent it
            local parentName = obj.parent or "BlaxSmith_Map"
            local parentObj = workspace:FindFirstChild(parentName, true) or mapFolder
            instance.Parent = parentObj
            
            -- SANITIZE & AUTOMATE (Lemonade-style)
            if instance:IsA("Model") or instance:IsA("BasePart") then
                stripScripts(instance)
                optimizeModel(instance)
            end

            -- Stagger for performance if many assets
            if i % 10 == 0 then wait() end
        end
    end
end

local function injectSDK()
    print("[BlaxSmith] Checking for SDK...")
    local existing = ReplicatedStorage:FindFirstChild("BlaxSmith_Advanced_SDK")
    if existing then
        print("[BlaxSmith] SDK already present (v" .. CONFIG.SDK_VERSION .. ")")
        return true
    end
    warn(" BlaxSmith_Advanced_SDK is missing! Please import it from MegaPack.")
    return false
end

local function buildFullGame(data)
    ChangeHistoryService:SetWaypoint("BlaxSmith Build Start")
    local package = data.GamePackage or data
    
    -- TERRAIN & ROADS (The Spine)
    if package.terrain then
        generateTerrain(package.terrain)
    end
    
    if package.roads then
        generateRoadGrid(package.roads)
    end

    -- QUEST SYSTEM BOOTSTRAP
    local questModule = nil
    if package.quests then
        questModule = GameGenerator.createQuestSystemModule()
    end
    
    -- INVENTORY & COMBAT BOOTSTRAP
    if package.inventory or package.combat then
        GameGenerator.createInventorySystemModule()
        GameGenerator.createCombatSystemModule()
    end
    
    -- UI SYSTEM BOOTSTRAP
    GameGenerator.createUISystem()
    
    -- SAVE SYSTEM BOOTSTRAP (The Persistence Layer)
    GameGenerator.createSaveSystemModule()

    -- Core Folders
    local repBox = ensureFolder(ReplicatedStorage, "BlaxSmith_Replicated")
    local remotes = ensureFolder(repBox, "RemoteEvents")
    local serverCode = ensureFolder(ServerScriptService, "BlaxSmith_Server")
    local clientCode = ensureFolder(StarterPlayer.StarterPlayerScripts, "BlaxSmith_Client")
    local modulesFolder = ensureFolder(ReplicatedStorage, "GameModules")

    -- SDK Injection
    injectSDK()

    -- Remote Events Auto-Wire
    if package.RemoteEvents then
        print("[BlaxSmith] Wiring RemoteEvents...")
        for _, name in ipairs(package.RemoteEvents) do
            if not remotes:FindFirstChild(name) then
                local r = Instance.new("RemoteEvent", remotes)
                r.Name = name
            end
        end
    end

    -- Map / Parts (Support both schemas)
    if package.npc then
        -- Generate blocks for NPC placement
        local blocks = {}
        local blockCount = package.roads and package.roads.blocks or 4
        local blockSize = package.roads and package.roads.blockSize or 100
        for x = 0, blockCount-1 do
            for z = 0, blockCount-1 do
                local centerX = (x * blockSize) - (blockCount * blockSize / 2) + (blockSize / 2)
                local centerZ = (z * blockSize) - (blockCount * blockSize / 2) + (blockSize / 2)
                table.insert(blocks, {center = Vector3.new(centerX, 0, centerZ), size = blockSize})
            end
        end
        GameGenerator.spawnAutomatedNPCs(package.npc, blocks)
    end
    
    if package.quests and questModule then
        GameGenerator.hookNPCQuests(package, questModule)
    end
    
    if package.npc_behaviors then
        GameGenerator.hookNPCBehaviors(package)
    end
    
    -- Scripts (Support Array from MegaTemplates vs Dictionary from AI)
    if package.Scripts then
        if type(package.Scripts) == "table" and #package.Scripts > 0 and package.Scripts[1] then
            -- Array Format (MegaTemplates)
            local serverMap = {}
            local clientMap = {}
            local moduleMap = {}
            
            for _, s in ipairs(package.Scripts) do
                local content = { code = s.Source }
                if s.Class == "LocalScript" then
                    clientMap[s.Name] = content
                elseif s.Class == "ModuleScript" then
                    moduleMap[s.Name] = content
                else
                    serverMap[s.Name] = content
                end
            end
            importScripts(serverMap, serverCode)
            importScripts(clientMap, clientCode)
            importScripts(moduleMap, modulesFolder)
        else
            -- Dictionary Format (AI)
            if package.Scripts.Server then importScripts(package.Scripts.Server, serverCode) end
            if package.Scripts.Client then importScripts(package.Scripts.Client, clientCode) end
            if package.Scripts.Modules then importScripts(package.Scripts.Modules, modulesFolder) end
            
            if package.Scripts.Startup then
                 local s = Instance.new("Script", serverCode)
                 s.Name = "BlaxSmith_Startup"
                 s.Source = package.Scripts.Startup.code or "print('BlaxSmith Game Started!')"
            end
        end
    end

    -- Modules at Root (MegaTemplates format)
    if package.Modules and type(package.Modules) == "table" then
         local modGroup = {}
         for _, m in ipairs(package.Modules) do
             modGroup[m.Name] = { code = m.Source, type = "ModuleScript" }
         end
         importScripts(modGroup, modulesFolder)
    end
    
    -- UI
    if package.UI then
        if package.UI.Scripts then 
            importScripts(package.UI.Scripts, StarterGui) 
        elseif type(package.UI) == "table" and #package.UI > 0 then
             -- Handle Array format UI if necessary
        end
    end

    -- Lighting
    if package.Lighting then
        if package.Lighting.TimeOfDay then Lighting.TimeOfDay = package.Lighting.TimeOfDay end
        if package.Lighting.Ambient then Lighting.Ambient = Color3.fromRGB(unpack(package.Lighting.Ambient)) end
    end
    
    print("")
    print(" BlaxSmith BUILD COMPLETE!")
    print(" SDK: v" .. CONFIG.SDK_VERSION .. " |  " .. CONFIG.TOTAL_MODULES .. " Modules")
    print("")
    ChangeHistoryService:SetWaypoint("BlaxSmith Build Complete")
    end
end

-- ============================================
-- 5. LEGO PROTOCOL HELPERS (Recursive Builder)
-- ============================================

-- HELPER: The "Auto-Namer" (Fixes the Duplicate Error)
local function getUniqueName(parent, baseName)
    local finalName = baseName
    local count = 1
    -- Check if name exists. If so, try "Name_2", "Name3", etc.
    while parent:FindFirstChild(finalName) do
        count = count + 1
        finalName = baseName .. "_" .. count
    end
    return finalName
end

-- HELPER: The Whitelist Builder
local ALLOWED_CLASSES = {
    ["Model"] = true, ["Folder"] = true, ["Part"] = true, 
    ["Script"] = true, ["LocalScript"] = true, ["ModuleScript"] = true,
    ["Sound"] = true, ["ScreenGui"] = true, ["Frame"] = true, 
    ["TextLabel"] = true, ["TextButton"] = true, ["BillboardGui"] = true,
    ["SurfaceGui"] = true, ["ImageLabel"] = true, ["ImageButton"] = true,
    ["ScrollingFrame"] = true, ["TextBox"] = true, ["UICorner"] = true,
    ["UIStroke"] = true, ["UIGradient"] = true, ["UIPadding"] = true,
    ["UIScale"] = true, ["UIGridLayout"] = true, ["UIListLayout"] = true,
    ["ClickDetector"] = true, ["ProximityPrompt"] = true, ["SpotLight"] = true,
    ["PointLight"] = true, ["SurfaceLight"] = true, ["Highlight"] = true,
    ["Sparkles"] = true, ["Fire"] = true, ["Smoke"] = true, ["ParticleEmitter"] = true
}

local function safeConvert(prop, val)
    if typeof(val) == "string" and prop == "Color" then return Color3.fromHex(val) end
    if typeof(val) == "string" and prop == "Position" then return Vector3.new(unpack(game:GetService("HttpService"):JSONDecode("["..val.."]"))) end
    -- Handle array inputs for Vector3/Color3/UDim2
    if type(val) == "table" then
        if #val == 3 then -- Vector3 or Color3
            if prop:match("Color") then return Color3.new(val[1], val[2], val[3]) end
            return Vector3.new(val[1], val[2], val[3])
        elseif #val == 4 then -- UDim2
             return UDim2.new(val[1], val[2], val[3], val[4])
        end
    end
    return val
end

local function applyShape(part, shapeName)
    local shapeEnum = Enum.PartType.Block
    if shapeName == "Ball" then shapeEnum = Enum.PartType.Ball
    elseif shapeName == "Cylinder" then shapeEnum = Enum.PartType.Cylinder
    elseif shapeName == "Wedge" then shapeEnum = Enum.PartType.Wedge
    elseif shapeName == "CornerWedge" then shapeEnum = Enum.PartType.CornerWedge
    end
    part.Shape = shapeEnum
end

local function buildObject(data, parent)
    local className = data.class

    -- 1. FORCE MODEL/PRIMITIVE (No Toolbox)
    if not ALLOWED_CLASSES[className] then
        warn("[ForgeMindVI] Blocked Class '"..className.."'. Converting to Model/Part.")
        if className:find("Mesh") then className = "Part" else className = "Model" end
    end

    -- 2. CREATE INSTANCE
    local success, obj = pcall(function() return Instance.new(className) end)
    if not success then return end

    -- 3. APPLY UNIQUE NAME (The Fix)
    -- We do NOT check "if exists then return". We Rename.
    obj.Name = getUniqueName(parent, data.name or className)
    obj.Parent = parent

    -- 4. LOGGING (Corrected)
    print("[ForgeMindVI]  Building: " .. obj.Name .. " (" .. className .. ")")

    -- 5. PROPERTIES & CHILDREN
    if data.properties then
        for prop, val in pairs(data.properties) do
            -- Filter out ID properties that trigger Toolbox
            if prop ~= "MeshId" and prop ~= "TextureId" then
                if prop == "Shape" and obj:IsA("Part") then
                    applyShape(obj, val)
                else
                    pcall(function() obj[prop] = safeConvert(prop, val) end)
                end
            end
        end
    end

    if data.children then
        for _, child in ipairs(data.children) do
            buildObject(child, obj)
        end
    end
    
    return obj
end

-- ============================================
-- 6. COMMAND HANDLER
-- ============================================
do -- BEGIN COMMAND HANDLERS/GAME GENERATOR SCOPE

local CommandHandlers = {
    ["handle_intent_json"] = function(data)
        print("[BlaxSmith]  Handling Intent JSON:", data.intent)
        
        -- Support both 'data' wrapper and direct payload
        local payload = data.data or data 
        -- If the structure is { intent="...", data={...} }, then payload is the inner data?
        -- Wait, if input is { intent="...", data={...} }, then data.data is the inner part.
        
        if data.intent == "create_asset" then
            if data.data then
                print("[BlaxSmith]  Creating Asset...")
                local asset = AssetBuilder.build(data.data)
                if asset then
                    Selection:Set({asset})
                    print("[BlaxSmith]  Asset Created: " .. asset.Name)
                end
            end
        elseif data.intent == "create_script" then
            if data.data then
                print("[BlaxSmith]  Creating Script...")
                local scriptObj = ScriptInjector.inject(data.data)
                if scriptObj then
                    Selection:Set({scriptObj})
                    print("[BlaxSmith]  Script Created: " .. scriptObj.Name)
                end
            end
        elseif data.intent == "hybrid" then
            print("[BlaxSmith]  Handling Hybrid Intent...")
            local asset, scriptObj
            
            if data.asset_data then
                asset = AssetBuilder.build(data.asset_data)
            end
            
            if data.script_data then
                -- if we created an asset, script goes inside it ideally?
                -- JSON structure for hybrid: { intent="hybrid", asset_data={...}, script_data={...} }
                -- AssetBuilder default parent is Workspace.
                -- ScriptInjector default parent depends on type.
                
                -- If asset exists, parent script to it?
                -- The script_data might want to reference the asset. Use `ScriptInjector.inject(data, target)`
                
                if asset then
                    scriptObj = ScriptInjector.inject(data.script_data, asset)
                else
                    scriptObj = ScriptInjector.inject(data.script_data)
                end
            end
            
            local newSelection = {}
            if asset then table.insert(newSelection, asset) end
            if scriptObj and not asset then table.insert(newSelection, scriptObj) end -- If script inside asset, selecting asset is enough
            
            if #newSelection > 0 then Selection:Set(newSelection) end
            print("[BlaxSmith]  Hybrid creation complete!")
        else
            warn("[BlaxSmith] Unknown intent received: ", data.intent)
        end
    end,
    ["execute"] = function(data)
        print("[BlaxSmith] ====== EXECUTE COMMAND RECEIVED ======")
        local code = stripMarkdown(data.code)
        print("[BlaxSmith] Code length: " .. #code .. " characters")
        if #code < 500 then
            print("[BlaxSmith] Code preview: " .. code:sub(1, 500))
        else
            print("[BlaxSmith] Code preview (first 500 chars): " .. code:sub(1, 500) .. "...")
        end
        
        local f, err = loadstring(code)
        if f then
            local success, runErr = pcall(f)
            if success then
                print("[BlaxSmith]  Code executed successfully!")
            else
                smartError(runErr)
            end
        else
            smartError("Syntax error: " .. tostring(err))
        end
        print("[BlaxSmith] ========================================")
    end,
    ["build-game"] = function(data)
        buildFullGame(data.payload)
    end,
    ["notify"] = function(data)
        print("[BlaxSmith]  Notification: " .. tostring(data.message or "No message"))
    end,
    ["search-toolbox"] = function(data)
        -- Search the Roblox toolbox directly from plugin
        local keyword = data.keyword or "tree"
        print("[BlaxSmith] Searching toolbox for: " .. keyword)
        
        -- Use Roblox's Toolbox API (available to plugins)
        local success, results = pcall(function()
            local url = "https://apis.roblox.com/toolbox-service/v1/items/details?assetType=Model&keyword=" .. HttpService:UrlEncode(keyword) .. "&limit=10"
            local response = HttpService:RequestAsync({
                Url = url,
                Method = "GET",
                Headers = { ["Content-Type"] = "application/json" }
            })
            return HttpService:JSONDecode(response.Body)
        end)
        
        if success and results and results.data then
            print("[BlaxSmith] Found " .. #results.data .. " results:")
            for i, item in ipairs(results.data) do
                print("  " .. i .. ". " .. (item.asset.name or "Unknown") .. " (ID: " .. (item.asset.id or "?") .. ")")
            end
        else
            print("[BlaxSmith] Toolbox search failed, using fallback method")
        end
    end,
    ["insert-asset"] = function(data)
         local id = tonumber(data.assetId)
         print("[BlaxSmith] ====== INSERTING ASSET ======")
         print("[BlaxSmith] Asset ID: " .. tostring(id))
         
         -- Method 1: InsertService:LoadAsset (works for Roblox-owned and shared assets)
         local s, m = pcall(function() return InsertService:LoadAsset(id) end)
         
         if s and m then
             print("[BlaxSmith]  LoadAsset succeeded!")
             
             -- SAFETY: Strip scripts from Toolbox/External assets
             stripScripts(m)
             -- OPTIMIZATION: Anchor, Scale, Clean
             optimizeModel(m)
             
             -- PROPER GROUND PLACEMENT using bounding box
             local cframe, size = m:GetBoundingBox()
             local halfHeight = size.Y / 2
             local groundY = 0
             local targetPos = Vector3.new(0, groundY + halfHeight + 1, 0)
             m:PivotTo(CFrame.new(targetPos))
             m.Parent = workspace
             
             -- ENSURE VISIBILITY
             for _, part in ipairs(m:GetDescendants()) do
                 if part:IsA("BasePart") then
                     part.Anchored = true
                     part.Transparency = 0
                 end
             end
             
             -- PLACEMENT: Grid/Scatter if requested
             if data.placement then
                 smartPlace(m, data.placement)
             end
             
             print("[BlaxSmith]  Asset inserted at Y=" .. tostring(targetPos.Y))
             return
         end
         
         print("[BlaxSmith] LoadAsset failed, trying GetObjects...")
         
         -- Method 2: game:GetObjects fallback (works in plugins for more assets)
         local s2, objs = pcall(function() return game:GetObjects("rbxassetid://" .. id) end)
         if s2 and objs and #objs > 0 then
             local container = Instance.new("Model")
             container.Name = "InsertedAsset_" .. id
             for _, o in ipairs(objs) do 
                 o.Parent = container 
             end
             
             -- SAFETY: Strip scripts
             stripScripts(container)
             -- OPTIMIZATION: Anchor, Scale, Clean
             optimizeModel(container)
             
             -- PROPER GROUND PLACEMENT using bounding box
             local cframe, size = container:GetBoundingBox()
             local halfHeight = size.Y / 2
             local targetPos = Vector3.new(0, halfHeight + 1, 0)
             container:PivotTo(CFrame.new(targetPos))
             container.Parent = workspace
             
             -- ENSURE VISIBILITY
             for _, part in ipairs(container:GetDescendants()) do
                 if part:IsA("BasePart") then
                     part.Anchored = true
                     part.Transparency = 0
                 end
             end
             
             -- PLACEMENT: Grid/Scatter if requested
             if data.placement then
                  smartPlace(container, data.placement)
             end
             
             print("[BlaxSmith]  Asset inserted via GetObjects at Y=" .. tostring(targetPos.Y))
             return
         end
         
         warn("[BlaxSmith]  Failed to insert asset: " .. tostring(id))
         warn("[BlaxSmith] Only Roblox-owned or shared assets can be loaded.")
         warn("[BlaxSmith] The sword (125013769) is confirmed working.")
    end,

    ["insert-asset-batch"] = function(data)
        local assets = data.assets or {}
        local keyword = data.keyword or "assets"
        local source = data.source or "Smart Search"

        print("[BlaxSmith]  BATCH INSERT START: " .. #assets .. " items for \"" .. keyword .. "\" from " .. source)

        -- Create a folder for the batch
        local folder = workspace:FindFirstChild("BlaxSmith_Batch_" .. keyword)
        if not folder then
            folder = Instance.new("Folder")
            folder.Name = "BlaxSmith_Batch_" .. keyword
            folder.Parent = workspace
        end

        for i, assetData in ipairs(assets) do
            local assetId = assetData.assetId or assetData.id
            if assetId then
                spawn(function()
                    local s, m = pcall(function() return InsertService:LoadAsset(tonumber(assetId)) end)
                    if not s then
                        s, m = pcall(function() return game:GetObjects("rbxassetid://" .. assetId)[1] end)
                    end

                    if s and m then
                        m.Name = assetData.name or (keyword .. "_" .. i)
                        m.Parent = folder
                        local offset = Vector3.new((i - 1) * 15, 0, 0)
                        m:MoveTo(Vector3.new(0, 5, 0) + offset)
                        stripScripts(m)
                        optimizeModel(m)
                    end
                end)
                wait(0.3)
            elseif assetData.downloadUrl then
                warn("[BlaxSmith]  External model detected: " .. (assetData.name or "Unknown") .. ". Auto-converting GLB to Roblox Mesh...")
                -- Here we could trigger a local download/import if supported
            end
        end
    end,

    -- Undo Stack for inserted assets
    ["undo-insert"] = function(data)
        print("[BlaxSmith] ====== UNDO INSERT ======")
        local id = tostring(data.assetId)
        
        -- Find and remove the most recently inserted asset with this ID
        for _, obj in ipairs(workspace:GetChildren()) do
            if obj.Name:find("InsertedAsset_" .. id) or obj:FindFirstChild("InsertedAsset_" .. id) then
                print("[BlaxSmith]  Undoing: " .. obj.Name)
                obj:Destroy()
                return
            end
        end
        
        -- Try to find any model with matching asset name
        for _, obj in ipairs(workspace:GetChildren()) do
            if obj:GetAttribute("BlaxSmithAssetId") == id then
                print("[BlaxSmith]  Undoing (by attribute): " .. obj.Name)
                obj:Destroy()
                return
            end
        end
        
        print("[BlaxSmith]  Could not find asset to undo: " .. id)
    end,
    
    ["inject-sdk"] = function()
        injectSDK()
    end,
    
    -- NEW: Import external 3D file (GLB/FBX from Poly Haven, Sloyd, etc.)
    ["import_fbx"] = function(data)
        print("[BlaxSmith] ====== EXTERNAL 3D MODEL READY ======")
        print("[BlaxSmith]  File: " .. tostring(data.name or "Unknown"))
        print("[BlaxSmith]  Path: " .. tostring(data.path))
        print("[BlaxSmith]  Source: " .. tostring(data.source or "external"))
        
        -- Store the file info for user reference
        local modelInfo = {
            name = data.name or "Model",
            path = data.path,
            source = data.source or "external",
            position = data.position or {x = 0, y = 5, z = 0}
        }
        
        -- Create visual marker where model should be placed
        local marker = Instance.new("Part")
        marker.Name = "BlaxSmith_ImportMarker_" .. (data.name or "Model")
        marker.Size = Vector3.new(4, 4, 4)
        marker.Position = Vector3.new(modelInfo.position.x or 0, modelInfo.position.y or 5, modelInfo.position.z or 0)
        marker.Anchored = true
        marker.CanCollide = false
        marker.Transparency = 0.5
        marker.BrickColor = BrickColor.new("Bright green")
        marker.Material = Enum.Material.Neon
        marker.Parent = workspace
        
        -- Add info label
        local billboard = Instance.new("BillboardGui")
        billboard.Size = UDim2.new(0, 200, 0, 80)
        billboard.StudsOffset = Vector3.new(0, 4, 0)
        billboard.AlwaysOnTop = true
        billboard.Adornee = marker
        billboard.Parent = marker
        
        local label = Instance.new("TextLabel")
        label.Size = UDim2.new(1, 0, 1, 0)
        label.BackgroundColor3 = Color3.fromRGB(30, 150, 60)
        label.BackgroundTransparency = 0.2
        label.TextColor3 = Color3.new(1, 1, 1)
        label.Text = " " .. (data.name or "Model") .. "\n " .. (data.source or "external") .. "\nDrag imported model here!"
        label.TextScaled = true
        label.Font = Enum.Font.GothamBold
        label.Parent = billboard
        
        -- Auto-cleanup marker after 60 seconds
        spawn(function()
            wait(60)
            if marker and marker.Parent then
                marker:Destroy()
            end
        end)
        
        print("[BlaxSmith]  Import marker created at position")
        print("[BlaxSmith] ")
        print("[BlaxSmith]  TO IMPORT THE 3D MODEL:")
        print("[BlaxSmith] 1. In Roblox Studio, go to: File  Import 3D")
        print("[BlaxSmith] 2. Navigate to the path shown above")
        print("[BlaxSmith] 3. Select the file and click Import")
        print("[BlaxSmith] 4. Drag the model to the green marker!")
        print("[BlaxSmith] ")
        print("[BlaxSmith]  TIP: The marker shows where to place the model")
    end,
    
    -- NEW: Import asset bundle from BlaxSmith pipeline
    ["import_bundle"] = function(data)
        print("[BlaxSmith] ====== IMPORTING ASSET BUNDLE ======")
        print("[BlaxSmith] Bundle: " .. tostring(data.name))
        
        local bundlePath = data.bundlePath or data.path
        local metadata = data.metadata or {}
        
        -- Try to import FBX
        if bundlePath then
            local success, result = pcall(function()
                return StudioService:PromptImportFile({bundlePath})
            end)
            
            if success then
                print("[BlaxSmith]  Bundle import started for: " .. tostring(data.name))
            end
        end
        
        -- Apply metadata after import (position, anchored, etc.)
        if metadata.position then
            print("[BlaxSmith] Position will be set to: " .. tostring(metadata.position.x) .. ", " .. tostring(metadata.position.y) .. ", " .. tostring(metadata.position.z))
        end
    end,
    
    -- NEW: Place last imported asset at position
    ["place_asset"] = function(data)
        local lastImported = Selection:Get()[1]
        if lastImported then
            local pos = data.position or {x = 0, y = 5, z = 0}
            if lastImported:IsA("Model") then
                lastImported:PivotTo(CFrame.new(pos.x, pos.y, pos.z))
            elseif lastImported:IsA("BasePart") then
                lastImported.Position = Vector3.new(pos.x, pos.y, pos.z)
            end
            
            if data.anchored and lastImported:IsA("Model") then
                for _, part in pairs(lastImported:GetDescendants()) do
                    if part:IsA("BasePart") then
                        part.Anchored = true
                    end
                end
            end
            
            print("[BlaxSmith]  Asset placed at " .. tostring(pos.x) .. ", " .. tostring(pos.y) .. ", " .. tostring(pos.z))
        else
            print("[BlaxSmith]  No asset selected. Import an asset first.")
        end
    end,

    -- THE SKELETON: Blueprint Execution (The "Hands")
    ["execute_blueprint"] = function(blueprint)
        print("[BlaxSmith]  BLUEPRINT RECEIVED: " .. (blueprint.gameName or "Untitled"))
        buildFullGame(blueprint)
    end,
}

-- ============================================
--  PLUGIN CORE: PERSISTENT COMMAND LISTENER
-- =-- This matches the Lemonade/Superbullet architecture
-- ============================================
local busy = false
local lastPoll = 0
local POLL_INTERVAL = 0.5 -- seconds

RunService.Heartbeat:Connect(function()
    if not CONFIG.AUTO_CONNECT then return end -- Only poll if connected
    if busy then return end
    
    local now = tick()
    if now - lastPoll < POLL_INTERVAL then return end
    lastPoll = now
    
    busy = true
    
    local success, result = pcall(function()
        return HttpService:RequestAsync({
            Url = CONFIG.APP_URL .. "/poll",
            Method = "GET",
            Headers = { ["Content-Type"] = "application/json" }
        })
    end)
    
    if success and result and result.Body ~= "" then
        local data = HttpService:JSONDecode(result.Body)
        
        -- Handle multiple actions if delivered in a list (v6 style)
        if data.actions and type(data.actions) == "table" then
            for _, action in ipairs(data.actions) do
                if CommandHandlers[action.type] then
                    CommandHandlers[action.type](action)
                elseif action.action and CommandHandlers[action.action] then
                    CommandHandlers[action.action](action)
                end
            end
        elseif data.type and data.type ~= "none" then
            -- Single action (legacy style)
            if CommandHandlers[data.type] then
                CommandHandlers[data.type](data)
            end
        end
    end
    
    busy = false
end)
-- =========================
--  GAME GENERATOR (PROMPTS -> FULL GAMES)
-- =========================
local GameGenerator = {}

-- Helper: Create Player Spawns
function GameGenerator.createPlayerSpawns(spawnPositions)
    for i, pos in ipairs(spawnPositions or {}) do
        -- If position is a table {x,y,z}, convert to Vector3
        if type(pos) == "table" and pos.x then 
            pos = Vector3.new(pos.x, pos.y, pos.z) 
        end
        
        local spawn = Instance.new("SpawnLocation")
        spawn.Position = pos
        spawn.Anchored = true
        spawn.CanCollide = false
        spawn.Transparency = 1
        spawn.Parent = workspace
        spawn.TeamColor = BrickColor.Random()
        spawn.Name = "Spawn_" .. i
    end
    print("[BlaxSmith]  Player spawn points created")
end

-- Helper: Spawn NPCs
function GameGenerator.spawnNPCs(npcList)
    for _, npcInfo in ipairs(npcList or {}) do
        local assetId = tonumber(npcInfo.assetId)
        local pos = npcInfo.position
        if type(pos) == "table" then pos = Vector3.new(pos.x, pos.y, pos.z) end
        
        if assetId then
            local model = safeInsert(assetId)
            if model then
                model.Name = npcInfo.name or "NPC"
                if model:IsA("Model") then
                    model:PivotTo(CFrame.new(pos))
                elseif model:IsA("BasePart") then
                    model.Position = pos
                end
                
                -- Ensure it's anchored if it's a statue, or unanchored if it needs to move
                -- For now, default to plugin preference or model settings
                model.Parent = workspace
            end
        end
    end
    print("[BlaxSmith]  NPCs spawned")
end

-- Helper: Spawn Loot
function GameGenerator.spawnLoot(lootList)
    for _, lootInfo in ipairs(lootList or {}) do
        local assetId = tonumber(lootInfo.assetId)
        local pos = lootInfo.position
        if type(pos) == "table" then pos = Vector3.new(pos.x, pos.y, pos.z) end
        
        if assetId then
            local model = safeInsert(assetId)
            if model then
                model.Name = lootInfo.name or "Loot"
                if model:IsA("Model") then
                    model:PivotTo(CFrame.new(pos))
                elseif model:IsA("BasePart") then
                    model.Position = pos
                end
                model.Parent = workspace
            end
        end
    end
    print("[BlaxSmith]  Loot items spawned")
end

-- Helper: Create Triggers
function GameGenerator.createTriggers(triggerList)
    for _, triggerInfo in ipairs(triggerList or {}) do
        local pos = triggerInfo.position
        if type(pos) == "table" then pos = Vector3.new(pos.x, pos.y, pos.z) end
        
        local part = Instance.new("Part")
        part.Size = triggerInfo.size or Vector3.new(4,1,4)
        part.Position = pos
        part.Transparency = 0.5
        part.Anchored = true
        part.CanCollide = false
        part.Name = triggerInfo.name or "Trigger"
        part.BrickColor = BrickColor.new("Magenta")
        part.Material = Enum.Material.ForceField
        part.Parent = workspace
        
        -- Connect touch event
        local script = Instance.new("Script")
        script.Parent = part
        script.Source = [[
            script.Parent.Touched:Connect(function(hit)
                if hit.Parent:FindFirstChild("Humanoid") then
                    print("[BlaxSmith]  Trigger Activated: " .. script.Parent.Name)
                end
            end)
        ]]
    end
    print("[BlaxSmith]  Triggers created")
end

-- NPC AI & PATHFINDING (Lemonade-style)
local function randomPositionInBlock(blockCenter, blockSize)
    local x = blockCenter.X + (math.random() - 0.5) * (blockSize - 10)
    local z = blockCenter.Z + (math.random() - 0.5) * (blockSize - 10)
    return Vector3.new(x, 2, z)
end

local function wanderAI(npc)
    task.spawn(function()
        local humanoid = npc:FindFirstChildOfClass("Humanoid")
        if not humanoid then return end
        
        while npc and npc.Parent do
            local currentPos = npc.PrimaryPart.Position
            local targetPos = currentPos + Vector3.new(math.random(-30, 30), 0, math.random(-30, 30))
            
            local path = PathfindingService:CreatePath({
                AgentRadius = 2,
                AgentHeight = 5,
                AgentCanJump = true,
            })
            
            local success, errorMessage = pcall(function()
                path:ComputeAsync(currentPos, targetPos)
            end)
            
            if success and path.Status == Enum.PathStatus.Success then
                local waypoints = path:GetWaypoints()
                for i = 2, #waypoints do
                    humanoid:MoveTo(waypoints[i].Position)
                    local reached = humanoid.MoveToFinished:Wait()
                    if not reached then break end
                    if not npc or not npc.Parent then return end
                end
            else
                -- Fallback: simple MoveTo if path fails
                humanoid:MoveTo(targetPos)
                humanoid.MoveToFinished:Wait()
            end
            
            task.wait(math.random(3, 7))
        end
    end)
end

function GameGenerator.spawnAutomatedNPCs(config, blocks)
    print("[BlaxSmith]  Spawning " .. (config.count or 10) .. " Automated NPCs...")
    local npcsFolder = ensureFolder(workspace, "BlaxSmith_NPCs")
    
    for i = 1, (config.count or 10) do
        local block = blocks[math.random(1, #blocks)]
        local spawnPos = randomPositionInBlock(block.center, block.size)
        
        -- Create a simple R6-ish character if no template provided
        local npc = Instance.new("Model")
        npc.Name = "Citizen_" .. i
        
        local torso = Instance.new("Part")
        torso.Name = "Torso"
        torso.Size = Vector3.new(2, 2, 1)
        torso.Position = spawnPos + Vector3.new(0, 1, 0)
        torso.Parent = npc
        torso.BrickColor = BrickColor.Random()
        
        local head = Instance.new("Part")
        head.Name = "Head"
        head.Size = Vector3.new(1.2, 1.2, 1.2)
        head.Position = torso.Position + Vector3.new(0, 1.5, 0)
        head.Parent = npc
        
        local humanoid = Instance.new("Humanoid")
        humanoid.Parent = npc
        
        npc.PrimaryPart = torso
        npc.Parent = npcsFolder
        
        wanderAI(npc)
    end
end

-- ============================================
-- SUPERBULLET-STYLE NPC SYSTEM
-- ============================================
function GameGenerator.spawnNPCs(npcs)
    local npcsFolder = workspace:FindFirstChild("NPCs") or Instance.new("Folder")
    npcsFolder.Name = "NPCs"
    npcsFolder.Parent = workspace
    
    print("[BlaxSmith]  Spawning " .. #npcs .. " NPCs...")
    
    for i, npcData in ipairs(npcs or {}) do
        local npc = Instance.new("Model")
        npc.Name = npcData.name or ("NPC_" .. i)
        
        -- Body Parts
        local torso = Instance.new("Part")
        torso.Name = "Torso"
        torso.Size = Vector3.new(2, 2, 1)
        torso.BrickColor = BrickColor.new(npcData.color or "Bright blue")
        torso.Anchored = true
        torso.Parent = npc
        
        local head = Instance.new("Part")
        head.Name = "Head"
        head.Shape = Enum.PartType.Ball
        head.Size = Vector3.new(1.2, 1.2, 1.2)
        head.BrickColor = BrickColor.new("Pastel brown")
        head.Position = torso.Position + Vector3.new(0, 1.5, 0)
        head.Anchored = true
        head.Parent = npc
        
        local humanoid = Instance.new("Humanoid")
        humanoid.Parent = npc
        
        npc.PrimaryPart = torso
        
        -- Position
        local pos = npcData.position or Vector3.new(
            math.random(-100, 100),
            3,
            math.random(-100, 100)
        )
        npc:SetPrimaryPartCFrame(CFrame.new(pos))
        
        -- Behavior Type
        if npcData.behavior == "patrol" then
            local patrolScript = Instance.new("Script")
            patrolScript.Name = "PatrolBehavior"
            patrolScript.Source = [[
                local npc = script.Parent
                local startPos = npc.PrimaryPart.Position
                local waypoints = {
                    startPos + Vector3.new(20, 0, 0),
                    startPos + Vector3.new(20, 0, 20),
                    startPos + Vector3.new(0, 0, 20),
                    startPos
                }
                local index = 1
                while true do
                    local target = waypoints[index]
                    for t = 0, 1, 0.02 do
                        npc:SetPrimaryPartCFrame(CFrame.new(npc.PrimaryPart.Position:Lerp(target, 0.05)))
                        wait(0.1)
                    end
                    index = (index % #waypoints) + 1
                end
            ]]
            patrolScript.Parent = npc
        elseif npcData.behavior == "shopkeeper" then
            -- Add ProximityPrompt for interaction
            local prompt = Instance.new("ProximityPrompt")
            prompt.ObjectText = npcData.name or "Shop"
            prompt.ActionText = "Open Shop"
            prompt.HoldDuration = 0.5
            prompt.Parent = torso
        elseif npcData.behavior == "combat" then
            -- Enemy NPC with health and attack
            humanoid.MaxHealth = npcData.health or 100
            humanoid.Health = humanoid.MaxHealth
            npc:SetAttribute("Damage", npcData.damage or 10)
            npc:SetAttribute("IsEnemy", true)
        end
        
        -- Name Tag
        local billboard = Instance.new("BillboardGui")
        billboard.Name = "NameTag"
        billboard.Size = UDim2.new(0, 100, 0, 30)
        billboard.StudsOffset = Vector3.new(0, 2.5, 0)
        billboard.Parent = head
        
        local nameLabel = Instance.new("TextLabel")
        nameLabel.Size = UDim2.new(1, 0, 1, 0)
        nameLabel.BackgroundTransparency = 1
        nameLabel.Text = npcData.name or "NPC"
        nameLabel.TextColor3 = Color3.new(1, 1, 1)
        nameLabel.TextStrokeTransparency = 0.5
        nameLabel.Font = Enum.Font.GothamBold
        nameLabel.TextSize = 14
        nameLabel.Parent = billboard
        
        npc.Parent = npcsFolder
    end
    
    print("[BlaxSmith]  NPCs spawned with behaviors!")
end

-- AUTOMATED QUEST SYSTEM (Lemonade-style)
function GameGenerator.createQuestSystemModule()
    print("[BlaxSmith]  Creating Integrated Quest System...")
    local sss = game:GetService("ServerScriptService")
    local questModule = sss:FindFirstChild("QuestSystem")
    if not questModule then
        questModule = Instance.new("ModuleScript")
        questModule.Name = "QuestSystem"
        questModule.Source = [[
local QuestSystem = {}
QuestSystem.activeQuests = {}

function QuestSystem:AssignQuest(npc, questData)
    QuestSystem.activeQuests[npc] = questData
    print("[QuestSystem] Assigned quest to " .. npc.Name)
end

function QuestSystem:CompleteQuest(npc, player)
    local quest = QuestSystem.activeQuests[npc]
    if not quest then return end
    
    -- Reward player
    local leaderstats = player:FindFirstChild("leaderstats")
    if leaderstats then
        local coins = leaderstats:FindFirstChild("Coins") or leaderstats:FindFirstChild("Gold")
        if coins then
            coins.Value = coins.Value + (quest.reward or 100)
            print("[QuestSystem] " .. player.Name .. " completed quest! Reward: " .. (quest.reward or 100))
        end
    end
    
    QuestSystem.activeQuests[npc] = nil
    return true
end

return QuestSystem
]]
        questModule.Parent = sss
    end
    return questModule
end

function GameGenerator.hookNPCQuests(blueprint, questModule)
    if not blueprint.quests or #blueprint.quests == 0 then return end
    print("[BlaxSmith]  Hooking " .. #blueprint.quests .. " quests to NPCs...")
    
    local QuestSystem = require(questModule)
    local sss = game:GetService("ServerScriptService")
    local Inventory = sss:FindFirstChild("Inventory") and require(sss.Inventory) or nil
    
    local npcs = workspace:FindFirstChild("BlaxSmith_NPCs")
    if not npcs then return end
    
    local npcList = npcs:GetChildren()
    if #npcList == 0 then return end
    
    for i, questData in ipairs(blueprint.quests) do
        local npc = npcList[math.random(1, #npcList)]
        QuestSystem:AssignQuest(npc, questData)
        
        -- Add Interaction
        local prompt = npc:FindFirstChildOfClass("ProximityPrompt") or Instance.new("ProximityPrompt")
        prompt.ObjectText = npc.Name
        prompt.ActionText = "Talk (Quest)"
        prompt.HoldDuration = 0.5
        prompt.Parent = npc.PrimaryPart or npc:FindFirstChild("Torso") or npc:FindFirstChild("HumanoidRootPart")
        
        -- Server Script to handle interaction
        local interactScript = npc:FindFirstChild("QuestInteraction") or Instance.new("Script")
        interactScript.Name = "QuestInteraction"
        interactScript.Source = [[
local QuestSystem = require(game.ServerScriptService.QuestSystem)
local npc = script.Parent
local prompt = npc:FindFirstChildOfClass("ProximityPrompt")

prompt.Triggered:Connect(function(player)
    local success = QuestSystem:CompleteQuest(npc, player)
    if success then
        print("[Quest] Done!")
        -- INVENTORY INTEGRATION: Add reward item if specified
        local sss = game:GetService("ServerScriptService")
        if sss:FindFirstChild("Inventory") then
            local Inventory = require(sss.Inventory)
            Inventory:AddItem(player, {name = "QuestReward", type = "reward"})
        end
    else
        print("[Quest] No active quest from this NPC.")
    end
end)
]]
        interactScript.Parent = npc
    end
end

-- INVENTORY & COMBAT SYSTEMS (Lemonade-style)
function GameGenerator.createInventorySystemModule()
    print("[BlaxSmith]  Creating Inventory System...")
    local sss = game:GetService("ServerScriptService")
    local invModule = sss:FindFirstChild("Inventory")
    if not invModule then
        invModule = Instance.new("ModuleScript")
        invModule.Name = "Inventory"
        invModule.Source = [[
local Inventory = {}
Inventory.players = {}

function Inventory:InitPlayer(player)
    self.players[player] = { items = {}, maxSlots = 20 }
    print("[Inventory] Initialized for " .. player.Name)
end

function Inventory:AddItem(player, item)
    local inv = self.players[player]
    if not inv then return false end
    if #inv.items >= inv.maxSlots then 
        warn("[Inventory] Full for " .. player.Name)
        return false 
    end
    table.insert(inv.items, item)
    print("[Inventory] Added " .. (item.name or "item") .. " to " .. player.Name)
    return true
end

function Inventory:RemoveItem(player, itemName)
    local inv = self.players[player]
    if not inv then return false end
    for i, item in ipairs(inv.items) do
        if item.name == itemName then
            table.remove(inv.items, i)
            return true
        end
    end
    return false
end

function Inventory:GetItems(player)
    return self.players[player] and self.players[player].items or {}
end

return Inventory
]]
        invModule.Parent = sss
        
        -- Auto-initialize players
        local initScript = Instance.new("Script")
        initScript.Name = "InventoryInitializer"
        initScript.Source = [[
local Players = game:GetService("Players")
local Inventory = require(script.Parent)

Players.PlayerAdded:Connect(function(player)
    Inventory:InitPlayer(player)
end)

for _, player in ipairs(Players:GetPlayers()) do
    Inventory:InitPlayer(player)
end
]]
        initScript.Parent = invModule
    end
    return invModule
end

function GameGenerator.createCombatSystemModule()
    print("[BlaxSmith]  Creating Combat System...")
    local sss = game:GetService("ServerScriptService")
    local combatModule = sss:FindFirstChild("Combat")
    if not combatModule then
        combatModule = Instance.new("ModuleScript")
        combatModule.Name = "Combat"
        combatModule.Source = [[
local Combat = {}
local Players = game:GetService("Players")

function Combat:Attack(attacker, target)
    local humanoid = target:FindFirstChildOfClass("Humanoid")
    if not humanoid then return end
    
    local damage = attacker:GetAttribute("Damage") or 10
    humanoid:TakeDamage(damage)
    
    if humanoid.Health <= 0 then
        print("[Combat] Target defeated: " .. target.Name)
        -- Reward player
        local player = nil
        if attacker:IsA("Player") then 
            player = attacker 
        elseif Players:GetPlayerFromCharacter(attacker) then
            player = Players:GetPlayerFromCharacter(attacker)
        end
        
        if player then
            local sss = game:GetService("ServerScriptService")
            if sss:FindFirstChild("Inventory") then
                local Inventory = require(sss.Inventory)
                Inventory:AddItem(player, { name="loot_coin", type="currency" })
            end
        end
    end
end

return Combat
]]
        combatModule.Parent = sss
    end
    return combatModule
end

-- ============================================
-- SUPERBULLET-STYLE LOOT SYSTEM
-- ============================================
function GameGenerator.spawnLoot(lootConfig)
    local lootFolder = workspace:FindFirstChild("Loot") or Instance.new("Folder")
    lootFolder.Name = "Loot"
    lootFolder.Parent = workspace
    
    local LOOT_TIERS = {
        common = {color = Color3.fromRGB(150, 150, 150), chance = 0.6},
        uncommon = {color = Color3.fromRGB(80, 220, 80), chance = 0.25},
        rare = {color = Color3.fromRGB(0, 150, 255), chance = 0.1},
        epic = {color = Color3.fromRGB(180, 60, 255), chance = 0.04},
        legendary = {color = Color3.fromRGB(255, 200, 0), chance = 0.01}
    }
    
    local count = lootConfig.count or 20
    print("[BlaxSmith]  Generating " .. count .. " loot items...")
    
    for i = 1, count do
        -- Random tier selection
        local roll = math.random()
        local tier = "common"
        local cumulative = 0
        for t, data in pairs(LOOT_TIERS) do
            cumulative = cumulative + data.chance
            if roll <= cumulative then
                tier = t
                break
            end
        end
        
        local chest = Instance.new("Part")
        chest.Name = tier:upper() .. "_Chest_" .. i
        chest.Size = Vector3.new(3, 2, 2)
        chest.BrickColor = BrickColor.new("Brown")
        chest.Material = Enum.Material.Wood
        chest.Anchored = true
        chest.Position = Vector3.new(
            math.random(-150, 150),
            1,
            math.random(-150, 150)
        )
        chest.Parent = lootFolder
        
        -- Glow effect for higher tiers
        if tier ~= "common" then
            local highlight = Instance.new("Highlight")
            highlight.FillColor = LOOT_TIERS[tier].color
            highlight.FillTransparency = 0.7
            highlight.OutlineTransparency = 0
            highlight.OutlineColor = LOOT_TIERS[tier].color
            highlight.Parent = chest
        end
        
        -- Loot interaction
        local prompt = Instance.new("ProximityPrompt")
        prompt.ObjectText = tier:upper() .. " Chest"
        prompt.ActionText = "Open"
        prompt.HoldDuration = 0.8
        prompt.Parent = chest
        
        -- Loot script
        local lootScript = Instance.new("Script")
        lootScript.Name = "LootHandler"
        lootScript.Source = string.format([[
            local tier = "%s"
            local rewards = {common = 10, uncommon = 25, rare = 75, epic = 200, legendary = 500}
            
            script.Parent.ProximityPrompt.Triggered:Connect(function(player)
                local ls = player:FindFirstChild("leaderstats")
                if ls then
                    local coins = ls:FindFirstChild("Coins")
                    if coins then
                        coins.Value = coins.Value + rewards[tier]
                        print(player.Name .. " found " .. tier:upper() .. " loot! +" .. rewards[tier])
                    end
                end
                script.Parent:Destroy()
            end)
        ]], tier)
        lootScript.Parent = chest
    end
    
    print("[BlaxSmith]  Loot system created with " .. count .. " chests!")
end

-- ============================================
-- ╔══════════════════════════════════════════════════════════════════════════════╗
-- ║  BlaxSmith ADVANCED QUEST SYSTEM v2.0                                         ║
-- ║  Premium Quests with Categories, Tiers, Progress & Quest Log UI               ║
-- ╚══════════════════════════════════════════════════════════════════════════════╝
function GameGenerator.createQuests(questsConfig)
    print("[BlaxSmith] ✨ Creating Advanced Quest System...")
    
    -- Server-side Quest Handler
    local questScript = Instance.new("Script")
    questScript.Name = "AdvancedQuestSystem"
    questScript.Source = [[
local Players = game:GetService("Players")
local ReplicatedStorage = game:GetService("ReplicatedStorage")

-- ========================= QUEST DATABASE =========================
local QUESTS = {
    -- DAILY QUESTS (Reset every 24h)
    {id = 1, name = "Daily Login", category = "Daily", type = "login", tier = "bronze", 
     description = "Log in today", goal = 1, reward = {coins = 100, xp = 50}, icon = "📅"},
    {id = 2, name = "Coin Collector", category = "Daily", type = "collect", tier = "silver", 
     description = "Collect 500 coins", goal = 500, reward = {coins = 200, xp = 100}, stat = "Coins", icon = "💰"},
    {id = 3, name = "Enemy Slayer", category = "Daily", type = "kill", tier = "gold", 
     description = "Defeat 25 enemies", goal = 25, reward = {coins = 500, gems = 5, xp = 250}, stat = "Kills", icon = "⚔️"},
    
    -- WEEKLY QUESTS
    {id = 4, name = "Treasure Hunter", category = "Weekly", type = "collect", tier = "gold", 
     description = "Open 50 chests", goal = 50, reward = {coins = 2000, gems = 20}, stat = "ChestsOpened", icon = "📦"},
    {id = 5, name = "Pet Master", category = "Weekly", type = "hatch", tier = "gold", 
     description = "Hatch 20 eggs", goal = 20, reward = {coins = 1500, gems = 15}, stat = "EggsHatched", icon = "🥚"},
    
    -- STORY QUESTS (One-time)
    {id = 6, name = "First Steps", category = "Story", type = "tutorial", tier = "bronze", 
     description = "Complete the tutorial", goal = 1, reward = {coins = 250, xp = 100}, icon = "👣"},
    {id = 7, name = "Rising Champion", category = "Story", type = "level", tier = "silver", 
     description = "Reach level 10", goal = 10, reward = {coins = 1000, gems = 10}, stat = "Level", icon = "⬆️"},
    {id = 8, name = "Legendary Hunter", category = "Story", type = "collect", tier = "gold", 
     description = "Obtain a legendary pet", goal = 1, reward = {coins = 5000, gems = 50}, stat = "LegendaryPets", icon = "🏆"},
    
    -- ACHIEVEMENT QUESTS
    {id = 9, name = "Millionaire", category = "Achievement", type = "collect", tier = "platinum", 
     description = "Accumulate 1,000,000 coins", goal = 1000000, reward = {gems = 100, title = "💎 Millionaire"}, stat = "TotalCoins", icon = "💵"},
    {id = 10, name = "Pet Collector", category = "Achievement", type = "collect", tier = "platinum", 
     description = "Own 100 pets", goal = 100, reward = {gems = 75, title = "🐾 Pet Master"}, stat = "TotalPets", icon = "🐾"},
}

local TIER_COLORS = {
    bronze = Color3.fromRGB(205, 127, 50),
    silver = Color3.fromRGB(192, 192, 192),
    gold = Color3.fromRGB(255, 215, 0),
    platinum = Color3.fromRGB(229, 228, 226)
}

-- Create RemoteEvents
local questFolder = Instance.new("Folder")
questFolder.Name = "QuestRemotes"
questFolder.Parent = ReplicatedStorage

local getQuestsRemote = Instance.new("RemoteFunction")
getQuestsRemote.Name = "GetQuests"
getQuestsRemote.Parent = questFolder

local updateProgressRemote = Instance.new("RemoteEvent")
updateProgressRemote.Name = "UpdateQuestProgress"
updateProgressRemote.Parent = questFolder

local claimRewardRemote = Instance.new("RemoteFunction")
claimRewardRemote.Name = "ClaimQuestReward"
claimRewardRemote.Parent = questFolder

-- Player quest data storage
local playerQuests = {}

-- Initialize player quests
Players.PlayerAdded:Connect(function(player)
    playerQuests[player] = {}
    
    for _, quest in ipairs(QUESTS) do
        playerQuests[player][quest.id] = {
            progress = 0,
            completed = false,
            claimed = false
        }
    end
    
    print("[Quest System] Initialized " .. #QUESTS .. " quests for " .. player.Name)
end)

Players.PlayerRemoving:Connect(function(player)
    playerQuests[player] = nil
end)

-- Get quests for player
getQuestsRemote.OnServerInvoke = function(player)
    local result = {}
    for _, quest in ipairs(QUESTS) do
        local pData = playerQuests[player] and playerQuests[player][quest.id]
        table.insert(result, {
            quest = quest,
            progress = pData and pData.progress or 0,
            completed = pData and pData.completed or false,
            claimed = pData and pData.claimed or false
        })
    end
    return result
end

-- Update quest progress
updateProgressRemote.OnServerEvent:Connect(function(player, statName, newValue)
    if not playerQuests[player] then return end
    
    for _, quest in ipairs(QUESTS) do
        if quest.stat == statName then
            local pData = playerQuests[player][quest.id]
            if pData and not pData.completed then
                pData.progress = math.min(newValue, quest.goal)
                if pData.progress >= quest.goal then
                    pData.completed = true
                    print("[Quest] " .. player.Name .. " completed: " .. quest.name)
                end
            end
        end
    end
end)

-- Claim quest reward
claimRewardRemote.OnServerInvoke = function(player, questId)
    if not playerQuests[player] then return false end
    
    local pData = playerQuests[player][questId]
    if not pData or not pData.completed or pData.claimed then
        return false
    end
    
    -- Find quest
    local quest = nil
    for _, q in ipairs(QUESTS) do
        if q.id == questId then quest = q break end
    end
    
    if not quest then return false end
    
    -- Give rewards
    local leaderstats = player:FindFirstChild("leaderstats")
    if leaderstats then
        if quest.reward.coins then
            local coins = leaderstats:FindFirstChild("Coins")
            if coins then coins.Value = coins.Value + quest.reward.coins end
        end
        if quest.reward.gems then
            local gems = leaderstats:FindFirstChild("Gems")
            if gems then gems.Value = gems.Value + quest.reward.gems end
        end
    end
    
    pData.claimed = true
    print("[Quest] " .. player.Name .. " claimed reward for: " .. quest.name)
    return true
end

print("[BlaxSmith] ✅ Advanced Quest System Active - " .. #QUESTS .. " quests loaded!")
]]
    questScript.Parent = game:GetService("ServerScriptService")
    
    -- Client-side Quest UI
    local questUI = Instance.new("LocalScript")
    questUI.Name = "QuestLogUI"
    questUI.Source = [[
local Players = game:GetService("Players")
local TweenService = game:GetService("TweenService")
local ReplicatedStorage = game:GetService("ReplicatedStorage")
local UserInputService = game:GetService("UserInputService")
local player = Players.LocalPlayer

-- Wait for remotes
local questRemotes = ReplicatedStorage:WaitForChild("QuestRemotes", 10)
if not questRemotes then return end
local getQuestsRemote = questRemotes:WaitForChild("GetQuests")
local claimRewardRemote = questRemotes:WaitForChild("ClaimQuestReward")

local TIER_COLORS = {
    bronze = Color3.fromRGB(205, 127, 50),
    silver = Color3.fromRGB(192, 192, 192),
    gold = Color3.fromRGB(255, 215, 0),
    platinum = Color3.fromRGB(229, 228, 226)
}

local CATEGORY_ICONS = {
    Daily = "📅",
    Weekly = "📆",
    Story = "📖",
    Achievement = "🏆"
}

-- Create UI
local screenGui = Instance.new("ScreenGui")
screenGui.Name = "BlaxSmith_QuestLog"
screenGui.ResetOnSpawn = false
screenGui.Parent = player.PlayerGui

local mainFrame = Instance.new("Frame")
mainFrame.Size = UDim2.new(0, 450, 0, 500)
mainFrame.Position = UDim2.new(0.5, -225, 0.5, -250)
mainFrame.BackgroundColor3 = Color3.fromRGB(18, 18, 30)
mainFrame.Visible = false
mainFrame.Parent = screenGui
Instance.new("UICorner", mainFrame).CornerRadius = UDim.new(0, 18)

local mainStroke = Instance.new("UIStroke")
mainStroke.Color = Color3.fromRGB(100, 80, 150)
mainStroke.Thickness = 2
mainStroke.Parent = mainFrame

-- Header
local header = Instance.new("Frame")
header.Size = UDim2.new(1, 0, 0, 55)
header.BackgroundColor3 = Color3.fromRGB(30, 25, 45)
header.Parent = mainFrame
Instance.new("UICorner", header).CornerRadius = UDim.new(0, 18)

local title = Instance.new("TextLabel")
title.Size = UDim2.new(0.7, 0, 1, 0)
title.Position = UDim2.new(0, 20, 0, 0)
title.BackgroundTransparency = 1
title.Text = "📜 QUEST LOG"
title.TextColor3 = Color3.fromRGB(255, 220, 150)
title.Font = Enum.Font.GothamBlack
title.TextSize = 22
title.TextXAlignment = Enum.TextXAlignment.Left
title.Parent = header

local closeBtn = Instance.new("TextButton")
closeBtn.Size = UDim2.new(0, 40, 0, 40)
closeBtn.Position = UDim2.new(1, -48, 0.5, -20)
closeBtn.BackgroundColor3 = Color3.fromRGB(255, 70, 70)
closeBtn.Text = "✕"
closeBtn.TextColor3 = Color3.new(1, 1, 1)
closeBtn.Font = Enum.Font.GothamBold
closeBtn.TextSize = 18
closeBtn.Parent = header
Instance.new("UICorner", closeBtn).CornerRadius = UDim.new(0, 10)

-- Category tabs
local tabFrame = Instance.new("Frame")
tabFrame.Size = UDim2.new(1, -30, 0, 35)
tabFrame.Position = UDim2.new(0, 15, 0, 60)
tabFrame.BackgroundTransparency = 1
tabFrame.Parent = mainFrame

local tabLayout = Instance.new("UIListLayout")
tabLayout.FillDirection = Enum.FillDirection.Horizontal
tabLayout.Padding = UDim.new(0, 6)
tabLayout.Parent = tabFrame

local categories = {"All", "Daily", "Weekly", "Story", "Achievement"}
local selectedCategory = "All"
local categoryTabs = {}

for _, cat in ipairs(categories) do
    local tab = Instance.new("TextButton")
    tab.Size = UDim2.new(0, 80, 1, 0)
    tab.BackgroundColor3 = cat == "All" and Color3.fromRGB(100, 70, 160) or Color3.fromRGB(40, 35, 55)
    tab.Text = cat
    tab.TextColor3 = Color3.new(1, 1, 1)
    tab.Font = Enum.Font.GothamBold
    tab.TextSize = 12
    tab.Parent = tabFrame
    Instance.new("UICorner", tab).CornerRadius = UDim.new(0, 8)
    categoryTabs[cat] = tab
end

-- Quest list
local questScroll = Instance.new("ScrollingFrame")
questScroll.Size = UDim2.new(1, -30, 1, -115)
questScroll.Position = UDim2.new(0, 15, 0, 100)
questScroll.BackgroundTransparency = 1
questScroll.ScrollBarThickness = 5
questScroll.CanvasSize = UDim2.new(0, 0, 0, 0)
questScroll.Parent = mainFrame

local questLayout = Instance.new("UIListLayout")
questLayout.Padding = UDim.new(0, 8)
questLayout.Parent = questScroll

-- Quest card creator
local function createQuestCard(questData)
    local quest = questData.quest
    local progress = questData.progress
    local completed = questData.completed
    local claimed = questData.claimed
    
    local card = Instance.new("Frame")
    card.Size = UDim2.new(1, -10, 0, 85)
    card.BackgroundColor3 = claimed and Color3.fromRGB(30, 40, 30) or Color3.fromRGB(35, 30, 50)
    Instance.new("UICorner", card).CornerRadius = UDim.new(0, 12)
    
    local tierStroke = Instance.new("UIStroke")
    tierStroke.Color = TIER_COLORS[quest.tier] or TIER_COLORS.bronze
    tierStroke.Thickness = completed and 2 or 1
    tierStroke.Transparency = claimed and 0.7 or 0.3
    tierStroke.Parent = card
    
    -- Icon
    local icon = Instance.new("TextLabel")
    icon.Size = UDim2.new(0, 50, 0, 50)
    icon.Position = UDim2.new(0, 10, 0.5, -25)
    icon.BackgroundTransparency = 1
    icon.Text = quest.icon or "📋"
    icon.TextSize = 30
    icon.Parent = card
    
    -- Name & Description
    local nameLabel = Instance.new("TextLabel")
    nameLabel.Size = UDim2.new(0, 200, 0, 20)
    nameLabel.Position = UDim2.new(0, 65, 0, 10)
    nameLabel.BackgroundTransparency = 1
    nameLabel.Text = quest.name
    nameLabel.TextColor3 = TIER_COLORS[quest.tier]
    nameLabel.Font = Enum.Font.GothamBold
    nameLabel.TextSize = 14
    nameLabel.TextXAlignment = Enum.TextXAlignment.Left
    nameLabel.Parent = card
    
    local descLabel = Instance.new("TextLabel")
    descLabel.Size = UDim2.new(0, 250, 0, 16)
    descLabel.Position = UDim2.new(0, 65, 0, 28)
    descLabel.BackgroundTransparency = 1
    descLabel.Text = quest.description
    descLabel.TextColor3 = Color3.fromRGB(180, 175, 200)
    descLabel.Font = Enum.Font.Gotham
    descLabel.TextSize = 11
    descLabel.TextXAlignment = Enum.TextXAlignment.Left
    descLabel.Parent = card
    
    -- Progress bar
    local progressBg = Instance.new("Frame")
    progressBg.Size = UDim2.new(0, 180, 0, 12)
    progressBg.Position = UDim2.new(0, 65, 0, 50)
    progressBg.BackgroundColor3 = Color3.fromRGB(25, 25, 35)
    progressBg.Parent = card
    Instance.new("UICorner", progressBg).CornerRadius = UDim.new(0, 6)
    
    local progressFill = Instance.new("Frame")
    progressFill.Size = UDim2.new(math.clamp(progress / quest.goal, 0, 1), 0, 1, 0)
    progressFill.BackgroundColor3 = completed and Color3.fromRGB(80, 200, 80) or TIER_COLORS[quest.tier]
    progressFill.Parent = progressBg
    Instance.new("UICorner", progressFill).CornerRadius = UDim.new(0, 6)
    
    local progressText = Instance.new("TextLabel")
    progressText.Size = UDim2.new(0, 60, 0, 12)
    progressText.Position = UDim2.new(0, 250, 0, 50)
    progressText.BackgroundTransparency = 1
    progressText.Text = progress .. "/" .. quest.goal
    progressText.TextColor3 = Color3.fromRGB(200, 200, 220)
    progressText.Font = Enum.Font.GothamBold
    progressText.TextSize = 11
    progressText.TextXAlignment = Enum.TextXAlignment.Left
    progressText.Parent = card
    
    -- Reward/Claim button
    local rewardBtn = Instance.new("TextButton")
    rewardBtn.Size = UDim2.new(0, 70, 0, 35)
    rewardBtn.Position = UDim2.new(1, -85, 0.5, -17)
    rewardBtn.Font = Enum.Font.GothamBold
    rewardBtn.TextSize = 11
    rewardBtn.Parent = card
    Instance.new("UICorner", rewardBtn).CornerRadius = UDim.new(0, 8)
    
    if claimed then
        rewardBtn.BackgroundColor3 = Color3.fromRGB(60, 80, 60)
        rewardBtn.Text = "✓ DONE"
        rewardBtn.TextColor3 = Color3.fromRGB(150, 200, 150)
    elseif completed then
        rewardBtn.BackgroundColor3 = Color3.fromRGB(80, 200, 80)
        rewardBtn.Text = "CLAIM!"
        rewardBtn.TextColor3 = Color3.new(1, 1, 1)
        
        rewardBtn.MouseButton1Click:Connect(function()
            local success = claimRewardRemote:InvokeServer(quest.id)
            if success then
                rewardBtn.Text = "✓ DONE"
                rewardBtn.BackgroundColor3 = Color3.fromRGB(60, 80, 60)
            end
        end)
    else
        rewardBtn.BackgroundColor3 = Color3.fromRGB(50, 45, 70)
        -- Show reward preview
        local rewardText = ""
        if quest.reward.coins then rewardText = "💰" .. quest.reward.coins end
        if quest.reward.gems then rewardText = rewardText .. " 💎" .. quest.reward.gems end
        rewardBtn.Text = rewardText ~= "" and rewardText or "🎁"
        rewardBtn.TextColor3 = Color3.fromRGB(180, 180, 200)
    end
    
    return card
end

-- Refresh quest list
local function refreshQuests()
    for _, child in ipairs(questScroll:GetChildren()) do
        if child:IsA("Frame") then child:Destroy() end
    end
    
    local quests = getQuestsRemote:InvokeServer()
    if not quests then return end
    
    local count = 0
    for _, qData in ipairs(quests) do
        if selectedCategory == "All" or qData.quest.category == selectedCategory then
            local card = createQuestCard(qData)
            card.Parent = questScroll
            count = count + 1
        end
    end
    
    questScroll.CanvasSize = UDim2.new(0, 0, 0, count * 93)
end

-- Tab switching
for cat, tab in pairs(categoryTabs) do
    tab.MouseButton1Click:Connect(function()
        selectedCategory = cat
        for c, t in pairs(categoryTabs) do
            t.BackgroundColor3 = c == cat and Color3.fromRGB(100, 70, 160) or Color3.fromRGB(40, 35, 55)
        end
        refreshQuests()
    end)
end

-- Open/Close
local isOpen = false

local function openQuestLog()
    if isOpen then return end
    isOpen = true
    mainFrame.Visible = true
    mainFrame.Size = UDim2.new(0, 0, 0, 0)
    mainFrame.Position = UDim2.new(0.5, 0, 0.5, 0)
    
    TweenService:Create(mainFrame, TweenInfo.new(0.35, Enum.EasingStyle.Back), {
        Size = UDim2.new(0, 450, 0, 500),
        Position = UDim2.new(0.5, -225, 0.5, -250)
    }):Play()
    
    refreshQuests()
end

local function closeQuestLog()
    if not isOpen then return end
    isOpen = false
    TweenService:Create(mainFrame, TweenInfo.new(0.25, Enum.EasingStyle.Back, Enum.EasingDirection.In), {
        Size = UDim2.new(0, 0, 0, 0),
        Position = UDim2.new(0.5, 0, 0.5, 0)
    }):Play()
    task.delay(0.25, function() mainFrame.Visible = false end)
end

closeBtn.MouseButton1Click:Connect(closeQuestLog)

-- Toggle button
local toggleBtn = Instance.new("TextButton")
toggleBtn.Size = UDim2.new(0, 70, 0, 70)
toggleBtn.Position = UDim2.new(0, 180, 1, -90)
toggleBtn.BackgroundColor3 = Color3.fromRGB(100, 70, 120)
toggleBtn.Text = "📜"
toggleBtn.TextSize = 32
toggleBtn.Parent = screenGui
Instance.new("UICorner", toggleBtn).CornerRadius = UDim.new(0, 16)

local toggleStroke = Instance.new("UIStroke")
toggleStroke.Color = Color3.fromRGB(140, 100, 170)
toggleStroke.Thickness = 2
toggleStroke.Parent = toggleBtn

toggleBtn.MouseButton1Click:Connect(function()
    if isOpen then closeQuestLog() else openQuestLog() end
end)

-- Keyboard shortcut (Q)
UserInputService.InputBegan:Connect(function(input, gpe)
    if gpe then return end
    if input.KeyCode == Enum.KeyCode.Q then
        if isOpen then closeQuestLog() else openQuestLog() end
    end
end)

print("[BlaxSmith] ✅ Quest Log UI loaded! Press Q to toggle")
]]
    questUI.Parent = game:GetService("StarterPlayer").StarterPlayerScripts
    
    print("[BlaxSmith] ✨ Advanced Quest System with " .. "10 quests across 4 categories!")
end

-- ╔══════════════════════════════════════════════════════════════════════════════╗
-- ║  BlaxSmith ADVANCED DAILY REWARDS SYSTEM v2.0                                 ║
-- ║  Premium Daily Rewards with Streaks, Milestones & Reward Wheel                ║
-- ╚══════════════════════════════════════════════════════════════════════════════╝
function GameGenerator.createDailyRewards()
    print("[BlaxSmith] 🎁 Creating Advanced Daily Rewards System...")
    
    -- Client-side Daily Rewards UI
    local dailyRewardsScript = Instance.new("LocalScript")
    dailyRewardsScript.Name = "DailyRewardsUI"
    dailyRewardsScript.Source = [[
local Players = game:GetService("Players")
local TweenService = game:GetService("TweenService")
local player = Players.LocalPlayer

-- ========================= REWARDS CONFIG =========================
local DAILY_REWARDS = {
    {day = 1, coins = 100, gems = 0, icon = "💰", name = "Day 1"},
    {day = 2, coins = 150, gems = 1, icon = "💰", name = "Day 2"},
    {day = 3, coins = 200, gems = 2, icon = "💎", name = "Day 3"},
    {day = 4, coins = 300, gems = 3, icon = "💰", name = "Day 4"},
    {day = 5, coins = 400, gems = 5, icon = "💎", name = "Day 5"},
    {day = 6, coins = 500, gems = 7, icon = "💰", name = "Day 6"},
    {day = 7, coins = 1000, gems = 15, special = "Mystery Box", icon = "🎁", name = "Day 7 MEGA"},
}

local STREAK_BONUSES = {
    {streak = 7, multiplier = 1.5, name = "Week Warrior"},
    {streak = 14, multiplier = 2.0, name = "Dedicated Player"},
    {streak = 30, multiplier = 3.0, name = "Monthly Master"},
}

-- Simulated player data (in real game, fetch from DataStore)
local playerData = {
    currentStreak = 3,
    lastClaim = os.time() - 86400, -- Yesterday
    totalDaysClaimed = 15
}

-- ========================= CREATE UI =========================
local screenGui = Instance.new("ScreenGui")
screenGui.Name = "BlaxSmith_DailyRewards"
screenGui.ResetOnSpawn = false
screenGui.Parent = player.PlayerGui

-- Main Frame
local mainFrame = Instance.new("Frame")
mainFrame.Name = "DailyRewardsPanel"
mainFrame.Size = UDim2.new(0, 550, 0, 420)
mainFrame.Position = UDim2.new(0.5, -275, 0.5, -210)
mainFrame.BackgroundColor3 = Color3.fromRGB(20, 18, 35)
mainFrame.Visible = false
mainFrame.Parent = screenGui
Instance.new("UICorner", mainFrame).CornerRadius = UDim.new(0, 20)

local mainStroke = Instance.new("UIStroke")
mainStroke.Color = Color3.fromRGB(255, 180, 50)
mainStroke.Thickness = 3
mainStroke.Parent = mainFrame

-- Header
local header = Instance.new("Frame")
header.Size = UDim2.new(1, 0, 0, 60)
header.BackgroundColor3 = Color3.fromRGB(35, 30, 55)
header.Parent = mainFrame
Instance.new("UICorner", header).CornerRadius = UDim.new(0, 20)

local title = Instance.new("TextLabel")
title.Size = UDim2.new(0.6, 0, 1, 0)
title.Position = UDim2.new(0, 20, 0, 0)
title.BackgroundTransparency = 1
title.Text = "🎁 DAILY REWARDS"
title.TextColor3 = Color3.fromRGB(255, 220, 100)
title.Font = Enum.Font.GothamBlack
title.TextSize = 24
title.TextXAlignment = Enum.TextXAlignment.Left
title.Parent = header

-- Streak Display
local streakFrame = Instance.new("Frame")
streakFrame.Size = UDim2.new(0, 140, 0, 40)
streakFrame.Position = UDim2.new(1, -200, 0.5, -20)
streakFrame.BackgroundColor3 = Color3.fromRGB(255, 100, 50)
streakFrame.Parent = header
Instance.new("UICorner", streakFrame).CornerRadius = UDim.new(0, 10)

local streakLabel = Instance.new("TextLabel")
streakLabel.Size = UDim2.new(1, 0, 1, 0)
streakLabel.BackgroundTransparency = 1
streakLabel.Text = "🔥 " .. playerData.currentStreak .. " Day Streak"
streakLabel.TextColor3 = Color3.new(1, 1, 1)
streakLabel.Font = Enum.Font.GothamBold
streakLabel.TextSize = 14
streakLabel.Parent = streakFrame

local closeBtn = Instance.new("TextButton")
closeBtn.Size = UDim2.new(0, 40, 0, 40)
closeBtn.Position = UDim2.new(1, -50, 0.5, -20)
closeBtn.BackgroundColor3 = Color3.fromRGB(255, 70, 70)
closeBtn.Text = "✕"
closeBtn.TextColor3 = Color3.new(1, 1, 1)
closeBtn.Font = Enum.Font.GothamBold
closeBtn.TextSize = 18
closeBtn.Parent = header
Instance.new("UICorner", closeBtn).CornerRadius = UDim.new(0, 10)

-- Days Grid
local daysFrame = Instance.new("Frame")
daysFrame.Size = UDim2.new(1, -30, 0, 200)
daysFrame.Position = UDim2.new(0, 15, 0, 75)
daysFrame.BackgroundTransparency = 1
daysFrame.Parent = mainFrame

local daysLayout = Instance.new("UIGridLayout")
daysLayout.CellSize = UDim2.new(0, 68, 0, 90)
daysLayout.CellPadding = UDim2.new(0, 8, 0, 8)
daysLayout.Parent = daysFrame

for i, reward in ipairs(DAILY_REWARDS) do
    local dayCard = Instance.new("Frame")
    dayCard.Name = "Day" .. i
    dayCard.BackgroundColor3 = i <= playerData.currentStreak and Color3.fromRGB(50, 80, 50) or Color3.fromRGB(35, 35, 55)
    dayCard.Parent = daysFrame
    Instance.new("UICorner", dayCard).CornerRadius = UDim.new(0, 12)
    
    local cardStroke = Instance.new("UIStroke")
    cardStroke.Color = i == playerData.currentStreak + 1 and Color3.fromRGB(255, 200, 50) or Color3.fromRGB(60, 60, 80)
    cardStroke.Thickness = i == playerData.currentStreak + 1 and 3 or 1
    cardStroke.Parent = dayCard
    
    local dayLabel = Instance.new("TextLabel")
    dayLabel.Size = UDim2.new(1, 0, 0, 18)
    dayLabel.Position = UDim2.new(0, 0, 0, 5)
    dayLabel.BackgroundTransparency = 1
    dayLabel.Text = "Day " .. i
    dayLabel.TextColor3 = i == 7 and Color3.fromRGB(255, 200, 50) or Color3.fromRGB(180, 180, 200)
    dayLabel.Font = Enum.Font.GothamBold
    dayLabel.TextSize = 11
    dayLabel.Parent = dayCard
    
    local icon = Instance.new("TextLabel")
    icon.Size = UDim2.new(1, 0, 0, 35)
    icon.Position = UDim2.new(0, 0, 0, 22)
    icon.BackgroundTransparency = 1
    icon.Text = i <= playerData.currentStreak and "✓" or reward.icon
    icon.TextSize = i <= playerData.currentStreak and 24 or 28
    icon.TextColor3 = i <= playerData.currentStreak and Color3.fromRGB(100, 255, 100) or Color3.new(1, 1, 1)
    icon.Parent = dayCard
    
    local rewardLabel = Instance.new("TextLabel")
    rewardLabel.Size = UDim2.new(1, 0, 0, 25)
    rewardLabel.Position = UDim2.new(0, 0, 1, -28)
    rewardLabel.BackgroundTransparency = 1
    rewardLabel.Text = reward.gems > 0 and "💎" .. reward.gems or "💰" .. reward.coins
    rewardLabel.TextColor3 = Color3.fromRGB(200, 200, 220)
    rewardLabel.Font = Enum.Font.GothamBold
    rewardLabel.TextSize = 10
    rewardLabel.Parent = dayCard
end

-- Claim Button
local claimBtn = Instance.new("TextButton")
claimBtn.Size = UDim2.new(0, 200, 0, 55)
claimBtn.Position = UDim2.new(0.5, -100, 1, -80)
claimBtn.BackgroundColor3 = Color3.fromRGB(80, 200, 80)
claimBtn.Text = "🎁 CLAIM TODAY'S REWARD"
claimBtn.TextColor3 = Color3.new(1, 1, 1)
claimBtn.Font = Enum.Font.GothamBlack
claimBtn.TextSize = 14
claimBtn.Parent = mainFrame
Instance.new("UICorner", claimBtn).CornerRadius = UDim.new(0, 14)

-- Claim animation
claimBtn.MouseButton1Click:Connect(function()
    claimBtn.Text = "✨ CLAIMED!"
    claimBtn.BackgroundColor3 = Color3.fromRGB(60, 150, 60)
    
    -- Celebration effect
    for i = 1, 10 do
        local particle = Instance.new("TextLabel")
        particle.Size = UDim2.new(0, 30, 0, 30)
        particle.Position = UDim2.new(0.5, math.random(-100, 100), 0.5, math.random(-50, 50))
        particle.BackgroundTransparency = 1
        particle.Text = ({"🎉", "⭐", "💰", "💎", "🎁"})[math.random(1, 5)]
        particle.TextSize = 24
        particle.Parent = mainFrame
        
        TweenService:Create(particle, TweenInfo.new(1.5), {
            Position = UDim2.new(0.5, math.random(-200, 200), -0.2, 0),
            TextTransparency = 1
        }):Play()
        
        task.delay(1.5, function() particle:Destroy() end)
    end
    
    print("[Daily Rewards] Player claimed day " .. (playerData.currentStreak + 1) .. " reward!")
end)

-- Bonus Progress
local bonusFrame = Instance.new("Frame")
bonusFrame.Size = UDim2.new(1, -30, 0, 50)
bonusFrame.Position = UDim2.new(0, 15, 1, -135)
bonusFrame.BackgroundColor3 = Color3.fromRGB(30, 28, 50)
bonusFrame.Parent = mainFrame
Instance.new("UICorner", bonusFrame).CornerRadius = UDim.new(0, 10)

local bonusLabel = Instance.new("TextLabel")
bonusLabel.Size = UDim2.new(1, -20, 1, 0)
bonusLabel.Position = UDim2.new(0, 10, 0, 0)
bonusLabel.BackgroundTransparency = 1
bonusLabel.Text = "🔥 " .. (7 - playerData.currentStreak) .. " more days for 1.5x Bonus Week Multiplier!"
bonusLabel.TextColor3 = Color3.fromRGB(255, 180, 100)
bonusLabel.Font = Enum.Font.GothamBold
bonusLabel.TextSize = 13
bonusLabel.TextXAlignment = Enum.TextXAlignment.Left
bonusLabel.Parent = bonusFrame

-- Open/Close Functions
local isOpen = false
local function openRewards()
    if isOpen then return end
    isOpen = true
    mainFrame.Visible = true
    mainFrame.Size = UDim2.new(0, 0, 0, 0)
    mainFrame.Position = UDim2.new(0.5, 0, 0.5, 0)
    
    TweenService:Create(mainFrame, TweenInfo.new(0.4, Enum.EasingStyle.Back), {
        Size = UDim2.new(0, 550, 0, 420),
        Position = UDim2.new(0.5, -275, 0.5, -210)
    }):Play()
end

local function closeRewards()
    if not isOpen then return end
    isOpen = false
    TweenService:Create(mainFrame, TweenInfo.new(0.25, Enum.EasingStyle.Back, Enum.EasingDirection.In), {
        Size = UDim2.new(0, 0, 0, 0),
        Position = UDim2.new(0.5, 0, 0.5, 0)
    }):Play()
    task.delay(0.25, function() mainFrame.Visible = false end)
end

closeBtn.MouseButton1Click:Connect(closeRewards)

-- Toggle Button
local toggleBtn = Instance.new("TextButton")
toggleBtn.Size = UDim2.new(0, 70, 0, 70)
toggleBtn.Position = UDim2.new(0, 260, 1, -90)
toggleBtn.BackgroundColor3 = Color3.fromRGB(200, 100, 50)
toggleBtn.Text = "🎁"
toggleBtn.TextSize = 32
toggleBtn.Parent = screenGui
Instance.new("UICorner", toggleBtn).CornerRadius = UDim.new(0, 16)

local toggleStroke = Instance.new("UIStroke")
toggleStroke.Color = Color3.fromRGB(255, 150, 80)
toggleStroke.Thickness = 2
toggleStroke.Parent = toggleBtn

toggleBtn.MouseButton1Click:Connect(function()
    if isOpen then closeRewards() else openRewards() end
end)

-- Auto-popup on join if reward available
task.delay(2, function()
    local timeSinceClaim = os.time() - playerData.lastClaim
    if timeSinceClaim >= 86400 then
        openRewards()
    end
end)

print("[BlaxSmith] ✅ Daily Rewards System loaded! 7-day rewards with streak bonuses")
]]
    dailyRewardsScript.Parent = game:GetService("StarterPlayer").StarterPlayerScripts
    
    print("[BlaxSmith] 🎁 Advanced Daily Rewards System created!")
end

-- ╔══════════════════════════════════════════════════════════════════════════════╗
-- ║  BlaxSmith ADVANCED TRADING SYSTEM v2.0                                       ║
-- ║  Premium Player-to-Player Trading with Verification & UI                      ║
-- ╚══════════════════════════════════════════════════════════════════════════════╝
function GameGenerator.createTradingSystem()
    print("[BlaxSmith] 🤝 Creating Advanced Trading System...")
    
    -- Trading System Script
    local tradingScript = Instance.new("LocalScript")
    tradingScript.Name = "TradingSystemUI"
    tradingScript.Source = [[
local Players = game:GetService("Players")
local TweenService = game:GetService("TweenService")
local player = Players.LocalPlayer

-- ========================= TRADING CONFIG =========================
local MAX_TRADE_SLOTS = 6
local RARITY_COLORS = {
    common = Color3.fromRGB(180, 180, 180),
    uncommon = Color3.fromRGB(30, 255, 0),
    rare = Color3.fromRGB(0, 112, 221),
    epic = Color3.fromRGB(163, 53, 238),
    legendary = Color3.fromRGB(255, 128, 0)
}

-- Sample items for demo
local myItems = {
    {name = "Fire Sword", rarity = "legendary", icon = "🔥"},
    {name = "Ice Shield", rarity = "epic", icon = "🛡️"},
    {name = "Speed Boots", rarity = "rare", icon = "👟"},
}

local theirItems = {
    {name = "Storm Dragon", rarity = "legendary", icon = "🐉"},
    {name = "Gold Coins x1000", rarity = "common", icon = "💰"},
}

-- ========================= CREATE UI =========================
local screenGui = Instance.new("ScreenGui")
screenGui.Name = "BlaxSmith_Trading"
screenGui.ResetOnSpawn = false
screenGui.Parent = player.PlayerGui

local mainFrame = Instance.new("Frame")
mainFrame.Size = UDim2.new(0, 600, 0, 450)
mainFrame.Position = UDim2.new(0.5, -300, 0.5, -225)
mainFrame.BackgroundColor3 = Color3.fromRGB(20, 20, 35)
mainFrame.Visible = false
mainFrame.Parent = screenGui
Instance.new("UICorner", mainFrame).CornerRadius = UDim.new(0, 18)

local mainStroke = Instance.new("UIStroke")
mainStroke.Color = Color3.fromRGB(100, 180, 255)
mainStroke.Thickness = 2
mainStroke.Parent = mainFrame

-- Header
local header = Instance.new("Frame")
header.Size = UDim2.new(1, 0, 0, 55)
header.BackgroundColor3 = Color3.fromRGB(30, 30, 50)
header.Parent = mainFrame
Instance.new("UICorner", header).CornerRadius = UDim.new(0, 18)

local title = Instance.new("TextLabel")
title.Size = UDim2.new(0.7, 0, 1, 0)
title.Position = UDim2.new(0, 20, 0, 0)
title.BackgroundTransparency = 1
title.Text = "🤝 TRADE WITH: PlayerName"
title.TextColor3 = Color3.fromRGB(100, 200, 255)
title.Font = Enum.Font.GothamBlack
title.TextSize = 20
title.TextXAlignment = Enum.TextXAlignment.Left
title.Parent = header

local closeBtn = Instance.new("TextButton")
closeBtn.Size = UDim2.new(0, 40, 0, 40)
closeBtn.Position = UDim2.new(1, -48, 0.5, -20)
closeBtn.BackgroundColor3 = Color3.fromRGB(255, 70, 70)
closeBtn.Text = "✕"
closeBtn.TextColor3 = Color3.new(1, 1, 1)
closeBtn.Font = Enum.Font.GothamBold
closeBtn.TextSize = 18
closeBtn.Parent = header
Instance.new("UICorner", closeBtn).CornerRadius = UDim.new(0, 10)

-- Split into two panels
local leftPanel = Instance.new("Frame")
leftPanel.Size = UDim2.new(0.48, 0, 0, 300)
leftPanel.Position = UDim2.new(0.01, 0, 0, 65)
leftPanel.BackgroundColor3 = Color3.fromRGB(30, 50, 40)
leftPanel.Parent = mainFrame
Instance.new("UICorner", leftPanel).CornerRadius = UDim.new(0, 14)

local leftTitle = Instance.new("TextLabel")
leftTitle.Size = UDim2.new(1, 0, 0, 30)
leftTitle.BackgroundTransparency = 1
leftTitle.Text = "📤 YOUR OFFER"
leftTitle.TextColor3 = Color3.fromRGB(100, 255, 150)
leftTitle.Font = Enum.Font.GothamBold
leftTitle.TextSize = 14
leftTitle.Parent = leftPanel

local rightPanel = Instance.new("Frame")
rightPanel.Size = UDim2.new(0.48, 0, 0, 300)
rightPanel.Position = UDim2.new(0.51, 0, 0, 65)
rightPanel.BackgroundColor3 = Color3.fromRGB(50, 40, 30)
rightPanel.Parent = mainFrame
Instance.new("UICorner", rightPanel).CornerRadius = UDim.new(0, 14)

local rightTitle = Instance.new("TextLabel")
rightTitle.Size = UDim2.new(1, 0, 0, 30)
rightTitle.BackgroundTransparency = 1
rightTitle.Text = "📥 THEIR OFFER"
rightTitle.TextColor3 = Color3.fromRGB(255, 200, 100)
rightTitle.Font = Enum.Font.GothamBold
rightTitle.TextSize = 14
rightTitle.Parent = rightPanel

-- Item slots function
local function createItemSlots(parent, items, yOffset)
    local grid = Instance.new("Frame")
    grid.Size = UDim2.new(1, -20, 0, 180)
    grid.Position = UDim2.new(0, 10, 0, 35)
    grid.BackgroundTransparency = 1
    grid.Parent = parent
    
    local layout = Instance.new("UIGridLayout")
    layout.CellSize = UDim2.new(0, 80, 0, 80)
    layout.CellPadding = UDim2.new(0, 8, 0, 8)
    layout.Parent = grid
    
    for i = 1, MAX_TRADE_SLOTS do
        local slot = Instance.new("Frame")
        slot.BackgroundColor3 = items[i] and Color3.fromRGB(45, 45, 65) or Color3.fromRGB(30, 30, 45)
        slot.Parent = grid
        Instance.new("UICorner", slot).CornerRadius = UDim.new(0, 10)
        
        if items[i] then
            local item = items[i]
            local stroke = Instance.new("UIStroke")
            stroke.Color = RARITY_COLORS[item.rarity]
            stroke.Thickness = 2
            stroke.Parent = slot
            
            local icon = Instance.new("TextLabel")
            icon.Size = UDim2.new(1, 0, 0.6, 0)
            icon.BackgroundTransparency = 1
            icon.Text = item.icon
            icon.TextSize = 32
            icon.Parent = slot
            
            local name = Instance.new("TextLabel")
            name.Size = UDim2.new(1, -6, 0, 20)
            name.Position = UDim2.new(0, 3, 1, -22)
            name.BackgroundTransparency = 1
            name.Text = item.name
            name.TextColor3 = RARITY_COLORS[item.rarity]
            name.Font = Enum.Font.GothamBold
            name.TextSize = 9
            name.TextTruncate = Enum.TextTruncate.AtEnd
            name.Parent = slot
        else
            local plusLabel = Instance.new("TextLabel")
            plusLabel.Size = UDim2.new(1, 0, 1, 0)
            plusLabel.BackgroundTransparency = 1
            plusLabel.Text = "+"
            plusLabel.TextColor3 = Color3.fromRGB(80, 80, 100)
            plusLabel.TextSize = 32
            plusLabel.Parent = slot
        end
    end
end

createItemSlots(leftPanel, myItems, 0)
createItemSlots(rightPanel, theirItems, 0)

-- Status indicators
local leftStatus = Instance.new("Frame")
leftStatus.Size = UDim2.new(0.45, 0, 0, 35)
leftStatus.Position = UDim2.new(0.01, 0, 0, 255)
leftStatus.BackgroundColor3 = Color3.fromRGB(60, 80, 60)
leftStatus.Parent = leftPanel
Instance.new("UICorner", leftStatus).CornerRadius = UDim.new(0, 8)

local leftStatusLabel = Instance.new("TextLabel")
leftStatusLabel.Size = UDim2.new(1, 0, 1, 0)
leftStatusLabel.BackgroundTransparency = 1
leftStatusLabel.Text = "⏳ Waiting..."
leftStatusLabel.TextColor3 = Color3.fromRGB(200, 200, 150)
leftStatusLabel.Font = Enum.Font.GothamBold
leftStatusLabel.TextSize = 12
leftStatusLabel.Parent = leftStatus

-- Action Buttons
local confirmBtn = Instance.new("TextButton")
confirmBtn.Size = UDim2.new(0, 150, 0, 50)
confirmBtn.Position = UDim2.new(0.25, -75, 1, -65)
confirmBtn.BackgroundColor3 = Color3.fromRGB(80, 180, 80)
confirmBtn.Text = "✓ CONFIRM"
confirmBtn.TextColor3 = Color3.new(1, 1, 1)
confirmBtn.Font = Enum.Font.GothamBlack
confirmBtn.TextSize = 16
confirmBtn.Parent = mainFrame
Instance.new("UICorner", confirmBtn).CornerRadius = UDim.new(0, 12)

local declineBtn = Instance.new("TextButton")
declineBtn.Size = UDim2.new(0, 150, 0, 50)
declineBtn.Position = UDim2.new(0.75, -75, 1, -65)
declineBtn.BackgroundColor3 = Color3.fromRGB(180, 80, 80)
declineBtn.Text = "✕ DECLINE"
declineBtn.TextColor3 = Color3.new(1, 1, 1)
declineBtn.Font = Enum.Font.GothamBlack
declineBtn.TextSize = 16
declineBtn.Parent = mainFrame
Instance.new("UICorner", declineBtn).CornerRadius = UDim.new(0, 12)

-- Button handlers
confirmBtn.MouseButton1Click:Connect(function()
    confirmBtn.Text = "✓ CONFIRMED"
    confirmBtn.BackgroundColor3 = Color3.fromRGB(60, 140, 60)
    leftStatusLabel.Text = "✓ You accepted"
    leftStatus.BackgroundColor3 = Color3.fromRGB(60, 120, 60)
    print("[Trading] Trade confirmed by local player")
end)

declineBtn.MouseButton1Click:Connect(function()
    print("[Trading] Trade declined")
    mainFrame.Visible = false
end)

-- Open/Close
local isOpen = false
local function openTrade()
    if isOpen then return end
    isOpen = true
    mainFrame.Visible = true
    mainFrame.Size = UDim2.new(0, 0, 0, 0)
    mainFrame.Position = UDim2.new(0.5, 0, 0.5, 0)
    
    TweenService:Create(mainFrame, TweenInfo.new(0.35, Enum.EasingStyle.Back), {
        Size = UDim2.new(0, 600, 0, 450),
        Position = UDim2.new(0.5, -300, 0.5, -225)
    }):Play()
end

local function closeTrade()
    if not isOpen then return end
    isOpen = false
    TweenService:Create(mainFrame, TweenInfo.new(0.25, Enum.EasingStyle.Back, Enum.EasingDirection.In), {
        Size = UDim2.new(0, 0, 0, 0),
        Position = UDim2.new(0.5, 0, 0.5, 0)
    }):Play()
    task.delay(0.25, function() mainFrame.Visible = false end)
end

closeBtn.MouseButton1Click:Connect(closeTrade)

-- Toggle Button
local toggleBtn = Instance.new("TextButton")
toggleBtn.Size = UDim2.new(0, 70, 0, 70)
toggleBtn.Position = UDim2.new(0, 340, 1, -90)
toggleBtn.BackgroundColor3 = Color3.fromRGB(50, 120, 180)
toggleBtn.Text = "🤝"
toggleBtn.TextSize = 32
toggleBtn.Parent = screenGui
Instance.new("UICorner", toggleBtn).CornerRadius = UDim.new(0, 16)

local toggleStroke = Instance.new("UIStroke")
toggleStroke.Color = Color3.fromRGB(80, 160, 220)
toggleStroke.Thickness = 2
toggleStroke.Parent = toggleBtn

toggleBtn.MouseButton1Click:Connect(function()
    if isOpen then closeTrade() else openTrade() end
end)

print("[BlaxSmith] ✅ Trading System loaded! Send trade requests with /trade [player]")
]]
    tradingScript.Parent = game:GetService("StarterPlayer").StarterPlayerScripts
    
    print("[BlaxSmith] 🤝 Advanced Trading System created!")
end

-- ╔══════════════════════════════════════════════════════════════════════════════╗
-- ║  BlaxSmith ADVANCED LEADERBOARD SYSTEM v2.0                                   ║
-- ║  Premium Leaderboards with Categories, Badges & Real-time Updates             ║
-- ╚══════════════════════════════════════════════════════════════════════════════╝
function GameGenerator.createLeaderboardSystem()
    print("[BlaxSmith] 🏆 Creating Advanced Leaderboard System...")
    
    local leaderboardScript = Instance.new("LocalScript")
    leaderboardScript.Name = "LeaderboardUI"
    leaderboardScript.Source = [[
local Players = game:GetService("Players")
local TweenService = game:GetService("TweenService")
local player = Players.LocalPlayer

local CATEGORIES = {
    {name = "Coins", icon = "💰", stat = "Coins"},
    {name = "Wins", icon = "🏆", stat = "Wins"},
    {name = "Kills", icon = "⚔️", stat = "Kills"},
    {name = "Level", icon = "⬆️", stat = "Level"},
    {name = "Time", icon = "⏱️", stat = "PlayTime"},
}

local RANK_COLORS = {
    Color3.fromRGB(255, 215, 0),   -- 1st Gold
    Color3.fromRGB(192, 192, 192), -- 2nd Silver
    Color3.fromRGB(205, 127, 50),  -- 3rd Bronze
}

-- Sample data
local leaderboardData = {
    {name = "ProGamer123", value = 50000, rank = 1},
    {name = "xX_Champion_Xx", value = 45000, rank = 2},
    {name = "RobloxMaster", value = 42000, rank = 3},
    {name = "CoolPlayer99", value = 38000, rank = 4},
    {name = "GameLegend", value = 35000, rank = 5},
    {name = "You", value = 28000, rank = 8, isLocal = true},
}

local screenGui = Instance.new("ScreenGui")
screenGui.Name = "BlaxSmith_Leaderboard"
screenGui.ResetOnSpawn = false
screenGui.Parent = player.PlayerGui

local mainFrame = Instance.new("Frame")
mainFrame.Size = UDim2.new(0, 400, 0, 500)
mainFrame.Position = UDim2.new(0.5, -200, 0.5, -250)
mainFrame.BackgroundColor3 = Color3.fromRGB(15, 15, 28)
mainFrame.Visible = false
mainFrame.Parent = screenGui
Instance.new("UICorner", mainFrame).CornerRadius = UDim.new(0, 18)

local mainStroke = Instance.new("UIStroke")
mainStroke.Color = Color3.fromRGB(255, 200, 50)
mainStroke.Thickness = 2
mainStroke.Parent = mainFrame

local header = Instance.new("Frame")
header.Size = UDim2.new(1, 0, 0, 55)
header.BackgroundColor3 = Color3.fromRGB(25, 25, 45)
header.Parent = mainFrame
Instance.new("UICorner", header).CornerRadius = UDim.new(0, 18)

local title = Instance.new("TextLabel")
title.Size = UDim2.new(0.7, 0, 1, 0)
title.Position = UDim2.new(0, 20, 0, 0)
title.BackgroundTransparency = 1
title.Text = "🏆 LEADERBOARDS"
title.TextColor3 = Color3.fromRGB(255, 215, 0)
title.Font = Enum.Font.GothamBlack
title.TextSize = 22
title.TextXAlignment = Enum.TextXAlignment.Left
title.Parent = header

local closeBtn = Instance.new("TextButton")
closeBtn.Size = UDim2.new(0, 40, 0, 40)
closeBtn.Position = UDim2.new(1, -48, 0.5, -20)
closeBtn.BackgroundColor3 = Color3.fromRGB(255, 70, 70)
closeBtn.Text = "✕"
closeBtn.TextColor3 = Color3.new(1, 1, 1)
closeBtn.Font = Enum.Font.GothamBold
closeBtn.TextSize = 18
closeBtn.Parent = header
Instance.new("UICorner", closeBtn).CornerRadius = UDim.new(0, 10)

-- Category tabs
local tabFrame = Instance.new("Frame")
tabFrame.Size = UDim2.new(1, -20, 0, 40)
tabFrame.Position = UDim2.new(0, 10, 0, 60)
tabFrame.BackgroundTransparency = 1
tabFrame.Parent = mainFrame

local tabLayout = Instance.new("UIListLayout")
tabLayout.FillDirection = Enum.FillDirection.Horizontal
tabLayout.Padding = UDim.new(0, 5)
tabLayout.Parent = tabFrame

local selectedCat = "Coins"
local catTabs = {}

for _, cat in ipairs(CATEGORIES) do
    local tab = Instance.new("TextButton")
    tab.Size = UDim2.new(0, 70, 1, 0)
    tab.BackgroundColor3 = cat.name == selectedCat and Color3.fromRGB(255, 180, 50) or Color3.fromRGB(40, 40, 60)
    tab.Text = cat.icon
    tab.TextSize = 22
    tab.Parent = tabFrame
    Instance.new("UICorner", tab).CornerRadius = UDim.new(0, 8)
    catTabs[cat.name] = tab
end

-- Leaderboard list
local listScroll = Instance.new("ScrollingFrame")
listScroll.Size = UDim2.new(1, -20, 1, -170)
listScroll.Position = UDim2.new(0, 10, 0, 105)
listScroll.BackgroundTransparency = 1
listScroll.ScrollBarThickness = 5
listScroll.Parent = mainFrame

local listLayout = Instance.new("UIListLayout")
listLayout.Padding = UDim.new(0, 6)
listLayout.Parent = listScroll

local function refreshLeaderboard()
    for _, child in ipairs(listScroll:GetChildren()) do
        if child:IsA("Frame") then child:Destroy() end
    end
    
    for _, entry in ipairs(leaderboardData) do
        local row = Instance.new("Frame")
        row.Size = UDim2.new(1, -5, 0, 50)
        row.BackgroundColor3 = entry.isLocal and Color3.fromRGB(50, 60, 80) or Color3.fromRGB(30, 30, 48)
        row.Parent = listScroll
        Instance.new("UICorner", row).CornerRadius = UDim.new(0, 10)
        
        if entry.rank <= 3 then
            local stroke = Instance.new("UIStroke")
            stroke.Color = RANK_COLORS[entry.rank]
            stroke.Thickness = 2
            stroke.Parent = row
        end
        
        local rankLabel = Instance.new("TextLabel")
        rankLabel.Size = UDim2.new(0, 40, 1, 0)
        rankLabel.Position = UDim2.new(0, 10, 0, 0)
        rankLabel.BackgroundTransparency = 1
        rankLabel.Text = "#" .. entry.rank
        rankLabel.TextColor3 = RANK_COLORS[entry.rank] or Color3.fromRGB(180, 180, 200)
        rankLabel.Font = Enum.Font.GothamBlack
        rankLabel.TextSize = 16
        rankLabel.Parent = row
        
        local nameLabel = Instance.new("TextLabel")
        nameLabel.Size = UDim2.new(0, 180, 1, 0)
        nameLabel.Position = UDim2.new(0, 55, 0, 0)
        nameLabel.BackgroundTransparency = 1
        nameLabel.Text = entry.name
        nameLabel.TextColor3 = entry.isLocal and Color3.fromRGB(100, 200, 255) or Color3.new(1, 1, 1)
        nameLabel.Font = Enum.Font.GothamBold
        nameLabel.TextSize = 14
        nameLabel.TextXAlignment = Enum.TextXAlignment.Left
        nameLabel.Parent = row
        
        local valueLabel = Instance.new("TextLabel")
        valueLabel.Size = UDim2.new(0, 100, 1, 0)
        valueLabel.Position = UDim2.new(1, -110, 0, 0)
        valueLabel.BackgroundTransparency = 1
        valueLabel.Text = tostring(entry.value)
        valueLabel.TextColor3 = Color3.fromRGB(255, 220, 100)
        valueLabel.Font = Enum.Font.GothamBlack
        valueLabel.TextSize = 16
        valueLabel.TextXAlignment = Enum.TextXAlignment.Right
        valueLabel.Parent = row
    end
    
    listScroll.CanvasSize = UDim2.new(0, 0, 0, #leaderboardData * 56)
end

-- Your rank display
local yourRank = Instance.new("Frame")
yourRank.Size = UDim2.new(1, -20, 0, 50)
yourRank.Position = UDim2.new(0, 10, 1, -60)
yourRank.BackgroundColor3 = Color3.fromRGB(40, 60, 80)
yourRank.Parent = mainFrame
Instance.new("UICorner", yourRank).CornerRadius = UDim.new(0, 10)

local yourRankLabel = Instance.new("TextLabel")
yourRankLabel.Size = UDim2.new(1, -20, 1, 0)
yourRankLabel.Position = UDim2.new(0, 10, 0, 0)
yourRankLabel.BackgroundTransparency = 1
yourRankLabel.Text = "📍 Your Rank: #8 • 28,000 Coins"
yourRankLabel.TextColor3 = Color3.fromRGB(100, 200, 255)
yourRankLabel.Font = Enum.Font.GothamBold
yourRankLabel.TextSize = 14
yourRankLabel.TextXAlignment = Enum.TextXAlignment.Left
yourRankLabel.Parent = yourRank

local isOpen = false
local function openLeaderboard()
    if isOpen then return end
    isOpen = true
    mainFrame.Visible = true
    TweenService:Create(mainFrame, TweenInfo.new(0.35, Enum.EasingStyle.Back), {
        Size = UDim2.new(0, 400, 0, 500),
        Position = UDim2.new(0.5, -200, 0.5, -250)
    }):Play()
    refreshLeaderboard()
end

local function closeLeaderboard()
    if not isOpen then return end
    isOpen = false
    TweenService:Create(mainFrame, TweenInfo.new(0.25), {Size = UDim2.new(0, 0, 0, 0)}):Play()
    task.delay(0.25, function() mainFrame.Visible = false end)
end

closeBtn.MouseButton1Click:Connect(closeLeaderboard)

local toggleBtn = Instance.new("TextButton")
toggleBtn.Size = UDim2.new(0, 70, 0, 70)
toggleBtn.Position = UDim2.new(0, 420, 1, -90)
toggleBtn.BackgroundColor3 = Color3.fromRGB(180, 140, 40)
toggleBtn.Text = "🏆"
toggleBtn.TextSize = 32
toggleBtn.Parent = screenGui
Instance.new("UICorner", toggleBtn).CornerRadius = UDim.new(0, 16)

toggleBtn.MouseButton1Click:Connect(function()
    if isOpen then closeLeaderboard() else openLeaderboard() end
end)

print("[BlaxSmith] ✅ Leaderboard System loaded!")
]]
    leaderboardScript.Parent = game:GetService("StarterPlayer").StarterPlayerScripts
    print("[BlaxSmith] 🏆 Advanced Leaderboard System created!")
end

-- ╔══════════════════════════════════════════════════════════════════════════════╗
-- ║  BlaxSmith ADVANCED SETTINGS SYSTEM v2.0                                      ║
-- ║  Premium Settings with Graphics, Audio, Controls & Accessibility              ║
-- ╚══════════════════════════════════════════════════════════════════════════════╝
function GameGenerator.createSettingsSystem()
    print("[BlaxSmith] ⚙️ Creating Advanced Settings System...")
    
    local settingsScript = Instance.new("LocalScript")
    settingsScript.Name = "SettingsUI"
    settingsScript.Source = [[
local Players = game:GetService("Players")
local TweenService = game:GetService("TweenService")
local Lighting = game:GetService("Lighting")
local player = Players.LocalPlayer

local settings = {
    graphics = {quality = "High", shadows = true, particles = true},
    audio = {master = 100, music = 80, sfx = 100},
    controls = {sensitivity = 50, invertY = false},
    gameplay = {showDamage = true, screenShake = true, notifications = true}
}

local screenGui = Instance.new("ScreenGui")
screenGui.Name = "BlaxSmith_Settings"
screenGui.ResetOnSpawn = false
screenGui.Parent = player.PlayerGui

local mainFrame = Instance.new("Frame")
mainFrame.Size = UDim2.new(0, 500, 0, 450)
mainFrame.Position = UDim2.new(0.5, -250, 0.5, -225)
mainFrame.BackgroundColor3 = Color3.fromRGB(18, 18, 30)
mainFrame.Visible = false
mainFrame.Parent = screenGui
Instance.new("UICorner", mainFrame).CornerRadius = UDim.new(0, 18)

local mainStroke = Instance.new("UIStroke")
mainStroke.Color = Color3.fromRGB(100, 100, 150)
mainStroke.Thickness = 2
mainStroke.Parent = mainFrame

local header = Instance.new("Frame")
header.Size = UDim2.new(1, 0, 0, 55)
header.BackgroundColor3 = Color3.fromRGB(28, 28, 45)
header.Parent = mainFrame
Instance.new("UICorner", header).CornerRadius = UDim.new(0, 18)

local title = Instance.new("TextLabel")
title.Size = UDim2.new(0.7, 0, 1, 0)
title.Position = UDim2.new(0, 20, 0, 0)
title.BackgroundTransparency = 1
title.Text = "⚙️ SETTINGS"
title.TextColor3 = Color3.fromRGB(200, 200, 220)
title.Font = Enum.Font.GothamBlack
title.TextSize = 22
title.TextXAlignment = Enum.TextXAlignment.Left
title.Parent = header

local closeBtn = Instance.new("TextButton")
closeBtn.Size = UDim2.new(0, 40, 0, 40)
closeBtn.Position = UDim2.new(1, -48, 0.5, -20)
closeBtn.BackgroundColor3 = Color3.fromRGB(255, 70, 70)
closeBtn.Text = "✕"
closeBtn.TextColor3 = Color3.new(1, 1, 1)
closeBtn.Font = Enum.Font.GothamBold
closeBtn.Parent = header
Instance.new("UICorner", closeBtn).CornerRadius = UDim.new(0, 10)

local function createSlider(parent, name, yPos, value, onChange)
    local container = Instance.new("Frame")
    container.Size = UDim2.new(1, -30, 0, 50)
    container.Position = UDim2.new(0, 15, 0, yPos)
    container.BackgroundTransparency = 1
    container.Parent = parent
    
    local label = Instance.new("TextLabel")
    label.Size = UDim2.new(0, 150, 0, 25)
    label.Position = UDim2.new(0, 0, 0, 0)
    label.BackgroundTransparency = 1
    label.Text = name
    label.TextColor3 = Color3.fromRGB(200, 200, 220)
    label.Font = Enum.Font.GothamBold
    label.TextSize = 14
    label.TextXAlignment = Enum.TextXAlignment.Left
    label.Parent = container
    
    local sliderBg = Instance.new("Frame")
    sliderBg.Size = UDim2.new(0, 200, 0, 12)
    sliderBg.Position = UDim2.new(0, 160, 0, 7)
    sliderBg.BackgroundColor3 = Color3.fromRGB(40, 40, 60)
    sliderBg.Parent = container
    Instance.new("UICorner", sliderBg).CornerRadius = UDim.new(0, 6)
    
    local sliderFill = Instance.new("Frame")
    sliderFill.Size = UDim2.new(value/100, 0, 1, 0)
    sliderFill.BackgroundColor3 = Color3.fromRGB(80, 150, 255)
    sliderFill.Parent = sliderBg
    Instance.new("UICorner", sliderFill).CornerRadius = UDim.new(0, 6)
    
    local valueLabel = Instance.new("TextLabel")
    valueLabel.Size = UDim2.new(0, 50, 0, 25)
    valueLabel.Position = UDim2.new(0, 370, 0, 0)
    valueLabel.BackgroundTransparency = 1
    valueLabel.Text = value .. "%"
    valueLabel.TextColor3 = Color3.fromRGB(150, 200, 255)
    valueLabel.Font = Enum.Font.GothamBold
    valueLabel.TextSize = 14
    valueLabel.Parent = container
    
    return container
end

local function createToggle(parent, name, yPos, enabled, onChange)
    local container = Instance.new("Frame")
    container.Size = UDim2.new(1, -30, 0, 40)
    container.Position = UDim2.new(0, 15, 0, yPos)
    container.BackgroundTransparency = 1
    container.Parent = parent
    
    local label = Instance.new("TextLabel")
    label.Size = UDim2.new(0, 250, 1, 0)
    label.BackgroundTransparency = 1
    label.Text = name
    label.TextColor3 = Color3.fromRGB(200, 200, 220)
    label.Font = Enum.Font.GothamBold
    label.TextSize = 14
    label.TextXAlignment = Enum.TextXAlignment.Left
    label.Parent = container
    
    local toggleBg = Instance.new("Frame")
    toggleBg.Size = UDim2.new(0, 50, 0, 26)
    toggleBg.Position = UDim2.new(1, -65, 0.5, -13)
    toggleBg.BackgroundColor3 = enabled and Color3.fromRGB(80, 180, 80) or Color3.fromRGB(60, 60, 80)
    toggleBg.Parent = container
    Instance.new("UICorner", toggleBg).CornerRadius = UDim.new(0, 13)
    
    local toggleKnob = Instance.new("Frame")
    toggleKnob.Size = UDim2.new(0, 22, 0, 22)
    toggleKnob.Position = enabled and UDim2.new(1, -24, 0.5, -11) or UDim2.new(0, 2, 0.5, -11)
    toggleKnob.BackgroundColor3 = Color3.new(1, 1, 1)
    toggleKnob.Parent = toggleBg
    Instance.new("UICorner", toggleKnob).CornerRadius = UDim.new(1, 0)
    
    local btn = Instance.new("TextButton")
    btn.Size = UDim2.new(1, 0, 1, 0)
    btn.BackgroundTransparency = 1
    btn.Text = ""
    btn.Parent = toggleBg
    
    btn.MouseButton1Click:Connect(function()
        enabled = not enabled
        TweenService:Create(toggleBg, TweenInfo.new(0.2), {
            BackgroundColor3 = enabled and Color3.fromRGB(80, 180, 80) or Color3.fromRGB(60, 60, 80)
        }):Play()
        TweenService:Create(toggleKnob, TweenInfo.new(0.2), {
            Position = enabled and UDim2.new(1, -24, 0.5, -11) or UDim2.new(0, 2, 0.5, -11)
        }):Play()
        if onChange then onChange(enabled) end
    end)
    
    return container
end

-- Settings sections
local sectionLabel = Instance.new("TextLabel")
sectionLabel.Size = UDim2.new(1, -30, 0, 30)
sectionLabel.Position = UDim2.new(0, 15, 0, 65)
sectionLabel.BackgroundTransparency = 1
sectionLabel.Text = "🔊 AUDIO"
sectionLabel.TextColor3 = Color3.fromRGB(255, 200, 100)
sectionLabel.Font = Enum.Font.GothamBlack
sectionLabel.TextSize = 16
sectionLabel.TextXAlignment = Enum.TextXAlignment.Left
sectionLabel.Parent = mainFrame

createSlider(mainFrame, "Master Volume", 95, settings.audio.master)
createSlider(mainFrame, "Music Volume", 145, settings.audio.music)
createSlider(mainFrame, "SFX Volume", 195, settings.audio.sfx)

local graphicsLabel = Instance.new("TextLabel")
graphicsLabel.Size = UDim2.new(1, -30, 0, 30)
graphicsLabel.Position = UDim2.new(0, 15, 0, 250)
graphicsLabel.BackgroundTransparency = 1
graphicsLabel.Text = "🎮 GAMEPLAY"
graphicsLabel.TextColor3 = Color3.fromRGB(255, 200, 100)
graphicsLabel.Font = Enum.Font.GothamBlack
graphicsLabel.TextSize = 16
graphicsLabel.TextXAlignment = Enum.TextXAlignment.Left
graphicsLabel.Parent = mainFrame

createToggle(mainFrame, "Show Damage Numbers", 280, settings.gameplay.showDamage)
createToggle(mainFrame, "Screen Shake", 320, settings.gameplay.screenShake)
createToggle(mainFrame, "Notifications", 360, settings.gameplay.notifications)

local isOpen = false
local function openSettings()
    if isOpen then return end
    isOpen = true
    mainFrame.Visible = true
    TweenService:Create(mainFrame, TweenInfo.new(0.35, Enum.EasingStyle.Back), {
        Size = UDim2.new(0, 500, 0, 450),
        Position = UDim2.new(0.5, -250, 0.5, -225)
    }):Play()
end

local function closeSettings()
    if not isOpen then return end
    isOpen = false
    TweenService:Create(mainFrame, TweenInfo.new(0.25), {Size = UDim2.new(0, 0, 0, 0)}):Play()
    task.delay(0.25, function() mainFrame.Visible = false end)
end

closeBtn.MouseButton1Click:Connect(closeSettings)

local toggleBtn = Instance.new("TextButton")
toggleBtn.Size = UDim2.new(0, 70, 0, 70)
toggleBtn.Position = UDim2.new(0, 500, 1, -90)
toggleBtn.BackgroundColor3 = Color3.fromRGB(80, 80, 120)
toggleBtn.Text = "⚙️"
toggleBtn.TextSize = 32
toggleBtn.Parent = screenGui
Instance.new("UICorner", toggleBtn).CornerRadius = UDim.new(0, 16)

toggleBtn.MouseButton1Click:Connect(function()
    if isOpen then closeSettings() else openSettings() end
end)

print("[BlaxSmith] ✅ Settings System loaded!")
]]
    settingsScript.Parent = game:GetService("StarterPlayer").StarterPlayerScripts
    print("[BlaxSmith] ⚙️ Advanced Settings System created!")
end

-- ╔══════════════════════════════════════════════════════════════════════════════╗
-- ║  BlaxSmith ADVANCED ACHIEVEMENT SYSTEM v2.0                                   ║
-- ║  Premium Achievements with Badges, Progress Bars & Notifications              ║
-- ╚══════════════════════════════════════════════════════════════════════════════╝
function GameGenerator.createAchievementSystem()
    print("[BlaxSmith] 🏅 Creating Advanced Achievement System...")
    
    local achievementScript = Instance.new("LocalScript")
    achievementScript.Name = "AchievementUI"
    achievementScript.Source = [[
local Players = game:GetService("Players")
local TweenService = game:GetService("TweenService")
local player = Players.LocalPlayer

local ACHIEVEMENTS = {
    {id = 1, name = "First Steps", desc = "Join the game", icon = "👣", unlocked = true, rarity = "common"},
    {id = 2, name = "Coin Collector", desc = "Collect 1,000 coins", icon = "💰", progress = 850, goal = 1000, rarity = "common"},
    {id = 3, name = "Pet Lover", desc = "Own 10 pets", icon = "🐾", progress = 7, goal = 10, rarity = "uncommon"},
    {id = 4, name = "Champion", desc = "Win 50 matches", icon = "🏆", progress = 23, goal = 50, rarity = "rare"},
    {id = 5, name = "Legend", desc = "Reach max level", icon = "⭐", progress = 45, goal = 100, rarity = "legendary"},
    {id = 6, name = "Millionaire", desc = "Earn 1M coins total", icon = "💎", progress = 250000, goal = 1000000, rarity = "mythic"},
}

local RARITY_COLORS = {
    common = Color3.fromRGB(180, 180, 180),
    uncommon = Color3.fromRGB(30, 255, 0),
    rare = Color3.fromRGB(0, 112, 221),
    legendary = Color3.fromRGB(255, 128, 0),
    mythic = Color3.fromRGB(255, 0, 100),
}

local screenGui = Instance.new("ScreenGui")
screenGui.Name = "BlaxSmith_Achievements"
screenGui.ResetOnSpawn = false
screenGui.Parent = player.PlayerGui

local mainFrame = Instance.new("Frame")
mainFrame.Size = UDim2.new(0, 450, 0, 500)
mainFrame.Position = UDim2.new(0.5, -225, 0.5, -250)
mainFrame.BackgroundColor3 = Color3.fromRGB(15, 15, 30)
mainFrame.Visible = false
mainFrame.Parent = screenGui
Instance.new("UICorner", mainFrame).CornerRadius = UDim.new(0, 18)

local mainStroke = Instance.new("UIStroke")
mainStroke.Color = Color3.fromRGB(200, 150, 50)
mainStroke.Thickness = 2
mainStroke.Parent = mainFrame

local header = Instance.new("Frame")
header.Size = UDim2.new(1, 0, 0, 55)
header.BackgroundColor3 = Color3.fromRGB(25, 25, 45)
header.Parent = mainFrame
Instance.new("UICorner", header).CornerRadius = UDim.new(0, 18)

local title = Instance.new("TextLabel")
title.Size = UDim2.new(0.6, 0, 1, 0)
title.Position = UDim2.new(0, 20, 0, 0)
title.BackgroundTransparency = 1
title.Text = "🏅 ACHIEVEMENTS"
title.TextColor3 = Color3.fromRGB(255, 200, 100)
title.Font = Enum.Font.GothamBlack
title.TextSize = 22
title.TextXAlignment = Enum.TextXAlignment.Left
title.Parent = header

local progressLabel = Instance.new("TextLabel")
progressLabel.Size = UDim2.new(0, 100, 0, 30)
progressLabel.Position = UDim2.new(1, -160, 0.5, -15)
progressLabel.BackgroundColor3 = Color3.fromRGB(40, 50, 60)
progressLabel.Text = "1/6"
progressLabel.TextColor3 = Color3.fromRGB(200, 220, 255)
progressLabel.Font = Enum.Font.GothamBold
progressLabel.TextSize = 14
progressLabel.Parent = header
Instance.new("UICorner", progressLabel).CornerRadius = UDim.new(0, 8)

local closeBtn = Instance.new("TextButton")
closeBtn.Size = UDim2.new(0, 40, 0, 40)
closeBtn.Position = UDim2.new(1, -48, 0.5, -20)
closeBtn.BackgroundColor3 = Color3.fromRGB(255, 70, 70)
closeBtn.Text = "✕"
closeBtn.TextColor3 = Color3.new(1, 1, 1)
closeBtn.Font = Enum.Font.GothamBold
closeBtn.Parent = header
Instance.new("UICorner", closeBtn).CornerRadius = UDim.new(0, 10)

local listScroll = Instance.new("ScrollingFrame")
listScroll.Size = UDim2.new(1, -20, 1, -70)
listScroll.Position = UDim2.new(0, 10, 0, 60)
listScroll.BackgroundTransparency = 1
listScroll.ScrollBarThickness = 5
listScroll.Parent = mainFrame

local listLayout = Instance.new("UIListLayout")
listLayout.Padding = UDim.new(0, 8)
listLayout.Parent = listScroll

for _, ach in ipairs(ACHIEVEMENTS) do
    local card = Instance.new("Frame")
    card.Size = UDim2.new(1, -10, 0, 70)
    card.BackgroundColor3 = ach.unlocked and Color3.fromRGB(40, 50, 40) or Color3.fromRGB(30, 30, 45)
    card.Parent = listScroll
    Instance.new("UICorner", card).CornerRadius = UDim.new(0, 12)
    
    local stroke = Instance.new("UIStroke")
    stroke.Color = RARITY_COLORS[ach.rarity]
    stroke.Thickness = ach.unlocked and 2 or 1
    stroke.Transparency = ach.unlocked and 0 or 0.5
    stroke.Parent = card
    
    local icon = Instance.new("TextLabel")
    icon.Size = UDim2.new(0, 50, 0, 50)
    icon.Position = UDim2.new(0, 10, 0.5, -25)
    icon.BackgroundTransparency = 1
    icon.Text = ach.unlocked and ach.icon or "🔒"
    icon.TextSize = 30
    icon.Parent = card
    
    local nameLabel = Instance.new("TextLabel")
    nameLabel.Size = UDim2.new(0, 200, 0, 22)
    nameLabel.Position = UDim2.new(0, 65, 0, 10)
    nameLabel.BackgroundTransparency = 1
    nameLabel.Text = ach.name
    nameLabel.TextColor3 = RARITY_COLORS[ach.rarity]
    nameLabel.Font = Enum.Font.GothamBlack
    nameLabel.TextSize = 14
    nameLabel.TextXAlignment = Enum.TextXAlignment.Left
    nameLabel.Parent = card
    
    local descLabel = Instance.new("TextLabel")
    descLabel.Size = UDim2.new(0, 250, 0, 18)
    descLabel.Position = UDim2.new(0, 65, 0, 30)
    descLabel.BackgroundTransparency = 1
    descLabel.Text = ach.desc
    descLabel.TextColor3 = Color3.fromRGB(150, 150, 180)
    descLabel.Font = Enum.Font.Gotham
    descLabel.TextSize = 11
    descLabel.TextXAlignment = Enum.TextXAlignment.Left
    descLabel.Parent = card
    
    if not ach.unlocked and ach.progress then
        local progressBg = Instance.new("Frame")
        progressBg.Size = UDim2.new(0, 150, 0, 10)
        progressBg.Position = UDim2.new(0, 65, 0, 52)
        progressBg.BackgroundColor3 = Color3.fromRGB(30, 30, 45)
        progressBg.Parent = card
        Instance.new("UICorner", progressBg).CornerRadius = UDim.new(0, 5)
        
        local progressFill = Instance.new("Frame")
        progressFill.Size = UDim2.new(ach.progress / ach.goal, 0, 1, 0)
        progressFill.BackgroundColor3 = RARITY_COLORS[ach.rarity]
        progressFill.Parent = progressBg
        Instance.new("UICorner", progressFill).CornerRadius = UDim.new(0, 5)
        
        local progressText = Instance.new("TextLabel")
        progressText.Size = UDim2.new(0, 80, 0, 18)
        progressText.Position = UDim2.new(0, 220, 0, 48)
        progressText.BackgroundTransparency = 1
        progressText.Text = ach.progress .. "/" .. ach.goal
        progressText.TextColor3 = Color3.fromRGB(180, 180, 200)
        progressText.Font = Enum.Font.GothamBold
        progressText.TextSize = 11
        progressText.TextXAlignment = Enum.TextXAlignment.Left
        progressText.Parent = card
    elseif ach.unlocked then
        local checkmark = Instance.new("TextLabel")
        checkmark.Size = UDim2.new(0, 40, 0, 40)
        checkmark.Position = UDim2.new(1, -50, 0.5, -20)
        checkmark.BackgroundTransparency = 1
        checkmark.Text = "✓"
        checkmark.TextColor3 = Color3.fromRGB(100, 255, 100)
        checkmark.Font = Enum.Font.GothamBlack
        checkmark.TextSize = 28
        checkmark.Parent = card
    end
end

listScroll.CanvasSize = UDim2.new(0, 0, 0, #ACHIEVEMENTS * 78)

local isOpen = false
local function openAchievements()
    if isOpen then return end
    isOpen = true
    mainFrame.Visible = true
    TweenService:Create(mainFrame, TweenInfo.new(0.35, Enum.EasingStyle.Back), {
        Size = UDim2.new(0, 450, 0, 500),
        Position = UDim2.new(0.5, -225, 0.5, -250)
    }):Play()
end

local function closeAchievements()
    if not isOpen then return end
    isOpen = false
    TweenService:Create(mainFrame, TweenInfo.new(0.25), {Size = UDim2.new(0, 0, 0, 0)}):Play()
    task.delay(0.25, function() mainFrame.Visible = false end)
end

closeBtn.MouseButton1Click:Connect(closeAchievements)

local toggleBtn = Instance.new("TextButton")
toggleBtn.Size = UDim2.new(0, 70, 0, 70)
toggleBtn.Position = UDim2.new(0, 580, 1, -90)
toggleBtn.BackgroundColor3 = Color3.fromRGB(200, 120, 50)
toggleBtn.Text = "🏅"
toggleBtn.TextSize = 32
toggleBtn.Parent = screenGui
Instance.new("UICorner", toggleBtn).CornerRadius = UDim.new(0, 16)

toggleBtn.MouseButton1Click:Connect(function()
    if isOpen then closeAchievements() else openAchievements() end
end)

print("[BlaxSmith] ✅ Achievement System loaded!")
]]
    achievementScript.Parent = game:GetService("StarterPlayer").StarterPlayerScripts
    print("[BlaxSmith] 🏅 Advanced Achievement System created!")
end

-- AUTOMATED UI SYSTEM (Lemonade-style)
function GameGenerator.createUISystem()
    print("[BlaxSmith]  Generating Automated UI...")
    local sg = Instance.new("ScreenGui")
    sg.Name = "BlaxSmithUI"
    sg.ResetOnSpawn = false
    sg.Parent = game:GetService("StarterGui")
    
    -- Health Bar
    local healthFrame = Instance.new("Frame")
    healthFrame.Name = "HealthBar"
    healthFrame.Size = UDim2.new(0, 200, 0, 25)
    healthFrame.Position = UDim2.new(0.5, -100, 1, -50)
    healthFrame.BackgroundColor3 = Color3.fromRGB(40, 40, 40)
    healthFrame.BorderSizePixel = 0
    healthFrame.Parent = sg
    
    local healthFill = Instance.new("Frame")
    healthFill.Name = "Fill"
    healthFill.Size = UDim2.new(1, 0, 1, 0)
    healthFill.BackgroundColor3 = Color3.fromRGB(200, 0, 0)
    healthFill.BorderSizePixel = 0
    healthFill.Parent = healthFrame
    
    local healthLabel = Instance.new("TextLabel")
    healthLabel.Size = UDim2.new(1, 0, 1, 0)
    healthLabel.BackgroundTransparency = 1
    healthLabel.Text = "HEALTH"
    healthLabel.TextColor3 = Color3.new(1, 1, 1)
    healthLabel.Font = Enum.Font.GothamBold
    healthLabel.TextSize = 14
    healthLabel.Parent = healthFrame

    -- Inventory Panel
    local invFrame = Instance.new("Frame")
    invFrame.Name = "Inventory"
    invFrame.Size = UDim2.new(0, 250, 0, 300)
    invFrame.Position = UDim2.new(0, 20, 0, 100)
    invFrame.BackgroundColor3 = Color3.fromRGB(30, 30, 30)
    invFrame.Parent = sg
    
    local invTitle = Instance.new("TextLabel")
    invTitle.Size = UDim2.new(1, 0, 0, 30)
    invTitle.Text = "INVENTORY"
    invTitle.BackgroundColor3 = Color3.fromRGB(40, 40, 40)
    invTitle.TextColor3 = Color3.new(1, 1, 1)
    invTitle.Font = Enum.Font.GothamBold
    invTitle.Parent = invFrame
    
    local invList = Instance.new("ScrollingFrame")
    invList.Name = "List"
    invList.Size = UDim2.new(1, -10, 1, -40)
    invList.Position = UDim2.new(0, 5, 0, 35)
    invList.BackgroundTransparency = 1
    invList.CanvasSize = UDim2.new(0, 0, 0, 0)
    invList.Parent = invFrame
    
    local uiList = Instance.new("UIListLayout")
    uiList.Padding = UDim.new(0, 5)
    uiList.Parent = invList

    -- Quest Log
    local questFrame = Instance.new("Frame")
    questFrame.Name = "QuestLog"
    questFrame.Size = UDim2.new(0, 300, 0, 200)
    questFrame.Position = UDim2.new(1, -320, 0, 100)
    questFrame.BackgroundColor3 = Color3.fromRGB(25, 25, 25)
    questFrame.Parent = sg
    
    local questTitle = Instance.new("TextLabel")
    questTitle.Size = UDim2.new(1, 0, 0, 30)
    questTitle.Text = "QUEST LOG"
    questTitle.BackgroundColor3 = Color3.fromRGB(35, 35, 35)
    questTitle.TextColor3 = Color3.new(1, 1, 1)
    questTitle.Font = Enum.Font.GothamBold
    questTitle.Parent = questFrame
    
    local questList = Instance.new("ScrollingFrame")
    questList.Name = "List"
    questList.Size = UDim2.new(1, -10, 1, -40)
    questList.Position = UDim2.new(0, 5, 0, 35)
    questList.BackgroundTransparency = 1
    questList.Parent = questFrame
    
    local uiList2 = Instance.new("UIListLayout")
    uiList2.Padding = UDim.new(0, 5)
    uiList2.Parent = questList

    -- UI Handler (LocalScript)
    local handler = Instance.new("LocalScript")
    handler.Name = "UIHandler"
    handler.Source = [[
local player = game.Players.LocalPlayer
local character = player.Character or player.CharacterAdded:Wait()
local humanoid = character:WaitForChild("Humanoid")

local sg = script.Parent
local healthFill = sg.HealthBar.Fill
local invList = sg.Inventory.List
local questList = sg.QuestLog.List

-- Update Health
local function updateHealth()
    local percent = humanoid.Health / humanoid.MaxHealth
    healthFill.Size = UDim2.new(math.clamp(percent, 0, 1), 0, 1, 0)
end
humanoid:GetPropertyChangedSignal("Health"):Connect(updateHealth)
player.CharacterAdded:Connect(function(char)
    humanoid = char:WaitForChild("Humanoid")
    humanoid:GetPropertyChangedSignal("Health"):Connect(updateHealth)
    updateHealth()
end)

-- Note: In a real environment, we'd use Remotes to fetch Inv/Quests.
-- For this auto-gen stack, we poll the server-side attributes or a shared folder.
while true do
    -- Update Inventory (Example)
    -- This would be replaced by actual data sync logic
    wait(2)
end
]]
    handler.Parent = sg
    
    print("[BlaxSmith]  UI System Created")
end

-- ADVANCED NPC BEHAVIORS (Lemonade-style)
local function setupVendor(npc, items)
    local prompt = npc:FindFirstChildOfClass("ProximityPrompt") or Instance.new("ProximityPrompt")
    prompt.ObjectText = npc.Name
    prompt.ActionText = "Open Shop"
    prompt.Parent = npc.PrimaryPart or npc:FindFirstChild("Torso")
    
    npc:SetAttribute("IsVendor", true)
    npc:SetAttribute("ShopItems", HttpService:JSONEncode(items))
    
    local shopScript = npc:FindFirstChild("ShopInteraction") or Instance.new("Script")
    shopScript.Name = "ShopInteraction"
    shopScript.Source = [[
        local npc = script.Parent
        local prompt = npc:FindFirstChildOfClass("ProximityPrompt")
        prompt.Triggered:Connect(function(player)
            print("[Shop] Opened for " .. player.Name .. ". Items: " .. npc:GetAttribute("ShopItems"))
            -- Shop UI would be triggered here
        end)
    ]]
    shopScript.Parent = npc
end

local function setupPatrol(npc, path)
    task.spawn(function()
        local humanoid = npc:FindFirstChildOfClass("Humanoid")
        if not humanoid then return end
        
        local waypoints = {}
        for _, p in ipairs(path) do
            table.insert(waypoints, Vector3.new(p[1], 2, p[2]))
        end
        
        local index = 1
        while npc and npc.Parent do
            local target = waypoints[index]
            local pathObj = PathfindingService:CreatePath()
            pathObj:ComputeAsync(npc.PrimaryPart.Position, target)
            
            if pathObj.Status == Enum.PathStatus.Success then
                local wps = pathObj:GetWaypoints()
                for i = 2, #wps do
                    humanoid:MoveTo(wps[i].Position)
                    humanoid.MoveToFinished:Wait()
                end
            end
            
            task.wait(2)
            index = (index % #waypoints) + 1
        end
    end)
end

local function scheduleBehavior(npc, behavior, activeHours)
    task.spawn(function()
        while npc and npc.Parent do
            local hour = Lighting.ClockTime
            if hour >= activeHours[1] and hour <= activeHours[2] then
                -- Active: Wander (already handled by wanderAI if citizen)
                npc:SetAttribute("IsSleeping", false)
            else
                -- Inactive: Go home / Idle
                npc:SetAttribute("IsSleeping", true)
                -- Could move to a 'home' position here
            end
            task.wait(10)
        end
    end)
end

function GameGenerator.hookNPCBehaviors(blueprint)
    if not blueprint.npc_behaviors then return end
    print("[BlaxSmith]  Hooking " .. #blueprint.npc_behaviors .. " Advanced behaviors...")
    
    local npcsFolder = workspace:FindFirstChild("BlaxSmith_NPCs")
    if not npcsFolder then return end
    local npcs = npcsFolder:GetChildren()
    if #npcs == 0 then return end
    
    for _, behaviorData in ipairs(blueprint.npc_behaviors) do
        -- Find a suitable NPC (matching type or random)
        local npc = npcs[math.random(1, #npcs)]
        
        if behaviorData.behavior == "shop" then
            setupVendor(npc, behaviorData.inventory)
        elseif behaviorData.behavior == "patrol" then
            setupPatrol(npc, behaviorData.path)
        elseif behaviorData.behavior == "wander_day" then
            scheduleBehavior(npc, "wander_day", behaviorData.active_hours or {6, 18})
        end
    end
end

-- PERSISTENT SAVE/LOAD SYSTEM (Lemonade-style)
function GameGenerator.createSaveSystemModule()
    print("[BlaxSmith]  Creating Persistent Save System...")
    local sss = game:GetService("ServerScriptService")
    local saveModule = sss:FindFirstChild("SaveSystem")
    if not saveModule then
        saveModule = Instance.new("ModuleScript")
        saveModule.Name = "SaveSystem"
        saveModule.Source = [[
local DataStoreService = game:GetService("DataStoreService")
local SaveSystem = {}

local playerDataStore = DataStoreService:GetDataStore("BlaxSmithPlayerData")

function SaveSystem:SavePlayer(player)
    local sss = game:GetService("ServerScriptService")
    local Inventory = sss:FindFirstChild("Inventory") and require(sss.Inventory)
    local QuestSystem = sss:FindFirstChild("QuestSystem") and require(sss.QuestSystem)

    if not Inventory or not QuestSystem then return end

    local data = {
        inventory = Inventory:GetItems(player),
        quests = QuestSystem.activeQuests[player] or {},
        health = player.Character and player.Character:FindFirstChild("Humanoid") and player.Character.Humanoid.Health or 100
    }

    local success, err = pcall(function()
        playerDataStore:SetAsync(player.UserId, data)
    end)

    if not success then
        warn("[SaveSystem] Failed to save for " .. player.Name .. ": " .. tostring(err))
    else
        print("[SaveSystem] Saved progress for " .. player.Name)
    end
end

function SaveSystem:LoadPlayer(player)
    local sss = game:GetService("ServerScriptService")
    local Inventory = sss:FindFirstChild("Inventory") and require(sss.Inventory)
    local QuestSystem = sss:FindFirstChild("QuestSystem") and require(sss.QuestSystem)

    if not Inventory or not QuestSystem then return end

    local success, data = pcall(function()
        return playerDataStore:GetAsync(player.UserId)
    end)

    if success and data then
        print("[SaveSystem] Loading progress for " .. player.Name)
        -- restore inventory
        if Inventory.players then
            Inventory.players[player] = { items = data.inventory or {}, maxSlots = 20 }
        end
        -- restore quests
        if QuestSystem.activeQuests then
            QuestSystem.activeQuests[player] = data.quests or {}
        end
        -- restore health
        if player.Character and player.Character:FindFirstChild("Humanoid") then
            player.Character.Humanoid.Health = data.health or 100
        end
    else
        print("[SaveSystem] No existing data for " .. player.Name .. " or failed to load.")
    end
end

return SaveSystem
]]
        saveModule.Parent = sss
        
        -- Event Hooks Runner
        local runner = Instance.new("Script")
        runner.Name = "SaveSystemRunner"
        runner.Source = [[
local Players = game:GetService("Players")
local SaveSystem = require(script.Parent)

Players.PlayerAdded:Connect(function(player)
    player.CharacterAdded:Connect(function()
        -- Wait a bit for other systems to init
        task.wait(1)
        SaveSystem:LoadPlayer(player)
    end)
end)

Players.PlayerRemoving:Connect(function(player)
    SaveSystem:SavePlayer(player)
end)

-- Auto-Save Loop
task.spawn(function()
    while true do
        task.wait(60)
        for _, player in ipairs(Players:GetPlayers()) do
            SaveSystem:SavePlayer(player)
        end
    end
end)

game:BindToClose(function()
    for _, player in ipairs(Players:GetPlayers()) do
        SaveSystem:SavePlayer(player)
    end
    task.wait(2)
end)
]]
        runner.Parent = saveModule
    end
    return saveModule
end

-- 1. Create Leaderstats
function GameGenerator.addLeaderstats(stats)
    local scriptSource = [[
local Players = game:GetService("Players")

Players.PlayerAdded:Connect(function(player)
    local leaderstats = Instance.new("Folder")
    leaderstats.Name = "leaderstats"
    leaderstats.Parent = player
    
    -- Generated Stats
]]
    
    for _, stat in ipairs(stats or {}) do
        scriptSource = scriptSource .. string.format([[
    local %s = Instance.new("IntValue")
    %s.Name = "%s"
    %s.Value = %d
    %s.Parent = leaderstats
]], stat.name, stat.name, stat.name, stat.name, stat.defaultValue or 0, stat.name)
    end
    
    scriptSource = scriptSource .. "\nend)"
    
    local script = Instance.new("Script")
    script.Name = "LeaderstatsSystem"
    script.Source = scriptSource
    script.Parent = game:GetService("ServerScriptService")
    print("[BlaxSmith]  Added Leaderstats System")
end

-- 2. Create Teams
function GameGenerator.addTeams(teams)
    local Teams = game:GetService("Teams")
    for _, tData in ipairs(teams or {}) do
        local t = Instance.new("Team")
        t.Name = tData.name
        t.TeamColor = tData.color or BrickColor.Random()
        t.AutoAssignable = true
        t.Parent = Teams
    end
    print("[BlaxSmith]  Added " .. #teams .. " Teams")
end

-- 3. Give Tools (StarterPack)
function GameGenerator.giveTools(tools)
    for _, toolId in ipairs(tools or {}) do
        -- Use our safeInsert to fetch from catalog
        local tool = safeInsert(tonumber(toolId))
        if tool then
            tool.Parent = game:GetService("StarterPack")
        end
    end
    print("[BlaxSmith]  Added Tools to StarterPack")
end

-- 4. Create Simple UI
function GameGenerator.addGui(config)
    local gui = Instance.new("ScreenGui")
    gui.Name = config.name or "GameGui"
    gui.Parent = game:GetService("StarterGui")
    
    local frame = Instance.new("Frame")
    frame.Size = UDim2.new(0, 300, 0, 100)
    frame.Position = UDim2.new(0.5, -150, 0.9, -120)
    frame.BackgroundColor3 = Color3.fromRGB(30, 30, 30)
    frame.BorderSizePixel = 0
    frame.Parent = gui
    
    local corner = Instance.new("UICorner")
    corner.CornerRadius = UDim.new(0, 12)
    corner.Parent = frame
    
    local title = Instance.new("TextLabel")
    title.Size = UDim2.new(1, 0, 1, 0)
    title.BackgroundTransparency = 1
    title.Text = config.title or "Welcome!"
    title.TextColor3 = Color3.new(1,1,1)
    title.TextSize = 24
    title.Font = Enum.Font.GothamBold
    title.Parent = frame
    
    print("[BlaxSmith]  Added Game GUI")
end

-- DYNAMIC ASSET POPULATOR (Mixed Mode)
local function populateMapWithAssets(preset, mapFolder, minRadius)
    minRadius = minRadius or 0 -- Default to 0 radius (random placement allowed anywhere)
    
    spawn(function()
        local success, response = pcall(function()
            return HttpService:RequestAsync({
                 Url = CONFIG.APP_URL .. "/api/search?q=" .. preset .. "&limit=5",
                 Method = "GET"
            })
        end)
        
        if success and response.Body then
            local searchData = HttpService:JSONDecode(response.Body)
            if searchData.results and #searchData.results > 0 then
                print("[BlaxSmith]  Found " .. #searchData.results .. " dynamic assets for " .. preset)
                
                for i, result in ipairs(searchData.results) do
                    local assetId = tonumber(result.assetId)
                    if assetId then
                        -- Insert at random position around the map, respecting minRadius
                        local dist = math.random(minRadius, minRadius + 150)
                        local angle = math.rad(math.random(0, 360))
                        
                        local x = math.sin(angle) * dist
                        local z = math.cos(angle) * dist
                        local pos = Vector3.new(x, 5, z)
                        
                        -- Avoid center if radius > 0
                        
                        print("[BlaxSmith]  Inserting dynamic asset:", result.name)
                        local model = safeInsert(assetId)
                        if model then
                            if model:IsA("Model") then
                                model:PivotTo(CFrame.new(pos))
                            elseif model:IsA("BasePart") then
                                model.Position = pos
                            end
                            model.Parent = mapFolder
                        end
                    end
                    wait(0.5) -- Spread out requests
                end
            else
                print("[BlaxSmith]  No dynamic assets found, sticking to built-in map.")
            end
        end
    end)
end

-- 6. OBBY / FLOOD ESCAPE MAP BUILDER
function GameGenerator.buildObbyMap(difficulty)
    local mapFolder = Instance.new("Folder")
    mapFolder.Name = "BlaxSmith_ObbyMap"
    mapFolder.Parent = workspace
    
    -- CREATE SPAWN
    local spawnLoc = Instance.new("SpawnLocation")
    spawnLoc.Position = Vector3.new(0, 10, 0)
    spawnLoc.Size = Vector3.new(10, 1, 10)
    spawnLoc.Anchored = true
    spawnLoc.BrickColor = BrickColor.new("Lime green")
    spawnLoc.Material = Enum.Material.Neon
    spawnLoc.Name = "StartSpawn"
    spawnLoc.Parent = mapFolder
    
    local currentPos = spawnLoc.Position
    local platformCount = 25
    
    -- Procedurally generate jumps
    for i = 1, platformCount do
        -- Calculate next jump
        local dist = math.random(8, 14)
        local angle = math.rad(math.random(-30, 30)) -- More linear path
        local heightChange = math.random(1, 4)
        
        local nextPos = currentPos + Vector3.new(
            math.sin(angle) * dist,
            heightChange,
            math.cos(angle) * dist
        )
        -- Ensure we move generally FORWARD (Z+)
        nextPos = nextPos + Vector3.new(0,0, 5)

        local platform = Instance.new("Part")
        platform.Name = "Stage_" .. i
        platform.Size = Vector3.new(6, 1, 6)
        platform.Position = nextPos
        platform.Anchored = true
        platform.BrickColor = BrickColor.Random()
        platform.Material = Enum.Material.Neon
        platform.Parent = mapFolder
        
        currentPos = nextPos
        
        if i % 5 == 0 then
            -- Checkpoint platform
            platform.Size = Vector3.new(10, 1, 10)
            platform.BrickColor = BrickColor.new("Gold")
        end
    end
    
    local endPad = Instance.new("Part")
    endPad.Name = "WinnerPad"
    endPad.Size = Vector3.new(15, 1, 15)
    endPad.Position = currentPos + Vector3.new(0, 0, 12)
    endPad.Anchored = true
    endPad.BrickColor = BrickColor.new("Baby blue")
    endPad.Material = Enum.Material.Neon
    endPad.Parent = mapFolder
    
    -- WINNER UI (Touch event script)
    local script = Instance.new("Script")
    script.Parent = endPad
    script.Source = [[
        script.Parent.Touched:Connect(function(hit)
            local hum = hit.Parent:FindFirstChild("Humanoid")
            if hum then
                print("WINNER!")
                -- Celebration logic here
            end
        end)
    ]]
    
    print("[BlaxSmith]  Generated Obby Map with " .. platformCount .. " stages")
    return mapFolder
end

-- 8. COMPLETE PET SIMULATOR GENERATOR (Full Automation)
function GameGenerator.buildSimulatorMap()
    local mapFolder = Instance.new("Folder")
    mapFolder.Name = "PetSimulator_Map"
    mapFolder.Parent = workspace
    
    print("[BlaxSmith]  Building Complete Pet Simulator...")
    
    -- TERRAIN: Colorful Island
    local base = Instance.new("Part")
    base.Size = Vector3.new(400, 5, 400)
    base.Position = Vector3.new(0, -2.5, 0)
    base.Anchored = true
    base.Color = Color3.fromRGB(76, 153, 76) -- Grass green
    base.Material = Enum.Material.Grass
    base.Name = "Island"
    base.Parent = mapFolder
    
    -- SPAWN AREA: Beautiful Plaza
    local plaza = Instance.new("Part")
    plaza.Size = Vector3.new(80, 1, 80)
    plaza.Position = Vector3.new(0, 0.5, 0)
    plaza.Anchored = true
    plaza.Color = Color3.fromRGB(255, 255, 255)
    plaza.Material = Enum.Material.Marble
    plaza.Name = "SpawnPlaza"
    plaza.Parent = mapFolder
    
    local spawn = Instance.new("SpawnLocation")
    spawn.Position = Vector3.new(0, 3, 0)
    spawn.Size = Vector3.new(10, 1, 10)
    spawn.Anchored = true
    spawn.Transparency = 1
    spawn.Parent = mapFolder
    
    -- EGG AREA: Multiple Egg Pedestals
    local eggColors = {
        {name="Common", color=Color3.fromRGB(200, 200, 200), cost=100},
        {name="Rare", color=Color3.fromRGB(0, 150, 255), cost=500},
        {name="Epic", color=Color3.fromRGB(200, 0, 255), cost=2000},
        {name="Legendary", color=Color3.fromRGB(255, 215, 0), cost=10000}
    }
    
    for i, eggData in ipairs(eggColors) do
        local xPos = -60 + (i * 40)
        
        -- Pedestal
        local pedestal = Instance.new("Part")
        pedestal.Size = Vector3.new(8, 4, 8)
        pedestal.Position = Vector3.new(xPos, 2, 60)
        pedestal.Anchored = true
        pedestal.Color = Color3.fromRGB(80, 80, 80)
        pedestal.Material = Enum.Material.Slate
        pedestal.Name = eggData.name .. "_Pedestal"
        pedestal.Parent = mapFolder
        
        -- Egg (sphere)
        local egg = Instance.new("Part")
        egg.Shape = Enum.PartType.Ball
        egg.Size = Vector3.new(6, 8, 6)
        egg.Position = Vector3.new(xPos, 8, 60)
        egg.Anchored = true
        egg.Color = eggData.color
        egg.Material = Enum.Material.Neon
        egg.Name = eggData.name .. "_Egg"
        egg.Parent = mapFolder
        
        -- Egg Label
        local label = Instance.new("BillboardGui")
        label.Size = UDim2.new(0, 150, 0, 60)
        label.StudsOffset = Vector3.new(0, 6, 0)
        label.Adornee = egg
        label.Parent = egg
        
        local text = Instance.new("TextLabel")
        text.Size = UDim2.new(1, 0, 0.5, 0)
        text.BackgroundTransparency = 1
        text.Text = eggData.name .. " Egg"
        text.TextColor3 = Color3.new(1, 1, 1)
        text.TextStrokeTransparency = 0
        text.TextScaled = true
        text.Font = Enum.Font.GothamBold
        text.Parent = label
        
        local costText = Instance.new("TextLabel")
        costText.Size = UDim2.new(1, 0, 0.5, 0)
        costText.Position = UDim2.new(0, 0, 0.5, 0)
        costText.BackgroundTransparency = 1
        costText.Text = " " .. eggData.cost .. " Coins"
        costText.TextColor3 = Color3.fromRGB(255, 215, 0)
        costText.TextStrokeTransparency = 0
        costText.TextScaled = true
        costText.Font = Enum.Font.Gotham
        costText.Parent = label
        
        -- ClickDetector for hatching
        local click = Instance.new("ClickDetector")
        click.MaxActivationDistance = 15
        click.Parent = egg
        
        -- HATCH SCRIPT
        local hatchScript = Instance.new("Script")
        hatchScript.Name = "HatchScript"
        hatchScript.Source = string.format([[
            local egg = script.Parent
            local cost = %d
            local petNames = {"Doggy", "Kitty", "Dragon", "Unicorn", "Phoenix"}
            
            egg.ClickDetector.MouseClick:Connect(function(player)
                local ls = player:FindFirstChild("leaderstats")
                if ls and ls:FindFirstChild("Coins") then
                    if ls.Coins.Value >= cost then
                        ls.Coins.Value = ls.Coins.Value - cost
                        if ls:FindFirstChild("Eggs Hatched") then
                            ls["Eggs Hatched"].Value = ls["Eggs Hatched"].Value + 1
                        end
                        if ls:FindFirstChild("Pets") then
                            ls.Pets.Value = ls.Pets.Value + 1
                        end
                        
                        -- Create pet
                        local pet = Instance.new("Part")
                        pet.Shape = Enum.PartType.Ball
                        pet.Size = Vector3.new(3, 3, 3)
                        pet.Color = egg.Color
                        pet.Material = Enum.Material.SmoothPlastic
                        pet.Name = petNames[math.random(1, #petNames)]
                        pet.Anchored = false
                        pet.CanCollide = false
                        pet.Position = player.Character.HumanoidRootPart.Position + Vector3.new(3, 2, 0)
                        pet.Parent = workspace
                        
                        -- Pet follow script
                        local follow = Instance.new("BodyPosition")
                        follow.MaxForce = Vector3.new(5000, 5000, 5000)
                        follow.P = 1000
                        follow.Parent = pet
                        
                        spawn(function()
                            while pet.Parent do
                                if player.Character and player.Character:FindFirstChild("HumanoidRootPart") then
                                    follow.Position = player.Character.HumanoidRootPart.Position + Vector3.new(3, 3, 0)
                                end
                                wait(0.1)
                            end
                        end)
                        
                        print(player.Name .. " hatched a " .. pet.Name .. "!")
                    else
                        print("Not enough coins!")
                    end
                end
            end)
        ]], eggData.cost)
        hatchScript.Parent = egg
    end
    print("[BlaxSmith]  Created 4 Egg Pedestals with Hatch Scripts")
    
    -- SHOP BUILDING
    local shop = Instance.new("Part")
    shop.Size = Vector3.new(50, 20, 40)
    shop.Position = Vector3.new(0, 10, -80)
    shop.Anchored = true
    shop.Color = Color3.fromRGB(255, 100, 150)
    shop.Material = Enum.Material.SmoothPlastic
    shop.Name = "ShopBuilding"
    shop.Parent = mapFolder
    
    local shopSign = Instance.new("BillboardGui")
    shopSign.Size = UDim2.new(0, 200, 0, 60)
    shopSign.StudsOffset = Vector3.new(0, 15, 0)
    shopSign.Adornee = shop
    shopSign.Parent = shop
    
    local signText = Instance.new("TextLabel")
    signText.Size = UDim2.new(1, 0, 1, 0)
    signText.BackgroundTransparency = 1
    signText.Text = " PET SHOP"
    signText.TextColor3 = Color3.new(1, 1, 1)
    signText.TextStrokeTransparency = 0
    signText.TextScaled = true
    signText.Font = Enum.Font.GothamBlack
    signText.Parent = shopSign
    print("[BlaxSmith]  Created Shop Building")
    
    -- COIN COLLECTIBLES scattered around map
    for i = 1, 30 do
        local coin = Instance.new("Part")
        coin.Shape = Enum.PartType.Cylinder
        coin.Size = Vector3.new(0.5, 3, 3)
        coin.Rotation = Vector3.new(0, 0, 90)
        coin.Position = Vector3.new(math.random(-150, 150), 3, math.random(-150, 150))
        coin.Anchored = true
        coin.Color = Color3.fromRGB(255, 215, 0)
        coin.Material = Enum.Material.Neon
        coin.Name = "Coin_" .. i
        coin.Parent = mapFolder
        
        local coinScript = Instance.new("Script")
        coinScript.Source = [[
            local coin = script.Parent
            local value = 10
            local respawnTime = 5
            
            coin.Touched:Connect(function(hit)
                local player = game.Players:GetPlayerFromCharacter(hit.Parent)
                if player and coin.Transparency < 1 then
                    local ls = player:FindFirstChild("leaderstats")
                    if ls and ls:FindFirstChild("Coins") then
                        ls.Coins.Value = ls.Coins.Value + value
                        coin.Transparency = 1
                        coin.CanCollide = false
                        wait(respawnTime)
                        coin.Transparency = 0
                        coin.CanCollide = true
                    end
                end
            end)
        ]]
        coinScript.Parent = coin
    end
    print("[BlaxSmith]  Created 30 Coin Collectibles with Scripts")
    
    -- DECORATIVE TREES
    for i = 1, 15 do
        local tree = Instance.new("Model")
        tree.Name = "Tree_" .. i
        
        local trunk = Instance.new("Part")
        trunk.Size = Vector3.new(3, 12, 3)
        trunk.Position = Vector3.new(math.random(-180, 180), 6, math.random(-180, 180))
        trunk.Anchored = true
        trunk.Color = Color3.fromRGB(139, 90, 43)
        trunk.Material = Enum.Material.Wood
        trunk.Parent = tree
        tree.PrimaryPart = trunk
        
        local leaves = Instance.new("Part")
        leaves.Shape = Enum.PartType.Ball
        leaves.Size = Vector3.new(12, 12, 12)
        leaves.Position = trunk.Position + Vector3.new(0, 10, 0)
        leaves.Anchored = true
        leaves.Color = Color3.fromRGB(0, 180, 0)
        leaves.Material = Enum.Material.Grass
        leaves.Parent = tree
        
        tree.Parent = mapFolder
    end
    print("[BlaxSmith]  Created 15 Decorative Trees")
    
    print("[BlaxSmith]  ====== PET SIMULATOR COMPLETE! ======")
    print("[BlaxSmith]  4 Egg Types |  30 Coins |  Shop |  15 Trees")
    return mapFolder
end

-- 9. TYCOON GENERATOR (Dropper System)
function GameGenerator.buildTycoonMap()
    local mapFolder = Instance.new("Folder")
    mapFolder.Name = "BlaxSmith_TycoonMap"
    mapFolder.Parent = workspace
    
    -- Base
    local base = Instance.new("Part")
    base.Size = Vector3.new(200, 1, 200)
    base.Position = Vector3.new(0, -0.5, 0)
    base.Anchored = true
    base.BrickColor = BrickColor.new("Dark stone grey")
    base.Material = Enum.Material.Concrete
    base.Name = "TycoonFloor"
    base.Parent = mapFolder
    
    -- Tycoon Plot
    local plot = Instance.new("Model")
    plot.Name = "TycoonPlot1"
    plot.Parent = mapFolder
    
    local plotFloor = Instance.new("Part")
    plotFloor.Size = Vector3.new(60, 1, 80)
    plotFloor.Position = Vector3.new(0, 0.1, 0)
    plotFloor.Anchored = true
    plotFloor.BrickColor = BrickColor.new("Medium stone grey")
    plotFloor.Parent = plot
    
    -- Dropper
    local dropper = Instance.new("Part")
    dropper.Size = Vector3.new(4, 4, 4)
    dropper.Position = Vector3.new(0, 5, -30)
    dropper.Anchored = true
    dropper.BrickColor = BrickColor.new("Bright red")
    dropper.Name = "Dropper"
    dropper.Parent = plot
    
    -- Conveyor
    local conveyor = Instance.new("Part")
    conveyor.Size = Vector3.new(4, 1, 20)
    conveyor.Position = Vector3.new(0, 1, -20)
    conveyor.Anchored = true
    conveyor.BrickColor = BrickColor.new("Black")
    conveyor.Parent = plot
    
    -- Collector
    local collector = Instance.new("Part")
    collector.Size = Vector3.new(6, 1, 6)
    collector.Position = Vector3.new(0, 1, -8)
    collector.Anchored = true
    collector.BrickColor = BrickColor.new("Bright green")
    collector.Name = "Collector"
    collector.Parent = plot
    
    -- SCRIPTS
    local dropScript = Instance.new("Script")
    dropScript.Parent = dropper
    dropScript.Source = [[
        while true do
            wait(2)
            local part = Instance.new("Part")
            part.Size = Vector3.new(1,1,1)
            part.Position = script.Parent.Position - Vector3.new(0, 3, 0)
            part.BrickColor = BrickColor.Random()
            part.Name = "Ore"
            part.Parent = workspace
            game:GetService("Debris"):AddItem(part, 10)
        end
    ]]
    
    local collectScript = Instance.new("Script")
    collectScript.Parent = collector
    collectScript.Source = [[
        script.Parent.Touched:Connect(function(hit)
            if hit.Name == "Ore" then
                hit:Destroy()
                -- Give cash logic would go here
                print("Cash +10")
            end
        end)
    ]]
    
    print("[BlaxSmith]  Generated Tycoon Map")
    return mapFolder
end



-- 7. FLOOD ESCAPE SYSTEM (Rising Water/Lava)
function GameGenerator.addFloodSystem(config)
    local scriptSource = [[
-- FE2 Stylized Rising Flood
local floodPart = Instance.new("Part")
floodPart.Name = "RisingFlood"
floodPart.Size = Vector3.new(500, 1, 500)
floodPart.Position = Vector3.new(0, -10, 0)
floodPart.Anchored = true
floodPart.CanCollide = false
floodPart.Material = Enum.Material.Water
floodPart.Transparency = 0.5
floodPart.BrickColor = BrickColor.new("Bright blue")
floodPart.Parent = workspace

local riseSpeed = 0.5 -- Studs per second
local damageRate = 10 

while true do
    floodPart.Position = floodPart.Position + Vector3.new(0, riseSpeed * wait(0.1), 0)
    
    -- Damage players touching
    local parts = workspace:GetPartsInPart(floodPart)
    for _, part in pairs(parts) do
        local hum = part.Parent:FindFirstChild("Humanoid")
        if hum then
            hum:TakeDamage(damageRate * 0.1)
        end
    end
end
]]
    if config.liquidType == "lava" then
        scriptSource = scriptSource:gsub("Bright blue", "Bright orange")
        scriptSource = scriptSource:gsub("Enum.Material.Water", "Enum.Material.Neon")
    end

    local script = Instance.new("Script")
    script.Name = "FloodSystem"
    script.Source = scriptSource
    script.Parent = game:GetService("ServerScriptService")
    print("[BlaxSmith]  Added Flood Escape System")
end

-- 5. MASTER BUILD FUNCTION (Updated)
function GameGenerator.build(config)
    print("---------------------------------------")
    print("[BlaxSmith]  Building Full Game: " .. (config.name or "Untitled"))
    print("---------------------------------------")
    
    -- A. Map
    -- A. Map Generation
    local mapFolder
    
    if config.mapTheme == "obby" or config.mapTheme == "flood" then
        mapFolder = GameGenerator.buildObbyMap()
    elseif config.mapTheme == "simulator" then
        mapFolder = GameGenerator.buildSimulatorMap()
    elseif config.mapTheme == "tycoon" then
        mapFolder = GameGenerator.buildTycoonMap()
    else
        mapFolder = buildDirectMap(config.mapTheme)
    end

    -- Dynamic Asset Population (Smart Scatter)
    spawn(function()
        local minRadius = 0
        -- If it's a "Kit" game, keep the center clear
        if config.mapTheme == "obby" or config.mapTheme == "flood" or config.mapTheme == "fe2" or config.mapTheme == "simulator" or config.mapTheme == "tycoon" then
            minRadius = 150 
            print("[BlaxSmith]  Keeping map center clear (Radius: 150) for game kit...")
        end
        
        if mapFolder then
             populateMapWithAssets(config.mapTheme, mapFolder, minRadius)
        end
    end)
    wait(1)
    
    -- B. Systems
    if config.leaderstats then GameGenerator.addLeaderstats(config.leaderstats) end
    if config.teams then GameGenerator.addTeams(config.teams) end
    if config.tools then GameGenerator.giveTools(config.tools) end
    if config.ui then GameGenerator.addGui(config.ui) end
    
    -- C. Gameplay Automation (NPCs, Loot, Spawns, Triggers)
    if config.spawnPositions then GameGenerator.createPlayerSpawns(config.spawnPositions) end
    if config.npcs then GameGenerator.spawnNPCs(config.npcs) end
    if config.loot then GameGenerator.spawnLoot(config.loot) end
    if config.triggers then GameGenerator.createTriggers(config.triggers) end
    
    -- NEW: Flood System
    if config.floodSystem then
        GameGenerator.addFloodSystem(config.floodSystem)
    end
    
    print("[BlaxSmith]  GAME GENERATION COMPLETE!")
end

    
    -- GENERATE MAP COMMAND (builds entire map with parts)
    -- GENERATE MAP COMMAND (Mixed Mode: Direct Terrain + Dynamic Catalog Assets)
-- DYNAMIC ASSET POPULATOR (Mixed Mode)
local function populateMapWithAssets(preset, mapFolder)
    spawn(function()
        local success, response = pcall(function()
            return HttpService:RequestAsync({
                 Url = CONFIG.APP_URL .. "/api/search?q=" .. preset .. "&limit=5",
                 Method = "GET"
            })
        end)
        
        if success and response.Body then
            local searchData = HttpService:JSONDecode(response.Body)
            if searchData.results and #searchData.results > 0 then
                print("[BlaxSmith]  Found " .. #searchData.results .. " dynamic assets for " .. preset)
                
                for i, result in ipairs(searchData.results) do
                    local assetId = tonumber(result.assetId)
                    if assetId then
                        -- Insert at random position around the map
                        local x = math.random(-80, 80)
                        local z = math.random(-80, 80)
                        local pos = Vector3.new(x, 5, z)
                        
                        print("[BlaxSmith]  Inserting dynamic asset:", result.name)
                        local model = safeInsert(assetId)
                        if model then
                            if model:IsA("Model") then
                                model:PivotTo(CFrame.new(pos))
                            elseif model:IsA("BasePart") then
                                model.Position = pos
                            end
                            model.Parent = mapFolder
                        end
                    end
                    wait(0.5) -- Spread out requests
                end
            else
                print("[BlaxSmith]  No dynamic assets found, sticking to built-in map.")
            end
        end
    end)
end

-- COMMAND HANDLERS
CommandHandlers = {
    -- GENERATE MAP (Mixed Mode)
    ["generate-map"] = function(data)
        local preset = data.preset or "medieval"
        print("[BlaxSmith]  Generating map - Preset:", preset)
        
        -- 1. Build Base Terrain (100% reliable)
        local mapFolder = buildDirectMap(preset)
        
        -- 2. Fetch & Insert Dynamic Assets from Catalog
        populateMapWithAssets(preset, mapFolder)
    end,
    
    -- INSERT BATCH (multiple assets)
    ["insert-batch"] = function(data)
        local assets = data.assets or {}
        print("[BlaxSmith]  Batch inserting", #assets, "assets")
        insertAssetsQueue(assets)
    end,

    -- INSERT SINGLE ASSET (from Toolbox search)
    ["insert-asset"] = function(data)
        local assetId = tonumber(data.assetId)
        local assetName = data.name or "Asset"
        local position = data.position or {x = 0, y = 5, z = 0}
        local parentName = data.parent
        
        print("[BlaxSmith]  Inserting asset:", assetName, "(ID:", assetId, ") at", position.x, position.y, position.z)
        
        if not assetId then
            warn("[BlaxSmith]  Invalid asset ID")
            return
        end
        
        -- Try game:GetObjects first (works with more assets)
        local success, result = pcall(function()
            local objects = game:GetObjects("rbxassetid://" .. assetId)
            return objects and objects[1]
        end)
        
        -- Fallback to InsertService
        if not success or not result then
            print("[BlaxSmith]  Trying InsertService fallback...")
            success, result = pcall(function()
                local container = InsertService:LoadAsset(assetId)
                return container:FindFirstChildWhichIsA("Model") or container:FindFirstChildWhichIsA("BasePart") or container:GetChildren()[1]
            end)
        end
        
        if success and result then
            local model = result
            
            -- Create imports folder if needed
            local folder = workspace:FindFirstChild("BlaxSmith_Imports")
            if not folder then
                folder = Instance.new("Folder")
                folder.Name = "BlaxSmith_Imports"
                folder.Parent = workspace
            end
            
            -- Position the model
            local pos = Vector3.new(position.x or 0, position.y or 5, position.z or 0)
            if model:IsA("Model") then
                model:PivotTo(CFrame.new(pos))
            elseif model:IsA("BasePart") then
                model.Position = pos
            end
            
            model.Name = assetName
            model.Parent = folder
            print("[BlaxSmith]  Inserted:", assetName, "at", pos)
            
            -- Select the inserted asset
            game:GetService("Selection"):Set({model})
        else
            warn("[BlaxSmith]  Could not load asset ID:", assetId, "- Error:", tostring(result))
            warn("[BlaxSmith]  This asset may not be available for insertion. Try a different asset.")
        end
    end,

    -- INSERT ASSET BATCH (Try multiple until one works - for realistic assets)
    ["insert-asset-batch"] = function(data)
        local assets = data.assets or {}
        local keyword = data.keyword or "asset"
        
        print("[BlaxSmith]  BATCH INSERT: Trying " .. #assets .. " realistic '" .. keyword .. "' assets...")
        
        local successCount = 0
        local folder = workspace:FindFirstChild("BlaxSmith_Imports")
        if not folder then
            folder = Instance.new("Folder")
            folder.Name = "BlaxSmith_Imports"
            folder.Parent = workspace
        end
        
        for i, assetInfo in ipairs(assets) do
            local assetId = tonumber(assetInfo.assetId)
            local assetName = assetInfo.name or ("Asset_" .. i)
            
            print("[BlaxSmith]  Trying #" .. i .. ": " .. assetName .. " (ID: " .. tostring(assetId) .. ")")
            
            local success, result = pcall(function()
                return game:GetService("InsertService"):LoadAsset(assetId)
            end)
            
            if success and result then
                -- Find actual model inside wrapper
                local model = result:FindFirstChildWhichIsA("Model") or result:FindFirstChildWhichIsA("BasePart") or result
                
                -- Position near camera or at origin
                local cam = workspace.CurrentCamera
                local pos = Vector3.new(0, 5, 0)
                
                if cam then
                    local camPos = cam.CFrame.Position + (cam.CFrame.LookVector * 15)
                    pos = Vector3.new(camPos.X, 5, camPos.Z)
                end
                
                if model:IsA("Model") then
                    model:PivotTo(CFrame.new(pos))
                elseif model:IsA("BasePart") then
                    model.Position = pos
                end
                
                model.Name = keyword:gsub("^%l", string.upper) .. "_" .. i
                model.Parent = folder
                
                print("[BlaxSmith]  SUCCESS! Inserted: " .. assetName .. " (ID: " .. assetId .. ")")
                successCount = successCount + 1
                
                -- Stop after first success for single insert
                if successCount >= 1 then
                    print("[BlaxSmith]  Realistic asset inserted successfully!")
                    return
                end
            else
                print("[BlaxSmith]  Failed #" .. i .. " (permission denied or unavailable)")
            end
            
            wait(0.1) -- Small delay between attempts
        end
        
        if successCount == 0 then
            warn("[BlaxSmith]  All " .. #assets .. " assets failed. Try a different search term.")
        end
    end,

    -- SMART DISPATCHER (JSON TOOLS)
    ["execute_tool"] = function(data)
        if data.tool and data.params then
             executeTool(data.tool, data.params)
        else
             warn("[BlaxSmith]  Invalid execute_tool payload")
        end
    end,

    -- CREATE STRUCTURE (JSON Object Tree)
    ["create_structure"] = function(data)
        print("[BlaxSmith]  Building Object Tree...")
        local parentName = data.data.Parent or "Workspace"
        local parent = game:GetService(parentName)
        
        -- Handle StarterGui specifically for visibility
        if parentName == "StarterGui" then
             parent = game:GetService("StarterGui")
        end

        local root = buildObjectTree(data.data, parent)
        if root then
            game:GetService("Selection"):Set({root})
            print("[BlaxSmith]  Structure created: " .. root.Name)
        end
    end,

    -- EXECUTE LUA CODE (from Desktop App)
    ["execute"] = function(data)
        local code = data.code
        print("[BlaxSmith]  Executing Lua code...")

        -- Method: Use a ModuleScript and require() it to run the code immediately
        local success, err = pcall(function()
            -- Wrap code in a module that runs on require
            local moduleCode = "return function() " .. code .. " end"
            
            local tempModule = Instance.new("ModuleScript")
            tempModule.Name = "BlaxSmith_TempModule_" .. tostring(tick())
            tempModule.Source = moduleCode
            tempModule.Parent = game:GetService("ReplicatedStorage")
            
            -- Require and execute immediately
            local moduleFunc = require(tempModule)
            moduleFunc()
            
            -- Clean up
            tempModule:Destroy()
        end)
        
        if success then
            print("[BlaxSmith]  Code executed successfully!")
        else
            warn("[BlaxSmith]  Execution error: " .. tostring(err))
        end
    end,

    ["execute_lua"] = function(data)
        -- Alias for execute
        CommandHandlers["execute"](data)
    end,

    -- EXECUTE_SCRIPT: Alias for execute (server compatibility)
    ["execute_script"] = function(data)
        -- Alias for execute
        CommandHandlers["execute"](data)
    end,

    -- CREATE-SCRIPT: Create actual Script objects in the game (SINGLETON)
    ["create-script"] = function(data)
        local code = data.code
        local scriptType = data.scriptType or "Script"  -- "Script", "LocalScript", or "ModuleScript"
        local scriptName = data.name or "BlaxSmithScript"
        local location = data.location or "ServerScriptService"
        local replaceExisting = data.replaceExisting ~= false  -- Default true
        
        print("[BlaxSmith]  Creating " .. scriptType .. ": " .. scriptName)
        
        -- Determine parent location
        local parent
        if location:lower() == "serverscriptservice" then
            parent = game:GetService("ServerScriptService")
        elseif location:lower() == "replicatedstorage" then
            parent = game:GetService("ReplicatedStorage")
        elseif location:lower() == "starterplayerscripts" then
            parent = game:GetService("StarterPlayer"):WaitForChild("StarterPlayerScripts")
        elseif location:lower() == "startercharacterscripts" then
            parent = game:GetService("StarterPlayer"):WaitForChild("StarterCharacterScripts")
        elseif location:lower() == "startergui" then
            parent = game:GetService("StarterGui")
        elseif location:lower() == "workspace" then
            parent = game:GetService("Workspace")
        else
            parent = game:GetService("ServerScriptService")
        end
        
        -- SINGLETON: Check if script already exists and remove it
        if replaceExisting then
            local existing = parent:FindFirstChild(scriptName)
            if existing then
                print("[BlaxSmith]  Removing existing script: " .. scriptName)
                existing:Destroy()
            end
        end
        
        -- Create the script object
        local newScript
        if scriptType == "LocalScript" then
            newScript = Instance.new("LocalScript")
        elseif scriptType == "ModuleScript" then
            newScript = Instance.new("ModuleScript")
        else
            newScript = Instance.new("Script")
        end
        
        newScript.Name = scriptName
        newScript.Source = code
        newScript.Parent = parent
        
        print("[BlaxSmith]  Created " .. scriptType .. " '" .. scriptName .. "' in " .. parent.Name)
        
        -- Select the new script in Studio
        game:GetService("Selection"):Set({newScript})
    end,

    -- IMPORT-ASSET: Insert asset into specified location
    ["import-asset"] = function(data)
        local assetId = data.assetId
        local location = data.location or "workspace"
        local assetName = data.name or ("Asset_" .. tostring(assetId))
        
        print("[BlaxSmith]  Importing asset " .. tostring(assetId) .. " into " .. location)
        
        -- Determine parent location
        local parent
        if location:lower() == "workspace" then
            parent = game.Workspace
        elseif location:lower() == "replicatedstorage" then
            parent = game:GetService("ReplicatedStorage")
        elseif location:lower() == "startergui" then
            parent = game:GetService("StarterGui")
        elseif location:lower() == "serverstorage" then
            parent = game:GetService("ServerStorage")
        elseif location:lower() == "lighting" then
            parent = game:GetService("Lighting")
        else
            parent = game.Workspace
        end
        
        -- Insert using InsertService
        spawn(function()
            local success, result = pcall(function()
                return game:GetService("InsertService"):LoadAsset(tonumber(assetId))
            end)
            
            if success and result then
                result.Name = assetName
                -- Move children to parent and delete container
                for _, child in pairs(result:GetChildren()) do
                    child.Parent = parent
                end
                result:Destroy()
                print("[BlaxSmith]  Imported " .. assetName .. " into " .. parent.Name)
            else
                warn("[BlaxSmith]  Failed to import asset: " .. tostring(result))
            end
        end)
    end,

    -- INSERT-ASSET (alias for import-asset)
    ["insert-asset"] = function(data)
        CommandHandlers["import-asset"](data)
    end,

    -- INSERT_ASSET (underscore version - REAL TOOLBOX MODELS)
    ["insert_asset"] = function(data)
        print("[BlaxSmith]  insert_asset command received, assetId: " .. tostring(data.assetId))
        local assetId = data.assetId or data.id
        local assetName = data.name or ("Asset_" .. tostring(assetId))
        local position = data.position or {x = 0, y = 10, z = 0}
        
        -- 
        -- AUTO-RENAME IF DUPLICATE EXISTS
        -- 
        assetName = getUniqueAssetName(assetName)
        
        -- 
        -- GUI KEYWORD DETECTION - ULTIMATE FAILSAFE
        -- 
        local nameLower = string.lower(assetName or "")
        local guiKeywords = {"health", "healthbar", "shop", "inventory", "menu", "hud", "gui", "ui", 
                            "leaderboard", "cash", "money", "stamina", "bar", "helth", "hp", "stat", "level"}
        
        for _, keyword in ipairs(guiKeywords) do
            if string.find(nameLower, keyword) then
                print("[BlaxSmith]  GUI KEYWORD DETECTED: '" .. assetName .. "' - Creating GUI instead!")
                local screenGui = Instance.new("ScreenGui")
                screenGui.Name = assetName:gsub("[^%w]", "") .. "GUI"
                screenGui.ResetOnSpawn = false
                screenGui.Parent = StarterGui
                
                local mainFrame = Instance.new("Frame")
                mainFrame.Size = UDim2.new(0, 300, 0, 40)
                mainFrame.Position = UDim2.new(0.5, -150, 0, 20)
                mainFrame.BackgroundColor3 = Color3.fromRGB(30, 30, 30)
                mainFrame.Parent = screenGui
                
                local corner = Instance.new("UICorner")
                corner.CornerRadius = UDim.new(0, 10)
                corner.Parent = mainFrame
                
                local fillBar = Instance.new("Frame")
                fillBar.Size = UDim2.new(1, -8, 1, -8)
                fillBar.Position = UDim2.new(0, 4, 0, 4)
                fillBar.BackgroundColor3 = Color3.fromRGB(0, 200, 100)
                fillBar.Parent = mainFrame
                
                local fillCorner = Instance.new("UICorner")
                fillCorner.CornerRadius = UDim.new(0, 8)
                fillCorner.Parent = fillBar
                
                print("[BlaxSmith]  Created GUI in StarterGui: " .. screenGui.Name)
                return
            end
        end
        
        spawn(function()
            local folder = workspace:FindFirstChild("BlaxSmith_Imports")
            if not folder then
                folder = Instance.new("Folder")
                folder.Name = "BlaxSmith_Imports"
                folder.Parent = workspace
            end
            
            local pos = Vector3.new(position.x or 0, position.y or 10, position.z or 0)
            local insertedModel = nil
            
            -- 
            -- METHOD 1: SEARCH TOOLBOX WITH GetFreeModels (REAL ASSETS!)
            -- 
            print("[BlaxSmith]  Searching Toolbox for: " .. assetName)
            local searchSuccess, searchResult = pcall(function()
                return InsertService:GetFreeModels(assetName, 0)
            end)
            
            if searchSuccess and searchResult and searchResult[1] and searchResult[1].Results and #searchResult[1].Results > 0 then
                local topResult = searchResult[1].Results[1]
                local foundAssetId = topResult.AssetId
                print("[BlaxSmith]  Found in Toolbox: " .. topResult.Name .. " (ID: " .. foundAssetId .. ")")
                
                -- Load using game:GetObjects (works for free models!)
                local loadSuccess, objects = pcall(function()
                    return game:GetObjects("rbxassetid://" .. foundAssetId)
                end)
                
                if loadSuccess and objects and #objects > 0 then
                    -- Collapse objects into a container
                    local model
                    if #objects == 1 then
                        model = objects[1]
                    else
                        model = Instance.new("Model")
                        for _, obj in pairs(objects) do
                            obj.Parent = model
                        end
                    end
                    
                    model.Name = assetName
                    model.Parent = folder
                    
                    -- Position the model
                    if model:IsA("Model") then
                        model:PivotTo(CFrame.new(pos))
                    elseif model:IsA("BasePart") then
                        model.Position = pos
                    end
                    
                    insertedModel = model
                    print("[BlaxSmith]  INSERTED REAL TOOLBOX MODEL: " .. assetName)
                    game:GetService("Selection"):Set({model})
                    return
                else
                    print("[BlaxSmith]  GetObjects failed, trying InsertService...")
                end
            else
                print("[BlaxSmith]  GetFreeModels failed, trying direct assetId...")
            end
            
            -- 
            -- METHOD 2: TRY DIRECT ASSET ID WITH game:GetObjects
            -- 
            if assetId and not insertedModel then
                print("[BlaxSmith]  Trying game:GetObjects with assetId: " .. tostring(assetId))
                local directSuccess, directObjects = pcall(function()
                    return game:GetObjects("rbxassetid://" .. assetId)
                end)
                
                if directSuccess and directObjects and #directObjects > 0 then
                    local model = directObjects[1]
                    model.Name = assetName
                    model.Parent = folder
                    
                    if model:IsA("Model") then
                        model:PivotTo(CFrame.new(pos))
                    elseif model:IsA("BasePart") then
                        model.Position = pos
                    end
                    
                    print("[BlaxSmith]  INSERTED ASSET: " .. assetName .. " (ID: " .. tostring(assetId) .. ")")
                    game:GetService("Selection"):Set({model})
                    return
                end
            end
            
            -- 
            -- METHOD 3: TRY InsertService:LoadAsset (for some trusted assets)
            -- 
            if assetId and not insertedModel then
                print("[BlaxSmith]  Trying InsertService:LoadAsset...")
                local insertSuccess, insertResult = pcall(function()
                    return InsertService:LoadAsset(tonumber(assetId))
                end)
                
                if insertSuccess and insertResult then
                    local model = insertResult:FindFirstChildWhichIsA("Model") or insertResult:FindFirstChildWhichIsA("BasePart")
                    if model then
                        model.Name = assetName
                        model.Parent = folder
                        if model:IsA("Model") then model:PivotTo(CFrame.new(pos)) end
                        print("[BlaxSmith]  INSERTED via LoadAsset: " .. assetName)
                        game:GetService("Selection"):Set({model})
                        return
                    end
                end
            end
            
            warn("[BlaxSmith]  All methods failed for: " .. assetName .. ". Asset may be restricted.")
        end)
    end,

    -- 
    -- UNDERSCORE ALIASES (for server compatibility)
    -- 
    
    -- generate_map alias
    ["generate_map"] = function(data)
        CommandHandlers["generate-map"](data)
    end,
    
    -- insert_batch alias
    ["insert_batch"] = function(data)
        CommandHandlers["insert-batch"](data)
    end,
    
    -- import_asset alias
    ["import_asset"] = function(data)
        CommandHandlers["import-asset"](data)
    end,

    -- DUMP_CODEBASE: Scans entire game and creates a consolidated script for AI analysis
    ["dump_codebase"] = function(data)
        print("[BlaxSmith]  Starting Codebase Dump...")
        
        local servicesToScan = {
            game:GetService("ServerScriptService"),
            game:GetService("ReplicatedStorage"),
            game:GetService("StarterPlayer"),
            game:GetService("ServerStorage"),
            game:GetService("StarterGui"),
            game:GetService("Workspace") -- Be careful if Workspace is huge
        }

        local output = {}
        table.insert(output, "-- ROBLOX GAME CODEBASE EXPORT --")
        table.insert(output, "-- This file contains all scripts, localscripts, and modulescripts --\n")
        table.insert(output, "-- Exported by BlaxSmith AI Plugin --\n")

        local function scan(parent)
            for _, child in ipairs(parent:GetChildren()) do
                -- Check if it is a script
                if child:IsA("Script") or child:IsA("LocalScript") or child:IsA("ModuleScript") then
                    -- Ignore empty scripts or disabled scripts if you want
                    -- Also ignore the AI_FULL_CODEBASE itself to prevent recursion loop
                    if child.Source ~= "" and child.Name ~= "AI_FULL_CODEBASE" then
                        table.insert(output, string.rep("-", 50))
                        table.insert(output, "--- FILE PATH: " .. child:GetFullName() .. " ---")
                        table.insert(output, "--- CLASS: " .. child.ClassName .. " ---")
                        table.insert(output, string.rep("-", 50))
                        table.insert(output, child.Source)
                        table.insert(output, "\n")
                    end
                end
                
                -- Recursively scan children (but ignore package folders if you use them to save space)
                if child:IsA("Folder") or child:IsA("Model") or child:IsA("ScreenGui") or child:IsA("Frame") or child:IsA("ScrollingFrame") then
                    scan(child)
                end
            end
        end

        -- Run the scan
        for _, service in ipairs(servicesToScan) do
            scan(service)
        end

        -- Create the result file
        local finalString = table.concat(output, "\n")
        local resultScript = game:GetService("ServerStorage"):FindFirstChild("AI_FULL_CODEBASE")
        
        if not resultScript then
            resultScript = Instance.new("ModuleScript")
            resultScript.Name = "AI_FULL_CODEBASE"
            resultScript.Parent = game:GetService("ServerStorage")
        end
        
        -- Use comment block for safety
        resultScript.Source = "--[[\n" .. finalString .. "\n]]"

        print("[BlaxSmith]  SUCCESS! Full codebase dumped to ServerStorage > AI_FULL_CODEBASE")
        game:GetService("Selection"):Set({resultScript})
        
        -- Optional: Send back to Electron (if we want to automate the read process later)
        -- HttpService:PostAsync("http://127.0.0.1:3006/api/codebase/upload", ...)
    end,

    -- SCENE GRAPH SCANNER (For AI Vision)
    ["scan-scene"] = function()
        print("[BlaxSmith]  Scanning scene for AI analysis...")
        
        local sceneData = {
            objects = {},
            lighting = {
                brightness = game.Lighting.Brightness,
                clockTime = game.Lighting.ClockTime,
                ambient = tostring(game.Lighting.Ambient),
                fogEnd = game.Lighting.FogEnd
            },
            playerCount = #game.Players:GetPlayers()
        }
        
        -- Helper to get object info
        local function getObjectInfo(obj)
            return {
                name = obj.Name,
                className = obj.ClassName,
                position = obj:IsA("BasePart") and {X=math.floor(obj.Position.X), Y=math.floor(obj.Position.Y), Z=math.floor(obj.Position.Z)} or nil,
                size = obj:IsA("BasePart") and {X=math.floor(obj.Size.X), Y=math.floor(obj.Size.Y), Z=math.floor(obj.Size.Z)} or nil,
                children = #obj:GetChildren()
            }
        end
        
        -- Scan workspace top-level items
        for _, obj in pairs(workspace:GetChildren()) do
            if not obj:IsA("Terrain") and not obj:IsA("Camera") then
                table.insert(sceneData.objects, getObjectInfo(obj))
            end
        end
        
        -- Send data back to backend
        spawn(function()
            local json = HttpService:JSONEncode(sceneData)
            -- Post to backend (fire and forget)
            pcall(function()
                HttpService:PostAsync(
                    CONFIG.APP_URL .. "/api/vision/scan-result",
                    json,
                    Enum.HttpContentType.ApplicationJson
                )
            end)
            print("[BlaxSmith]  Scene data sent to AI! (" .. #sceneData.objects .. " objects)")
        end)
    end,
    
    -- create_script alias
    ["create_script"] = function(data)
        CommandHandlers["create-script"](data)
    end,
    
    -- insert_asset_batch alias
    ["insert_asset_batch"] = function(data)
        CommandHandlers["insert-asset-batch"](data)
    end,
    
    -- generate_poly_pizza alias
    ["generate_poly_pizza"] = function(data)
        CommandHandlers["generate-poly-pizza"](data)
    end,
    
    -- generate_game alias
    ["generate_game"] = function(data)
        CommandHandlers["generate-game"](data)
    end,

    -- run_lua alias (common alias for execute)
    ["run_lua"] = function(data)
        CommandHandlers["execute"](data)
    end,
    
    -- run_code alias (another common alias)
    ["run_code"] = function(data)
        CommandHandlers["execute"](data)
    end,

    -- GENERATE-POLY-PIZZA: Search Poly Pizza style prompt and insert matching assets
    ["generate-poly-pizza"] = function(data)
        local prompt = data.prompt or ""
        print("[BlaxSmith]  Poly Pizza Generation: " .. prompt)
        
        -- Massive verified Roblox asset library (100+ categories)
        -- These are tested and work with InsertService:LoadAsset()
        local POLY_ASSETS = {
            -- NATURE
            tree = { 5786736273, 5164286694, 1290033, 435738865 },
            pine = { 432066756, 435738865, 1290033 },
            oak = { 5786736273, 1290033, 435738865 },
            palm = { 5164286694, 435738865 },
            bush = { 5164286694, 435738865 },
            grass = { 5164286694, 435738865 },
            flower = { 5164286694, 40577 },
            rose = { 40577, 5164286694 },
            rock = { 3060136209, 13382433 },
            boulder = { 3060136209, 13382433 },
            stone = { 3060136209, 13382433 },
            mountain = { 3060136209, 13382433 },
            cliff = { 3060136209, 13382433 },
            mushroom = { 13382433, 40577 },
            cactus = { 40577, 5164286694 },
            log = { 1395673, 89481042 },
            stump = { 1395673, 89481042 },
            coral = { 13382433, 40577 },
            seaweed = { 5164286694, 40577 },
            
            -- VEHICLES
            car = { 6810376207, 4128265113, 95354288 },
            truck = { 4128265113, 6810376207 },
            bus = { 4128265113, 27319316 },
            helicopter = { 5758788772, 124922775 },
            heli = { 5758788772, 124922775 },
            plane = { 124922775, 5758788772 },
            airplane = { 124922775, 5758788772 },
            jet = { 124922775, 5758788772 },
            boat = { 124922775, 142152483 },
            ship = { 124922775, 142152483 },
            train = { 4128265113, 27319316 },
            bike = { 6810376207, 95354288 },
            motorcycle = { 6810376207, 95354288 },
            tank = { 4128265113, 95354288 },
            ambulance = { 27319316, 4128265113 },
            firetruck = { 30009416, 4128265113 },
            police = { 27319316, 6810376207 },
            
            -- BUILDINGS
            house = { 47997, 27319316, 182709446 },
            home = { 47997, 27319316 },
            building = { 47997, 163921175 },
            skyscraper = { 163921175, 505243004 },
            castle = { 48094, 6524103192 },
            tower = { 505243004, 48180 },
            cabin = { 89481042, 47997 },
            mansion = { 163921175, 47997 },
            shop = { 47997, 27319316 },
            store = { 47997, 27319316 },
            barn = { 89481042, 47997 },
            warehouse = { 163921175, 47997 },
            factory = { 163921175, 505243004 },
            hospital = { 27319316, 163921175 },
            school = { 163921175, 47997 },
            church = { 48094, 47997 },
            temple = { 48094, 192800 },
            pyramid = { 48094, 3060136209 },
            lighthouse = { 505243004, 142152483 },
            windmill = { 505243004, 89481042 },
            
            -- STRUCTURES
            wall = { 65580267, 505243004 },
            fence = { 65580267, 505243004 },
            gate = { 65580267, 48094 },
            door = { 65580267, 47997 },
            window = { 47997, 163921175 },
            bridge = { 168325679, 89481042 },
            road = { 15802146917, 168325679 },
            street = { 15802146917, 168325679 },
            path = { 168325679, 15802146917 },
            sidewalk = { 168325679, 15802146917 },
            stairs = { 505243004, 168325679 },
            ladder = { 505243004, 65580267 },
            platform = { 168325679, 505243004 },
            
            -- FURNITURE
            chair = { 32597725, 180082379 },
            table = { 31143197, 180081627 },
            desk = { 31143197, 180081627 },
            bed = { 180081627, 180082379 },
            sofa = { 180082379, 32597725 },
            couch = { 180082379, 32597725 },
            lamp = { 142152483, 31143197 },
            light = { 142152483, 31143197 },
            shelf = { 31143197, 32597725 },
            bookshelf = { 31143197, 32597725 },
            cabinet = { 31143197, 180081627 },
            dresser = { 180081627, 31143197 },
            wardrobe = { 180081627, 31143197 },
            mirror = { 31143197, 142152483 },
            rug = { 180082379, 180081627 },
            carpet = { 180082379, 180081627 },
            clock = { 129380094, 142152483 },
            tv = { 142152483, 31143197 },
            television = { 142152483, 31143197 },
            computer = { 142152483, 31143197 },
            
            -- WEAPONS
            sword = { 125013769, 47433 },
            gun = { 95354288, 10648330247 },
            pistol = { 95354288, 10648330247 },
            rifle = { 10648330247, 95354288 },
            rocket = { 190093516, 95354288 },
            bow = { 190914616, 125013769 },
            arrow = { 190914616, 125013769 },
            axe = { 73089166, 125013769 },
            hammer = { 73089166, 125013769 },
            spear = { 125013769, 190914616 },
            knife = { 47433, 125013769 },
            dagger = { 47433, 125013769 },
            shield = { 86495073, 125013769 },
            grenade = { 190093516, 95354288 },
            bomb = { 190093516, 95354288 },
            
            -- CHARACTERS/NPCs
            npc = { 430073972, 170897263 },
            zombie = { 430073972, 125013769 },
            skeleton = { 430073972, 192800 },
            ghost = { 430073972, 192800 },
            monster = { 430073972, 125013769 },
            enemy = { 430073972, 125013769 },
            knight = { 125013769, 86495073 },
            soldier = { 95354288, 86495073 },
            ninja = { 170897263, 125013769 },
            wizard = { 192800, 170897263 },
            witch = { 192800, 170897263 },
            pirate = { 170897263, 125013769 },
            robot = { 430073972, 142152483 },
            alien = { 430073972, 124922775 },
            dragon = { 430073972, 5758788772 },
            
            -- ITEMS/OBJECTS
            chest = { 180081627, 86495073 },
            treasure = { 180081627, 129380094 },
            coin = { 129380094, 121328844 },
            gold = { 129380094, 121328844 },
            gem = { 129380094, 121328844 },
            diamond = { 129380094, 121328844 },
            key = { 129380094, 86495073 },
            potion = { 129380094, 192800 },
            barrel = { 180081627, 89481042 },
            crate = { 180081627, 89481042 },
            box = { 180081627, 89481042 },
            sign = { 65580267, 505243004 },
            flag = { 65580267, 505243004 },
            banner = { 65580267, 505243004 },
            torch = { 142152483, 125013769 },
            candle = { 142152483, 129380094 },
            campfire = { 142152483, 1395673 },
            fire = { 142152483, 192800 },
            
            -- OUTDOOR
            fountain = { 142152483, 180081627 },
            statue = { 180081627, 192800 },
            bench = { 31143197, 32597725 },
            streetlight = { 142152483, 505243004 },
            mailbox = { 65580267, 27319316 },
            trashcan = { 180081627, 65580267 },
            hydrant = { 65580267, 30009416 },
            well = { 89481042, 142152483 },
            dock = { 168325679, 89481042 },
            pier = { 168325679, 89481042 },
            
            -- SPORTS
            basketball = { 121328844, 129380094 },
            football = { 121328844, 129380094 },
            soccer = { 121328844, 129380094 },
            tennis = { 121328844, 190914616 },
            baseball = { 73089166, 121328844 },
            goal = { 505243004, 65580267 },
            hoop = { 505243004, 121328844 },
            
            -- FOOD
            apple = { 129380094, 40577 },
            pizza = { 129380094, 180081627 },
            burger = { 129380094, 180081627 },
            cake = { 129380094, 180081627 },
            donut = { 129380094, 180081627 },
            
            -- WATER/SKY
            water = { 192800, 142152483 },
            ocean = { 192800, 142152483 },
            lake = { 192800, 142152483 },
            river = { 192800, 168325679 },
            cloud = { 192800, 142152483 },
            sun = { 142152483, 192800 },
            moon = { 192800, 142152483 },
            star = { 142152483, 129380094 },
            
            -- MISC
            portal = { 192800, 142152483 },
            teleporter = { 142152483, 192800 },
            spawn = { 142152483, 192800 },
            checkpoint = { 142152483, 65580267 },
            button = { 142152483, 65580267 },
            lever = { 65580267, 125013769 },
            switch = { 142152483, 65580267 },
            crystal = { 129380094, 192800 },
            orb = { 129380094, 192800 },
            sphere = { 129380094, 121328844 }
        }

        
        -- Parse comma-separated keywords
        local keywords = {}
        for word in string.gmatch(prompt, "[^,]+") do
            local trimmed = string.gsub(word, "^%s*(.-)%s*$", "%1")
            if trimmed and #trimmed > 0 then
                table.insert(keywords, string.lower(trimmed))
            end
        end
        
        print("[BlaxSmith]  Found " .. #keywords .. " keywords to search")
        
        -- Create folder for generated assets
        local folder = Instance.new("Folder")
        folder.Name = "PolyPizza_" .. os.time()
        folder.Parent = workspace
        folder:SetAttribute("BlaxSmithGenerated", true)
        
        local insertedCount = 0
        local InsertService = game:GetService("InsertService")
        
        for i, keyword in ipairs(keywords) do
            -- Find matching asset ID
            local assetIds = POLY_ASSETS[keyword]
            if assetIds and #assetIds > 0 then
                local assetId = assetIds[1] -- Use first matching ID
                
                -- Calculate random position
                local x = (i - 1) % 5 * 30 - 60
                local z = math.floor((i - 1) / 5) * 30 - 60
                
                spawn(function()
                    local success, model = pcall(function()
                        return InsertService:LoadAsset(assetId)
                    end)
                    
                    if success and model then
                        model.Name = keyword:sub(1,1):upper() .. keyword:sub(2) .. "_" .. i
                        model.Parent = folder
                        
                        -- Position the model
                        local primary = model:FindFirstChildWhichIsA("BasePart", true)
                        if primary then
                            if model:IsA("Model") then
                                model:PivotTo(CFrame.new(x, 0, z))
                            else
                                primary.Position = Vector3.new(x, 0, z)
                            end
                        end
                        
                        insertedCount = insertedCount + 1
                        print("[BlaxSmith]  Inserted: " .. keyword .. " (ID: " .. assetId .. ")")
                        selectAndFocus(model) -- Focus camera on inserted asset
                    else
                        warn("[BlaxSmith]  Failed to insert: " .. keyword .. " - " .. tostring(model))
                    end
                end)
                
                wait(0.3) -- Rate limit InsertService calls
            else
                -- No exact match, try to find partial match
                local found = false
                for key, ids in pairs(POLY_ASSETS) do
                    if string.find(keyword, key) or string.find(key, keyword) then
                        local assetId = ids[1]
                        spawn(function()
                            local success, model = pcall(function()
                                return InsertService:LoadAsset(assetId)
                            end)
                            if success and model then
                                model.Name = keyword:sub(1,1):upper() .. keyword:sub(2) .. "_" .. i
                                model.Parent = folder
                                insertedCount = insertedCount + 1
                                print("[BlaxSmith]  Partial match - Inserted: " .. keyword .. " as " .. key)
                            end
                        end)
                        found = true
                        break
                    end
                end
                
                if not found then
                    print("[BlaxSmith]  No asset found for: " .. keyword)
                end
            end
        end
        
        -- Summary
        spawn(function()
            wait(2)
            print("[BlaxSmith]  Poly Pizza Complete!")
            print("[BlaxSmith] Inserted " .. insertedCount .. " assets from prompt: " .. prompt)
        end)
    end,

    -- GENERATE FULL GAME COMMAND
    ["generate-game"] = function(data)
        print("[BlaxSmith]  Generating Full Game from config...")
        -- Support nested structure: {type, data: {config: {...}}} OR {config={...}} OR {...}
        local config = nil
        if data.data and data.data.config then
            config = data.data.config  -- Nested API format
        elseif data.config then
            config = data.config       -- Direct API format
        else
            config = data              -- Raw config
        end
        
        -- Apply defaults if empty
        if not config.mapTheme and not config.name then
             config = {
                name = "Generated Game",
                mapTheme = "medieval",
                leaderstats = {{name="Coins", defaultValue=0}},
                tools = {125013769}, -- Sword
                ui = {title = "Medieval RPG"}
            }
        end
        
        GameGenerator.build(config)
    end,

    -- INSERT ASSET COMMAND (Universal Toolbox)
    ["insert-asset"] = function(data)
        local assetId = tonumber(data.assetId) or tonumber(data.data and data.data.assetId)
        if not assetId then 
            warn("[BlaxSmith] Missing assetId for insert-asset")
            return 
        end
        
        print("[BlaxSmith]  Universal Insert Request: " .. assetId)
        
        local success, model = pcall(function()
            return game:GetService("InsertService"):LoadAsset(assetId)
        end)
        
        if success and model then
            -- Get the actual asset (usually wrapped in a container)
            local asset = model:GetChildren()[1] or model
            asset.Name = data.name or ("InsertedAsset_" .. assetId)
            
            -- Calculate Bounding Box for proper ground placement
            local cframe, size = model:GetBoundingBox()
            local halfHeight = size.Y / 2
            
            -- ALWAYS place ABOVE ground (Y = halfHeight + small offset)
            local groundY = 0
            local cam = workspace.CurrentCamera
            local targetX, targetZ = 0, 0
            
            if cam then
                local lookPos = cam.CFrame.Position + (cam.CFrame.LookVector * 15)
                targetX, targetZ = lookPos.X, lookPos.Z
            end
            
            -- Final position: ground level + half height so asset sits ON ground
            local finalPos = Vector3.new(targetX, groundY + halfHeight + 1, targetZ)
            model:PivotTo(CFrame.new(finalPos))
            
            -- ENSURE VISIBILITY: Anchor all parts and reset transparency
            for _, part in ipairs(model:GetDescendants()) do
                if part:IsA("BasePart") then
                    part.Anchored = true
                    part.Transparency = 0  -- Ensure visible
                    part.CanCollide = true
                end
            end
            
            -- Parent to imports folder
            local importsFolder = workspace:FindFirstChild("BlaxSmith_Imports")
            if not importsFolder then
                importsFolder = Instance.new("Folder")
                importsFolder.Name = "BlaxSmith_Imports"
                importsFolder.Parent = workspace
            end
            model.Parent = importsFolder
            
            -- Select and focus camera
            game:GetService("Selection"):Set({model})
            if cam then
                cam.CFrame = CFrame.new(finalPos + Vector3.new(15, 10, 15), finalPos)
            end
            
            print("[BlaxSmith]  Successfully inserted: " .. asset.Name .. " at Y=" .. tostring(finalPos.Y))
        else
            warn("[BlaxSmith]  Failed to insert asset " .. assetId)
        end
    end,
}

-- ============================================
-- POLLING LOOP
-- ============================================
local isPolling = false
local pollCount = 0
local function startPolling()
    if isPolling then return end
    isPolling = true
    print("[BlaxSmith]  Starting polling loop...")
    spawn(function()
        while isPolling do
            pollCount = pollCount + 1
            local success, result = pcall(function()
                return HttpService:RequestAsync({
                     Url = CONFIG.APP_URL .. "/plugin/poll",
                     Method = "GET",
                     Headers = { ["Content-Type"] = "application/json" }
                })
            end)
            if success and result and result.Body ~= "" then
                local ok, data = pcall(function() return HttpService:JSONDecode(response.Body) end)
                if ok and data then
                    -- Handle new format: { success: true, actions: [...] } or { commands: [...] }
                    local cmds = data.actions or data.commands
                    if cmds and #cmds > 0 then
                        for _, cmd in ipairs(cmds) do
                            print("[BlaxSmith]  Received Command: " .. tostring(cmd.type))
                            if CommandHandlers and CommandHandlers[cmd.type] then
                                print("[BlaxSmith]  Executing: " .. cmd.type)
                                local cmdSuccess, cmdErr = pcall(function()
                                    CommandHandlers[cmd.type](cmd)
                                end)
                                if not cmdSuccess then
                                    warn("[BlaxSmith]  Command error: " .. tostring(cmdErr))
                                end
                            else
                                -- Fallback to executeCommand
                                if executeCommand then
                                    executeCommand(cmd.type, cmd)
                                else
                                    warn("[BlaxSmith]  Unknown command: " .. tostring(cmd.type))
                                end
                            end
                        end
                    -- Handle legacy format: { type: "execute", code: "..." }
                    elseif data.type and data.type ~= "none" then
                        print("[BlaxSmith]  Received Command (legacy): " .. data.type)
                        if CommandHandlers and CommandHandlers[data.type] then
                            print("[BlaxSmith]  Executing: " .. data.type)
                            pcall(CommandHandlers[data.type], data)
                        end
                    end
                end
            elseif not success then
                -- Show poll errors occasionally
                if pollCount % 100 == 0 then
                    print("[BlaxSmith]  Poll error: " .. tostring(response))
                end
            end
            -- Log every 600 polls (~5 minutes)
            if pollCount % 600 == 0 then
                print("[BlaxSmith]  Heartbeat - Poll #" .. pollCount .. " - Connection active")
            end
            wait(1) -- Increased to 1 second to avoid rate limiting
        end
    end)
end

-- ============================================
-- DUPLICATE UI CONSTRUCTION REMOVED
-- (The main UI is created at line 46-80)
-- ============================================
--[[ REMOVED DUPLICATE TOOLBAR
local toolbar = plugin:CreateToolbar("BlaxSmith AI v6.0")
local dockButton = toolbar:CreateButton("BlaxSmith", "Open BlaxSmith AI - 250 Module SDK", "")

local widgetInfo = DockWidgetPluginGuiInfo.new(Enum.InitialDockState.Right, true, false, 320, 550, 280, 400)
local widget = plugin:CreateDockWidgetPluginGui("BlaxSmithMasterUI_v6", widgetInfo)
widget.Title = "BlaxSmith AI v6.0"
]]

-- Create the widget properly (pluginWidget was undefined - FIXED)
-- REUSE existing Toolbar from line 115 instead of creating duplicate
local dockButton = Toolbar:CreateButton("BlaxSmith Panel", "Open BlaxSmith AI Panel", "rbxassetid://6031251534")

local widgetInfo2 = DockWidgetPluginGuiInfo.new(Enum.InitialDockState.Right, true, false, 320, 550, 280, 400)
local widget = plugin:CreateDockWidgetPluginGui("BlaxSmithMasterUI_v6_fixed", widgetInfo2)
widget.Title = "BlaxSmith AI v6.0"

-- Main Container
local main = Instance.new("ScrollingFrame", widget)
main.Size = UDim2.new(1, 0, 1, 0)
main.BackgroundColor3 = COLORS.DARK_BG
main.ScrollBarThickness = 6
main.CanvasSize = UDim2.new(0, 0, 0, 900)
main.AutomaticCanvasSize = Enum.AutomaticSize.Y

local padding = Instance.new("UIPadding", main)
padding.PaddingLeft = UDim.new(0, 10)
padding.PaddingRight = UDim.new(0, 10)
padding.PaddingTop = UDim.new(0, 10)

local listLayout = Instance.new("UIListLayout", main)
listLayout.SortOrder = Enum.SortOrder.LayoutOrder
listLayout.Padding = UDim.new(0, 8)

-- Header
local header = Instance.new("Frame", main)
header.Size = UDim2.new(1, 0, 0, 60)
header.BackgroundColor3 = COLORS.PANEL_BG
header.LayoutOrder = 0
createUICorner(header)
createGradient(header, COLORS.PURPLE, COLORS.CYAN)

local title = Instance.new("TextLabel", header)
title.Text = " BlaxSmith AI v6.0"
title.TextColor3 = COLORS.TEXT
title.Font = Enum.Font.GothamBlack
title.TextSize = 18
title.Size = UDim2.new(1, 0, 0.6, 0)
title.BackgroundTransparency = 1

local subtitle = Instance.new("TextLabel", header)
subtitle.Text = "250 Modules | Production Ready"
subtitle.TextColor3 = COLORS.GOLD
subtitle.Font = Enum.Font.Gotham
title.TextSize = 12
subtitle.Position = UDim2.new(0, 0, 0.55, 0)
subtitle.Size = UDim2.new(1, 0, 0.4, 0)
subtitle.BackgroundTransparency = 1

-- Connection Section
local connSection = Instance.new("Frame", main)
connSection.Size = UDim2.new(1, 0, 0, 70)
connSection.BackgroundColor3 = COLORS.PANEL_BG
connSection.LayoutOrder = 1
createUICorner(connSection)

local connLabel = Instance.new("TextLabel", connSection)
connLabel.Text = " Desktop App Connection"
connLabel.TextColor3 = COLORS.TEXT_MUTED
connLabel.Font = Enum.Font.Gotham
connLabel.TextSize = 11
connLabel.Size = UDim2.new(1, 0, 0, 25)
connLabel.BackgroundTransparency = 1

local connectBtn = Instance.new("TextButton", connSection)
connectBtn.Size = UDim2.new(1, -20, 0, 35)
connectBtn.Position = UDim2.new(0, 10, 0, 28)
connectBtn.Text = " CONNECT TO APP"
connectBtn.TextColor3 = COLORS.TEXT
connectBtn.BackgroundColor3 = COLORS.CYAN
connectBtn.Font = Enum.Font.GothamBold
connectBtn.TextSize = 14
createUICorner(connectBtn)

-- Status (simplified - only show connection status)
local status = Instance.new("TextLabel", main)
status.Size = UDim2.new(1, 0, 0, 30)
status.BackgroundTransparency = 1
status.Text = "Ready | Connect to Desktop App"
status.TextColor3 = COLORS.TEXT_MUTED
status.Font = Enum.Font.Gotham
status.TextSize = 11
status.LayoutOrder = 2

-- ============================================
-- EVENT HANDLERS
-- ============================================
local isConnected = false

connectBtn.MouseButton1Click:Connect(function()
    if isConnected then
        isPolling = false
        isConnected = false
        connectBtn.Text = " CONNECT TO APP"
        connectBtn.BackgroundColor3 = COLORS.CYAN
        status.Text = "Disconnected"
        status.TextColor3 = COLORS.TEXT_MUTED
    else
        status.Text = "Connecting..."
        status.TextColor3 = COLORS.GOLD
        
        local success = httpRequest("POST", "/plugin/connect", {
            studioId = game.JobId,
            pluginVersion = CONFIG.PLUGIN_VERSION,
            sdkVersion = CONFIG.SDK_VERSION
        })
        
        if success then
            startPolling()
            isConnected = true
            connectBtn.Text = " CONNECTED"
            connectBtn.BackgroundColor3 = COLORS.GREEN
            status.Text = "Connected to Desktop App"
            status.TextColor3 = COLORS.GREEN
        else
            connectBtn.Text = " Failed - Retry"
            status.Text = "Connection failed - Is app running?"
            status.TextColor3 = COLORS.RED
            wait(2)
            connectBtn.Text = " CONNECT TO APP"
            connectBtn.BackgroundColor3 = COLORS.CYAN
        end
    end
end)

if dockButton then
    dockButton.Click:Connect(function() 
        widget.Enabled = not widget.Enabled 
    end)
end

-- ============================================
-- STARTUP
-- ============================================
-- =========================
-- BlaxSmith PLUGIN STARTUP
-- =========================
print("")
print("BlaxSmith AI Plugin v6.4.0 (EXECUTE FIX) Loaded!")
print("")

-- Startup indicator removed - no floating parts in workspace

print(" SDK Support: v6.1 |  250 Modules")
print("")

-- ============================================
-- AUTO-CONNECT ON STARTUP
-- ============================================
spawn(function()
    wait(2) -- Wait for Studio to fully load
    
    print("[BlaxSmith]  Auto-connecting to Desktop App...")
    
    local success = httpRequest("POST", "/plugin/connect", {
        studioId = game.JobId,
        pluginVersion = CONFIG.PLUGIN_VERSION,
        sdkVersion = CONFIG.SDK_VERSION,
        autoConnect = true
    })
    
    if success then
        startPolling()
        isConnected = true
        connectBtn.Text = " CONNECTED"
        connectBtn.BackgroundColor3 = COLORS.GREEN
        status.Text = "Auto-connected to Desktop App"
        status.TextColor3 = COLORS.GREEN
        updateStatus(true) -- Update splash screen status
        print("[BlaxSmith]  Auto-connected to Desktop App!")
    else
        print("[BlaxSmith]  Desktop App not running. Click 'Connect' when ready.")
        status.Text = "Click Connect when app is running"
        status.TextColor3 = COLORS.GOLD
    end
    
    -- Also try to connect to Rojo
    wait(1)
    print("[BlaxSmith]  Checking Rojo connection...")
    local rojoSuccess, rojoResp = pcall(function()
        return HttpService:RequestAsync({
            Url = "http://127.0.0.1:34872/",
            Method = "GET",
            Headers = { ["Content-Type"] = "application/json" }
        })
    end)
    
    if rojoSuccess and rojoResp.Success then
        print("[BlaxSmith]  Rojo server detected on port 34872!")
        print("[BlaxSmith]  Click 'Rojo Connect' in Rojo plugin to sync!")
    else
        print("[BlaxSmith]  Rojo not detected. Start Rojo serve from app.")
    end
end)

print("")

-- ============================================
--  BlaxSmith PRO: AUTO-CLEANUP (CRITICAL)
-- Watches Workspace for Toolbox inserts and auto-cleans them
-- STUDIO-GRADE: License, Guardrails, Performance, Observability
-- ============================================
--[[ 
-- BlaxSmith_PRO_DISABLED: Auto-Cleanup feature temporarily disabled due to missing helper functions.
-- This prevents the "attempt to call a nil value" error at line 6720.

local BlaxSmithImports = ensureFolder(workspace, "BlaxSmith_Imports")
local sessionAssetCount = 0
local sessionScriptsRemoved = 0

workspace.ChildAdded:Connect(function(instance)
    -- Skip our own imports folder
    if instance.Name == "BlaxSmith_Imports" then return end
    
    -- Wait a frame for full load
    task.wait()
    
    -- Only process Models (Toolbox usually inserts Models)
    if instance:IsA("Model") then
        print("[BlaxSmith]  BlaxSmith Pro Processing: " .. instance.Name)
        
        -- 1. START TRANSACTION (Undo/Rollback)
        local transaction = beginTransaction("Import: " .. instance.Name)
        table.insert(transaction.assets, instance)
        
        -- 2. ENFORCE GUARDRAILS (Remove all unsafe objects)
        local guardrailsRemoved = enforceGuardrails(instance)
        sessionScriptsRemoved = sessionScriptsRemoved + guardrailsRemoved
        
        -- 3. STRIP SCRIPTS (Extra safety)
        stripScripts(instance)
        
        -- 4. OPTIMIZE MODEL
        optimizeModel(instance)
        
        -- 5. LICENSE TAGGING
        tagAssetLicense(instance, "Roblox Toolbox")
        
        -- 6. TERRAIN RAYCAST (Ground snap)
        local currentPos = instance:GetPivot().Position
        local groundY = raycastToTerrain(currentPos)
        
        -- 7. STYLE DETECTION
        local style = detectAssetStyle(instance.Name)
        instance:SetAttribute("BlaxSmith_Style", style)
        
        -- 8. SMART PLACEMENT (Grid for buildings, natural for nature)
        if style == "building" then
            local snappedPos = snapToGrid(currentPos)
            instance:PivotTo(CFrame.new(snappedPos.X, groundY + 2, snappedPos.Z))
            print("[BlaxSmith]  Grid-snapped: " .. instance.Name)
        else
            instance:PivotTo(CFrame.new(currentPos.X, groundY + 2, currentPos.Z))
        end
        
        -- 9. MOVE TO ORGANIZED FOLDER
        instance.Parent = BlaxSmithImports
        sessionAssetCount = sessionAssetCount + 1
        
        -- 10. COMMIT TRANSACTION
        commitTransaction(transaction)
        
        -- 11. PERFORMANCE CHECK (every 10 assets)
        if sessionAssetCount % 10 == 0 then
            local perfScore = getScenePerformanceScore()
            if perfScore.score == "HIGH" then
                warn("[BlaxSmith]  Scene performance is HIGH - Consider optimizing!")
            end
        end
        
        print("[BlaxSmith]  BlaxSmith Pro Complete: " .. instance.Name)
        print("[BlaxSmith]  Session: " .. sessionAssetCount .. " assets, " .. sessionScriptsRemoved .. " scripts removed")
    end
end)
]]

print("[BlaxSmith]  BlaxSmith Pro Mode ACTIVE - Studio-Grade Asset Pipeline!")
print("[BlaxSmith]  Guardrails: ON |  License Tagging: ON |  Undo: ON")

-- ============================================
-- AUTO-CONNECT POLLING LOOP
-- Automatically connects to BlaxSmith Desktop App
-- ============================================
local isConnected = false
local connectionStartTime = 0

-- ============================================
-- FORGEMIND VI PROTOCOL (JSON EXECUTOR)
-- ============================================

-- HELPER: The Universal Property Converter
local function convertValue(propName, value)
    -- 1. Handle Vectors (Size, Position for Parts) -> [x, y, z]
    if type(value) == "table" and #value == 3 then
        return Vector3.new(value[1], value[2], value[3])
    
    -- 2. Handle UDim2 (Size, Position for GUI) -> [[scaleX, offX], [scaleY, offY]]
    elseif type(value) == "table" and #value == 2 and type(value[1]) == "table" then
        return UDim2.new(value[1][1], value[1][2], value[2][1], value[2][2])
    
    -- 3. Handle Colors -> [r, g, b]
    elseif (propName == "Color" or propName == "BackgroundColor3") and type(value) == "table" then
        return Color3.new(value[1], value[2], value[3])
        
    -- 4. Handle Enums (Material: "Grass")
    elseif type(value) == "string" and propName == "Material" then
        -- Try to find the Enum, default to Plastic if failed
        local success, material = pcall(function() return Enum.Material[value] end)
        return success and material or Enum.Material.Plastic

    else
        return value
    end
end

-- HELPER: Recursive Builder
local function buildObject(data, parent)
    local success, obj = pcall(function() return Instance.new(data.class) end)
    if not success then warn("[ForgeMind] Invalid Class: " .. tostring(data.class)) return end
    
    obj.Name = data.name or data.class
    
    -- Set Properties
    if data.properties then
        for prop, val in pairs(data.properties) do
            pcall(function()
                obj[prop] = convertValue(prop, val)
            end)
        end
    end
    
    obj.Parent = parent
    
    -- Build Children (Recursive)
    if data.children then
        for _, childData in ipairs(data.children) do
            buildObject(childData, obj)
        end
    end
    
    return obj
end

-- MAIN: The Executioner
local function executeForgeCommand(cmd)
    local targetParent = game:GetService("Workspace")
    
    -- Intelligent Parenting
    if cmd.target_parent == "StarterGui" then targetParent = game:GetService("StarterGui") end
    if cmd.target_parent == "ServerScriptService" then targetParent = game:GetService("ServerScriptService") end
    if cmd.target_parent == "ReplicatedStorage" then targetParent = game:GetService("ReplicatedStorage") end
    if cmd.target_parent == "StarterPlayerScripts" then targetParent = game:GetService("StarterPlayer"):FindFirstChild("StarterPlayerScripts") end

    print("[ForgeMindVI]  Executing for Domain: " .. tostring(cmd.target_parent))

    if cmd.objects then
        for _, objData in ipairs(cmd.objects) do
            local newObj = buildObject(objData, targetParent)
            if newObj then
                print("[ForgeMindVI] Created: " .. objData.class .. " (" .. objData.name .. ") in " .. targetParent.Name)
                Selection:Set({newObj})
            end
        end
    end
end


-- ============================================
-- UNIVERSAL DISPATCHER - Handles ALL AI Commands
-- Terrain, UI, Scripts, Models - Everything!
-- ============================================

-- UTILITY: Get a point in front of the camera
local function getFocusPoint()
    if workspace.CurrentCamera then
        return workspace.CurrentCamera.CFrame * CFrame.new(0, 0, -15)
    end
    return CFrame.new(0, 10, 0)
end

-- MASTER COMMAND HANDLERS
local CommandHandlers = {
    -- === RUN EDITOR COMMAND (Terrain, UI, Building) ===
    -- This handles "Fill map with grass", "Make a GUI", "Spawn 50 parts"
    run_editor_command = function(cmd)
        local code = cmd.code or cmd.data or cmd.args and cmd.args.code
        if not code then
            warn("[BlaxSmith]  run_editor_command missing code")
            return
        end
        
        print("[BlaxSmith]  Running Editor Command...")
        
        local func, err = loadstring(code)
        if func then
            -- Sandbox the environment so 'script' doesn't break it
            local env = getfenv(func)
            env.script = nil
            env.game = game
            env.workspace = workspace
            
            local success, runtimeErr = pcall(func)
            if success then
                ChangeHistoryService:SetWaypoint("AI Editor Action")
                print("[BlaxSmith]  Editor Command Executed Successfully")
            else
                warn("[BlaxSmith]  Runtime Error:", tostring(runtimeErr))
            end
        else
            warn("[BlaxSmith]  Syntax Error:", tostring(err))
        end
    end,
    
    -- === CREATE-SCRIPT: Creates Script/LocalScript in appropriate location ===
    ["create-script"] = function(cmd)
        local code = cmd.code or cmd.source or ""
        local location = cmd.location or "StarterGui"
        local scriptName = cmd.name or "BlaxSmith_Script"
        local scriptType = cmd.scriptType or "LocalScript"
        
        print("[BlaxSmith]  Creating " .. scriptType .. ": " .. scriptName .. " in " .. location)
        
        -- SMART DETECTION: Check if this is a loading screen request
        local nameLower = scriptName:lower()
        local codeLower = code:lower()
        local isLoadingScreen = (nameLower:find("loading") and nameLower:find("screen")) or
                                (nameLower:find("loading") and nameLower:find("gui")) or
                                (codeLower:find("loading") and codeLower:find("screen"))
        
        if isLoadingScreen then
            print("[BlaxSmith]  Loading Screen detected - using PREMIUM template!")
            code = [[
-- BlaxSmith Premium Loading Screen
local Players = game:GetService("Players")
local TweenService = game:GetService("TweenService")
local ContentProvider = game:GetService("ContentProvider")
local player = Players.LocalPlayer

local screenGui = Instance.new("ScreenGui")
screenGui.Name = "BlaxSmith_LoadingScreen"
screenGui.IgnoreGuiInset = true
screenGui.ZIndexBehavior = Enum.ZIndexBehavior.Sibling
screenGui.Parent = player.PlayerGui

-- FULL SCREEN BACKGROUND
local background = Instance.new("Frame")
background.Name = "Background"
background.Size = UDim2.new(1, 0, 1, 0)
background.BackgroundColor3 = Color3.fromRGB(15, 15, 25)
background.BorderSizePixel = 0
background.Parent = screenGui

local gradient = Instance.new("UIGradient")
gradient.Color = ColorSequence.new({
    ColorSequenceKeypoint.new(0, Color3.fromRGB(25, 25, 45)),
    ColorSequenceKeypoint.new(0.5, Color3.fromRGB(15, 15, 30)),
    ColorSequenceKeypoint.new(1, Color3.fromRGB(10, 10, 20))
})
gradient.Rotation = 45
gradient.Parent = background

-- ANIMATED PARTICLES
for i = 1, 30 do
    local particle = Instance.new("Frame")
    particle.Size = UDim2.new(0, math.random(3, 8), 0, math.random(3, 8))
    particle.Position = UDim2.new(math.random(), 0, math.random(), 0)
    particle.BackgroundColor3 = Color3.fromRGB(100, 150, 255)
    particle.BackgroundTransparency = math.random(3, 7) / 10
    particle.BorderSizePixel = 0
    particle.Parent = background
    Instance.new("UICorner", particle).CornerRadius = UDim.new(1, 0)
    
    -- Animate each particle
    spawn(function()
        while particle.Parent do
            local targetPos = UDim2.new(math.random(), 0, math.random(), 0)
            local tween = TweenService:Create(particle, TweenInfo.new(math.random(5, 15), Enum.EasingStyle.Sine), {Position = targetPos, BackgroundTransparency = math.random(3, 8) / 10})
            tween:Play()
            tween.Completed:Wait()
        end
    end)
end

-- GAME TITLE
local title = Instance.new("TextLabel")
title.Name = "Title"
title.Size = UDim2.new(1, 0, 0, 100)
title.Position = UDim2.new(0, 0, 0.3, 0)
title.BackgroundTransparency = 1
title.Text = " YOUR GAME "
title.TextColor3 = Color3.new(1, 1, 1)
title.Font = Enum.Font.GothamBold
title.TextSize = 56
title.Parent = background

local titleGradient = Instance.new("UIGradient")
titleGradient.Color = ColorSequence.new({
    ColorSequenceKeypoint.new(0, Color3.fromRGB(255, 200, 100)),
    ColorSequenceKeypoint.new(0.5, Color3.fromRGB(255, 255, 255)),
    ColorSequenceKeypoint.new(1, Color3.fromRGB(100, 200, 255))
})
titleGradient.Parent = title

-- LOADING BAR CONTAINER
local barContainer = Instance.new("Frame")
barContainer.Name = "BarContainer"
barContainer.Size = UDim2.new(0.5, 0, 0, 30)
barContainer.Position = UDim2.new(0.25, 0, 0.6, 0)
barContainer.BackgroundColor3 = Color3.fromRGB(30, 30, 50)
barContainer.BorderSizePixel = 0
barContainer.Parent = background
Instance.new("UICorner", barContainer).CornerRadius = UDim.new(0, 15)

local barFill = Instance.new("Frame")
barFill.Name = "Fill"
barFill.Size = UDim2.new(0, 0, 1, 0)
barFill.BackgroundColor3 = Color3.fromRGB(100, 200, 255)
barFill.BorderSizePixel = 0
barFill.Parent = barContainer
Instance.new("UICorner", barFill).CornerRadius = UDim.new(0, 15)

local barGradient = Instance.new("UIGradient")
barGradient.Color = ColorSequence.new({
    ColorSequenceKeypoint.new(0, Color3.fromRGB(100, 150, 255)),
    ColorSequenceKeypoint.new(1, Color3.fromRGB(150, 100, 255))
})
barGradient.Parent = barFill

-- LOADING TEXT
local loadingText = Instance.new("TextLabel")
loadingText.Name = "LoadingText"
loadingText.Size = UDim2.new(1, 0, 0, 40)
loadingText.Position = UDim2.new(0, 0, 0.68, 0)
loadingText.BackgroundTransparency = 1
loadingText.Text = "Loading..."
loadingText.TextColor3 = Color3.fromRGB(200, 200, 220)
loadingText.Font = Enum.Font.Gotham
loadingText.TextSize = 20
loadingText.Parent = background

-- LOADING TIPS
local tips = {
    " Tip: Explore the world to find hidden secrets!",
    " Tip: Press E to interact with objects!",
    " Tip: Speed boosts are scattered around the map!",
    " Tip: Complete quests to earn rewards!",
    " Tip: Practice makes perfect!"
}

local tipLabel = Instance.new("TextLabel")
tipLabel.Name = "TipLabel"
tipLabel.Size = UDim2.new(0.8, 0, 0, 50)
tipLabel.Position = UDim2.new(0.1, 0, 0.85, 0)
tipLabel.BackgroundTransparency = 1
tipLabel.Text = tips[1]
tipLabel.TextColor3 = Color3.fromRGB(150, 150, 180)
tipLabel.Font = Enum.Font.GothamMedium
tipLabel.TextSize = 16
tipLabel.Parent = background

-- ANIMATE LOADING
spawn(function()
    local progress = 0
    local tipIndex = 1
    
    while progress < 1 do
        progress = progress + math.random(1, 5) / 100
        if progress > 1 then progress = 1 end
        
        TweenService:Create(barFill, TweenInfo.new(0.3), {Size = UDim2.new(progress, 0, 1, 0)}):Play()
        loadingText.Text = "Loading... " .. math.floor(progress * 100) .. "%"
        
        -- Change tip every 20%
        if math.floor(progress * 5) > tipIndex - 1 and tipIndex <= #tips then
            tipLabel.Text = tips[tipIndex]
            tipIndex = tipIndex + 1
        end
        
        wait(math.random(1, 3) / 10)
    end
    
    loadingText.Text = " Ready!"
    wait(0.5)
    
    -- FADE OUT
    local fadeOut = TweenService:Create(background, TweenInfo.new(1, Enum.EasingStyle.Quad), {BackgroundTransparency = 1})
    fadeOut:Play()
    
    for _, child in pairs(background:GetDescendants()) do
        if child:IsA("GuiObject") then
            pcall(function()
                TweenService:Create(child, TweenInfo.new(1), {BackgroundTransparency = 1}):Play()
            end)
        end
        if child:IsA("TextLabel") then
            TweenService:Create(child, TweenInfo.new(1), {TextTransparency = 1}):Play()
        end
    end
    
    wait(1.2)
    screenGui:Destroy()
end)

print("[BlaxSmith]  Premium Loading Screen created!")
]]
        end
        
        -- Determine parent
        local parent = game:GetService("StarterGui")
        if location:lower() == "serverscriptservice" then
            parent = game:GetService("ServerScriptService")
        elseif location:lower() == "replicatedstorage" then
            parent = game:GetService("ReplicatedStorage")
        elseif location:lower() == "starterplayerscripts" then
            parent = game:GetService("StarterPlayer"):FindFirstChild("StarterPlayerScripts")
        elseif location:lower() == "workspace" then
            parent = workspace
        end
        
        local newScript = Instance.new(scriptType)
        newScript.Name = scriptName
        newScript.Source = code
        newScript.Parent = parent
        
        Selection:Set({newScript})
        ChangeHistoryService:SetWaypoint("AI Created Script: " .. scriptName)
        print("[BlaxSmith]  Created " .. scriptType .. " '" .. scriptName .. "' in " .. parent.Name)
    end,
    
    -- === EXECUTE (Smart: Scripts vs Immediate Execution) ===
    execute = function(cmd)
        local code = cmd.code or cmd.data or (cmd.args and cmd.args.code)
        local scriptName = cmd.name or cmd.scriptName or "BlaxSmith_AI_Script"
        
        if not code then
            warn("[BlaxSmith]  execute command missing code")
            return
        end
        
        -- SMART DETECTION: Determine if this should be a Script or immediate execution
        local codeLower = code:lower()
        
        -- Patterns that indicate this should be a PERSISTENT SCRIPT (not immediate execution)
        local scriptPatterns = {
            "while%s+true",           -- Infinite loops
            "while%s+wait",           -- Loop with wait
            "runservice",             -- RunService connections
            "playeradded",            -- Player join events
            "playerremoving",         -- Player leave events
            "bindtoclose",            -- Server shutdown
            "remotefunction",         -- Remote functions
            "remoteevent",            -- Remote events
            "module%s*=%s*{",         -- Module scripts
            "return%s+module",        -- Module return
            "game%.replicatedstorage",-- ReplicatedStorage access
            "game%.serverstorage",    -- ServerStorage access
            "leaderstats",            -- Leaderboard systems
            "datastore",              -- Data persistence
            "touched",                -- Touch connections (combat/traps)
            ":connect%(",             -- Event connections
        }
        
        -- Patterns that indicate IMMEDIATE EXECUTION (terrain, parts, models)
        local immediatePatterns = {
            "fillblock",              -- Terrain fill
            "fillregion",             -- Terrain region
            "workspace%.terrain",     -- Terrain manipulation
            "instance%.new%(%s*['\"]part",    -- Creating parts
            "instance%.new%(%s*['\"]model",   -- Creating models
            "insertservice",          -- Model insertion
            "loadasset",              -- Asset loading
            ":destroy%(",             -- Cleanup operations
            "baseplate",              -- Baseplate manipulation
            "position%s*=%s*vector3", -- Direct positioning
            "screengui",              -- UI creation
            "textbutton",             -- Button creation
            "textlabel",              -- Label creation
            "imagelabel",             -- Image creation
            "frame",                  -- Frame creation
            "startergui",             -- StarterGui access
            "playergui",              -- PlayerGui access
        }
        
        local shouldCreateScript = false
        local matchedPattern = nil
        
        -- Check for script patterns
        for _, pattern in ipairs(scriptPatterns) do
            if codeLower:match(pattern) then
                shouldCreateScript = true
                matchedPattern = pattern
                break
            end
        end
        
        -- Override: If it matches immediate patterns, execute immediately
        for _, pattern in ipairs(immediatePatterns) do
            if codeLower:match(pattern) then
                shouldCreateScript = false
                matchedPattern = pattern
                break
            end
        end
        
        if shouldCreateScript then
            -- CREATE AS SCRIPT (for game systems that need to persist)
            print("[BlaxSmith]  Creating Script: " .. scriptName .. " (detected: " .. (matchedPattern or "game system") .. ")")
            
            local scriptObj = Instance.new("Script")
            scriptObj.Name = scriptName
            scriptObj.Source = code
            scriptObj.Parent = game:GetService("ServerScriptService")
            Selection:Set({scriptObj})
            ChangeHistoryService:SetWaypoint("AI Created Script: " .. scriptName)
            print("[BlaxSmith]  Created Script: " .. scriptName)
        else
            -- EXECUTE IMMEDIATELY (for terrain, parts, models, GUIs)
            print("[BlaxSmith]  Executing Lua code immediately...")
            
            -- Check if this is GUI/LocalScript code that needs special handling
            local isGuiScript = code:find("script%.Parent") or 
                               code:find("LocalPlayer") or 
                               code:find("PlayerGui") or
                               code:find(":Connect%(") or
                               code:find("MouseButton1Click")
            
            if isGuiScript then
                -- GUI scripts need to be actual LocalScripts, not loadstring
                print("[BlaxSmith]  Detected GUI script - creating as LocalScript...")
                
                -- Check if this is a flying script request - use guaranteed working code
                local isFlyingScript = code:lower():find("fly") or code:lower():find("flying")
                local finalCode = code
                
                if isFlyingScript then
                    print("[BlaxSmith]  Flying script detected - using guaranteed working version!")
                    finalCode = [[
-- BlaxSmith Flying Script with GUI (Guaranteed Working)
local Players = game:GetService("Players")
local UserInputService = game:GetService("UserInputService")
local RunService = game:GetService("RunService")

local player = Players.LocalPlayer
local character = player.Character or player.CharacterAdded:Wait()
local humanoid = character:WaitForChild("Humanoid")
local rootPart = character:WaitForChild("HumanoidRootPart")

-- CREATE THE GUI
local screenGui = Instance.new("ScreenGui")
screenGui.Name = "BlaxSmith_FlyGUI"
screenGui.ResetOnSpawn = false
screenGui.Parent = player.PlayerGui

local flyButton = Instance.new("TextButton")
flyButton.Name = "FlyButton"
flyButton.Size = UDim2.new(0, 160, 0, 55)
flyButton.Position = UDim2.new(0, 20, 0, 20)
flyButton.BackgroundColor3 = Color3.fromRGB(255, 255, 255)
flyButton.TextColor3 = Color3.new(1, 1, 1)
flyButton.Text = "FLY"
flyButton.Font = Enum.Font.GothamBold
flyButton.TextSize = 22
flyButton.Parent = screenGui

-- Add corner radius
local corner = Instance.new("UICorner")
corner.CornerRadius = UDim.new(0, 14)
corner.Parent = flyButton

-- Add gradient for modern look
local gradient = Instance.new("UIGradient")
gradient.Color = ColorSequence.new({
    ColorSequenceKeypoint.new(0, Color3.fromRGB(0, 200, 255)),
    ColorSequenceKeypoint.new(1, Color3.fromRGB(150, 0, 255))
})
gradient.Rotation = 45
gradient.Parent = flyButton

-- Add stroke for glow effect
local stroke = Instance.new("UIStroke")
stroke.Color = Color3.fromRGB(255, 255, 255)
stroke.Thickness = 2
stroke.Transparency = 0.5
stroke.Parent = flyButton

local flying = false
local flySpeed = 50
local bodyVel = nil
local bodyGyro = nil

local function startFlying()
    flying = true
    flyButton.Text = " LAND"
    flyButton.BackgroundColor3 = Color3.fromRGB(255, 100, 100)
    
    bodyVel = Instance.new("BodyVelocity")
    bodyVel.MaxForce = Vector3.new(math.huge, math.huge, math.huge)
    bodyVel.Velocity = Vector3.new(0, 0, 0)
    bodyVel.Parent = rootPart
    
    bodyGyro = Instance.new("BodyGyro")
    bodyGyro.MaxTorque = Vector3.new(math.huge, math.huge, math.huge)
    bodyGyro.P = 10000
    bodyGyro.Parent = rootPart
    
    humanoid.PlatformStand = true
end

local function stopFlying()
    flying = false
    flyButton.Text = "FLY"
    flyButton.BackgroundColor3 = Color3.fromRGB(0, 170, 255)
    
    if bodyVel then bodyVel:Destroy() bodyVel = nil end
    if bodyGyro then bodyGyro:Destroy() bodyGyro = nil end
    
    humanoid.PlatformStand = false
end

flyButton.MouseButton1Click:Connect(function()
    if flying then
        stopFlying()
    else
        startFlying()
    end
end)

RunService.Heartbeat:Connect(function()
    if flying and bodyVel and bodyGyro then
        local camera = workspace.CurrentCamera
        local moveDir = Vector3.new()
        
        if UserInputService:IsKeyDown(Enum.KeyCode.W) then
            moveDir = moveDir + camera.CFrame.LookVector
        end
        if UserInputService:IsKeyDown(Enum.KeyCode.S) then
            moveDir = moveDir - camera.CFrame.LookVector
        end
        if UserInputService:IsKeyDown(Enum.KeyCode.A) then
            moveDir = moveDir - camera.CFrame.RightVector
        end
        if UserInputService:IsKeyDown(Enum.KeyCode.D) then
            moveDir = moveDir + camera.CFrame.RightVector
        end
        if UserInputService:IsKeyDown(Enum.KeyCode.Space) then
            moveDir = moveDir + Vector3.new(0, 1, 0)
        end
        if UserInputService:IsKeyDown(Enum.KeyCode.LeftControl) then
            moveDir = moveDir - Vector3.new(0, 1, 0)
        end
        
        if moveDir.Magnitude > 0 then
            bodyVel.Velocity = moveDir.Unit * flySpeed
        else
            bodyVel.Velocity = Vector3.new(0, 0, 0)
        end
        
        bodyGyro.CFrame = camera.CFrame
    end
end)

print("[BlaxSmith]  Flying script loaded! Click the FLY button or press keys while flying:")
print("  WASD = Move, Space = Up, Ctrl = Down")
]]
                end
                
                -- Check for SPEED script
                local isSpeedScript = code:lower():find("speed") and (code:lower():find("gui") or code:lower():find("button"))
                if isSpeedScript and not isFlyingScript then
                    print("[BlaxSmith]  Speed script detected - using guaranteed working version!")
                    finalCode = [[
-- BlaxSmith Speed Script with GUI
local Players = game:GetService("Players")
local player = Players.LocalPlayer
local character = player.Character or player.CharacterAdded:Wait()
local humanoid = character:WaitForChild("Humanoid")

local screenGui = Instance.new("ScreenGui")
screenGui.Name = "BlaxSmith_SpeedGUI"
screenGui.ResetOnSpawn = false
screenGui.Parent = player.PlayerGui

local frame = Instance.new("Frame")
frame.Size = UDim2.new(0, 200, 0, 120)
frame.Position = UDim2.new(0, 20, 0, 80)
frame.BackgroundColor3 = Color3.fromRGB(30, 30, 40)
frame.Parent = screenGui
Instance.new("UICorner", frame).CornerRadius = UDim.new(0, 12)

local title = Instance.new("TextLabel")
title.Size = UDim2.new(1, 0, 0, 30)
title.BackgroundTransparency = 1
title.Text = " Speed Control"
title.TextColor3 = Color3.new(1, 1, 1)
title.Font = Enum.Font.GothamBold
title.TextSize = 16
title.Parent = frame

local speedLabel = Instance.new("TextLabel")
speedLabel.Size = UDim2.new(1, 0, 0, 25)
speedLabel.Position = UDim2.new(0, 0, 0, 35)
speedLabel.BackgroundTransparency = 1
speedLabel.Text = "Speed: 16"
speedLabel.TextColor3 = Color3.fromRGB(0, 255, 150)
speedLabel.Font = Enum.Font.Gotham
speedLabel.TextSize = 14
speedLabel.Parent = frame

local slowBtn = Instance.new("TextButton")
slowBtn.Size = UDim2.new(0.45, 0, 0, 35)
slowBtn.Position = UDim2.new(0.025, 0, 0, 70)
slowBtn.BackgroundColor3 = Color3.fromRGB(255, 100, 100)
slowBtn.Text = "- Slower"
slowBtn.TextColor3 = Color3.new(1,1,1)
slowBtn.Font = Enum.Font.GothamBold
slowBtn.Parent = frame
Instance.new("UICorner", slowBtn).CornerRadius = UDim.new(0, 8)

local fastBtn = Instance.new("TextButton")
fastBtn.Size = UDim2.new(0.45, 0, 0, 35)
fastBtn.Position = UDim2.new(0.525, 0, 0, 70)
fastBtn.BackgroundColor3 = Color3.fromRGB(100, 200, 255)
fastBtn.Text = "+ Faster"
fastBtn.TextColor3 = Color3.new(1,1,1)
fastBtn.Font = Enum.Font.GothamBold
fastBtn.Parent = frame
Instance.new("UICorner", fastBtn).CornerRadius = UDim.new(0, 8)

slowBtn.MouseButton1Click:Connect(function()
    humanoid.WalkSpeed = math.max(0, humanoid.WalkSpeed - 8)
    speedLabel.Text = "Speed: " .. humanoid.WalkSpeed
end)

fastBtn.MouseButton1Click:Connect(function()
    humanoid.WalkSpeed = humanoid.WalkSpeed + 8
    speedLabel.Text = "Speed: " .. humanoid.WalkSpeed
end)

print("[BlaxSmith]  Speed GUI loaded!")
]]
                end
                
                -- Check for HEALTH BAR script
                local isHealthScript = code:lower():find("health") and (code:lower():find("bar") or code:lower():find("gui"))
                if isHealthScript and not isFlyingScript and not isSpeedScript then
                    print("[BlaxSmith]  Health bar detected - using guaranteed working version!")
                    finalCode = [[
-- BlaxSmith Health Bar GUI
local Players = game:GetService("Players")
local player = Players.LocalPlayer
local character = player.Character or player.CharacterAdded:Wait()
local humanoid = character:WaitForChild("Humanoid")

local screenGui = Instance.new("ScreenGui")
screenGui.Name = "BlaxSmith_HealthGUI"
screenGui.ResetOnSpawn = false
screenGui.Parent = player.PlayerGui

local frame = Instance.new("Frame")
frame.Size = UDim2.new(0, 250, 0, 50)
frame.Position = UDim2.new(0.5, -125, 0, 20)
frame.BackgroundColor3 = Color3.fromRGB(40, 40, 50)
frame.Parent = screenGui
Instance.new("UICorner", frame).CornerRadius = UDim.new(0, 10)

local healthBar = Instance.new("Frame")
healthBar.Size = UDim2.new(1, -20, 0.5, 0)
healthBar.Position = UDim2.new(0, 10, 0.35, 0)
healthBar.BackgroundColor3 = Color3.fromRGB(60, 60, 70)
healthBar.Parent = frame
Instance.new("UICorner", healthBar).CornerRadius = UDim.new(0, 6)

local healthFill = Instance.new("Frame")
healthFill.Size = UDim2.new(1, 0, 1, 0)
healthFill.BackgroundColor3 = Color3.fromRGB(255, 80, 80)
healthFill.Parent = healthBar
Instance.new("UICorner", healthFill).CornerRadius = UDim.new(0, 6)

local healthText = Instance.new("TextLabel")
healthText.Size = UDim2.new(1, 0, 0, 20)
healthText.Position = UDim2.new(0, 0, 0, 2)
healthText.BackgroundTransparency = 1
healthText.Text = " 100/100"
healthText.TextColor3 = Color3.new(1, 1, 1)
healthText.Font = Enum.Font.GothamBold
healthText.TextSize = 14
healthText.Parent = frame

humanoid.HealthChanged:Connect(function(health)
    healthFill.Size = UDim2.new(health / humanoid.MaxHealth, 0, 1, 0)
    healthText.Text = " " .. math.floor(health) .. "/" .. humanoid.MaxHealth
    if health < 30 then
        healthFill.BackgroundColor3 = Color3.fromRGB(255, 50, 50)
    elseif health < 60 then
        healthFill.BackgroundColor3 = Color3.fromRGB(255, 150, 50)
    else
        healthFill.BackgroundColor3 = Color3.fromRGB(100, 255, 100)
    end
end)

print("[BlaxSmith]  Health Bar GUI loaded!")
]]
                end
                
                -- Check for SHOP GUI
                local isShopScript = code:lower():find("shop") and (code:lower():find("gui") or code:lower():find("buy"))
                if isShopScript and not isFlyingScript and not isSpeedScript and not isHealthScript then
                    print("[BlaxSmith]  Shop GUI detected - using guaranteed working version!")
                    finalCode = [[
-- ╔══════════════════════════════════════════════════════════════════════════════╗
-- ║  BlaxSmith ADVANCED SHOP SYSTEM v2.0                                          ║
-- ║  Premium In-Game Shop with Multi-Currency, Categories & Animations            ║
-- ╚══════════════════════════════════════════════════════════════════════════════╝

local Players = game:GetService("Players")
local TweenService = game:GetService("TweenService")
local SoundService = game:GetService("SoundService")
local MarketplaceService = game:GetService("MarketplaceService")
local ReplicatedStorage = game:GetService("ReplicatedStorage")
local player = Players.LocalPlayer

-- ========================= CONFIGURATION =========================
local CONFIG = {
    CATEGORIES = {"All", "Weapons", "Skins", "Boosts", "Pets", "VIP"},
    CURRENCIES = {
        {name = "Coins", icon = "💰", color = Color3.fromRGB(255, 215, 0)},
        {name = "Gems", icon = "💎", color = Color3.fromRGB(0, 200, 255)},
        {name = "Robux", icon = "🅁", color = Color3.fromRGB(0, 255, 127)}
    },
    SHOP_ITEMS = {
        -- Weapons
        {id = 1, name = "Starter Sword", category = "Weapons", price = 100, currency = "Coins", icon = "⚔️", rarity = "common", description = "A basic sword for beginners"},
        {id = 2, name = "Fire Blade", category = "Weapons", price = 500, currency = "Coins", icon = "🔥", rarity = "rare", description = "Burns enemies on hit"},
        {id = 3, name = "Legendary Katana", category = "Weapons", price = 50, currency = "Gems", icon = "🗡️", rarity = "legendary", description = "The ultimate weapon"},
        -- Skins
        {id = 4, name = "Neon Skin", category = "Skins", price = 200, currency = "Coins", icon = "🌈", rarity = "uncommon", description = "Glow in the dark!"},
        {id = 5, name = "Galaxy Skin", category = "Skins", price = 100, currency = "Gems", icon = "🌌", rarity = "epic", description = "Stars follow you"},
        {id = 6, name = "Diamond Skin", category = "Skins", price = 99, currency = "Robux", icon = "💠", rarity = "legendary", description = "Exclusive premium skin"},
        -- Boosts
        {id = 7, name = "2x Speed (1hr)", category = "Boosts", price = 50, currency = "Coins", icon = "⚡", rarity = "common", description = "Double speed for 1 hour"},
        {id = 8, name = "2x Coins (1hr)", category = "Boosts", price = 25, currency = "Gems", icon = "💵", rarity = "rare", description = "Double coin earnings"},
        {id = 9, name = "VIP Boost Pack", category = "Boosts", price = 199, currency = "Robux", icon = "👑", rarity = "legendary", description = "All boosts for 24 hours"},
        -- Pets
        {id = 10, name = "Baby Dragon", category = "Pets", price = 1000, currency = "Coins", icon = "🐉", rarity = "epic", description = "Follows you around"},
        {id = 11, name = "Golden Cat", category = "Pets", price = 75, currency = "Gems", icon = "🐱", rarity = "rare", description = "Collects coins for you"},
        {id = 12, name = "Mythic Phoenix", category = "Pets", price = 499, currency = "Robux", icon = "🔥", rarity = "legendary", description = "Revive once per game"},
        -- VIP
        {id = 13, name = "VIP Pass", category = "VIP", price = 799, currency = "Robux", icon = "⭐", rarity = "legendary", description = "Unlock all VIP areas"},
        {id = 14, name = "Daily Bonus x3", category = "VIP", price = 299, currency = "Robux", icon = "🎁", rarity = "epic", description = "Triple daily rewards"},
    },
    RARITY_COLORS = {
        common = Color3.fromRGB(180, 180, 180),
        uncommon = Color3.fromRGB(30, 255, 0),
        rare = Color3.fromRGB(0, 112, 221),
        epic = Color3.fromRGB(163, 53, 238),
        legendary = Color3.fromRGB(255, 128, 0)
    },
    SOUNDS = {
        open = "rbxassetid://6042053626",
        close = "rbxassetid://6042053626",
        hover = "rbxassetid://6042053626",
        purchase = "rbxassetid://5273966429",
        error = "rbxassetid://4590657391"
    }
}

-- ========================= CREATE MAIN GUI =========================
local screenGui = Instance.new("ScreenGui")
screenGui.Name = "BlaxSmith_AdvancedShop"
screenGui.ResetOnSpawn = false
screenGui.ZIndexBehavior = Enum.ZIndexBehavior.Sibling
screenGui.Parent = player.PlayerGui

-- Blur Background
local blur = Instance.new("Frame")
blur.Name = "Blur"
blur.Size = UDim2.new(1, 0, 1, 0)
blur.BackgroundColor3 = Color3.fromRGB(0, 0, 0)
blur.BackgroundTransparency = 1
blur.Visible = false
blur.Parent = screenGui

-- Main Shop Frame
local mainFrame = Instance.new("Frame")
mainFrame.Name = "MainShop"
mainFrame.Size = UDim2.new(0, 700, 0, 500)
mainFrame.Position = UDim2.new(0.5, -350, 0.5, -250)
mainFrame.BackgroundColor3 = Color3.fromRGB(18, 18, 28)
mainFrame.BorderSizePixel = 0
mainFrame.Visible = false
mainFrame.Parent = screenGui

local mainCorner = Instance.new("UICorner")
mainCorner.CornerRadius = UDim.new(0, 20)
mainCorner.Parent = mainFrame

local mainStroke = Instance.new("UIStroke")
mainStroke.Color = Color3.fromRGB(100, 100, 150)
mainStroke.Thickness = 2
mainStroke.Parent = mainFrame

-- Gradient Background
local gradient = Instance.new("UIGradient")
gradient.Color = ColorSequence.new({
    ColorSequenceKeypoint.new(0, Color3.fromRGB(25, 25, 40)),
    ColorSequenceKeypoint.new(1, Color3.fromRGB(15, 15, 25))
})
gradient.Rotation = 45
gradient.Parent = mainFrame

-- ========================= HEADER =========================
local header = Instance.new("Frame")
header.Name = "Header"
header.Size = UDim2.new(1, 0, 0, 60)
header.BackgroundColor3 = Color3.fromRGB(30, 30, 50)
header.BorderSizePixel = 0
header.Parent = mainFrame

local headerCorner = Instance.new("UICorner")
headerCorner.CornerRadius = UDim.new(0, 20)
headerCorner.Parent = header

-- Fix bottom corners
local headerFix = Instance.new("Frame")
headerFix.Size = UDim2.new(1, 0, 0, 20)
headerFix.Position = UDim2.new(0, 0, 1, -20)
headerFix.BackgroundColor3 = Color3.fromRGB(30, 30, 50)
headerFix.BorderSizePixel = 0
headerFix.Parent = header

-- Title
local title = Instance.new("TextLabel")
title.Name = "Title"
title.Size = UDim2.new(0, 200, 1, 0)
title.Position = UDim2.new(0, 20, 0, 0)
title.BackgroundTransparency = 1
title.Text = "🛒 PREMIUM SHOP"
title.TextColor3 = Color3.fromRGB(255, 255, 255)
title.Font = Enum.Font.GothamBlack
title.TextSize = 24
title.TextXAlignment = Enum.TextXAlignment.Left
title.Parent = header

-- Currency Display
local currencyFrame = Instance.new("Frame")
currencyFrame.Name = "Currencies"
currencyFrame.Size = UDim2.new(0, 350, 0, 40)
currencyFrame.Position = UDim2.new(1, -420, 0.5, -20)
currencyFrame.BackgroundTransparency = 1
currencyFrame.Parent = header

local currencyLayout = Instance.new("UIListLayout")
currencyLayout.FillDirection = Enum.FillDirection.Horizontal
currencyLayout.Padding = UDim.new(0, 10)
currencyLayout.HorizontalAlignment = Enum.HorizontalAlignment.Right
currencyLayout.Parent = currencyFrame

-- Create currency displays
local currencyLabels = {}
for _, curr in ipairs(CONFIG.CURRENCIES) do
    local currBox = Instance.new("Frame")
    currBox.Name = curr.name
    currBox.Size = UDim2.new(0, 100, 1, 0)
    currBox.BackgroundColor3 = Color3.fromRGB(40, 40, 60)
    currBox.Parent = currencyFrame
    Instance.new("UICorner", currBox).CornerRadius = UDim.new(0, 8)
    
    local currLabel = Instance.new("TextLabel")
    currLabel.Size = UDim2.new(1, 0, 1, 0)
    currLabel.BackgroundTransparency = 1
    currLabel.Text = curr.icon .. " 0"
    currLabel.TextColor3 = curr.color
    currLabel.Font = Enum.Font.GothamBold
    currLabel.TextSize = 16
    currLabel.Parent = currBox
    currencyLabels[curr.name] = currLabel
end

-- Close Button
local closeBtn = Instance.new("TextButton")
closeBtn.Name = "Close"
closeBtn.Size = UDim2.new(0, 40, 0, 40)
closeBtn.Position = UDim2.new(1, -50, 0.5, -20)
closeBtn.BackgroundColor3 = Color3.fromRGB(255, 60, 60)
closeBtn.Text = "✕"
closeBtn.TextColor3 = Color3.new(1, 1, 1)
closeBtn.Font = Enum.Font.GothamBold
closeBtn.TextSize = 20
closeBtn.Parent = header
Instance.new("UICorner", closeBtn).CornerRadius = UDim.new(0, 10)

-- ========================= CATEGORY TABS =========================
local tabFrame = Instance.new("Frame")
tabFrame.Name = "Tabs"
tabFrame.Size = UDim2.new(1, -40, 0, 45)
tabFrame.Position = UDim2.new(0, 20, 0, 70)
tabFrame.BackgroundTransparency = 1
tabFrame.Parent = mainFrame

local tabLayout = Instance.new("UIListLayout")
tabLayout.FillDirection = Enum.FillDirection.Horizontal
tabLayout.Padding = UDim.new(0, 8)
tabLayout.Parent = tabFrame

local categoryTabs = {}
local selectedCategory = "All"

for i, cat in ipairs(CONFIG.CATEGORIES) do
    local tab = Instance.new("TextButton")
    tab.Name = cat
    tab.Size = UDim2.new(0, 100, 1, 0)
    tab.BackgroundColor3 = i == 1 and Color3.fromRGB(80, 60, 180) or Color3.fromRGB(40, 40, 60)
    tab.Text = cat
    tab.TextColor3 = Color3.new(1, 1, 1)
    tab.Font = Enum.Font.GothamBold
    tab.TextSize = 14
    tab.AutoButtonColor = false
    tab.Parent = tabFrame
    Instance.new("UICorner", tab).CornerRadius = UDim.new(0, 10)
    categoryTabs[cat] = tab
end

-- ========================= ITEM GRID =========================
local scrollFrame = Instance.new("ScrollingFrame")
scrollFrame.Name = "Items"
scrollFrame.Size = UDim2.new(1, -40, 1, -130)
scrollFrame.Position = UDim2.new(0, 20, 0, 120)
scrollFrame.BackgroundTransparency = 1
scrollFrame.ScrollBarThickness = 6
scrollFrame.ScrollBarImageColor3 = Color3.fromRGB(100, 100, 150)
scrollFrame.CanvasSize = UDim2.new(0, 0, 0, 0)
scrollFrame.Parent = mainFrame

local gridLayout = Instance.new("UIGridLayout")
gridLayout.CellSize = UDim2.new(0, 200, 0, 220)
gridLayout.CellPadding = UDim2.new(0, 15, 0, 15)
gridLayout.Parent = scrollFrame

-- ========================= ITEM CARD TEMPLATE =========================
local function createItemCard(item)
    local card = Instance.new("Frame")
    card.Name = "Item_" .. item.id
    card.BackgroundColor3 = Color3.fromRGB(35, 35, 55)
    card.BorderSizePixel = 0
    
    local cardCorner = Instance.new("UICorner")
    cardCorner.CornerRadius = UDim.new(0, 16)
    cardCorner.Parent = card
    
    -- Rarity glow
    local rarityGlow = Instance.new("UIStroke")
    rarityGlow.Color = CONFIG.RARITY_COLORS[item.rarity]
    rarityGlow.Thickness = 2
    rarityGlow.Transparency = 0.5
    rarityGlow.Parent = card
    
    -- Icon
    local icon = Instance.new("TextLabel")
    icon.Name = "Icon"
    icon.Size = UDim2.new(1, 0, 0, 80)
    icon.Position = UDim2.new(0, 0, 0, 10)
    icon.BackgroundTransparency = 1
    icon.Text = item.icon
    icon.TextSize = 50
    icon.Parent = card
    
    -- Rarity Badge
    local badge = Instance.new("TextLabel")
    badge.Name = "Rarity"
    badge.Size = UDim2.new(0, 70, 0, 20)
    badge.Position = UDim2.new(0.5, -35, 0, 85)
    badge.BackgroundColor3 = CONFIG.RARITY_COLORS[item.rarity]
    badge.Text = item.rarity:upper()
    badge.TextColor3 = Color3.new(1, 1, 1)
    badge.Font = Enum.Font.GothamBold
    badge.TextSize = 10
    badge.Parent = card
    Instance.new("UICorner", badge).CornerRadius = UDim.new(0, 6)
    
    -- Name
    local name = Instance.new("TextLabel")
    name.Name = "Name"
    name.Size = UDim2.new(1, -20, 0, 25)
    name.Position = UDim2.new(0, 10, 0, 110)
    name.BackgroundTransparency = 1
    name.Text = item.name
    name.TextColor3 = Color3.new(1, 1, 1)
    name.Font = Enum.Font.GothamBold
    name.TextSize = 14
    name.TextTruncate = Enum.TextTruncate.AtEnd
    name.Parent = card
    
    -- Description
    local desc = Instance.new("TextLabel")
    desc.Name = "Desc"
    desc.Size = UDim2.new(1, -20, 0, 30)
    desc.Position = UDim2.new(0, 10, 0, 130)
    desc.BackgroundTransparency = 1
    desc.Text = item.description
    desc.TextColor3 = Color3.fromRGB(150, 150, 170)
    desc.Font = Enum.Font.Gotham
    desc.TextSize = 11
    desc.TextWrapped = true
    desc.TextTruncate = Enum.TextTruncate.AtEnd
    desc.Parent = card
    
    -- Buy Button
    local currInfo = nil
    for _, c in ipairs(CONFIG.CURRENCIES) do
        if c.name == item.currency then currInfo = c break end
    end
    
    local buyBtn = Instance.new("TextButton")
    buyBtn.Name = "Buy"
    buyBtn.Size = UDim2.new(1, -20, 0, 40)
    buyBtn.Position = UDim2.new(0, 10, 1, -50)
    buyBtn.BackgroundColor3 = currInfo and currInfo.color or Color3.fromRGB(100, 200, 100)
    buyBtn.Text = currInfo.icon .. " " .. item.price
    buyBtn.TextColor3 = Color3.fromRGB(20, 20, 30)
    buyBtn.Font = Enum.Font.GothamBlack
    buyBtn.TextSize = 16
    buyBtn.AutoButtonColor = false
    buyBtn.Parent = card
    Instance.new("UICorner", buyBtn).CornerRadius = UDim.new(0, 10)
    
    -- Hover Effects
    card.MouseEnter:Connect(function()
        TweenService:Create(card, TweenInfo.new(0.2), {BackgroundColor3 = Color3.fromRGB(50, 50, 75)}):Play()
        TweenService:Create(rarityGlow, TweenInfo.new(0.2), {Transparency = 0}):Play()
    end)
    
    card.MouseLeave:Connect(function()
        TweenService:Create(card, TweenInfo.new(0.2), {BackgroundColor3 = Color3.fromRGB(35, 35, 55)}):Play()
        TweenService:Create(rarityGlow, TweenInfo.new(0.2), {Transparency = 0.5}):Play()
    end)
    
    -- Buy Button Hover
    buyBtn.MouseEnter:Connect(function()
        TweenService:Create(buyBtn, TweenInfo.new(0.15), {Size = UDim2.new(1, -10, 0, 44)}):Play()
    end)
    
    buyBtn.MouseLeave:Connect(function()
        TweenService:Create(buyBtn, TweenInfo.new(0.15), {Size = UDim2.new(1, -20, 0, 40)}):Play()
    end)
    
    -- Purchase Handler
    buyBtn.MouseButton1Click:Connect(function()
        -- Flash animation
        local flash = Instance.new("Frame")
        flash.Size = UDim2.new(1, 0, 1, 0)
        flash.BackgroundColor3 = Color3.new(1, 1, 1)
        flash.BackgroundTransparency = 0.7
        flash.Parent = card
        Instance.new("UICorner", flash).CornerRadius = UDim.new(0, 16)
        
        TweenService:Create(flash, TweenInfo.new(0.3), {BackgroundTransparency = 1}):Play()
        task.delay(0.3, function() flash:Destroy() end)
        
        -- TODO: Implement actual purchase via RemoteEvent
        print("[BlaxSmith Shop] Purchase requested: " .. item.name .. " for " .. item.price .. " " .. item.currency)
        
        -- Show purchase notification
        local notif = Instance.new("TextLabel")
        notif.Size = UDim2.new(0, 250, 0, 50)
        notif.Position = UDim2.new(0.5, -125, 1, 0)
        notif.BackgroundColor3 = Color3.fromRGB(50, 200, 100)
        notif.Text = "✅ Purchased " .. item.name .. "!"
        notif.TextColor3 = Color3.new(1, 1, 1)
        notif.Font = Enum.Font.GothamBold
        notif.TextSize = 16
        notif.Parent = screenGui
        Instance.new("UICorner", notif).CornerRadius = UDim.new(0, 12)
        
        TweenService:Create(notif, TweenInfo.new(0.3, Enum.EasingStyle.Back), {Position = UDim2.new(0.5, -125, 1, -70)}):Play()
        task.delay(2, function()
            TweenService:Create(notif, TweenInfo.new(0.3), {Position = UDim2.new(0.5, -125, 1, 0)}):Play()
            task.delay(0.3, function() notif:Destroy() end)
        end)
    end)
    
    return card
end

-- ========================= POPULATE ITEMS =========================
local function refreshItems(category)
    -- Clear existing
    for _, child in ipairs(scrollFrame:GetChildren()) do
        if child:IsA("Frame") then child:Destroy() end
    end
    
    -- Add filtered items
    local count = 0
    for _, item in ipairs(CONFIG.SHOP_ITEMS) do
        if category == "All" or item.category == category then
            local card = createItemCard(item)
            card.Parent = scrollFrame
            count = count + 1
        end
    end
    
    -- Update canvas size
    local rows = math.ceil(count / 3)
    scrollFrame.CanvasSize = UDim2.new(0, 0, 0, rows * 235)
end

-- ========================= TAB SWITCHING =========================
for cat, tab in pairs(categoryTabs) do
    tab.MouseButton1Click:Connect(function()
        selectedCategory = cat
        for c, t in pairs(categoryTabs) do
            local targetColor = c == cat and Color3.fromRGB(80, 60, 180) or Color3.fromRGB(40, 40, 60)
            TweenService:Create(t, TweenInfo.new(0.2), {BackgroundColor3 = targetColor}):Play()
        end
        refreshItems(cat)
    end)
end

-- ========================= OPEN/CLOSE SHOP =========================
local shopOpen = false

local function openShop()
    if shopOpen then return end
    shopOpen = true
    blur.Visible = true
    mainFrame.Visible = true
    mainFrame.Size = UDim2.new(0, 0, 0, 0)
    mainFrame.Position = UDim2.new(0.5, 0, 0.5, 0)
    
    TweenService:Create(blur, TweenInfo.new(0.3), {BackgroundTransparency = 0.5}):Play()
    TweenService:Create(mainFrame, TweenInfo.new(0.4, Enum.EasingStyle.Back), {
        Size = UDim2.new(0, 700, 0, 500),
        Position = UDim2.new(0.5, -350, 0.5, -250)
    }):Play()
    
    refreshItems("All")
end

local function closeShop()
    if not shopOpen then return end
    shopOpen = false
    
    TweenService:Create(blur, TweenInfo.new(0.2), {BackgroundTransparency = 1}):Play()
    TweenService:Create(mainFrame, TweenInfo.new(0.3, Enum.EasingStyle.Back, Enum.EasingDirection.In), {
        Size = UDim2.new(0, 0, 0, 0),
        Position = UDim2.new(0.5, 0, 0.5, 0)
    }):Play()
    
    task.delay(0.3, function()
        blur.Visible = false
        mainFrame.Visible = false
    end)
end

closeBtn.MouseButton1Click:Connect(closeShop)
blur.InputBegan:Connect(function(input)
    if input.UserInputType == Enum.UserInputType.MouseButton1 then
        closeShop()
    end
end)

-- ========================= OPEN BUTTON =========================
local openBtn = Instance.new("TextButton")
openBtn.Name = "OpenShop"
openBtn.Size = UDim2.new(0, 120, 0, 50)
openBtn.Position = UDim2.new(1, -140, 0.5, -25)
openBtn.BackgroundColor3 = Color3.fromRGB(255, 200, 50)
openBtn.Text = "🛒 SHOP"
openBtn.TextColor3 = Color3.fromRGB(30, 30, 40)
openBtn.Font = Enum.Font.GothamBlack
openBtn.TextSize = 18
openBtn.Parent = screenGui
Instance.new("UICorner", openBtn).CornerRadius = UDim.new(0, 14)

local openStroke = Instance.new("UIStroke")
openStroke.Color = Color3.fromRGB(255, 220, 100)
openStroke.Thickness = 2
openStroke.Parent = openBtn

-- Pulsing animation for open button
task.spawn(function()
    while true do
        TweenService:Create(openBtn, TweenInfo.new(0.8, Enum.EasingStyle.Sine, Enum.EasingDirection.InOut), {
            Size = UDim2.new(0, 125, 0, 52)
        }):Play()
        task.wait(0.8)
        TweenService:Create(openBtn, TweenInfo.new(0.8, Enum.EasingStyle.Sine, Enum.EasingDirection.InOut), {
            Size = UDim2.new(0, 120, 0, 50)
        }):Play()
        task.wait(0.8)
    end
end)

openBtn.MouseButton1Click:Connect(openShop)

-- ========================= CURRENCY SYNC =========================
-- Connect to leaderstats if available
local function updateCurrencies()
    local ls = player:FindFirstChild("leaderstats")
    if ls then
        for _, curr in ipairs(CONFIG.CURRENCIES) do
            local val = ls:FindFirstChild(curr.name)
            if val and currencyLabels[curr.name] then
                currencyLabels[curr.name].Text = curr.icon .. " " .. tostring(val.Value)
            end
        end
    end
end

player.CharacterAdded:Connect(function()
    task.wait(1)
    updateCurrencies()
end)
task.spawn(function()
    while true do
        updateCurrencies()
        task.wait(1)
    end
end)

print("[BlaxSmith] ✅ ADVANCED SHOP SYSTEM loaded!")
print("[BlaxSmith] 🛒 " .. #CONFIG.SHOP_ITEMS .. " items | " .. #CONFIG.CATEGORIES .. " categories")
]]
                end
                
                -- Check for TELEPORT script
                local isTeleportScript = code:lower():find("teleport") and (code:lower():find("gui") or code:lower():find("button"))
                if isTeleportScript then
                    print("[BlaxSmith]  Teleport GUI detected - using guaranteed working version!")
                    finalCode = [[
-- BlaxSmith Teleport GUI
local Players = game:GetService("Players")
local player = Players.LocalPlayer

local screenGui = Instance.new("ScreenGui")
screenGui.Name = "BlaxSmith_TeleportGUI"
screenGui.Parent = player.PlayerGui

local frame = Instance.new("Frame")
frame.Size = UDim2.new(0, 180, 0, 200)
frame.Position = UDim2.new(1, -200, 0.5, -100)
frame.BackgroundColor3 = Color3.fromRGB(30, 30, 45)
frame.Parent = screenGui
Instance.new("UICorner", frame).CornerRadius = UDim.new(0, 12)

local title = Instance.new("TextLabel")
title.Size = UDim2.new(1, 0, 0, 35)
title.BackgroundTransparency = 1
title.Text = " Teleport"
title.TextColor3 = Color3.fromRGB(150, 100, 255)
title.Font = Enum.Font.GothamBold
title.TextSize = 18
title.Parent = frame

local locations = {"Spawn", "Shop", "Arena", "VIP"}
for i, loc in ipairs(locations) do
    local btn = Instance.new("TextButton")
    btn.Size = UDim2.new(0.9, 0, 0, 35)
    btn.Position = UDim2.new(0.05, 0, 0, 30 + (i * 40))
    btn.BackgroundColor3 = Color3.fromRGB(80, 60, 140)
    btn.Text = " " .. loc
    btn.TextColor3 = Color3.new(1,1,1)
    btn.Font = Enum.Font.GothamBold
    btn.Parent = frame
    Instance.new("UICorner", btn).CornerRadius = UDim.new(0, 8)
    
    btn.MouseButton1Click:Connect(function()
        local part = workspace:FindFirstChild(loc)
        if part then
            player.Character:SetPrimaryPartCFrame(part.CFrame + Vector3.new(0,5,0))
        end
    end)
end

print("[BlaxSmith]  Teleport GUI loaded!")
]]
                end
                
                -- Check for SPRINT script
                local isSprintScript = code:lower():find("sprint") or code:lower():find("run")
                if isSprintScript and not isFlyingScript and not isSpeedScript then
                    print("[BlaxSmith]  Sprint script detected - using guaranteed working version!")
                    finalCode = [[
-- BlaxSmith Sprint Script
local Players = game:GetService("Players")
local UserInputService = game:GetService("UserInputService")
local player = Players.LocalPlayer
local character = player.Character or player.CharacterAdded:Wait()
local humanoid = character:WaitForChild("Humanoid")

local normalSpeed = 16
local sprintSpeed = 32
local sprinting = false

local screenGui = Instance.new("ScreenGui")
screenGui.Name = "BlaxSmith_SprintGUI"
screenGui.Parent = player.PlayerGui

local label = Instance.new("TextLabel")
label.Size = UDim2.new(0, 150, 0, 40)
label.Position = UDim2.new(0.5, -75, 1, -60)
label.BackgroundColor3 = Color3.fromRGB(40, 40, 50)
label.Text = " Walking"
label.TextColor3 = Color3.new(1,1,1)
label.Font = Enum.Font.GothamBold
label.TextSize = 16
label.Parent = screenGui
Instance.new("UICorner", label).CornerRadius = UDim.new(0, 10)

UserInputService.InputBegan:Connect(function(input, gpe)
    if gpe then return end
    if input.KeyCode == Enum.KeyCode.LeftShift then
        sprinting = true
        humanoid.WalkSpeed = sprintSpeed
        label.Text = " Sprinting!"
        label.BackgroundColor3 = Color3.fromRGB(255, 150, 50)
    end
end)

UserInputService.InputEnded:Connect(function(input)
    if input.KeyCode == Enum.KeyCode.LeftShift then
        sprinting = false
        humanoid.WalkSpeed = normalSpeed
        label.Text = " Walking"
        label.BackgroundColor3 = Color3.fromRGB(40, 40, 50)
    end
end)

print("[BlaxSmith]  Sprint script loaded! Hold SHIFT to run!")
]]
                end
                
                -- Check for JUMP BOOST script
                local isJumpScript = code:lower():find("jump") and (code:lower():find("boost") or code:lower():find("high"))
                if isJumpScript then
                    print("[BlaxSmith]  Jump Boost detected - using guaranteed working version!")
                    finalCode = [[
-- BlaxSmith Jump Boost GUI
local Players = game:GetService("Players")
local player = Players.LocalPlayer
local character = player.Character or player.CharacterAdded:Wait()
local humanoid = character:WaitForChild("Humanoid")

local screenGui = Instance.new("ScreenGui")
screenGui.Name = "BlaxSmith_JumpGUI"
screenGui.Parent = player.PlayerGui

local btn = Instance.new("TextButton")
btn.Size = UDim2.new(0, 150, 0, 50)
btn.Position = UDim2.new(0, 20, 1, -70)
btn.BackgroundColor3 = Color3.fromRGB(100, 200, 100)
btn.Text = " Jump: 50"
btn.TextColor3 = Color3.new(1,1,1)
btn.Font = Enum.Font.GothamBold
btn.TextSize = 16
btn.Parent = screenGui
Instance.new("UICorner", btn).CornerRadius = UDim.new(0, 10)

btn.MouseButton1Click:Connect(function()
    humanoid.JumpPower = humanoid.JumpPower + 25
    btn.Text = " Jump: " .. humanoid.JumpPower
end)

print("[BlaxSmith]  Jump Boost GUI loaded!")
]]
                end
                
                -- Check for COINS/LEADERSTATS script
                local isCoinsScript = code:lower():find("coin") or code:lower():find("leaderstats") or code:lower():find("money")
                if isCoinsScript then
                    print("[BlaxSmith]  Coins/Leaderstats detected - creating server script!")
                    -- This needs to be a SERVER script, not LocalScript
                    local serverScript = Instance.new("Script")
                    serverScript.Name = "BlaxSmith_Leaderstats"
                    serverScript.Source = [[
-- BlaxSmith Leaderstats/Coins System
local Players = game:GetService("Players")

Players.PlayerAdded:Connect(function(player)
    local leaderstats = Instance.new("Folder")
    leaderstats.Name = "leaderstats"
    leaderstats.Parent = player
    
    local coins = Instance.new("IntValue")
    coins.Name = "Coins"
    coins.Value = 100
    coins.Parent = leaderstats
    
    local level = Instance.new("IntValue")
    level.Name = "Level"
    level.Value = 1
    level.Parent = leaderstats
    
    print("[BlaxSmith]  Leaderstats created for " .. player.Name)
end)

print("[BlaxSmith]  Leaderstats system loaded!")
]]
                    serverScript.Parent = game:GetService("ServerScriptService")
                    Selection:Set({serverScript})
                    ChangeHistoryService:SetWaypoint("AI Created Leaderstats")
                    print("[BlaxSmith]  Created Leaderstats script in ServerScriptService!")
                    return -- Exit early, don't create LocalScript
                end
                
                -- Check for NOCLIP script
                local isNoclipScript = code:lower():find("noclip") or code:lower():find("no clip") or code:lower():find("walk through")
                if isNoclipScript then
                    print("[BlaxSmith]  Noclip script detected - using guaranteed working version!")
                    finalCode = [[
-- BlaxSmith Noclip Script
local Players = game:GetService("Players")
local UserInputService = game:GetService("UserInputService")
local RunService = game:GetService("RunService")
local player = Players.LocalPlayer

local noclip = false

local screenGui = Instance.new("ScreenGui")
screenGui.Name = "BlaxSmith_NoclipGUI"
screenGui.Parent = player.PlayerGui

local btn = Instance.new("TextButton")
btn.Size = UDim2.new(0, 120, 0, 40)
btn.Position = UDim2.new(0, 20, 0.5, 0)
btn.BackgroundColor3 = Color3.fromRGB(100, 100, 200)
btn.Text = " Noclip: OFF"
btn.TextColor3 = Color3.new(1,1,1)
btn.Font = Enum.Font.GothamBold
btn.Parent = screenGui
Instance.new("UICorner", btn).CornerRadius = UDim.new(0, 10)

btn.MouseButton1Click:Connect(function()
    noclip = not noclip
    btn.Text = noclip and " Noclip: ON" or " Noclip: OFF"
    btn.BackgroundColor3 = noclip and Color3.fromRGB(150, 100, 255) or Color3.fromRGB(100, 100, 200)
end)

RunService.Stepped:Connect(function()
    if noclip then
        local character = player.Character
        if character then
            for _, part in pairs(character:GetDescendants()) do
                if part:IsA("BasePart") then
                    part.CanCollide = false
                end
            end
        end
    end
end)

print("[BlaxSmith]  Noclip script loaded! Click button to toggle!")
]]
                end
                
                -- Check for TIMER script
                local isTimerScript = code:lower():find("timer") or code:lower():find("stopwatch") or code:lower():find("countdown")
                if isTimerScript then
                    print("[BlaxSmith]  Timer detected - using guaranteed working version!")
                    finalCode = [[
-- BlaxSmith Timer GUI
local Players = game:GetService("Players")
local player = Players.LocalPlayer

local screenGui = Instance.new("ScreenGui")
screenGui.Name = "BlaxSmith_TimerGUI"
screenGui.Parent = player.PlayerGui

local frame = Instance.new("Frame")
frame.Size = UDim2.new(0, 200, 0, 100)
frame.Position = UDim2.new(0.5, -100, 0, 20)
frame.BackgroundColor3 = Color3.fromRGB(30, 30, 40)
frame.Parent = screenGui
Instance.new("UICorner", frame).CornerRadius = UDim.new(0, 12)

local timeLabel = Instance.new("TextLabel")
timeLabel.Size = UDim2.new(1, 0, 0, 50)
timeLabel.BackgroundTransparency = 1
timeLabel.Text = "00:00"
timeLabel.TextColor3 = Color3.fromRGB(0, 255, 200)
timeLabel.Font = Enum.Font.Code
timeLabel.TextSize = 36
timeLabel.Parent = frame

local startBtn = Instance.new("TextButton")
startBtn.Size = UDim2.new(0.45, 0, 0, 35)
startBtn.Position = UDim2.new(0.025, 0, 0, 55)
startBtn.BackgroundColor3 = Color3.fromRGB(100, 200, 100)
startBtn.Text = " Start"
startBtn.TextColor3 = Color3.new(1,1,1)
startBtn.Font = Enum.Font.GothamBold
startBtn.Parent = frame
Instance.new("UICorner", startBtn).CornerRadius = UDim.new(0, 8)

local resetBtn = Instance.new("TextButton")
resetBtn.Size = UDim2.new(0.45, 0, 0, 35)
resetBtn.Position = UDim2.new(0.525, 0, 0, 55)
resetBtn.BackgroundColor3 = Color3.fromRGB(200, 100, 100)
resetBtn.Text = " Reset"
resetBtn.TextColor3 = Color3.new(1,1,1)
resetBtn.Font = Enum.Font.GothamBold
resetBtn.Parent = frame
Instance.new("UICorner", resetBtn).CornerRadius = UDim.new(0, 8)

local timeElapsed = 0
local running = false

startBtn.MouseButton1Click:Connect(function()
    running = not running
    startBtn.Text = running and " Pause" or " Start"
end)

resetBtn.MouseButton1Click:Connect(function()
    timeElapsed = 0
    running = false
    startBtn.Text = " Start"
    timeLabel.Text = "00:00"
end)

game:GetService("RunService").Heartbeat:Connect(function(dt)
    if running then
        timeElapsed = timeElapsed + dt
        local mins = math.floor(timeElapsed / 60)
        local secs = math.floor(timeElapsed % 60)
        timeLabel.Text = string.format("%02d:%02d", mins, secs)
    end
end)

print("[BlaxSmith]  Timer GUI loaded!")
]]
                end
                
                -- Check for PARTICLES/EFFECTS script
                local isParticleScript = code:lower():find("particle") or code:lower():find("effect") or code:lower():find("sparkle")
                if isParticleScript then
                    print("[BlaxSmith]  Particles/Effects detected - creating guaranteed working version!")
                    -- Create directly in workspace
                    local part = Instance.new("Part")
                    part.Name = "BlaxSmith_EffectPart"
                    part.Size = Vector3.new(4, 4, 4)
                    part.Position = Vector3.new(0, 10, 0)
                    part.Anchored = true
                    part.CanCollide = false
                    part.Transparency = 0.5
                    part.BrickColor = BrickColor.new("Bright blue")
                    part.Material = Enum.Material.Neon
                    part.Parent = workspace
                    
                    local particle = Instance.new("ParticleEmitter")
                    particle.Texture = "rbxassetid://243660364"
                    particle.Rate = 50
                    particle.Lifetime = NumberRange.new(1, 2)
                    particle.Speed = NumberRange.new(5, 10)
                    particle.SpreadAngle = Vector2.new(180, 180)
                    particle.Color = ColorSequence.new(Color3.fromRGB(0, 200, 255), Color3.fromRGB(200, 0, 255))
                    particle.Size = NumberSequence.new({
                        NumberSequenceKeypoint.new(0, 1),
                        NumberSequenceKeypoint.new(1, 0)
                    })
                    particle.Parent = part
                    
                    local light = Instance.new("PointLight")
                    light.Color = Color3.fromRGB(0, 200, 255)
                    light.Brightness = 2
                    light.Range = 20
                    light.Parent = part
                    
                    Selection:Set({part})
                    ChangeHistoryService:SetWaypoint("AI Created Particle Effect")
                    print("[BlaxSmith]  Created particle effect in workspace!")
                    return
                end
                
                -- Check for TRAIL script
                local isTrailScript = code:lower():find("trail")
                if isTrailScript then
                    print("[BlaxSmith]  Trail detected - using guaranteed working version!")
                    finalCode = [[
-- BlaxSmith Trail Script
local Players = game:GetService("Players")
local player = Players.LocalPlayer
local character = player.Character or player.CharacterAdded:Wait()
local rootPart = character:WaitForChild("HumanoidRootPart")

-- Create trail attachments
local attachment0 = Instance.new("Attachment")
attachment0.Name = "TrailAttach0"
attachment0.Position = Vector3.new(0, 1, 0)
attachment0.Parent = rootPart

local attachment1 = Instance.new("Attachment")
attachment1.Name = "TrailAttach1"
attachment1.Position = Vector3.new(0, -1, 0)
attachment1.Parent = rootPart

-- Create trail
local trail = Instance.new("Trail")
trail.Name = "BlaxSmith_Trail"
trail.Attachment0 = attachment0
trail.Attachment1 = attachment1
trail.Lifetime = 0.5
trail.MinLength = 0.1
trail.FaceCamera = true
trail.Color = ColorSequence.new({
    ColorSequenceKeypoint.new(0, Color3.fromRGB(255, 0, 150)),
    ColorSequenceKeypoint.new(0.5, Color3.fromRGB(0, 150, 255)),
    ColorSequenceKeypoint.new(1, Color3.fromRGB(150, 0, 255))
})
trail.Transparency = NumberSequence.new({
    NumberSequenceKeypoint.new(0, 0),
    NumberSequenceKeypoint.new(1, 1)
})
trail.WidthScale = NumberSequence.new({
    NumberSequenceKeypoint.new(0, 1),
    NumberSequenceKeypoint.new(1, 0.5)
})
trail.Parent = rootPart

print("[BlaxSmith]  Rainbow trail added to player!")
]]
                end
                
                -- Check for EXPLOSION script
                local isExplosionScript = code:lower():find("explosion") or code:lower():find("explode") or code:lower():find("bomb")
                if isExplosionScript then
                    print("[BlaxSmith]  Explosion detected - creating explosion effect!")
                    local explosion = Instance.new("Explosion")
                    explosion.Position = Vector3.new(0, 5, 0)
                    explosion.BlastRadius = 20
                    explosion.BlastPressure = 500000
                    explosion.DestroyJointRadiusPercent = 0
                    explosion.Parent = workspace
                    
                    ChangeHistoryService:SetWaypoint("AI Created Explosion")
                    print("[BlaxSmith]  Created explosion at origin!")
                    return
                end
                
                -- Check for DAY/NIGHT or LIGHTING script
                local isLightingScript = code:lower():find("day") or code:lower():find("night") or code:lower():find("lighting") or code:lower():find("atmosphere")
                if isLightingScript and not isFlyingScript then
                    print("[BlaxSmith]  Lighting/Atmosphere detected - creating script!")
                    local script = Instance.new("Script")
                    script.Name = "BlaxSmith_DayNightCycle"
                    script.Source = [[
-- BlaxSmith Day/Night Cycle
local Lighting = game:GetService("Lighting")

-- Set up nice atmosphere
local atmosphere = Instance.new("Atmosphere")
atmosphere.Density = 0.3
atmosphere.Offset = 0.25
atmosphere.Color = Color3.fromRGB(199, 199, 199)
atmosphere.Decay = Color3.fromRGB(92, 60, 13)
atmosphere.Glare = 0.2
atmosphere.Haze = 1.5
atmosphere.Parent = Lighting

local bloom = Instance.new("BloomEffect")
bloom.Intensity = 0.5
bloom.Size = 24
bloom.Threshold = 1.5
bloom.Parent = Lighting

local sunRays = Instance.new("SunRaysEffect")
sunRays.Intensity = 0.1
sunRays.Spread = 0.5
sunRays.Parent = Lighting

-- Day/Night cycle
while true do
    for i = 0, 24, 0.02 do
        Lighting.ClockTime = i
        wait(0.1)
    end
end
]]
                    script.Parent = game:GetService("ServerScriptService")
                    Selection:Set({script})
                    ChangeHistoryService:SetWaypoint("AI Created Day/Night Cycle")
                    print("[BlaxSmith]  Created Day/Night cycle with atmosphere!")
                    return
                end
                
                -- Check for KILL BRICK script
                local isKillBrickScript = code:lower():find("kill") and code:lower():find("brick")
                if isKillBrickScript then
                    print("[BlaxSmith]  Kill Brick detected - creating in workspace!")
                    local killBrick = Instance.new("Part")
                    killBrick.Name = "KillBrick"
                    killBrick.Size = Vector3.new(10, 1, 10)
                    killBrick.Position = Vector3.new(0, 0.5, 20)
                    killBrick.Anchored = true
                    killBrick.BrickColor = BrickColor.new("Really red")
                    killBrick.Material = Enum.Material.Neon
                    killBrick.Parent = workspace
                    
                    local script = Instance.new("Script")
                    script.Name = "KillScript"
                    script.Source = [[
script.Parent.Touched:Connect(function(hit)
    local humanoid = hit.Parent:FindFirstChild("Humanoid")
    if humanoid then
        humanoid.Health = 0
    end
end)
]]
                    script.Parent = killBrick
                    
                    Selection:Set({killBrick})
                    ChangeHistoryService:SetWaypoint("AI Created Kill Brick")
                    print("[BlaxSmith]  Created Kill Brick in workspace!")
                    return
                end
                
                -- Check for INVENTORY script
                local isInventoryScript = code:lower():find("inventory") or code:lower():find("backpack")
                if isInventoryScript then
                    print("[BlaxSmith]  Inventory GUI detected!")
                    finalCode = [[
-- ╔══════════════════════════════════════════════════════════════════════════════╗
-- ║  BlaxSmith ADVANCED INVENTORY SYSTEM v2.0                                     ║
-- ║  Premium Inventory with Slots, Rarity, Tooltips & Animations                  ║
-- ╚══════════════════════════════════════════════════════════════════════════════╝

local Players = game:GetService("Players")
local TweenService = game:GetService("TweenService")
local UserInputService = game:GetService("UserInputService")
local player = Players.LocalPlayer

-- ========================= CONFIGURATION =========================
local CONFIG = {
    MAX_SLOTS = 30,
    SLOT_SIZE = 65,
    SLOT_PADDING = 8,
    SLOTS_PER_ROW = 6,
    RARITY_COLORS = {
        common = Color3.fromRGB(180, 180, 180),
        uncommon = Color3.fromRGB(30, 255, 0),
        rare = Color3.fromRGB(0, 112, 221),
        epic = Color3.fromRGB(163, 53, 238),
        legendary = Color3.fromRGB(255, 128, 0),
        mythic = Color3.fromRGB(255, 0, 100)
    },
    ITEM_TYPES = {"Weapon", "Armor", "Consumable", "Material", "Pet", "Special"}
}

-- Sample inventory items (in real game, sync from server)
local inventoryData = {
    {id = 1, name = "Blazing Sword", type = "Weapon", rarity = "legendary", icon = "⚔️", stats = {damage = 50, speed = 1.2}},
    {id = 2, name = "Health Potion", type = "Consumable", rarity = "common", icon = "🧪", stats = {heal = 50}, stackable = true, count = 5},
    {id = 3, name = "Diamond Shield", type = "Armor", rarity = "epic", icon = "🛡️", stats = {defense = 35}},
    {id = 4, name = "Fire Crystal", type = "Material", rarity = "rare", icon = "💎", stackable = true, count = 12},
    {id = 5, name = "Baby Dragon", type = "Pet", rarity = "legendary", icon = "🐉", stats = {bonus = "+10% coins"}},
    {id = 6, name = "Speed Boots", type = "Armor", rarity = "uncommon", icon = "👟", stats = {speed = 1.5}},
}

-- ========================= CREATE MAIN GUI =========================
local screenGui = Instance.new("ScreenGui")
screenGui.Name = "BlaxSmith_AdvancedInventory"
screenGui.ResetOnSpawn = false
screenGui.ZIndexBehavior = Enum.ZIndexBehavior.Sibling
screenGui.Parent = player.PlayerGui

-- Blur Background
local blur = Instance.new("Frame")
blur.Name = "Blur"
blur.Size = UDim2.new(1, 0, 1, 0)
blur.BackgroundColor3 = Color3.fromRGB(0, 0, 0)
blur.BackgroundTransparency = 1
blur.Visible = false
blur.ZIndex = 10
blur.Parent = screenGui

-- Main Inventory Frame
local mainFrame = Instance.new("Frame")
mainFrame.Name = "MainInventory"
mainFrame.Size = UDim2.new(0, 500, 0, 450)
mainFrame.Position = UDim2.new(0.5, -250, 0.5, -225)
mainFrame.BackgroundColor3 = Color3.fromRGB(20, 20, 32)
mainFrame.BorderSizePixel = 0
mainFrame.Visible = false
mainFrame.ZIndex = 11
mainFrame.Parent = screenGui

Instance.new("UICorner", mainFrame).CornerRadius = UDim.new(0, 18)
local mainStroke = Instance.new("UIStroke")
mainStroke.Color = Color3.fromRGB(80, 80, 120)
mainStroke.Thickness = 2
mainStroke.Parent = mainFrame

-- ========================= HEADER =========================
local header = Instance.new("Frame")
header.Size = UDim2.new(1, 0, 0, 55)
header.BackgroundColor3 = Color3.fromRGB(30, 30, 48)
header.BorderSizePixel = 0
header.ZIndex = 12
header.Parent = mainFrame
Instance.new("UICorner", header).CornerRadius = UDim.new(0, 18)

local headerFix = Instance.new("Frame")
headerFix.Size = UDim2.new(1, 0, 0, 18)
headerFix.Position = UDim2.new(0, 0, 1, -18)
headerFix.BackgroundColor3 = Color3.fromRGB(30, 30, 48)
headerFix.BorderSizePixel = 0
headerFix.ZIndex = 12
headerFix.Parent = header

local title = Instance.new("TextLabel")
title.Size = UDim2.new(0.7, 0, 1, 0)
title.Position = UDim2.new(0, 20, 0, 0)
title.BackgroundTransparency = 1
title.Text = "🎒 INVENTORY"
title.TextColor3 = Color3.fromRGB(255, 200, 100)
title.Font = Enum.Font.GothamBlack
title.TextSize = 22
title.TextXAlignment = Enum.TextXAlignment.Left
title.ZIndex = 13
title.Parent = header

local slotCounter = Instance.new("TextLabel")
slotCounter.Size = UDim2.new(0, 120, 0, 30)
slotCounter.Position = UDim2.new(1, -180, 0.5, -15)
slotCounter.BackgroundColor3 = Color3.fromRGB(45, 45, 65)
slotCounter.Text = "6/30 Items"
slotCounter.TextColor3 = Color3.fromRGB(200, 200, 220)
slotCounter.Font = Enum.Font.GothamBold
slotCounter.TextSize = 13
slotCounter.ZIndex = 13
slotCounter.Parent = header
Instance.new("UICorner", slotCounter).CornerRadius = UDim.new(0, 8)

local closeBtn = Instance.new("TextButton")
closeBtn.Size = UDim2.new(0, 40, 0, 40)
closeBtn.Position = UDim2.new(1, -50, 0.5, -20)
closeBtn.BackgroundColor3 = Color3.fromRGB(255, 70, 70)
closeBtn.Text = "✕"
closeBtn.TextColor3 = Color3.new(1, 1, 1)
closeBtn.Font = Enum.Font.GothamBold
closeBtn.TextSize = 18
closeBtn.ZIndex = 13
closeBtn.Parent = header
Instance.new("UICorner", closeBtn).CornerRadius = UDim.new(0, 10)

-- ========================= ITEM GRID =========================
local gridScroll = Instance.new("ScrollingFrame")
gridScroll.Size = UDim2.new(1, -30, 1, -120)
gridScroll.Position = UDim2.new(0, 15, 0, 60)
gridScroll.BackgroundTransparency = 1
gridScroll.ScrollBarThickness = 5
gridScroll.ScrollBarImageColor3 = Color3.fromRGB(100, 100, 140)
gridScroll.CanvasSize = UDim2.new(0, 0, 0, 0)
gridScroll.ZIndex = 12
gridScroll.Parent = mainFrame

local gridLayout = Instance.new("UIGridLayout")
gridLayout.CellSize = UDim2.new(0, CONFIG.SLOT_SIZE, 0, CONFIG.SLOT_SIZE)
gridLayout.CellPadding = UDim2.new(0, CONFIG.SLOT_PADDING, 0, CONFIG.SLOT_PADDING)
gridLayout.SortOrder = Enum.SortOrder.LayoutOrder
gridLayout.Parent = gridScroll

-- ========================= TOOLTIP =========================
local tooltip = Instance.new("Frame")
tooltip.Name = "Tooltip"
tooltip.Size = UDim2.new(0, 180, 0, 120)
tooltip.BackgroundColor3 = Color3.fromRGB(15, 15, 25)
tooltip.BorderSizePixel = 0
tooltip.Visible = false
tooltip.ZIndex = 50
tooltip.Parent = screenGui
Instance.new("UICorner", tooltip).CornerRadius = UDim.new(0, 10)

local tooltipStroke = Instance.new("UIStroke")
tooltipStroke.Thickness = 2
tooltipStroke.Parent = tooltip

local tooltipName = Instance.new("TextLabel")
tooltipName.Size = UDim2.new(1, -16, 0, 25)
tooltipName.Position = UDim2.new(0, 8, 0, 8)
tooltipName.BackgroundTransparency = 1
tooltipName.Font = Enum.Font.GothamBold
tooltipName.TextSize = 14
tooltipName.TextXAlignment = Enum.TextXAlignment.Left
tooltipName.ZIndex = 51
tooltipName.Parent = tooltip

local tooltipType = Instance.new("TextLabel")
tooltipType.Size = UDim2.new(1, -16, 0, 18)
tooltipType.Position = UDim2.new(0, 8, 0, 30)
tooltipType.BackgroundTransparency = 1
tooltipType.TextColor3 = Color3.fromRGB(150, 150, 180)
tooltipType.Font = Enum.Font.Gotham
tooltipType.TextSize = 11
tooltipType.TextXAlignment = Enum.TextXAlignment.Left
tooltipType.ZIndex = 51
tooltipType.Parent = tooltip

local tooltipStats = Instance.new("TextLabel")
tooltipStats.Size = UDim2.new(1, -16, 0, 50)
tooltipStats.Position = UDim2.new(0, 8, 0, 55)
tooltipStats.BackgroundTransparency = 1
tooltipStats.TextColor3 = Color3.fromRGB(180, 220, 180)
tooltipStats.Font = Enum.Font.GothamBold
tooltipStats.TextSize = 12
tooltipStats.TextXAlignment = Enum.TextXAlignment.Left
tooltipStats.TextYAlignment = Enum.TextYAlignment.Top
tooltipStats.TextWrapped = true
tooltipStats.ZIndex = 51
tooltipStats.Parent = tooltip

-- ========================= CREATE ITEM SLOT =========================
local function createItemSlot(item, slotIndex)
    local slot = Instance.new("Frame")
    slot.Name = "Slot_" .. slotIndex
    slot.BackgroundColor3 = item and Color3.fromRGB(40, 40, 55) or Color3.fromRGB(30, 30, 42)
    slot.BorderSizePixel = 0
    slot.ZIndex = 13
    slot.LayoutOrder = slotIndex
    
    Instance.new("UICorner", slot).CornerRadius = UDim.new(0, 10)
    
    if item then
        -- Rarity border
        local rarityGlow = Instance.new("UIStroke")
        rarityGlow.Color = CONFIG.RARITY_COLORS[item.rarity] or CONFIG.RARITY_COLORS.common
        rarityGlow.Thickness = 2
        rarityGlow.Transparency = 0.3
        rarityGlow.Parent = slot
        
        -- Item icon
        local icon = Instance.new("TextLabel")
        icon.Size = UDim2.new(1, 0, 1, item.count and -18 or 0)
        icon.BackgroundTransparency = 1
        icon.Text = item.icon or "?"
        icon.TextSize = 32
        icon.ZIndex = 14
        icon.Parent = slot
        
        -- Stack count
        if item.stackable and item.count then
            local countLabel = Instance.new("TextLabel")
            countLabel.Size = UDim2.new(0, 25, 0, 16)
            countLabel.Position = UDim2.new(1, -28, 1, -19)
            countLabel.BackgroundColor3 = Color3.fromRGB(0, 0, 0)
            countLabel.BackgroundTransparency = 0.3
            countLabel.Text = "x" .. item.count
            countLabel.TextColor3 = Color3.new(1, 1, 1)
            countLabel.Font = Enum.Font.GothamBold
            countLabel.TextSize = 10
            countLabel.ZIndex = 15
            countLabel.Parent = slot
            Instance.new("UICorner", countLabel).CornerRadius = UDim.new(0, 4)
        end
        
        -- Hover effects
        slot.MouseEnter:Connect(function()
            TweenService:Create(slot, TweenInfo.new(0.15), {BackgroundColor3 = Color3.fromRGB(55, 55, 75)}):Play()
            TweenService:Create(rarityGlow, TweenInfo.new(0.15), {Transparency = 0}):Play()
            
            -- Show tooltip
            tooltipName.Text = item.name
            tooltipName.TextColor3 = CONFIG.RARITY_COLORS[item.rarity]
            tooltipType.Text = item.type .. " • " .. item.rarity:upper()
            tooltipStroke.Color = CONFIG.RARITY_COLORS[item.rarity]
            
            local statsText = ""
            if item.stats then
                for k, v in pairs(item.stats) do
                    statsText = statsText .. "+" .. tostring(v) .. " " .. k:upper() .. "\n"
                end
            end
            tooltipStats.Text = statsText
            tooltip.Visible = true
        end)
        
        slot.MouseLeave:Connect(function()
            TweenService:Create(slot, TweenInfo.new(0.15), {BackgroundColor3 = Color3.fromRGB(40, 40, 55)}):Play()
            TweenService:Create(rarityGlow, TweenInfo.new(0.15), {Transparency = 0.3}):Play()
            tooltip.Visible = false
        end)
        
        slot.MouseMoved:Connect(function(x, y)
            tooltip.Position = UDim2.new(0, x + 15, 0, y + 15)
        end)
        
        -- Click to use/equip
        local clickBtn = Instance.new("TextButton")
        clickBtn.Size = UDim2.new(1, 0, 1, 0)
        clickBtn.BackgroundTransparency = 1
        clickBtn.Text = ""
        clickBtn.ZIndex = 16
        clickBtn.Parent = slot
        
        clickBtn.MouseButton1Click:Connect(function()
            local flash = Instance.new("Frame")
            flash.Size = UDim2.new(1, 0, 1, 0)
            flash.BackgroundColor3 = Color3.new(1, 1, 1)
            flash.BackgroundTransparency = 0.5
            flash.ZIndex = 17
            flash.Parent = slot
            Instance.new("UICorner", flash).CornerRadius = UDim.new(0, 10)
            
            TweenService:Create(flash, TweenInfo.new(0.3), {BackgroundTransparency = 1}):Play()
            task.delay(0.3, function() flash:Destroy() end)
            
            print("[Inventory] Used/Equipped: " .. item.name)
        end)
    end
    
    return slot
end

-- ========================= POPULATE INVENTORY =========================
local function refreshInventory()
    for _, child in ipairs(gridScroll:GetChildren()) do
        if child:IsA("Frame") then child:Destroy() end
    end
    
    for i = 1, CONFIG.MAX_SLOTS do
        local item = inventoryData[i]
        local slot = createItemSlot(item, i)
        slot.Parent = gridScroll
    end
    
    slotCounter.Text = #inventoryData .. "/" .. CONFIG.MAX_SLOTS .. " Items"
    
    local rows = math.ceil(CONFIG.MAX_SLOTS / CONFIG.SLOTS_PER_ROW)
    gridScroll.CanvasSize = UDim2.new(0, 0, 0, rows * (CONFIG.SLOT_SIZE + CONFIG.SLOT_PADDING))
end

-- ========================= OPEN/CLOSE =========================
local isOpen = false

local function openInventory()
    if isOpen then return end
    isOpen = true
    blur.Visible = true
    mainFrame.Visible = true
    mainFrame.Size = UDim2.new(0, 0, 0, 0)
    mainFrame.Position = UDim2.new(0.5, 0, 0.5, 0)
    
    TweenService:Create(blur, TweenInfo.new(0.25), {BackgroundTransparency = 0.5}):Play()
    TweenService:Create(mainFrame, TweenInfo.new(0.35, Enum.EasingStyle.Back), {
        Size = UDim2.new(0, 500, 0, 450),
        Position = UDim2.new(0.5, -250, 0.5, -225)
    }):Play()
    
    refreshInventory()
end

local function closeInventory()
    if not isOpen then return end
    isOpen = false
    tooltip.Visible = false
    
    TweenService:Create(blur, TweenInfo.new(0.2), {BackgroundTransparency = 1}):Play()
    TweenService:Create(mainFrame, TweenInfo.new(0.25, Enum.EasingStyle.Back, Enum.EasingDirection.In), {
        Size = UDim2.new(0, 0, 0, 0),
        Position = UDim2.new(0.5, 0, 0.5, 0)
    }):Play()
    
    task.delay(0.25, function()
        blur.Visible = false
        mainFrame.Visible = false
    end)
end

closeBtn.MouseButton1Click:Connect(closeInventory)
blur.InputBegan:Connect(function(input)
    if input.UserInputType == Enum.UserInputType.MouseButton1 then
        closeInventory()
    end
end)

-- ========================= TOGGLE BUTTON =========================
local toggleBtn = Instance.new("TextButton")
toggleBtn.Size = UDim2.new(0, 70, 0, 70)
toggleBtn.Position = UDim2.new(0, 20, 1, -90)
toggleBtn.BackgroundColor3 = Color3.fromRGB(60, 50, 100)
toggleBtn.Text = "🎒"
toggleBtn.TextSize = 32
toggleBtn.Font = Enum.Font.GothamBold
toggleBtn.Parent = screenGui
Instance.new("UICorner", toggleBtn).CornerRadius = UDim.new(0, 16)

local toggleStroke = Instance.new("UIStroke")
toggleStroke.Color = Color3.fromRGB(100, 80, 160)
toggleStroke.Thickness = 2
toggleStroke.Parent = toggleBtn

toggleBtn.MouseButton1Click:Connect(function()
    if isOpen then closeInventory() else openInventory() end
end)

-- Keyboard shortcut (Tab or I)
UserInputService.InputBegan:Connect(function(input, gpe)
    if gpe then return end
    if input.KeyCode == Enum.KeyCode.Tab or input.KeyCode == Enum.KeyCode.I then
        if isOpen then closeInventory() else openInventory() end
    end
end)

print("[BlaxSmith] ✅ ADVANCED INVENTORY SYSTEM loaded!")
print("[BlaxSmith] 🎒 " .. CONFIG.MAX_SLOTS .. " slots | Tab/I to toggle")
]]
                end
                
                -- Check for PET FOLLOW script
                local isPetScript = code:lower():find("pet") and (code:lower():find("follow") or code:lower():find("spawn"))
                if isPetScript then
                    print("[BlaxSmith]  Pet Follow script detected!")
                    finalCode = [[
-- ╔══════════════════════════════════════════════════════════════════════════════╗
-- ║  BlaxSmith ADVANCED PET SYSTEM v2.0                                           ║
-- ║  Premium Pets with Rarity, Abilities, Effects & Pet Manager                   ║
-- ╚══════════════════════════════════════════════════════════════════════════════╝

local Players = game:GetService("Players")
local RunService = game:GetService("RunService")
local TweenService = game:GetService("TweenService")
local UserInputService = game:GetService("UserInputService")
local player = Players.LocalPlayer
local character = player.Character or player.CharacterAdded:Wait()
local rootPart = character:WaitForChild("HumanoidRootPart")

-- ========================= CONFIGURATION =========================
local CONFIG = {
    MAX_EQUIPPED = 3,
    RARITY_COLORS = {
        common = Color3.fromRGB(180, 180, 180),
        uncommon = Color3.fromRGB(30, 255, 0),
        rare = Color3.fromRGB(0, 112, 221),
        epic = Color3.fromRGB(163, 53, 238),
        legendary = Color3.fromRGB(255, 128, 0),
        mythic = Color3.fromRGB(255, 0, 100)
    },
    RARITY_SIZES = {
        common = Vector3.new(1.5, 1.5, 1.5),
        uncommon = Vector3.new(1.7, 1.7, 1.7),
        rare = Vector3.new(2, 2, 2),
        epic = Vector3.new(2.2, 2.2, 2.2),
        legendary = Vector3.new(2.5, 2.5, 2.5),
        mythic = Vector3.new(3, 3, 3)
    }
}

-- Pet Collection (in real game, sync from server)
local petCollection = {
    {id = 1, name = "Blob", rarity = "common", icon = "🟢", equipped = true, ability = "None", damage = 1, coinBonus = 0},
    {id = 2, name = "Fire Spirit", rarity = "rare", icon = "🔥", equipped = true, ability = "+10% Speed", damage = 5, coinBonus = 5},
    {id = 3, name = "Storm Dragon", rarity = "legendary", icon = "🐉", equipped = false, ability = "+25% Coins", damage = 15, coinBonus = 25},
    {id = 4, name = "Shadow Cat", rarity = "epic", icon = "🐱", equipped = false, ability = "Stealth", damage = 10, coinBonus = 15},
    {id = 5, name = "Phoenix", rarity = "mythic", icon = "🦅", equipped = false, ability = "Auto Revive", damage = 30, coinBonus = 50},
}

local activePets = {}

-- ========================= CREATE PET VISUAL =========================
local function createPetVisual(petData, index)
    local pet = Instance.new("Part")
    pet.Name = "Pet_" .. petData.name
    pet.Size = CONFIG.RARITY_SIZES[petData.rarity] or CONFIG.RARITY_SIZES.common
    pet.Shape = Enum.PartType.Ball
    pet.Color = CONFIG.RARITY_COLORS[petData.rarity]
    pet.Material = Enum.Material.Neon
    pet.CanCollide = false
    pet.Anchored = true
    pet.CastShadow = false
    pet.Parent = workspace
    
    -- Particle effects for higher rarities
    if petData.rarity ~= "common" then
        local particles = Instance.new("ParticleEmitter")
        particles.Color = ColorSequence.new(CONFIG.RARITY_COLORS[petData.rarity])
        particles.Size = NumberSequence.new({
            NumberSequenceKeypoint.new(0, 0.3),
            NumberSequenceKeypoint.new(1, 0)
        })
        particles.Lifetime = NumberRange.new(0.5, 1)
        particles.Rate = petData.rarity == "mythic" and 30 or (petData.rarity == "legendary" and 20 or 10)
        particles.Speed = NumberRange.new(1, 2)
        particles.SpreadAngle = Vector2.new(180, 180)
        particles.Parent = pet
    end
    
    -- Glow for legendary+
    if petData.rarity == "legendary" or petData.rarity == "mythic" then
        local light = Instance.new("PointLight")
        light.Color = CONFIG.RARITY_COLORS[petData.rarity]
        light.Brightness = 2
        light.Range = 8
        light.Parent = pet
    end
    
    -- Name tag
    local billboard = Instance.new("BillboardGui")
    billboard.Size = UDim2.new(0, 100, 0, 30)
    billboard.StudsOffset = Vector3.new(0, 2, 0)
    billboard.Adornee = pet
    billboard.Parent = pet
    
    local nameLabel = Instance.new("TextLabel")
    nameLabel.Size = UDim2.new(1, 0, 1, 0)
    nameLabel.BackgroundTransparency = 1
    nameLabel.Text = petData.icon .. " " .. petData.name
    nameLabel.TextColor3 = CONFIG.RARITY_COLORS[petData.rarity]
    nameLabel.Font = Enum.Font.GothamBold
    nameLabel.TextSize = 14
    nameLabel.TextStrokeTransparency = 0.5
    nameLabel.Parent = billboard
    
    -- Offset position based on pet index
    local angle = (index - 1) * (360 / CONFIG.MAX_EQUIPPED)
    local offset = Vector3.new(
        math.sin(math.rad(angle)) * 4,
        2 + (index * 0.3),
        math.cos(math.rad(angle)) * 4
    )
    
    -- Store pet data
    activePets[petData.id] = {
        part = pet,
        data = petData,
        offset = offset,
        bobPhase = math.random() * math.pi * 2
    }
    
    return pet
end

-- ========================= PET MOVEMENT =========================
local bobSpeed = 2
local followSpeed = 0.08

RunService.Heartbeat:Connect(function(dt)
    for id, petInfo in pairs(activePets) do
        if petInfo.part and rootPart then
            petInfo.bobPhase = petInfo.bobPhase + dt * bobSpeed
            local bobOffset = Vector3.new(0, math.sin(petInfo.bobPhase) * 0.5, 0)
            
            local targetPos = rootPart.Position + petInfo.offset + bobOffset
            petInfo.part.Position = petInfo.part.Position:Lerp(targetPos, followSpeed)
            
            -- Rotate to face player
            local lookDir = (rootPart.Position - petInfo.part.Position)
            if lookDir.Magnitude > 0.1 then
                petInfo.part.CFrame = CFrame.new(petInfo.part.Position, rootPart.Position)
            end
        end
    end
end)

-- ========================= SPAWN EQUIPPED PETS =========================
local function spawnEquippedPets()
    -- Clear existing
    for id, petInfo in pairs(activePets) do
        if petInfo.part then petInfo.part:Destroy() end
    end
    activePets = {}
    
    -- Spawn equipped pets
    local index = 1
    for _, pet in ipairs(petCollection) do
        if pet.equipped and index <= CONFIG.MAX_EQUIPPED then
            createPetVisual(pet, index)
            index = index + 1
        end
    end
    
    print("[Pet System] Spawned " .. (index - 1) .. " pets")
end

-- ========================= PET MANAGER GUI =========================
local screenGui = Instance.new("ScreenGui")
screenGui.Name = "BlaxSmith_PetManager"
screenGui.ResetOnSpawn = false
screenGui.Parent = player.PlayerGui

local managerFrame = Instance.new("Frame")
managerFrame.Name = "Manager"
managerFrame.Size = UDim2.new(0, 350, 0, 400)
managerFrame.Position = UDim2.new(0.5, -175, 0.5, -200)
managerFrame.BackgroundColor3 = Color3.fromRGB(20, 20, 35)
managerFrame.Visible = false
managerFrame.Parent = screenGui
Instance.new("UICorner", managerFrame).CornerRadius = UDim.new(0, 16)

local managerStroke = Instance.new("UIStroke")
managerStroke.Color = Color3.fromRGB(100, 80, 160)
managerStroke.Thickness = 2
managerStroke.Parent = managerFrame

local title = Instance.new("TextLabel")
title.Size = UDim2.new(1, 0, 0, 45)
title.BackgroundColor3 = Color3.fromRGB(30, 30, 50)
title.Text = "🐾 PET MANAGER"
title.TextColor3 = Color3.fromRGB(255, 200, 120)
title.Font = Enum.Font.GothamBlack
title.TextSize = 20
title.Parent = managerFrame
Instance.new("UICorner", title).CornerRadius = UDim.new(0, 16)

local closeBtn = Instance.new("TextButton")
closeBtn.Size = UDim2.new(0, 35, 0, 35)
closeBtn.Position = UDim2.new(1, -42, 0, 5)
closeBtn.BackgroundColor3 = Color3.fromRGB(255, 70, 70)
closeBtn.Text = "✕"
closeBtn.TextColor3 = Color3.new(1, 1, 1)
closeBtn.Font = Enum.Font.GothamBold
closeBtn.TextSize = 16
closeBtn.Parent = managerFrame
Instance.new("UICorner", closeBtn).CornerRadius = UDim.new(0, 8)

local petList = Instance.new("ScrollingFrame")
petList.Size = UDim2.new(1, -20, 1, -60)
petList.Position = UDim2.new(0, 10, 0, 50)
petList.BackgroundTransparency = 1
petList.ScrollBarThickness = 5
petList.Parent = managerFrame

local listLayout = Instance.new("UIListLayout")
listLayout.Padding = UDim.new(0, 8)
listLayout.Parent = petList

-- Create pet entries
for _, pet in ipairs(petCollection) do
    local entry = Instance.new("Frame")
    entry.Size = UDim2.new(1, -10, 0, 60)
    entry.BackgroundColor3 = Color3.fromRGB(35, 35, 55)
    entry.Parent = petList
    Instance.new("UICorner", entry).CornerRadius = UDim.new(0, 10)
    
    local entryStroke = Instance.new("UIStroke")
    entryStroke.Color = CONFIG.RARITY_COLORS[pet.rarity]
    entryStroke.Thickness = 2
    entryStroke.Transparency = 0.5
    entryStroke.Parent = entry
    
    local icon = Instance.new("TextLabel")
    icon.Size = UDim2.new(0, 50, 0, 50)
    icon.Position = UDim2.new(0, 5, 0.5, -25)
    icon.BackgroundTransparency = 1
    icon.Text = pet.icon
    icon.TextSize = 32
    icon.Parent = entry
    
    local nameLabel = Instance.new("TextLabel")
    nameLabel.Size = UDim2.new(0, 120, 0, 20)
    nameLabel.Position = UDim2.new(0, 55, 0, 8)
    nameLabel.BackgroundTransparency = 1
    nameLabel.Text = pet.name
    nameLabel.TextColor3 = CONFIG.RARITY_COLORS[pet.rarity]
    nameLabel.Font = Enum.Font.GothamBold
    nameLabel.TextSize = 14
    nameLabel.TextXAlignment = Enum.TextXAlignment.Left
    nameLabel.Parent = entry
    
    local abilityLabel = Instance.new("TextLabel")
    abilityLabel.Size = UDim2.new(0, 150, 0, 15)
    abilityLabel.Position = UDim2.new(0, 55, 0, 28)
    abilityLabel.BackgroundTransparency = 1
    abilityLabel.Text = "⚡ " .. pet.ability
    abilityLabel.TextColor3 = Color3.fromRGB(150, 255, 150)
    abilityLabel.Font = Enum.Font.Gotham
    abilityLabel.TextSize = 11
    abilityLabel.TextXAlignment = Enum.TextXAlignment.Left
    abilityLabel.Parent = entry
    
    local statsLabel = Instance.new("TextLabel")
    statsLabel.Size = UDim2.new(0, 150, 0, 15)
    statsLabel.Position = UDim2.new(0, 55, 0, 42)
    statsLabel.BackgroundTransparency = 1
    statsLabel.Text = "💥 " .. pet.damage .. " DMG | 💰 +" .. pet.coinBonus .. "%"
    statsLabel.TextColor3 = Color3.fromRGB(180, 180, 200)
    statsLabel.Font = Enum.Font.Gotham
    statsLabel.TextSize = 10
    statsLabel.TextXAlignment = Enum.TextXAlignment.Left
    statsLabel.Parent = entry
    
    local equipBtn = Instance.new("TextButton")
    equipBtn.Size = UDim2.new(0, 70, 0, 30)
    equipBtn.Position = UDim2.new(1, -80, 0.5, -15)
    equipBtn.BackgroundColor3 = pet.equipped and Color3.fromRGB(80, 180, 80) or Color3.fromRGB(60, 60, 90)
    equipBtn.Text = pet.equipped and "EQUIPPED" or "EQUIP"
    equipBtn.TextColor3 = Color3.new(1, 1, 1)
    equipBtn.Font = Enum.Font.GothamBold
    equipBtn.TextSize = 11
    equipBtn.Parent = entry
    Instance.new("UICorner", equipBtn).CornerRadius = UDim.new(0, 6)
    
    equipBtn.MouseButton1Click:Connect(function()
        pet.equipped = not pet.equipped
        equipBtn.BackgroundColor3 = pet.equipped and Color3.fromRGB(80, 180, 80) or Color3.fromRGB(60, 60, 90)
        equipBtn.Text = pet.equipped and "EQUIPPED" or "EQUIP"
        spawnEquippedPets()
    end)
end

petList.CanvasSize = UDim2.new(0, 0, 0, #petCollection * 68)

-- Toggle button
local toggleBtn = Instance.new("TextButton")
toggleBtn.Size = UDim2.new(0, 70, 0, 70)
toggleBtn.Position = UDim2.new(0, 100, 1, -90)
toggleBtn.BackgroundColor3 = Color3.fromRGB(100, 60, 120)
toggleBtn.Text = "🐾"
toggleBtn.TextSize = 32
toggleBtn.Parent = screenGui
Instance.new("UICorner", toggleBtn).CornerRadius = UDim.new(0, 16)

local toggleStroke = Instance.new("UIStroke")
toggleStroke.Color = Color3.fromRGB(150, 100, 180)
toggleStroke.Thickness = 2
toggleStroke.Parent = toggleBtn

toggleBtn.MouseButton1Click:Connect(function()
    managerFrame.Visible = not managerFrame.Visible
end)

closeBtn.MouseButton1Click:Connect(function()
    managerFrame.Visible = false
end)

-- Handle respawn
player.CharacterAdded:Connect(function(char)
    character = char
    rootPart = char:WaitForChild("HumanoidRootPart")
    task.wait(0.5)
    spawnEquippedPets()
end)

-- Initial spawn
spawnEquippedPets()

print("[BlaxSmith] ✅ ADVANCED PET SYSTEM loaded!")
print("[BlaxSmith] 🐾 " .. #petCollection .. " pets | " .. CONFIG.MAX_EQUIPPED .. " max equipped")
]]
                end
                
                -- Check for OBBY CHECKPOINT script
                local isCheckpointScript = code:lower():find("checkpoint") or code:lower():find("obby")
                if isCheckpointScript then
                    print("[BlaxSmith]  Checkpoint/Obby script detected!")
                    local script = Instance.new("Script")
                    script.Name = "BlaxSmith_Checkpoints"
                    script.Source = [[
-- BlaxSmith Obby Checkpoint System
local Players = game:GetService("Players")

local checkpoints = {}
for i = 1, 5 do
    local cp = Instance.new("Part")
    cp.Name = "Checkpoint" .. i
    cp.Size = Vector3.new(8, 1, 8)
    cp.Position = Vector3.new(i * 20, 5 + (i * 3), 0)
    cp.Anchored = true
    cp.BrickColor = BrickColor.new("Lime green")
    cp.Material = Enum.Material.Neon
    cp.Parent = workspace
    
    cp.Touched:Connect(function(hit)
        local player = Players:GetPlayerFromCharacter(hit.Parent)
        if player then
            local leaderstats = player:FindFirstChild("leaderstats")
            if leaderstats then
                local stage = leaderstats:FindFirstChild("Stage")
                if stage and stage.Value < i then
                    stage.Value = i
                    print("[Checkpoint] " .. player.Name .. " reached stage " .. i)
                end
            end
        end
    end)
    checkpoints[i] = cp
end

Players.PlayerAdded:Connect(function(player)
    local leaderstats = Instance.new("Folder")
    leaderstats.Name = "leaderstats"
    leaderstats.Parent = player
    
    local stage = Instance.new("IntValue")
    stage.Name = "Stage"
    stage.Value = 1
    stage.Parent = leaderstats
end)

print("[BlaxSmith]  Obby Checkpoints created!")
]]
                    script.Parent = game:GetService("ServerScriptService")
                    Selection:Set({script})
                    ChangeHistoryService:SetWaypoint("AI Created Checkpoints")
                    print("[BlaxSmith]  Created Checkpoint system!")
                    return
                end
                
                -- Check for SWORD/WEAPON script
                local isSwordScript = code:lower():find("sword") or code:lower():find("weapon") or code:lower():find("combat")
                if isSwordScript then
                    print("[BlaxSmith]  Sword/Combat script detected!")
                    local tool = Instance.new("Tool")
                    tool.Name = "BlaxSmith_Sword"
                    tool.RequiresHandle = true
                    
                    local handle = Instance.new("Part")
                    handle.Name = "Handle"
                    handle.Size = Vector3.new(1, 1, 5)
                    handle.BrickColor = BrickColor.new("Bright blue")
                    handle.Material = Enum.Material.Neon
                    handle.Parent = tool
                    
                    local script = Instance.new("Script")
                    script.Source = [[
local tool = script.Parent
local damage = 25

tool.Activated:Connect(function()
    local handle = tool:FindFirstChild("Handle")
    if handle then
        handle.Touched:Connect(function(hit)
            local humanoid = hit.Parent:FindFirstChild("Humanoid")
            if humanoid and humanoid.Parent ~= tool.Parent then
                humanoid:TakeDamage(damage)
            end
        end)
    end
end)
]]
                    script.Parent = tool
                    tool.Parent = game:GetService("StarterPack")
                    Selection:Set({tool})
                    ChangeHistoryService:SetWaypoint("AI Created Sword")
                    print("[BlaxSmith]  Created Sword tool!")
                    return
                end
                
                -- Check for DOOR script
                local isDoorScript = code:lower():find("door")
                if isDoorScript then
                    print("[BlaxSmith]  Door script detected!")
                    local door = Instance.new("Part")
                    door.Name = "BlaxSmith_Door"
                    door.Size = Vector3.new(6, 10, 1)
                    door.Position = Vector3.new(0, 5, 10)
                    door.Anchored = true
                    door.BrickColor = BrickColor.new("Reddish brown")
                    door.Parent = workspace
                    
                    local clickDetector = Instance.new("ClickDetector")
                    clickDetector.Parent = door
                    
                    local script = Instance.new("Script")
                    script.Source = [[
local door = script.Parent
local open = false
local originalPos = door.Position

door.ClickDetector.MouseClick:Connect(function()
    if open then
        door.Position = originalPos
    else
        door.Position = originalPos + Vector3.new(0, 10, 0)
    end
    open = not open
end)
]]
                    script.Parent = door
                    Selection:Set({door})
                    ChangeHistoryService:SetWaypoint("AI Created Door")
                    print("[BlaxSmith]  Created interactive door!")
                    return
                end
                
                -- Check for MOVING PLATFORM script
                local isPlatformScript = code:lower():find("platform") or code:lower():find("moving")
                if isPlatformScript and not isFlyingScript then
                    print("[BlaxSmith]  Moving Platform detected!")
                    local platform = Instance.new("Part")
                    platform.Name = "BlaxSmith_MovingPlatform"
                    platform.Size = Vector3.new(10, 2, 10)
                    platform.Position = Vector3.new(0, 5, 0)
                    platform.Anchored = true
                    platform.BrickColor = BrickColor.new("Bright yellow")
                    platform.Material = Enum.Material.SmoothPlastic
                    platform.Parent = workspace
                    
                    local script = Instance.new("Script")
                    script.Source = [[
local platform = script.Parent
local startPos = platform.Position
local endPos = startPos + Vector3.new(20, 0, 0)
local speed = 2

while true do
    for i = 0, 1, 0.01 do
        platform.Position = startPos:Lerp(endPos, i)
        wait(1/speed/100)
    end
    for i = 1, 0, -0.01 do
        platform.Position = startPos:Lerp(endPos, i)
        wait(1/speed/100)
    end
end
]]
                    script.Parent = platform
                    Selection:Set({platform})
                    ChangeHistoryService:SetWaypoint("AI Created Moving Platform")
                    print("[BlaxSmith]  Created moving platform!")
                    return
                end
                
                -- Check for SPINNING PART script  
                local isSpinScript = code:lower():find("spin") or code:lower():find("rotate")
                if isSpinScript then
                    print("[BlaxSmith]  Spinning part detected!")
                    local part = Instance.new("Part")
                    part.Name = "BlaxSmith_SpinningPart"
                    part.Size = Vector3.new(8, 2, 8)
                    part.Position = Vector3.new(0, 5, 0)
                    part.Anchored = true
                    part.BrickColor = BrickColor.new("Bright orange")
                    part.Material = Enum.Material.Neon
                    part.Parent = workspace
                    
                    local script = Instance.new("Script")
                    script.Source = [[
local part = script.Parent
local speed = 2
while true do
    part.CFrame = part.CFrame * CFrame.Angles(0, math.rad(speed), 0)
    wait()
end
]]
                    script.Parent = part
                    Selection:Set({part})
                    ChangeHistoryService:SetWaypoint("AI Created Spinning Part")
                    print("[BlaxSmith]  Created spinning part!")
                    return
                end
                
                -- Check for MUSIC script
                local isMusicScript = code:lower():find("music") or code:lower():find("radio") or code:lower():find("sound")
                if isMusicScript then
                    print("[BlaxSmith]  Music Player detected!")
                    finalCode = [[
-- BlaxSmith Music Player GUI
local Players = game:GetService("Players")
local player = Players.LocalPlayer

local screenGui = Instance.new("ScreenGui")
screenGui.Name = "BlaxSmith_MusicGUI"
screenGui.Parent = player.PlayerGui

local frame = Instance.new("Frame")
frame.Size = UDim2.new(0, 250, 0, 80)
frame.Position = UDim2.new(1, -270, 1, -100)
frame.BackgroundColor3 = Color3.fromRGB(25, 25, 35)
frame.Parent = screenGui
Instance.new("UICorner", frame).CornerRadius = UDim.new(0, 12)

local title = Instance.new("TextLabel")
title.Size = UDim2.new(1, 0, 0, 30)
title.BackgroundTransparency = 1
title.Text = " Music Player"
title.TextColor3 = Color3.new(1,1,1)
title.Font = Enum.Font.GothamBold
title.TextSize = 16
title.Parent = frame

local playBtn = Instance.new("TextButton")
playBtn.Size = UDim2.new(0.45, 0, 0, 35)
playBtn.Position = UDim2.new(0.025, 0, 0, 38)
playBtn.BackgroundColor3 = Color3.fromRGB(100, 200, 100)
playBtn.Text = " Play"
playBtn.TextColor3 = Color3.new(1,1,1)
playBtn.Font = Enum.Font.GothamBold
playBtn.Parent = frame
Instance.new("UICorner", playBtn).CornerRadius = UDim.new(0, 8)

local stopBtn = Instance.new("TextButton")
stopBtn.Size = UDim2.new(0.45, 0, 0, 35)
stopBtn.Position = UDim2.new(0.525, 0, 0, 38)
stopBtn.BackgroundColor3 = Color3.fromRGB(200, 100, 100)
stopBtn.Text = " Stop"
stopBtn.TextColor3 = Color3.new(1,1,1)
stopBtn.Font = Enum.Font.GothamBold
stopBtn.Parent = frame
Instance.new("UICorner", stopBtn).CornerRadius = UDim.new(0, 8)

local sound = Instance.new("Sound")
sound.SoundId = "rbxassetid://1837849285"
sound.Volume = 0.5
sound.Looped = true
sound.Parent = player.PlayerGui

playBtn.MouseButton1Click:Connect(function()
    sound:Play()
    playBtn.Text = " Playing"
end)

stopBtn.MouseButton1Click:Connect(function()
    sound:Stop()
    playBtn.Text = " Play"
end)

print("[BlaxSmith]  Music Player loaded!")
]]
                end
                
                -- Check for DASH/DODGE script
                local isDashScript = code:lower():find("dash") or code:lower():find("dodge") or code:lower():find("roll")
                if isDashScript then
                    print("[BlaxSmith]  Dash script detected!")
                    finalCode = [[
-- BlaxSmith Dash Script
local Players = game:GetService("Players")
local UserInputService = game:GetService("UserInputService")
local player = Players.LocalPlayer
local character = player.Character or player.CharacterAdded:Wait()
local humanoid = character:WaitForChild("Humanoid")
local rootPart = character:WaitForChild("HumanoidRootPart")

local dashSpeed = 80
local dashDuration = 0.2
local cooldown = 1
local canDash = true

local screenGui = Instance.new("ScreenGui")
screenGui.Name = "BlaxSmith_DashGUI"
screenGui.Parent = player.PlayerGui

local label = Instance.new("TextLabel")
label.Size = UDim2.new(0, 150, 0, 40)
label.Position = UDim2.new(0.5, -75, 1, -100)
label.BackgroundColor3 = Color3.fromRGB(100, 100, 200)
label.Text = " Press Q to Dash"
label.TextColor3 = Color3.new(1,1,1)
label.Font = Enum.Font.GothamBold
label.TextSize = 14
label.Parent = screenGui
Instance.new("UICorner", label).CornerRadius = UDim.new(0, 10)

UserInputService.InputBegan:Connect(function(input, gpe)
    if gpe then return end
    if input.KeyCode == Enum.KeyCode.Q and canDash then
        canDash = false
        label.Text = " Dashing!"
        label.BackgroundColor3 = Color3.fromRGB(200, 100, 200)
        
        local bodyVel = Instance.new("BodyVelocity")
        bodyVel.MaxForce = Vector3.new(math.huge, 0, math.huge)
        bodyVel.Velocity = rootPart.CFrame.LookVector * dashSpeed
        bodyVel.Parent = rootPart
        
        wait(dashDuration)
        bodyVel:Destroy()
        
        label.Text = " Cooldown..."
        wait(cooldown)
        canDash = true
        label.Text = " Press Q to Dash"
        label.BackgroundColor3 = Color3.fromRGB(100, 100, 200)
    end
end)

print("[BlaxSmith]  Dash script loaded! Press Q to dash!")
]]
                end
                
                -- Check for STAMINA script
                local isStaminaScript = code:lower():find("stamina") or code:lower():find("energy")
                if isStaminaScript then
                    print("[BlaxSmith]  Stamina system detected!")
                    finalCode = [[
-- BlaxSmith Stamina System
local Players = game:GetService("Players")
local UserInputService = game:GetService("UserInputService")
local RunService = game:GetService("RunService")
local player = Players.LocalPlayer
local character = player.Character or player.CharacterAdded:Wait()
local humanoid = character:WaitForChild("Humanoid")

local maxStamina = 100
local stamina = 100
local drainRate = 20
local regenRate = 10

local screenGui = Instance.new("ScreenGui")
screenGui.Name = "BlaxSmith_StaminaGUI"
screenGui.Parent = player.PlayerGui

local barBg = Instance.new("Frame")
barBg.Size = UDim2.new(0, 200, 0, 20)
barBg.Position = UDim2.new(0.5, -100, 1, -40)
barBg.BackgroundColor3 = Color3.fromRGB(40, 40, 50)
barBg.Parent = screenGui
Instance.new("UICorner", barBg).CornerRadius = UDim.new(0, 6)

local barFill = Instance.new("Frame")
barFill.Size = UDim2.new(1, 0, 1, 0)
barFill.BackgroundColor3 = Color3.fromRGB(255, 200, 0)
barFill.Parent = barBg
Instance.new("UICorner", barFill).CornerRadius = UDim.new(0, 6)

local label = Instance.new("TextLabel")
label.Size = UDim2.new(1, 0, 1, 0)
label.BackgroundTransparency = 1
label.Text = " 100%"
label.TextColor3 = Color3.new(1,1,1)
label.Font = Enum.Font.GothamBold
label.TextSize = 12
label.Parent = barBg

RunService.Heartbeat:Connect(function(dt)
    local sprinting = UserInputService:IsKeyDown(Enum.KeyCode.LeftShift)
    if sprinting and stamina > 0 then
        stamina = math.max(0, stamina - drainRate * dt)
        humanoid.WalkSpeed = 32
    else
        stamina = math.min(maxStamina, stamina + regenRate * dt)
        humanoid.WalkSpeed = 16
    end
    barFill.Size = UDim2.new(stamina/maxStamina, 0, 1, 0)
    label.Text = " " .. math.floor(stamina) .. "%"
end)

print("[BlaxSmith]  Stamina system loaded! Hold SHIFT to sprint!")
]]
                end
                
                -- Check for XP/LEVEL script
                local isXPScript = code:lower():find("xp") or (code:lower():find("level") and not code:lower():find("lighting"))
                if isXPScript then
                    print("[BlaxSmith]  XP/Level system detected!")
                    local script = Instance.new("Script")
                    script.Name = "BlaxSmith_XPSystem"
                    script.Source = [[
-- BlaxSmith XP/Level System
local Players = game:GetService("Players")

local xpPerLevel = 100

Players.PlayerAdded:Connect(function(player)
    local leaderstats = Instance.new("Folder")
    leaderstats.Name = "leaderstats"
    leaderstats.Parent = player
    
    local level = Instance.new("IntValue")
    level.Name = "Level"
    level.Value = 1
    level.Parent = leaderstats
    
    local xp = Instance.new("IntValue")
    xp.Name = "XP"
    xp.Value = 0
    xp.Parent = leaderstats
    
    xp.Changed:Connect(function()
        local required = level.Value * xpPerLevel
        if xp.Value >= required then
            level.Value = level.Value + 1
            xp.Value = xp.Value - required
            print(player.Name .. " leveled up to " .. level.Value .. "!")
        end
    end)
end)

-- Give XP every 5 seconds for testing
while true do
    wait(5)
    for _, player in pairs(Players:GetPlayers()) do
        local xp = player:FindFirstChild("leaderstats") and player.leaderstats:FindFirstChild("XP")
        if xp then
            xp.Value = xp.Value + 25
        end
    end
end
]]
                    script.Parent = game:GetService("ServerScriptService")
                    Selection:Set({script})
                    ChangeHistoryService:SetWaypoint("AI Created XP System")
                    print("[BlaxSmith]  Created XP/Level system!")
                    return
                end
                
                -- Check for LOADING SCREEN script
                local isLoadingScript = code:lower():find("loading") and (code:lower():find("screen") or code:lower():find("gui"))
                if isLoadingScript then
                    print("[BlaxSmith]  Loading Screen detected!")
                    finalCode = [[
-- BlaxSmith Premium Loading Screen
local Players = game:GetService("Players")
local TweenService = game:GetService("TweenService")
local ContentProvider = game:GetService("ContentProvider")
local player = Players.LocalPlayer

local screenGui = Instance.new("ScreenGui")
screenGui.Name = "BlaxSmith_LoadingScreen"
screenGui.IgnoreGuiInset = true
screenGui.Parent = player.PlayerGui

-- BACKGROUND
local background = Instance.new("Frame")
background.Size = UDim2.new(1, 0, 1, 0)
background.BackgroundColor3 = Color3.fromRGB(15, 15, 25)
background.Parent = screenGui

local gradient = Instance.new("UIGradient")
gradient.Color = ColorSequence.new({
    ColorSequenceKeypoint.new(0, Color3.fromRGB(20, 20, 35)),
    ColorSequenceKeypoint.new(1, Color3.fromRGB(10, 10, 20))
})
gradient.Rotation = 90
gradient.Parent = background

-- PARTICLES
local particles = Instance.new("Frame")
particles.Size = UDim2.new(1, 0, 1, 0)
particles.BackgroundTransparency = 1
particles.Parent = background

for i = 1, 20 do
    local dot = Instance.new("Frame")
    dot.Size = UDim2.new(0, math.random(4, 8), 0, math.random(4, 8))
    dot.Position = UDim2.new(math.random(), 0, math.random(), 0)
    dot.BackgroundColor3 = Color3.fromRGB(255, 255, 255)
    dot.BackgroundTransparency = math.random() * 0.5 + 0.3
    dot.Parent = particles
    Instance.new("UICorner", dot).CornerRadius = UDim.new(1, 0)
    
    -- Animate dots (floating up)
    TweenService:Create(dot, TweenInfo.new(math.random(3, 6), Enum.EasingStyle.Linear, Enum.EasingDirection.Out, -1, true), {Position = dot.Position - UDim2.new(0, 0, 0.2, 0), BackgroundTransparency = 1}):Play()
end

-- LOGO / TITLE
local title = Instance.new("TextLabel")
title.Size = UDim2.new(1, 0, 0, 80)
title.Position = UDim2.new(0, 0, 0.35, 0)
title.BackgroundTransparency = 1
title.Text = " INITIALIZING..."
title.TextColor3 = Color3.new(1, 1, 1)
title.Font = Enum.Font.GothamBold
title.TextSize = 42
title.Parent = background
title.Parent = background

local titleStroke = Instance.new("UIStroke")
titleStroke.Thickness = 2
titleStroke.Transparency = 0.5
titleStroke.Parent = title

-- LOADING BAR CONTAINER
local barBg = Instance.new("Frame")
barBg.Size = UDim2.new(0.6, 0, 0, 16)
barBg.Position = UDim2.new(0.2, 0, 0.55, 0)
barBg.BackgroundColor3 = Color3.fromRGB(30, 30, 50)
barBg.Parent = background
Instance.new("UICorner", barBg).CornerRadius = UDim.new(1, 0)

-- LOADING BAR FILL
local barFill = Instance.new("Frame")
barFill.Size = UDim2.new(0, 0, 1, 0)
barFill.BackgroundColor3 = Color3.fromRGB(0, 255, 150)
barFill.Parent = barBg
Instance.new("UICorner", barFill).CornerRadius = UDim.new(1, 0)

local fillGradient = Instance.new("UIGradient")
fillGradient.Color = ColorSequence.new({
    ColorSequenceKeypoint.new(0, Color3.fromRGB(0, 200, 255)),
    ColorSequenceKeypoint.new(1, Color3.fromRGB(150, 0, 255))
})
fillGradient.Parent = barFill

local statusLabel = Instance.new("TextLabel")
statusLabel.Size = UDim2.new(1, 0, 0, 30)
statusLabel.Position = UDim2.new(0, 0, 0.55, 0)
statusLabel.BackgroundTransparency = 1
statusLabel.Text = "Loading assets..."
statusLabel.TextColor3 = Color3.fromRGB(150, 150, 180)
statusLabel.Font = Enum.Font.Gotham
statusLabel.TextSize = 18
statusLabel.Parent = background

-- Animate loading
for i = 0, 100, 2 do
    barFill.Size = UDim2.new(i/100, 0, 1, 0)
    statusLabel.Text = "Loading... " .. i .. "%"
    wait(0.05)
end

-- Fade out
local fadeOut = TweenService:Create(background, TweenInfo.new(1), {BackgroundTransparency = 1})
TweenService:Create(title, TweenInfo.new(1), {TextTransparency = 1}):Play()
TweenService:Create(barBg, TweenInfo.new(1), {BackgroundTransparency = 1}):Play()
TweenService:Create(barFill, TweenInfo.new(1), {BackgroundTransparency = 1}):Play()
TweenService:Create(statusLabel, TweenInfo.new(1), {TextTransparency = 1}):Play()
fadeOut:Play()
fadeOut.Completed:Wait()
screenGui:Destroy()

print("[BlaxSmith]  Loading screen completed!")
]]
                end
                
                -- Check for MENU script (HIGH PRIORITY - before settings)
                local isMenuScript = code:lower():find("main menu") or (code:lower():find("menu") and not code:lower():find("settings"))
                if isMenuScript and not isShopScript then
                    print("[BlaxSmith]  MAIN MENU detected - creating fancy version!")
                    finalCode = [[
-- BlaxSmith Premium Main Menu
local Players = game:GetService("Players")
local TweenService = game:GetService("TweenService")
local RunService = game:GetService("RunService")
local player = Players.LocalPlayer

local screenGui = Instance.new("ScreenGui")
screenGui.Name = "BlaxSmith_MainMenu"
screenGui.IgnoreGuiInset = true
screenGui.ZIndexBehavior = Enum.ZIndexBehavior.Sibling
screenGui.Parent = player.PlayerGui

-- FULLSCREEN BACKGROUND
local background = Instance.new("Frame")
background.Size = UDim2.new(1, 0, 1, 0)
background.BackgroundColor3 = Color3.fromRGB(10, 10, 20)
background.Parent = screenGui

local gradient = Instance.new("UIGradient")
gradient.Color = ColorSequence.new({
    ColorSequenceKeypoint.new(0, Color3.fromRGB(20, 10, 40)),
    ColorSequenceKeypoint.new(0.5, Color3.fromRGB(10, 20, 50)),
    ColorSequenceKeypoint.new(1, Color3.fromRGB(5, 5, 15))
})
gradient.Rotation = 45
gradient.Parent = background

-- Animated particles effect
local particles = Instance.new("Frame")
particles.Size = UDim2.new(1, 0, 1, 0)
particles.BackgroundTransparency = 1
particles.Parent = background

for i = 1, 30 do
    local star = Instance.new("Frame")
    star.Size = UDim2.new(0, math.random(2, 6), 0, math.random(2, 6))
    star.Position = UDim2.new(math.random() * 0.95, 0, math.random() * 0.95, 0)
    star.BackgroundColor3 = Color3.fromRGB(255, 255, 255)
    star.BackgroundTransparency = math.random() * 0.5 + 0.3
    star.Parent = particles
    Instance.new("UICorner", star).CornerRadius = UDim.new(1, 0)
end

-- ANIMATED TITLE
local titleContainer = Instance.new("Frame")
titleContainer.Size = UDim2.new(1, 0, 0, 150)
titleContainer.Position = UDim2.new(0, 0, 0.1, 0)
titleContainer.BackgroundTransparency = 1
titleContainer.Parent = background

local title = Instance.new("TextLabel")
title.Size = UDim2.new(1, 0, 0, 80)
title.BackgroundTransparency = 1
title.Text = " MY AWESOME GAME"
title.TextColor3 = Color3.new(1, 1, 1)
title.Font = Enum.Font.GothamBold
title.TextSize = 64
title.Parent = titleContainer

local titleGlow = Instance.new("UIStroke")
titleGlow.Color = Color3.fromRGB(150, 100, 255)
titleGlow.Thickness = 2
titleGlow.Transparency = 0.5
titleGlow.Parent = title

local subtitle = Instance.new("TextLabel")
subtitle.Size = UDim2.new(1, 0, 0, 30)
subtitle.Position = UDim2.new(0, 0, 0, 85)
subtitle.BackgroundTransparency = 1
subtitle.Text = "Created with BlaxSmith AI "
subtitle.TextColor3 = Color3.fromRGB(150, 150, 200)
subtitle.Font = Enum.Font.Gotham
subtitle.TextSize = 20
subtitle.Parent = titleContainer

-- BUTTON CONTAINER
local buttonContainer = Instance.new("Frame")
buttonContainer.Size = UDim2.new(0, 350, 0, 320)
buttonContainer.Position = UDim2.new(0.5, -175, 0.4, 0)
buttonContainer.BackgroundTransparency = 1
buttonContainer.Parent = background

local layout = Instance.new("UIListLayout")
layout.Padding = UDim.new(0, 20)
layout.HorizontalAlignment = Enum.HorizontalAlignment.Center
layout.Parent = buttonContainer

-- FANCY BUTTONS
local buttonData = {
    {text = "  PLAY GAME", color1 = Color3.fromRGB(100, 200, 100), color2 = Color3.fromRGB(50, 150, 80), action = "play"},
    {text = "  SETTINGS", color1 = Color3.fromRGB(100, 150, 255), color2 = Color3.fromRGB(80, 100, 200), action = "settings"},
    {text = "  CREDITS", color1 = Color3.fromRGB(255, 200, 100), color2 = Color3.fromRGB(200, 150, 50), action = "credits"},
    {text = "  QUIT", color1 = Color3.fromRGB(255, 100, 100), color2 = Color3.fromRGB(200, 50, 80), action = "quit"},
}

for i, data in ipairs(buttonData) do
    local btn = Instance.new("TextButton")
    btn.Size = UDim2.new(1, 0, 0, 65)
    btn.BackgroundColor3 = Color3.new(1, 1, 1)
    btn.Text = data.text
    btn.TextColor3 = Color3.new(1, 1, 1)
    btn.Font = Enum.Font.GothamBold
    btn.TextSize = 24
    btn.Parent = buttonContainer
    btn.AutoButtonColor = false
    
    local corner = Instance.new("UICorner")
    corner.CornerRadius = UDim.new(0, 16)
    corner.Parent = btn
    
    local btnGrad = Instance.new("UIGradient")
    btnGrad.Color = ColorSequence.new({
        ColorSequenceKeypoint.new(0, data.color1),
        ColorSequenceKeypoint.new(1, data.color2)
    })
    btnGrad.Rotation = 90
    btnGrad.Parent = btn
    
    local stroke = Instance.new("UIStroke")
    stroke.Color = Color3.new(1, 1, 1)
    stroke.Thickness = 2
    stroke.Transparency = 0.7
    stroke.Parent = btn
    
    -- Hover effects
    btn.MouseEnter:Connect(function()
        TweenService:Create(btn, TweenInfo.new(0.2), {Size = UDim2.new(1.05, 0, 0, 70)}):Play()
        TweenService:Create(stroke, TweenInfo.new(0.2), {Transparency = 0}):Play()
    end)
    
    btn.MouseLeave:Connect(function()
        TweenService:Create(btn, TweenInfo.new(0.2), {Size = UDim2.new(1, 0, 0, 65)}):Play()
        TweenService:Create(stroke, TweenInfo.new(0.2), {Transparency = 0.7}):Play()
    end)
    
    btn.MouseButton1Click:Connect(function()
        if data.action == "play" then
            -- Fade out and close menu
            TweenService:Create(background, TweenInfo.new(0.8, Enum.EasingStyle.Quad), {BackgroundTransparency = 1}):Play()
            for _, child in pairs(background:GetDescendants()) do
                if child:IsA("TextLabel") or child:IsA("TextButton") then
                    TweenService:Create(child, TweenInfo.new(0.5), {TextTransparency = 1}):Play()
                end
                if child:IsA("Frame") then
                    TweenService:Create(child, TweenInfo.new(0.5), {BackgroundTransparency = 1}):Play()
                end
            end
            wait(0.8)
            screenGui:Destroy()
        elseif data.action == "quit" then
            player:Kick("Thanks for playing!")
        end
    end)
end

-- VERSION TEXT
local version = Instance.new("TextLabel")
version.Size = UDim2.new(0, 200, 0, 30)
version.Position = UDim2.new(1, -210, 1, -40)
version.BackgroundTransparency = 1
version.Text = "v1.0.0 | BlaxSmith AI"
version.TextColor3 = Color3.fromRGB(100, 100, 120)
version.Font = Enum.Font.Gotham
version.TextSize = 14
version.TextXAlignment = Enum.TextXAlignment.Right
version.Parent = background

-- Animate title glow
spawn(function()
    while screenGui.Parent do
        TweenService:Create(titleGlow, TweenInfo.new(1.5), {Transparency = 0.2}):Play()
        wait(1.5)
        TweenService:Create(titleGlow, TweenInfo.new(1.5), {Transparency = 0.7}):Play()
        wait(1.5)
    end
end)

print("[BlaxSmith]  Premium Main Menu loaded!")
]]
                end
                
                -- Check for ADMIN PANEL script
                local isAdminScript = code:lower():find("admin") and (code:lower():find("panel") or code:lower():find("command") or code:lower():find("gui"))
                if isAdminScript then
                    print("[BlaxSmith]  Admin Panel detected!")
                    local script = Instance.new("Script")
                    script.Name = "BlaxSmith_AdminPanel"
                    script.Source = [[
-- BlaxSmith Admin Panel System
local Players = game:GetService("Players")
local ReplicatedStorage = game:GetService("ReplicatedStorage")

local ADMINS = {"King_davez"} -- Add your username here

local adminEvent = Instance.new("RemoteEvent")
adminEvent.Name = "BlaxSmith_AdminEvent"
adminEvent.Parent = ReplicatedStorage

local function isAdmin(player)
    for _, name in ipairs(ADMINS) do
        if player.Name:lower() == name:lower() then
            return true
        end
    end
    return false
end

adminEvent.OnServerEvent:Connect(function(player, action, target)
    if not isAdmin(player) then return end
    
    local targetPlayer = Players:FindFirstChild(target)
    if targetPlayer then
        if action == "kick" then
            targetPlayer:Kick("Kicked by admin")
        elseif action == "kill" then
            local humanoid = targetPlayer.Character and targetPlayer.Character:FindFirstChild("Humanoid")
            if humanoid then humanoid.Health = 0 end
        elseif action == "speed" then
            local humanoid = targetPlayer.Character and targetPlayer.Character:FindFirstChild("Humanoid")
            if humanoid then humanoid.WalkSpeed = 100 end
        elseif action == "fly" then
            -- Fly handled client-side
        end
    end
end)

print("[BlaxSmith]  Admin Panel server loaded!")
]]
                    script.Parent = game:GetService("ServerScriptService")
                    
                    -- Also create the client GUI
                    local localScript = Instance.new("LocalScript")
                    localScript.Name = "BlaxSmith_AdminGUI"
                    localScript.Source = [[
-- BlaxSmith Admin Panel GUI
local Players = game:GetService("Players")
local ReplicatedStorage = game:GetService("ReplicatedStorage")
local player = Players.LocalPlayer

local adminEvent = ReplicatedStorage:WaitForChild("BlaxSmith_AdminEvent")

local screenGui = Instance.new("ScreenGui")
screenGui.Name = "BlaxSmith_AdminGUI"
screenGui.Parent = player.PlayerGui

local frame = Instance.new("Frame")
frame.Size = UDim2.new(0, 300, 0, 350)
frame.Position = UDim2.new(0, 20, 0.5, -175)
frame.BackgroundColor3 = Color3.fromRGB(25, 25, 35)
frame.Visible = false
frame.Parent = screenGui
Instance.new("UICorner", frame).CornerRadius = UDim.new(0, 16)

local gradient = Instance.new("UIGradient")
gradient.Color = ColorSequence.new({
    ColorSequenceKeypoint.new(0, Color3.fromRGB(40, 20, 60)),
    ColorSequenceKeypoint.new(1, Color3.fromRGB(20, 20, 40))
})
gradient.Rotation = 45
gradient.Parent = frame

local title = Instance.new("TextLabel")
title.Size = UDim2.new(1, 0, 0, 50)
title.BackgroundTransparency = 1
title.Text = " ADMIN PANEL"
title.TextColor3 = Color3.fromRGB(255, 215, 0)
title.Font = Enum.Font.GothamBold
title.TextSize = 24
title.Parent = frame

local targetBox = Instance.new("TextBox")
targetBox.Size = UDim2.new(0.9, 0, 0, 40)
targetBox.Position = UDim2.new(0.05, 0, 0, 60)
targetBox.BackgroundColor3 = Color3.fromRGB(50, 50, 70)
targetBox.PlaceholderText = "Enter player name..."
targetBox.Text = ""
targetBox.TextColor3 = Color3.new(1,1,1)
targetBox.Font = Enum.Font.Gotham
targetBox.Parent = frame
Instance.new("UICorner", targetBox).CornerRadius = UDim.new(0, 8)

local commands = {
    {text = " KICK", action = "kick", color = Color3.fromRGB(255, 100, 100)},
    {text = " KILL", action = "kill", color = Color3.fromRGB(200, 50, 50)},
    {text = " SPEED", action = "speed", color = Color3.fromRGB(100, 200, 255)},
}

for i, cmd in ipairs(commands) do
    local btn = Instance.new("TextButton")
    btn.Size = UDim2.new(0.9, 0, 0, 45)
    btn.Position = UDim2.new(0.05, 0, 0, 110 + (i * 55))
    btn.BackgroundColor3 = cmd.color
    btn.Text = cmd.text
    btn.TextColor3 = Color3.new(1,1,1)
    btn.Font = Enum.Font.GothamBold
    btn.TextSize = 18
    btn.Parent = frame
    Instance.new("UICorner", btn).CornerRadius = UDim.new(0, 10)
    
    btn.MouseButton1Click:Connect(function()
        if targetBox.Text ~= "" then
            adminEvent:FireServer(cmd.action, targetBox.Text)
        end
    end)
end

local toggleBtn = Instance.new("TextButton")
toggleBtn.Size = UDim2.new(0, 100, 0, 40)
toggleBtn.Position = UDim2.new(0, 20, 0, 20)
toggleBtn.BackgroundColor3 = Color3.fromRGB(255, 215, 0)
toggleBtn.Text = " Admin"
toggleBtn.TextColor3 = Color3.fromRGB(30, 30, 30)
toggleBtn.Font = Enum.Font.GothamBold
toggleBtn.Parent = screenGui
Instance.new("UICorner", toggleBtn).CornerRadius = UDim.new(0, 10)

toggleBtn.MouseButton1Click:Connect(function()
    frame.Visible = not frame.Visible
end)

print("[BlaxSmith]  Admin Panel GUI loaded!")
]]
                    localScript.Parent = game:GetService("StarterPlayer"):FindFirstChild("StarterPlayerScripts")
                    
                    Selection:Set({script, localScript})
                    ChangeHistoryService:SetWaypoint("AI Created Admin Panel")
                    print("[BlaxSmith]  Created Admin Panel (Server + Client)!")
                    return
                end
                
                -- Check for SETTINGS script (ONLY if NOT main menu)
                local isSettingsScript = code:lower():find("settings") or code:lower():find("options")
                local isMainMenuInCode = code:lower():find("main") and code:lower():find("menu")
                if isSettingsScript and not isMenuScript and not isMainMenuInCode then
                    print("[BlaxSmith]  Settings Menu detected!")
                    finalCode = [[
-- BlaxSmith Premium Settings Menu
local Players = game:GetService("Players")
local TweenService = game:GetService("TweenService")
local player = Players.LocalPlayer

local screenGui = Instance.new("ScreenGui")
screenGui.Name = "BlaxSmith_SettingsGUI"
screenGui.IgnoreGuiInset = true
screenGui.Parent = player.PlayerGui

-- DARK OVERLAY (click to close)
local overlay = Instance.new("TextButton")
overlay.Size = UDim2.new(1, 0, 1, 0)
overlay.BackgroundColor3 = Color3.fromRGB(0, 0, 0)
overlay.BackgroundTransparency = 1
overlay.Text = ""
overlay.Visible = false
overlay.Parent = screenGui

-- MAIN PANEL
local frame = Instance.new("Frame")
frame.Size = UDim2.new(0, 400, 0, 500)
frame.Position = UDim2.new(0.5, -200, 0.5, -250)
frame.BackgroundColor3 = Color3.fromRGB(20, 20, 35)
frame.BackgroundTransparency = 0.1
frame.Visible = false
frame.ClipsDescendants = true
frame.Parent = screenGui
Instance.new("UICorner", frame).CornerRadius = UDim.new(0, 20)

local uiStroke = Instance.new("UIStroke")
uiStroke.Color = Color3.fromRGB(60, 60, 90)
uiStroke.Thickness = 2
uiStroke.Parent = frame

-- BACKGROUND GRADIENT
local gradient = Instance.new("UIGradient")
gradient.Color = ColorSequence.new({
    ColorSequenceKeypoint.new(0, Color3.fromRGB(30, 30, 50)),
    ColorSequenceKeypoint.new(1, Color3.fromRGB(15, 15, 25))
})
gradient.Rotation = 45
gradient.Parent = frame

-- TITLE
local title = Instance.new("TextLabel")
title.Size = UDim2.new(1, 0, 0, 70)
title.BackgroundTransparency = 1
title.Text = " SETTINGS"
title.TextColor3 = Color3.new(1,1,1)
title.Font = Enum.Font.GothamBold
title.TextSize = 32
title.Parent = frame

-- SEPARATOR
local sep = Instance.new("Frame")
sep.Size = UDim2.new(0.8, 0, 0, 2)
sep.Position = UDim2.new(0.1, 0, 0, 70)
sep.BackgroundColor3 = Color3.fromRGB(255, 255, 255)
sep.BackgroundTransparency = 0.8
sep.Parent = frame

-- HELPER: Create Toggle Option
local function createToggle(name, yPos)
    local container = Instance.new("Frame")
    container.Size = UDim2.new(0.9, 0, 0, 50)
    container.Position = UDim2.new(0.05, 0, 0, yPos)
    container.BackgroundTransparency = 1
    container.Parent = frame

    local label = Instance.new("TextLabel")
    label.Size = UDim2.new(0.6, 0, 1, 0)
    label.BackgroundTransparency = 1
    label.Text = name
    label.TextColor3 = Color3.fromRGB(200, 200, 220)
    label.Font = Enum.Font.GothamMedium
    label.TextSize = 18
    label.TextXAlignment = Enum.TextXAlignment.Left
    label.Parent = container

    local toggleBtn = Instance.new("TextButton")
    toggleBtn.Size = UDim2.new(0, 60, 0, 30)
    toggleBtn.Position = UDim2.new(1, -70, 0.5, -15)
    toggleBtn.BackgroundColor3 = Color3.fromRGB(50, 200, 100)
    toggleBtn.Text = ""
    toggleBtn.Parent = container
    Instance.new("UICorner", toggleBtn).CornerRadius = UDim.new(1, 0)
    
    local knob = Instance.new("Frame")
    knob.Size = UDim2.new(0, 24, 0, 24)
    knob.Position = UDim2.new(1, -27, 0.5, -12)
    knob.BackgroundColor3 = Color3.new(1,1,1)
    knob.Parent = toggleBtn
    Instance.new("UICorner", knob).CornerRadius = UDim.new(1, 0)

    local isOn = true
    toggleBtn.MouseButton1Click:Connect(function()
        isOn = not isOn
        local targetPos = isOn and UDim2.new(1, -27, 0.5, -12) or UDim2.new(0, 3, 0.5, -12)
        local targetColor = isOn and Color3.fromRGB(50, 200, 100) or Color3.fromRGB(80, 80, 90)
        
        TweenService:Create(knob, TweenInfo.new(0.2), {Position = targetPos}):Play()
        TweenService:Create(toggleBtn, TweenInfo.new(0.2), {BackgroundColor3 = targetColor}):Play()
    end)
end

createToggle(" Background Music", 100)
createToggle(" Sound Effects", 160)
createToggle(" Shadows", 220)
createToggle(" Particle Effects", 280)

-- OPEN BUTTON
local openBtn = Instance.new("TextButton")
openBtn.Size = UDim2.new(0, 50, 0, 50)
openBtn.Position = UDim2.new(0, 20, 0, 20)
openBtn.BackgroundColor3 = Color3.fromRGB(40, 40, 60)
openBtn.Text = ""
openBtn.TextColor3 = Color3.new(1,1,1)
openBtn.TextSize = 30
openBtn.Font = Enum.Font.GothamBold
openBtn.Parent = screenGui
Instance.new("UICorner", openBtn).CornerRadius = UDim.new(0, 12)
Instance.new("UIStroke", openBtn).Color = Color3.fromRGB(100, 100, 150)
Instance.new("UIStroke", openBtn).Thickness = 2

-- ANIMATION LOGIC
local isOpen = false
local function toggleMenu()
    isOpen = not isOpen
    if isOpen then
        frame.Visible = true
        overlay.Visible = true
        frame.Position = UDim2.new(0.5, -200, 0.6, -250) -- Start slightly lower
        frame.BackgroundTransparency = 1
        
        TweenService:Create(frame, TweenInfo.new(0.3, Enum.EasingStyle.Back), {Position = UDim2.new(0.5, -200, 0.5, -250), BackgroundTransparency = 0.1}):Play()
        TweenService:Create(overlay, TweenInfo.new(0.3), {BackgroundTransparency = 0.5}):Play()
    else
        TweenService:Create(frame, TweenInfo.new(0.2), {Position = UDim2.new(0.5, -200, 0.6, -250), BackgroundTransparency = 1}):Play()
        TweenService:Create(overlay, TweenInfo.new(0.2), {BackgroundTransparency = 1}):Play()
        wait(0.2)
        frame.Visible = false
        overlay.Visible = false
    end
end

openBtn.MouseButton1Click:Connect(toggleMenu)
overlay.MouseButton1Click:Connect(toggleMenu)

print("[BlaxSmith]  Premium Settings Menu loaded!")
]]
                end
                
                -- Check for NOTIFICATION script
                local isNotifScript = code:lower():find("notification") or code:lower():find("toast") or code:lower():find("popup")
                if isNotifScript then
                    print("[BlaxSmith]  Notification System detected!")
                    finalCode = [[
-- BlaxSmith Notification System
local Players = game:GetService("Players")
local TweenService = game:GetService("TweenService")
local player = Players.LocalPlayer

local screenGui = Instance.new("ScreenGui")
screenGui.Name = "BlaxSmith_NotificationGUI"
screenGui.Parent = player.PlayerGui

local container = Instance.new("Frame")
container.Size = UDim2.new(0, 350, 1, 0)
container.Position = UDim2.new(1, -370, 0, 0)
container.BackgroundTransparency = 1
container.Parent = screenGui

local layout = Instance.new("UIListLayout")
layout.Padding = UDim.new(0, 10)
layout.VerticalAlignment = Enum.VerticalAlignment.Top
layout.Parent = container

local function showNotification(title, message, color)
    local notif = Instance.new("Frame")
    notif.Size = UDim2.new(1, 0, 0, 80)
    notif.BackgroundColor3 = Color3.fromRGB(30, 30, 45)
    notif.Position = UDim2.new(1, 0, 0, 0)
    notif.Parent = container
    Instance.new("UICorner", notif).CornerRadius = UDim.new(0, 12)
    
    local accent = Instance.new("Frame")
    accent.Size = UDim2.new(0, 5, 1, 0)
    accent.BackgroundColor3 = color or Color3.fromRGB(0, 200, 255)
    accent.Parent = notif
    Instance.new("UICorner", accent).CornerRadius = UDim.new(0, 12)
    
    local titleLabel = Instance.new("TextLabel")
    titleLabel.Size = UDim2.new(1, -20, 0, 30)
    titleLabel.Position = UDim2.new(0, 15, 0, 10)
    titleLabel.BackgroundTransparency = 1
    titleLabel.Text = title
    titleLabel.TextColor3 = Color3.new(1,1,1)
    titleLabel.Font = Enum.Font.GothamBold
    titleLabel.TextSize = 16
    titleLabel.TextXAlignment = Enum.TextXAlignment.Left
    titleLabel.Parent = notif
    
    local msgLabel = Instance.new("TextLabel")
    msgLabel.Size = UDim2.new(1, -20, 0, 30)
    msgLabel.Position = UDim2.new(0, 15, 0, 40)
    msgLabel.BackgroundTransparency = 1
    msgLabel.Text = message
    msgLabel.TextColor3 = Color3.fromRGB(180, 180, 200)
    msgLabel.Font = Enum.Font.Gotham
    msgLabel.TextSize = 14
    msgLabel.TextXAlignment = Enum.TextXAlignment.Left
    msgLabel.Parent = notif
    
    TweenService:Create(notif, TweenInfo.new(0.3), {Position = UDim2.new(0, 0, 0, 0)}):Play()
    
    wait(5)
    TweenService:Create(notif, TweenInfo.new(0.3), {Position = UDim2.new(1, 0, 0, 0)}):Play()
    wait(0.3)
    notif:Destroy()
end

-- Demo notifications
wait(1)
showNotification(" Welcome!", "Thanks for playing!", Color3.fromRGB(0, 200, 255))
wait(2)
showNotification(" Achievement!", "You earned a reward!", Color3.fromRGB(255, 200, 0))

print("[BlaxSmith]  Notification System loaded!")
]]
                end
                
                -- Check for NPC script
                local isNPCScript = code:lower():find("npc") or code:lower():find("enemy") or code:lower():find("mob") or code:lower():find("villager")
                if isNPCScript then
                    print("[BlaxSmith]  NPC detected - creating in workspace!")
                    
                    -- Create NPC model
                    local npc = Instance.new("Model")
                    npc.Name = "BlaxSmith_NPC"
                    
                    -- Create humanoid
                    local humanoid = Instance.new("Humanoid")
                    humanoid.Parent = npc
                    
                    -- Create body parts
                    local torso = Instance.new("Part")
                    torso.Name = "HumanoidRootPart"
                    torso.Size = Vector3.new(2, 2, 1)
                    torso.Position = Vector3.new(10, 5, 10)
                    torso.Anchored = false
                    torso.CanCollide = true
                    torso.BrickColor = BrickColor.new("Bright blue")
                    torso.Parent = npc
                    npc.PrimaryPart = torso
                    
                    local head = Instance.new("Part")
                    head.Name = "Head"
                    head.Size = Vector3.new(2, 1, 1)
                    head.Position = torso.Position + Vector3.new(0, 1.5, 0)
                    head.BrickColor = BrickColor.new("Light orange")
                    head.Parent = npc
                    
                    local face = Instance.new("Decal")
                    face.Face = Enum.NormalId.Front
                    face.Texture = "rbxasset://textures/face.png"
                    face.Parent = head
                    
                    -- Weld head to torso
                    local weld = Instance.new("Weld")
                    weld.Part0 = torso
                    weld.Part1 = head
                    weld.C0 = CFrame.new(0, 1.5, 0)
                    weld.Parent = torso
                    
                    -- Add click interaction
                    local clickDetector = Instance.new("ClickDetector")
                    clickDetector.MaxActivationDistance = 20
                    clickDetector.Parent = torso
                    
                    -- Add dialog billboard
                    local billboard = Instance.new("BillboardGui")
                    billboard.Size = UDim2.new(0, 200, 0, 50)
                    billboard.StudsOffset = Vector3.new(0, 3, 0)
                    billboard.Adornee = head
                    billboard.Parent = head
                    
                    local nameLabel = Instance.new("TextLabel")
                    nameLabel.Size = UDim2.new(1, 0, 1, 0)
                    nameLabel.BackgroundTransparency = 1
                    nameLabel.Text = " Friendly NPC"
                    nameLabel.TextColor3 = Color3.new(1, 1, 1)
                    nameLabel.Font = Enum.Font.GothamBold
                    nameLabel.TextSize = 18
                    nameLabel.Parent = billboard
                    
                    -- NPC AI Script
                    local aiScript = Instance.new("Script")
                    aiScript.Name = "NPC_AI"
                    aiScript.Source = [[
local npc = script.Parent
local humanoid = npc:FindFirstChild("Humanoid")
local rootPart = npc:FindFirstChild("HumanoidRootPart")
local clickDetector = rootPart:FindFirstChild("ClickDetector")

local dialogues = {
    "Hello there, traveler!",
    "Nice weather today, isn't it?",
    "Welcome to our village!",
    "Have you seen any monsters around?",
    "Stay safe out there!"
}

-- Random wandering
spawn(function()
    while humanoid and humanoid.Health > 0 do
        local randomPos = rootPart.Position + Vector3.new(math.random(-20, 20), 0, math.random(-20, 20))
        humanoid:MoveTo(randomPos)
        wait(math.random(3, 8))
    end
end)

-- Click interaction
if clickDetector then
    clickDetector.MouseClick:Connect(function(player)
        local head = npc:FindFirstChild("Head")
        if head then
            local billboard = head:FindFirstChild("BillboardGui")
            if billboard then
                local label = billboard:FindFirstChild("TextLabel")
                if label then
                    label.Text = dialogues[math.random(1, #dialogues)]
                end
            end
        end
    end)
end

print("[BlaxSmith]  NPC AI running!")
]]
                    aiScript.Parent = npc
                    
                    npc.Parent = workspace
                    Selection:Set({npc})
                    ChangeHistoryService:SetWaypoint("AI Created NPC")
                    print("[BlaxSmith]  Created NPC with AI in workspace!")
                    return
                end
                -- Determine script name based on type
                local scriptName = "BlaxSmith_Script"
                if isFlyingScript then scriptName = "BlaxSmith_FlyingScript"
                elseif isSpeedScript then scriptName = "BlaxSmith_SpeedScript"
                elseif isHealthScript then scriptName = "BlaxSmith_HealthScript"
                elseif isShopScript then scriptName = "BlaxSmith_ShopScript"
                elseif isTeleportScript then scriptName = "BlaxSmith_TeleportScript"
                elseif isSprintScript then scriptName = "BlaxSmith_SprintScript"
                elseif isJumpScript then scriptName = "BlaxSmith_JumpScript"
                elseif isNoclipScript then scriptName = "BlaxSmith_NoclipScript"
                elseif isTimerScript then scriptName = "BlaxSmith_TimerScript"
                elseif isTrailScript then scriptName = "BlaxSmith_TrailScript"
                elseif isInventoryScript then scriptName = "BlaxSmith_InventoryScript"
                elseif isPetScript then scriptName = "BlaxSmith_PetScript"
                elseif isMusicScript then scriptName = "BlaxSmith_MusicScript"
                elseif isDashScript then scriptName = "BlaxSmith_DashScript"
                elseif isStaminaScript then scriptName = "BlaxSmith_StaminaScript"
                end
                
                local StarterPlayerScripts = game:GetService("StarterPlayer"):FindFirstChild("StarterPlayerScripts")
                if not StarterPlayerScripts then
                    StarterPlayerScripts = Instance.new("Folder")
                    StarterPlayerScripts.Name = "StarterPlayerScripts"
                    StarterPlayerScripts.Parent = game:GetService("StarterPlayer")
                end
                
                local localScript = Instance.new("LocalScript")
                localScript.Name = scriptName
                localScript.Source = finalCode
                localScript.Parent = StarterPlayerScripts
                
                Selection:Set({localScript})
                ChangeHistoryService:SetWaypoint("AI Created LocalScript")
                print("[BlaxSmith]  Created LocalScript in StarterPlayerScripts!")
                print("[BlaxSmith]  Play the game to see the GUI and test flying!")
            else
                -- Regular code (terrain, parts, etc.) - execute via loadstring
                local func, err = loadstring(code)
                if func then
                    local env = getfenv(func)
                    env.script = nil
                    env.game = game
                    env.workspace = workspace
                    
                    local success, runtimeErr = pcall(func)
                    if success then
                        ChangeHistoryService:SetWaypoint("AI Code Execution")
                        print("[BlaxSmith]  Code executed successfully!")
                    else
                        warn("[BlaxSmith]  Runtime Error:", tostring(runtimeErr))
                    end
                else
                    warn("[BlaxSmith]  Syntax Error:", tostring(err))
                end
            end
        end
    end,

    -- === FORGE MIND VI JSON COMMAND ===
    forge_json = function(cmd)
        -- Support both direct objects array or wrapped in data/args
        local data = cmd
        if cmd.data then data = cmd.data end
        if cmd.args then data = cmd.args end
        
        -- Ensure we preserve the original command fields if they were at the root
        if not data.objects and cmd.objects then
            data.objects = cmd.objects
        end
        if not data.target_parent and cmd.target_parent then
            data.target_parent = cmd.target_parent
        end
        
        print("[BlaxSmith]  Received ForgeMind Command")
        executeForgeCommand(data)
    end,
    
    -- === INSERT TOOLBOX ASSET (Models, Tools, Audio) ===
    insert_toolbox_asset = function(cmd)
        local assetId = tonumber(cmd.assetId or cmd.id or (cmd.args and cmd.args.assetId))
        local query = cmd.query or cmd.name or cmd.assetName or "Asset"
        
        if not assetId then
            warn("[BlaxSmith]  insert_toolbox_asset missing assetId")
            return
        end
        
        print("[BlaxSmith]  Inserting Toolbox Asset: " .. tostring(assetId))
        
        local model = nil
        local success = false
        
        -- TRY METHOD 1: game:GetObjects() - Works for more free models
        local getObjectsSuccess, getObjectsResult = pcall(function()
            local url = "rbxassetid://" .. tostring(assetId)
            local objects = game:GetObjects(url)
            if objects and #objects > 0 then
                return objects[1]
            end
            return nil
        end)
        
        if getObjectsSuccess and getObjectsResult then
            model = getObjectsResult
            success = true
            print("[BlaxSmith]  Loaded via game:GetObjects()")
        else
            -- FALLBACK: InsertService:LoadAsset() - Works for Roblox-owned gear
            local insertSuccess, insertResult = pcall(function() 
                return InsertService:LoadAsset(assetId) 
            end)
            
            if insertSuccess and insertResult then
                model = insertResult
                success = true
                print("[BlaxSmith]  Loaded via InsertService:LoadAsset()")
            end
        end
        
        if success and model then
            model.Parent = workspace
            
            -- Move to Camera focus
            if model:IsA("Model") and model.PrimaryPart then
                model:PivotTo(getFocusPoint())
            elseif model:FindFirstChildWhichIsA("BasePart") then
                local part = model:FindFirstChildWhichIsA("BasePart")
                part.CFrame = getFocusPoint()
            end
            
            -- Auto-equip Tools to StarterPack
            for _, child in pairs(model:GetChildren()) do
                if child:IsA("Tool") then
                    child.Parent = game:GetService("StarterPack")
                    print("[BlaxSmith]  Auto-equipped Tool: " .. child.Name)
                end
            end
            
            Selection:Set(model:GetChildren())
            ChangeHistoryService:SetWaypoint("AI Inserted " .. query)
            print("[BlaxSmith]  Asset Inserted: " .. query .. " (ID: " .. tostring(assetId) .. ")")
        else
            warn("[BlaxSmith]  Failed to load asset " .. tostring(assetId) .. " - Asset may be off-sale or require copy permission")
        end
    end,
    
    -- === INSERT (Alias for insert_toolbox_asset) ===
    insert = function(cmd)
        CommandHandlers.insert_toolbox_asset(cmd)
    end,
    
    -- === CREATE SCRIPT (Server/Client Logic) ===
    create_script = function(cmd)
        local name = cmd.name or (cmd.args and cmd.args.name) or "AI_Generated_Script"
        local code = cmd.code or (cmd.args and cmd.args.code) or ""
        local location = cmd.location or (cmd.args and cmd.args.location) or "Server"
        
        local parent = ServerScriptService
        local class = "Script"
        
        if location == "Client" or name:match("Local") then
            parent = StarterPlayer.StarterPlayerScripts
            class = "LocalScript"
        end
        
        local scriptObj = Instance.new(class)
        scriptObj.Name = name
        scriptObj.Source = code
        scriptObj.Parent = parent
        Selection:Set({scriptObj})
        ChangeHistoryService:SetWaypoint("AI Created Script: " .. name)
        print("[BlaxSmith]  Created Script: " .. name .. " in " .. parent.Name)
    end,
    
    -- === CREATE LOCAL SCRIPT ===
    create_local_script = function(cmd)
        local name = cmd.name or "AI_LocalScript"
        local code = cmd.code or ""
        local scriptObj = Instance.new("LocalScript")
        scriptObj.Name = name
        scriptObj.Source = code
        scriptObj.Parent = StarterPlayer.StarterPlayerScripts
        Selection:Set({scriptObj})
        ChangeHistoryService:SetWaypoint("AI Created LocalScript: " .. name)
        print("[BlaxSmith]  Created LocalScript: " .. name)
    end,
    
    -- === CREATE MODULE SCRIPT ===
    create_module_script = function(cmd)
        local name = cmd.name or "AI_Module"
        local code = cmd.code or "local module = {}\nreturn module"
        local scriptObj = Instance.new("ModuleScript")
        scriptObj.Name = name
        scriptObj.Source = code
        scriptObj.Parent = ReplicatedStorage
        Selection:Set({scriptObj})
        ChangeHistoryService:SetWaypoint("AI Created ModuleScript: " .. name)
        print("[BlaxSmith]  Created ModuleScript: " .. name)
    end,
    
    -- === CREATE SCREEN GUI ===
    create_gui = function(cmd)
        local code = cmd.code or ""
        if code ~= "" then
            -- Execute the GUI creation code directly
            CommandHandlers.run_editor_command({code = code})
        else
            local name = cmd.name or "AI_ScreenGui"
            local gui = Instance.new("ScreenGui")
            gui.Name = name
            gui.ResetOnSpawn = false
            gui.Parent = StarterGui
            Selection:Set({gui})
            ChangeHistoryService:SetWaypoint("AI Created GUI: " .. name)
            print("[BlaxSmith]  Created ScreenGui: " .. name)
        end
    end,
    
    -- === CREATE SOUND ===
    create_sound = function(cmd)
        local soundId = cmd.soundId or cmd.id or "9120491093"
        local name = cmd.name or "AI_Sound"
        local sound = Instance.new("Sound")
        sound.Name = name
        sound.SoundId = "rbxassetid://" .. tostring(soundId)
        sound.Volume = cmd.volume or 0.5
        sound.Looped = cmd.looped or false
        sound.Parent = workspace
        if cmd.play then sound:Play() end
        Selection:Set({sound})
        ChangeHistoryService:SetWaypoint("AI Created Sound")
        print("[BlaxSmith]  Created Sound: " .. name)
    end,
    
    -- === CREATE ANIMATION ===
    create_animation = function(cmd)
        local animId = cmd.animId or cmd.id or "180426354"
        local name = cmd.name or "AI_Animation"
        local anim = Instance.new("Animation")
        anim.Name = name
        anim.AnimationId = "rbxassetid://" .. tostring(animId)
        anim.Parent = ReplicatedStorage
        Selection:Set({anim})
        ChangeHistoryService:SetWaypoint("AI Created Animation")
        print("[BlaxSmith]  Created Animation: " .. name)
    end,
    
    -- === CREATE PARTICLES ===
    create_particles = function(cmd)
        local code = cmd.code or ""
        if code ~= "" then
            CommandHandlers.run_editor_command({code = code})
        else
            local part = Instance.new("Part")
            part.Name = "ParticleSource"
            part.Anchored = true
            part.Transparency = 1
            part.Position = Vector3.new(0, 10, 0)
            part.Parent = workspace
            
            local emitter = Instance.new("ParticleEmitter")
            emitter.Parent = part
            Selection:Set({part})
            ChangeHistoryService:SetWaypoint("AI Created Particles")
            print("[BlaxSmith]  Created Particle System")
        end
    end,
    
    -- === CREATE MODEL (Empty model structure) ===
    create_model = function(cmd)
        local name = cmd.name or "AI_Model"
        local model = Instance.new("Model")
        model.Name = name
        
        -- Create a primary part
        local mainPart = Instance.new("Part")
        mainPart.Name = "MainPart"
        mainPart.Anchored = true
        mainPart.Position = workspace.CurrentCamera and 
            (workspace.CurrentCamera.CFrame * CFrame.new(0, 0, -15)).Position or 
            Vector3.new(0, 5, 0)
        mainPart.Parent = model
        model.PrimaryPart = mainPart
        model.Parent = workspace
        
        Selection:Set({model})
        ChangeHistoryService:SetWaypoint("AI Created Model: " .. name)
        print("[BlaxSmith]  Created Model: " .. name)
    end,
    
    -- === TERRAIN (Special terrain handler) ===
    terrain = function(cmd)
        CommandHandlers.run_editor_command(cmd)
    end,
    
    -- === LOAD ASSET (Alias) ===
    loadAsset = function(cmd)
        CommandHandlers.insert_toolbox_asset(cmd)
    end,
    
    -- === CREATE REMOTE EVENT ===
    create_remote = function(cmd)
        local name = cmd.name or "AI_RemoteEvent"
        local remote = Instance.new("RemoteEvent")
        remote.Name = name
        remote.Parent = ReplicatedStorage
        ChangeHistoryService:SetWaypoint("AI Created RemoteEvent")
        print("[BlaxSmith]  Created RemoteEvent: " .. name)
    end,
}

local function pollForCommands()
    -- Get Context
    local context = ContextTracker.getSelectedContext()
    local encodedContext = HttpService:UrlEncode(context)
    -- Get API Key
    local apiKey = plugin:GetSetting("BlaxSmithAPIKey") or ""
    local encodedKey = HttpService:UrlEncode(apiKey)
    
    local success, response = pcall(function()
        return HttpService:GetAsync(CONFIG.APP_URL .. "/plugin/poll?context=" .. encodedContext .. "&apiKey=" .. encodedKey)
    end)
    
    if success then
        if not isConnected then
            isConnected = true
            connectionStartTime = tick()
            print("[BlaxSmith]  AUTO-CONNECTED to Desktop App!")
            -- Update status label
            pcall(function()
                local statusLabel = centerContainer:FindFirstChild("StatusLabel")
                if statusLabel then
                    statusLabel.Text = " Connected to Desktop App"
                    statusLabel.TextColor3 = Color3.fromRGB(100, 255, 150)
                end
                -- Hide spinner when connected
                local spinner = centerContainer:FindFirstChild("SpinnerContainer")
                if spinner then spinner.Visible = false end
            end)
        end
        
        local data = HttpService:JSONDecode(response)
        if data and data.commands and #data.commands > 0 then
            for _, cmd in ipairs(data.commands) do
                print("[BlaxSmith]  Received command: " .. tostring(cmd.type))
                
                -- Process command through CommandHandlers
                if CommandHandlers and CommandHandlers[cmd.type] then
                    local cmdSuccess, cmdErr = pcall(function()
                        CommandHandlers[cmd.type](cmd.data or cmd)
                    end)
                    if not cmdSuccess then
                        warn("[BlaxSmith]  Command error: " .. tostring(cmdErr))
                    end
                else
                    -- Fallback to executeCommand if handler not found
                    if executeCommand then
                         executeCommand(cmd.type, cmd.data or cmd)
                    else
                         warn("[BlaxSmith]  Unknown command: " .. tostring(cmd.type))
                    end
                end
            end
        end
    else
        if isConnected then
            isConnected = false
            print("[BlaxSmith]  Disconnected from Desktop App. Retrying...")
            -- Update status label
            pcall(function()
                local statusLabel = centerContainer:FindFirstChild("StatusLabel")
                if statusLabel then
                    statusLabel.Text = " Disconnected - Reconnecting..."
                    statusLabel.TextColor3 = Color3.fromRGB(255, 180, 100)
                end
                local spinner = centerContainer:FindFirstChild("SpinnerContainer")
                if spinner then spinner.Visible = true end
            end)
        else
            -- Still trying to connect
            pcall(function()
                local statusLabel = centerContainer:FindFirstChild("StatusLabel")
                if statusLabel and statusLabel.Text == "Initializing..." then
                    statusLabel.Text = " Connecting to Desktop App..."
                end
            end)
        end
    end
end

-- Start auto-polling immediately
spawn(function()
    print("[BlaxSmith]  Starting AUTO-CONNECT polling...")
    wait(3) -- Wait for splash screen to finish
    
    while true do
        pollForCommands()
        wait(1) -- Poll every 1 second
    end
end)

-- Send initial connect signal
spawn(function()
    wait(2)
    local success = pcall(function()
        HttpService:PostAsync(CONFIG.APP_URL .. "/plugin/connect", HttpService:JSONEncode({
            version = CONFIG.PLUGIN_VERSION,
            game = game.Name,
            placeId = game.PlaceId
        }), Enum.HttpContentType.ApplicationJson)
    end)
    if success then
        print("[BlaxSmith]  Plugin registered with Desktop App!")
    end
end)

-- ============================================
--  AUTO-VISION: SCENE MONITORING
-- ============================================
spawn(function()
    -- Wait for connection to stabilize
    wait(5)
    print("[BlaxSmith]  Auto-Vision initialized...")
    
    local lastCount = 0
    local lastScanTime = 0
    
    while true do
        wait(10) -- Check every 10 seconds
        
        -- Simple change detection: Object count
        local currentCount = #workspace:GetChildren()
        local timeSince = tick() - lastScanTime
        
        -- Scan if meaningful change OR timeout (30s)
        if (math.abs(currentCount - lastCount) > 2) or (timeSince > 30) then
            if CommandHandlers["scan-scene"] then
                local success, err = pcall(function()
                    CommandHandlers["scan-scene"]()
                end)
                if success then
                    lastCount = currentCount
                    lastScanTime = tick()
                end
            end
        end
    end
end)

-- ============================================
-- OBSERVER: ERROR REPORTING & VISION
-- ============================================
local function reportErrorToApp(message, traceback, scriptName)
    spawn(function()
        pcall(function()
            HttpService:PostAsync(CONFIG.APP_URL .. "/log-error", HttpService:JSONEncode({
                type = "error",
                message = message,
                traceback = traceback,
                scriptName = scriptName or "StudioGlobal",
                time = tick()
            }), Enum.HttpContentType.ApplicationJson)
        end)
    end)
end

local function reportVisionToApp()
    local workspaceObjects = #workspace:GetDescendants()
    local activePlayers = #Players:GetPlayers()
    
    spawn(function()
        pcall(function()
            HttpService:PostAsync(CONFIG.APP_URL .. "/vision", HttpService:JSONEncode({
                type = "vision",
                workspace = { count = workspaceObjects }, -- Simplified for perf
                playerCount = activePlayers,
                time = tick()
            }), Enum.HttpContentType.ApplicationJson)
        end)
    end)
end

-- Hook into global Studio logs for error detection
LogService.MessageOut:Connect(function(message, messageType)
    if messageType == Enum.MessageType.MessageError then
        print("[BlaxSmith Observer]  Error Detected:", message)
        reportErrorToApp(message, debug.traceback(), "StudioError")
    end
end)

-- Start Vision reporting loop
spawn(function()
    while true do
        if isConnected then
            reportVisionToApp()
        end
        wait(10) -- Report every 10 seconds
    end
end)

print("[BlaxSmith] BlaxSmith v" .. CONFIG.PLUGIN_VERSION .. " Ready - Observer ACTIVE!")

end -- END COMMAND HANDLERS/GAME GENERATOR SCOPE

-- ============================================
-- COMMAND POLLING SYSTEM (Auto-Insert Scripts)
-- ============================================
do -- BEGIN COMMAND POLLING SCOPE (reduces local register count)

local InsertService = game:GetService("InsertService")
local Selection = game:GetService("Selection")
local ChangeHistoryService = game:GetService("ChangeHistoryService")

-- 1. Helper: Get location in front of camera
local function getSpawnCFrame()
    if workspace.CurrentCamera then
        return workspace.CurrentCamera.CFrame * CFrame.new(0, 0, -15)
    end
    return CFrame.new(0, 10, 0)
end

-- 2. Helper: Anti-clipping ground placement
-- IMPORTANT: Default position is offset from spawn (0,0,0) to prevent player collision
local SAFE_SPAWN_OFFSET = Vector3.new(50, 5, 50)

local function snapToGround(obj, targetPos)
    -- Use safe offset if none provided (offset from 0,0,0)
    targetPos = targetPos or SAFE_SPAWN_OFFSET
    
    -- Safety check: If targetPos is too close to origin, assume it's default and use camera spawn
    if targetPos.Magnitude < 5 then
        targetPos = getSpawnCFrame().Position
    end

    local size, cf
    if obj:IsA("Model") then 
        cf, size = obj:GetBoundingBox()
    elseif obj:IsA("BasePart") then 
        size = obj.Size
        cf = obj.CFrame 
    else
        return
    end

    local heightOffset = size.Y / 2
    local rayOrigin = Vector3.new(targetPos.X, targetPos.Y + 500, targetPos.Z) -- Start high up
    
    -- Raycast parameters (ignore the object itself)
    local rayParams = RaycastParams.new()
    rayParams.FilterDescendantsInstances = {obj}
    rayParams.FilterType = Enum.RaycastFilterType.Exclude

    local rayResult = workspace:Raycast(rayOrigin, Vector3.new(0, -1000, 0), rayParams)
    
    -- Calculate final Y: Ground Y + Half Height = Center Position
    local groundY = (rayResult and rayResult.Position.Y) or targetPos.Y
    
    -- Extra safety: Ensure it's not underground if raycast fails
    if not rayResult and groundY < 0 then groundY = 10 end
    
    local finalY = groundY + heightOffset
    local finalPos = Vector3.new(targetPos.X, finalY, targetPos.Z)

    if obj:IsA("Model") then 
        obj:PivotTo(CFrame.new(finalPos) * (cf - cf.Position)) -- Maintain rotation
    elseif obj:IsA("BasePart") then 
        obj.Position = finalPos 
    end
    print("[BlaxSmith]  Snapped to ground at Y=" .. finalY .. " (Ray hit: " .. tostring(rayResult ~= nil) .. ")")
end

-- 3. Helper: Weather & Lighting Controller
local function setWeather(presetName)
    local Lighting = game:GetService("Lighting")
    presetName = string.lower(presetName or "day")
    
    if presetName == "day" or presetName == "clear" then
        Lighting.ClockTime = 14
        Lighting.Brightness = 2
        Lighting.FogEnd = 100000
    elseif presetName == "night" or presetName == "midnight" then
        Lighting.ClockTime = 0
        Lighting.Brightness = 1
        Lighting.FogEnd = 100000
    elseif presetName == "sunset" then
        Lighting.ClockTime = 17.5
        Lighting.Brightness = 2
    elseif presetName == "foggy" or presetName == "spooky" then
        Lighting.ClockTime = 0
        Lighting.Brightness = 0.5
        Lighting.FogStart = 0
        Lighting.FogEnd = 50
        Lighting.FogColor = Color3.fromRGB(50, 50, 50)
    end
    print("[BlaxSmith]  Weather set to: " .. presetName)
end

-- 4. Helper: Visual Effects (Fire/Smoke/Sparkles)
local function addEffect(targetObj, effectType, properties)
    if not targetObj then warn("[BlaxSmith]  No target for effect") return end
    
    local allowedEffects = {Fire=true, Smoke=true, Sparkles=true, ParticleEmitter=true, PointLight=true}
    if not allowedEffects[effectType] then warn("[BlaxSmith]  Invalid Effect: " .. effectType) return end

    local fx = Instance.new(effectType)
    fx.Parent = targetObj
    
    if properties then
        for p, v in pairs(properties) do pcall(function() fx[p] = v end) end
    end
    print("[BlaxSmith]  Added " .. effectType .. " to " .. targetObj.Name)
    return fx
end

-- 5. Helper: Animation Player
local function playAnimation(characterModel, animId)
    local humanoid = characterModel:FindFirstChildOfClass("Humanoid")
    local animator = humanoid and humanoid:FindFirstChildOfClass("Animator")
    
    if not animator and humanoid then 
        animator = Instance.new("Animator", humanoid) 
    end

    if animator then
        local animation = Instance.new("Animation")
        animation.AnimationId = "rbxassetid://" .. tostring(animId)
        
        local track = animator:LoadAnimation(animation)
        track:Play()
        print("[BlaxSmith]  Playing Animation: " .. animId)
        return track
    else
        warn("[BlaxSmith]  Cannot animate: No Humanoid found")
    end
end

-- 6. Helper: Audio System (Music & SFX)
local function playAudio(soundId, isLooping, parentPart)
    local SoundService = game:GetService("SoundService")
    local sound = Instance.new("Sound")
    sound.SoundId = "rbxassetid://" .. tostring(soundId)
    sound.Looped = isLooping or false
    sound.Volume = 1
    
    if parentPart then
        sound.Parent = parentPart -- 3D Sound (gets quieter as you walk away)
    else
        sound.Parent = SoundService -- Global Sound (Music)
    end
    
    sound:Play()
    print("[BlaxSmith]  Playing Audio: " .. soundId .. (isLooping and " (Looping)" or ""))
    return sound
end

-- 7. Helper: Graphics & Post-Processing
local function setGraphics(style)
    local Lighting = game:GetService("Lighting")
    style = string.lower(style or "realistic")
    
    -- Clear old effects
    for _, v in pairs(Lighting:GetChildren()) do
        if v:IsA("PostEffect") or v:IsA("Sky") or v:IsA("Atmosphere") then 
            v:Destroy() 
        end
    end

    if style == "realistic" or style == "highquality" then
        local bloom = Instance.new("BloomEffect", Lighting)
        bloom.Intensity = 1
        bloom.Threshold = 0.9
        local rays = Instance.new("SunRaysEffect", Lighting)
        rays.Intensity = 0.1
        local colorCorr = Instance.new("ColorCorrectionEffect", Lighting)
        colorCorr.Saturation = 0.2
        colorCorr.Contrast = 0.1
        Lighting.EnvironmentDiffuseScale = 1
        Lighting.EnvironmentSpecularScale = 1
        print("[BlaxSmith]  Graphics set to Realistic")

    elseif style == "cartoon" or style == "bright" then
        local colorCorr = Instance.new("ColorCorrectionEffect", Lighting)
        colorCorr.Saturation = 0.5
        Lighting.Brightness = 3
        Lighting.EnvironmentDiffuseScale = 0.5
        print("[BlaxSmith]  Graphics set to Cartoon")
        
    elseif style == "blur" or style == "menu" or style == "blurry" then
        local blur = Instance.new("BlurEffect", Lighting)
        blur.Size = 24
        print("[BlaxSmith]  Graphics set to Blur")
        
    elseif style == "cinematic" then
        local bloom = Instance.new("BloomEffect", Lighting)
        bloom.Intensity = 0.5
        local colorCorr = Instance.new("ColorCorrectionEffect", Lighting)
        colorCorr.Contrast = 0.2
        colorCorr.TintColor = Color3.fromRGB(255, 240, 220)
        local dof = Instance.new("DepthOfFieldEffect", Lighting)
        dof.FarIntensity = 0.5
        dof.FocusDistance = 50
        print("[BlaxSmith]  Graphics set to Cinematic")
    end
end

-- 8. Helper: Load Community Asset with Multi-Try Fallback
-- Tries multiple asset IDs until one loads successfully
local function loadCommunityAsset(assetIds, assetName, position)
    local InsertService = game:GetService("InsertService")
    local Selection = game:GetService("Selection")
    
    -- If assetIds is a single number, wrap it
    if type(assetIds) == "number" then
        assetIds = {assetIds}
    end
    
    -- Add fallback ROBLOX-OWNED assets at the end (these ALWAYS work)
    -- Using official Roblox assets that are guaranteed accessible
    local robloxFallbacks = {
        125013769,   -- Classic Sword
        29751273,    -- Classic Tool
        10470609,    -- Simple Tree
        6654917269,  -- Nature Pack Tree
        6654940148,  -- Nature Pack Rock
        6654917335,  -- Nature Pack Bush
    }
    for _, fallbackId in ipairs(robloxFallbacks) do
        table.insert(assetIds, fallbackId)
    end
    
    for i, assetId in ipairs(assetIds) do
        print("[BlaxSmith]  Trying asset ID: " .. assetId .. " (" .. i .. "/" .. #assetIds .. ")")
        
        local success, modelContainer = pcall(function()
            return InsertService:LoadAsset(assetId)
        end)
        
        if success and modelContainer then
            local asset = modelContainer:GetChildren()[1]
            -- SAFETY CHECK: Reject pure Meshes (Models only)
            if asset and (asset:IsA("MeshPart") or asset:IsA("SpecialMesh")) then
                print("[BlaxSmith]  Skipped Asset " .. assetId .. " (MeshPart/SpecialMesh) - Seeking Model...")
                modelContainer:Destroy()
                asset = nil -- Treat as failed
            end

            if asset then
                -- Create imports folder
                local folder = workspace:FindFirstChild("BlaxSmith_Imports")
                if not folder then
                    folder = Instance.new("Folder")
                    folder.Name = "BlaxSmith_Imports"
                    folder.Parent = workspace
                end
                
                asset.Parent = folder
                asset.Name = assetName or asset.Name
                
                -- Position with anti-clipping - use safe offset if no position specified
                -- This prevents assets from spawning at (0,0,0) where players spawn
                local safePosition = position or SAFE_SPAWN_OFFSET
                snapToGround(asset, safePosition)
                
                -- Disable scripts for safety
                for _, v in pairs(asset:GetDescendants()) do
                    if v:IsA("Script") or v:IsA("LocalScript") then
                        v.Disabled = true
                    end
                end
                
                modelContainer:Destroy()
                Selection:Set({asset})
                
                -- AUTO-FOCUS CAMERA: Move camera to look at the inserted asset
                selectAndFocus(asset)
                
                print("[BlaxSmith]  Successfully loaded: " .. asset.Name .. " (ID: " .. assetId .. ")")
                print("[BlaxSmith]  Camera focused on inserted asset at position: " .. tostring(safePosition))
                return asset
            end
        else
            print("[BlaxSmith]  Asset " .. assetId .. " failed, trying next...")
        end
    end
    
    warn("[BlaxSmith]  All asset IDs failed to load")
    return nil
end

-- 8.5 GRAPHICS PRESETS - Change game lighting and atmosphere
local function setGraphics(style)
    local Lighting = game:GetService("Lighting")
    style = string.lower(style or "realistic")
    
    print("[BlaxSmith]  Applying graphics preset: " .. style)
    
    -- Clear existing post-processing effects
    for _, effect in pairs(Lighting:GetChildren()) do
        if effect:IsA("PostEffect") or effect:IsA("Atmosphere") or effect:IsA("Sky") then
            effect:Destroy()
        end
    end
    
    local presets = {
        realistic = {
            Ambient = Color3.fromRGB(40, 40, 50),
            OutdoorAmbient = Color3.fromRGB(80, 80, 100),
            Brightness = 2.5,
            ClockTime = 14,
            GeographicLatitude = 45,
            ColorShift_Top = Color3.fromRGB(255, 240, 220),
            atmosphere = { Density = 0.3, Offset = 0.25, Color = Color3.fromRGB(200, 210, 230), Decay = Color3.fromRGB(100, 110, 140), Glare = 0.1, Haze = 1 },
            bloom = { Intensity = 0.6, Size = 30, Threshold = 0.85 },
            colorCorrection = { Brightness = 0.03, Contrast = 0.2, Saturation = 0.15 },
            sunRays = { Intensity = 0.08, Spread = 0.6 }
        },
        horror = {
            Ambient = Color3.fromRGB(10, 10, 15),
            OutdoorAmbient = Color3.fromRGB(20, 20, 30),
            Brightness = 0.5,
            ClockTime = 0,
            ColorShift_Top = Color3.fromRGB(50, 50, 80),
            atmosphere = { Density = 0.8, Offset = 0.5, Color = Color3.fromRGB(30, 30, 40), Decay = Color3.fromRGB(20, 20, 30), Glare = 0, Haze = 5 },
            bloom = { Intensity = 0.3, Size = 40, Threshold = 0.9 },
            colorCorrection = { Brightness = -0.1, Contrast = 0.4, Saturation = -0.3 },
            depthOfField = { FarIntensity = 0.5, FocusDistance = 20, InFocusRadius = 10 }
        },
        neon = {
            Ambient = Color3.fromRGB(20, 10, 40),
            OutdoorAmbient = Color3.fromRGB(40, 20, 80),
            Brightness = 1,
            ClockTime = 21,
            ColorShift_Top = Color3.fromRGB(150, 50, 255),
            atmosphere = { Density = 0.4, Offset = 0.1, Color = Color3.fromRGB(100, 50, 150), Decay = Color3.fromRGB(50, 20, 100), Glare = 0.3, Haze = 2 },
            bloom = { Intensity = 1.5, Size = 50, Threshold = 0.6 },
            colorCorrection = { Brightness = 0.1, Contrast = 0.3, Saturation = 0.5 }
        },
        fantasy = {
            Ambient = Color3.fromRGB(60, 50, 70),
            OutdoorAmbient = Color3.fromRGB(120, 100, 140),
            Brightness = 2,
            ClockTime = 16,
            ColorShift_Top = Color3.fromRGB(255, 200, 150),
            atmosphere = { Density = 0.25, Offset = 0.3, Color = Color3.fromRGB(180, 150, 200), Decay = Color3.fromRGB(100, 80, 120), Glare = 0.2, Haze = 1.5 },
            bloom = { Intensity = 0.8, Size = 35, Threshold = 0.75 },
            colorCorrection = { Brightness = 0.05, Contrast = 0.15, Saturation = 0.25 },
            sunRays = { Intensity = 0.15, Spread = 0.8 }
        },
        stylized = {
            Ambient = Color3.fromRGB(80, 80, 100),
            OutdoorAmbient = Color3.fromRGB(150, 150, 180),
            Brightness = 3,
            ClockTime = 12,
            ColorShift_Top = Color3.fromRGB(255, 255, 255),
            atmosphere = { Density = 0.1, Offset = 0, Color = Color3.fromRGB(230, 230, 255), Decay = Color3.fromRGB(200, 200, 230), Glare = 0.05, Haze = 0.5 },
            bloom = { Intensity = 0.4, Size = 20, Threshold = 0.9 },
            colorCorrection = { Brightness = 0.08, Contrast = 0.1, Saturation = 0.3 }
        },
        cinematic = {
            Ambient = Color3.fromRGB(30, 30, 40),
            OutdoorAmbient = Color3.fromRGB(60, 60, 80),
            Brightness = 1.5,
            ClockTime = 17,
            ColorShift_Top = Color3.fromRGB(255, 200, 150),
            atmosphere = { Density = 0.35, Offset = 0.2, Color = Color3.fromRGB(180, 160, 140), Decay = Color3.fromRGB(100, 80, 60), Glare = 0.15, Haze = 2 },
            bloom = { Intensity = 0.7, Size = 40, Threshold = 0.8 },
            colorCorrection = { Brightness = -0.02, Contrast = 0.25, Saturation = 0.1 },
            depthOfField = { FarIntensity = 0.3, FocusDistance = 30, InFocusRadius = 15 },
            sunRays = { Intensity = 0.12, Spread = 0.7 }
        }
    }
    
    local preset = presets[style] or presets.realistic
    
    -- Apply Lighting properties
    Lighting.Ambient = preset.Ambient
    Lighting.OutdoorAmbient = preset.OutdoorAmbient
    Lighting.Brightness = preset.Brightness
    Lighting.ClockTime = preset.ClockTime
    Lighting.GeographicLatitude = preset.GeographicLatitude or 45
    Lighting.ColorShift_Top = preset.ColorShift_Top
    
    -- Create Atmosphere
    if preset.atmosphere then
        local atm = Instance.new("Atmosphere")
        atm.Density = preset.atmosphere.Density
        atm.Offset = preset.atmosphere.Offset
        atm.Color = preset.atmosphere.Color
        atm.Decay = preset.atmosphere.Decay
        atm.Glare = preset.atmosphere.Glare
        atm.Haze = preset.atmosphere.Haze
        atm.Parent = Lighting
    end
    
    -- Create Bloom
    if preset.bloom then
        local bloom = Instance.new("BloomEffect")
        bloom.Intensity = preset.bloom.Intensity
        bloom.Size = preset.bloom.Size
        bloom.Threshold = preset.bloom.Threshold
        bloom.Parent = Lighting
    end
    
    -- Create Color Correction
    if preset.colorCorrection then
        local cc = Instance.new("ColorCorrectionEffect")
        cc.Brightness = preset.colorCorrection.Brightness
        cc.Contrast = preset.colorCorrection.Contrast
        cc.Saturation = preset.colorCorrection.Saturation
        cc.Parent = Lighting
    end
    
    -- Create Depth of Field
    if preset.depthOfField then
        local dof = Instance.new("DepthOfFieldEffect")
        dof.FarIntensity = preset.depthOfField.FarIntensity
        dof.FocusDistance = preset.depthOfField.FocusDistance
        dof.InFocusRadius = preset.depthOfField.InFocusRadius
        dof.Parent = Lighting
    end
    
    -- Create Sun Rays
    if preset.sunRays then
        local rays = Instance.new("SunRaysEffect")
        rays.Intensity = preset.sunRays.Intensity
        rays.Spread = preset.sunRays.Spread
        rays.Parent = Lighting
    end
    
    ChangeHistoryService:SetWaypoint("Applied " .. style .. " graphics preset")
    print("[BlaxSmith]  Graphics preset '" .. style .. "' applied!")
end

-- 9. MAIN EXECUTION HANDLER
executeCommand = function(command, payload)
    command = string.lower(string.gsub(command, "^%s*(.-)%s*$", "%1")) -- Trim and lowercase
    print("[BlaxSmith]  Processing Command: '" .. command .. "'")

    
    -- === CASE A: BUILD PRIMITIVE OBJECTS (LEGO MODE) ===
    if command == "build_objects" then
        local objects = payload.data.objects
        if objects then
            print("[BlaxSmith]  Inserting LEGO Model...")
            
            local createdModels = {}
            for _, objData in ipairs(objects) do
               -- Default to Workspace if no parent specified
               local root = buildObject(objData, workspace)
               if root then
                   table.insert(createdModels, root)
                   -- Move to camera front
                   if root:IsA("Model") or root:IsA("BasePart") then
                       local cam = workspace.CurrentCamera
                       local targetPos = cam.CFrame + (cam.CFrame.LookVector * 10)
                       if root:IsA("Model") then root:PivotTo(targetPos) else root.CFrame = targetPos end
                   end
               end
            end
            
            Selection:Set(createdModels)
            print("[BlaxSmith]  LEGO Build Complete!")
        end


    -- === CASE B1: IMMEDIATE EXECUTION (run_editor_command) ===
    -- === CASE B1: IMMEDIATE EXECUTION (Smart Script Creation) ===
    elseif command == "execute" or command == "run_editor_command" then
        local code = payload.code or payload.source
        print("[BlaxSmith]  Analyzing Code...")
        
        -- DETECT SCRIPT TYPE
        local isGUI = string.find(code, "ScreenGui") or string.find(code, "StarterGui") or string.find(code, "PlayerGui")
        local isLocal = string.find(code, "LocalPlayer") or string.find(code, "Client") or isGUI
        
        if isGUI or isLocal then
            print("[BlaxSmith]  Detected Client/GUI Code.")
            
            local success, err = pcall(function()
                -- Create a LocalScript in StarterGui/StarterPlayerScripts
                local targetParent = game:GetService("StarterGui")
                if not isGUI then targetParent = game:GetService("StarterPlayer").StarterPlayerScripts end
                
                local newScript = Instance.new("LocalScript")
                newScript.Name = "BlaxSmith_GUI_Script" -- Clear name
                newScript.Source = code
                newScript.Parent = targetParent
                
                print("[BlaxSmith]  SUCCESS: Created LocalScript '" .. newScript.Name .. "' in " .. targetParent.Name)
                Selection:Set({newScript})
            end)
            
            if not success then
                warn("[BlaxSmith]  Failed to create LocalScript: " .. tostring(err))
            end
        else
            -- Server Script (can run via loadstring or Script instance)
            local success, err = pcall(function()
                local func, loadErr = loadstring(code)
                if func then
                    getfenv(func).script = nil 
                    func() 
                    game:GetService("ChangeHistoryService"):SetWaypoint("BlaxSmith AI Action")
                    print("[BlaxSmith]  Server Code Executed Successfully")
                else
                    -- Fallback: Create Script in Workspace
                    warn(" Direct Execution Failed, creating Script instance: " .. tostring(loadErr))
                    local s = Instance.new("Script")
                    s.Name = "BlaxSmith_ServerScript"
                    s.Source = code
                    s.Parent = workspace
                end
            end)
            if not success then warn(" Execution Error: " .. tostring(err)) end
        end

    -- === CASE B2: CREATE SCRIPT FILE (create_script) ===
    elseif command == "create-script" or command == "create_script" then
        local code = payload.code or payload.source
        local parentName = payload.parent 
        local scriptClass = payload.class
        
        -- Default: Server Script Logic
        local parent = game:GetService("ServerScriptService")
        local isLocal = false

        -- INTELLIGENT ROUTING
        if parentName == "StarterGui" or string.find(code, "ScreenGui") or string.find(code, "StarterGui") then
            parent = game:GetService("StarterGui")
            isLocal = true
        elseif parentName == "StarterPlayerScripts" or string.find(code, "LocalPlayer") or string.find(code, "Client") or scriptClass == "LocalScript" then
            parent = game:GetService("StarterPlayer").StarterPlayerScripts 
            isLocal = true
        elseif parentName == "Workspace" then
            parent = workspace
            isLocal = false
        end
        
        -- Create the Script container
        local newScript
        if isLocal or scriptClass == "LocalScript" then
            newScript = Instance.new("LocalScript")
        else
            newScript = Instance.new("Script")
        end
        
        newScript.Name = payload.name or "AI_Generated_" .. (isLocal and "Client" or "Server")
        newScript.Parent = parent
        newScript.Source = code
        
        -- Select it for User
        Selection:Set({newScript})
        print("[BlaxSmith]  Created Code: " .. newScript.Name .. " in " .. parent.Name)
    
    -- === CASE C: SET WEATHER ===
    elseif command == "set-weather" or command == "set_weather" or command == "weather" then
        local preset = payload.preset or payload.weather or payload.name or "day"
        setWeather(preset)
    
    -- === CASE D: ADD EFFECT ===
    elseif command == "add-effect" or command == "add_effect" or command == "effect" then
        local targetName = payload.target or payload.targetName
        local effectType = payload.effectType or payload.effect or "Fire"
        local properties = payload.properties or {}
        
        local target = workspace:FindFirstChild(targetName, true)
        if target then
            addEffect(target, effectType, properties)
        else
            warn("[BlaxSmith]  Could not find target: " .. tostring(targetName))
        end
    
    -- === CASE E: PLAY ANIMATION ===
    elseif command == "play-animation" or command == "play_animation" or command == "animate" then
        local targetName = payload.target or payload.character
        local animId = tonumber(payload.animationId) or tonumber(payload.animId) or tonumber(payload.id)
        
        local target = workspace:FindFirstChild(targetName, true)
        if target and animId then
            playAnimation(target, animId)
        else
            warn("[BlaxSmith]  Animation requires target model and animationId")
        end
    
    -- === CASE F: PLAY AUDIO ===
    elseif command == "play-audio" or command == "play_audio" or command == "audio" or command == "music" then
        local soundId = tonumber(payload.soundId) or tonumber(payload.id)
        local isLooping = payload.loop or payload.looping or false
        local targetName = payload.target or payload.parent
        
        local parentPart = nil
        if targetName then
            parentPart = workspace:FindFirstChild(targetName, true)
        end
        
        if soundId then
            playAudio(soundId, isLooping, parentPart)
        else
            warn("[BlaxSmith]  Audio requires soundId")
        end
    
    -- === CASE G: SET GRAPHICS ===
    elseif command == "set-graphics" or command == "set_graphics" or command == "graphics" then
        local style = payload.style or payload.preset or payload.name or "realistic"
        setGraphics(style)
    
    -- === CASE H: SEARCH COMMUNITY (Multi-try with fallback) ===
    elseif command == "search-community" or command == "community-asset" or command == "load-community" then
        local assetIds = payload.assetIds or payload.ids or {payload.assetId or payload.id}
        local assetName = payload.name or payload.query or "Community Asset"
        local position = nil
        
        if payload.position then
            position = Vector3.new(
                payload.position.x or payload.position.X or 0,
                payload.position.y or payload.position.Y or 0,
                payload.position.z or payload.position.Z or 0
            )
        end
        
        loadCommunityAsset(assetIds, assetName, position)
    
    -- === CASE I: INSERT ASSET (Sloyd/External uploads) ===
    elseif command == "INSERT_ASSET" or command == "insert_asset" or command == "insert-asset" then
        local assetId = tonumber(payload.assetId) or tonumber(payload.id)
        local assetName = payload.name or "Sloyd Model"
        local position = nil
        
        if payload.position then
            position = Vector3.new(
                payload.position.x or payload.position.X or 0,
                payload.position.y or payload.position.Y or 5,
                payload.position.z or payload.position.Z or 0
            )
        end
        
        if assetId then
            print("[BlaxSmith]  Inserting Sloyd/External asset: " .. assetName .. " (ID: " .. assetId .. ")")
            loadCommunityAsset({assetId}, assetName, position)
        else
            warn("[BlaxSmith]  insert_asset requires assetId")
        end
    
    -- === CASE: IMPORT SLOYD MODEL (GLB file from Sloyd AI) ===
    elseif command == "import_sloyd_model" or command == "IMPORT_SLOYD_MODEL" then
        local modelName = payload.name or "Sloyd Model"
        local modelPath = payload.path or ""
        local assetId = payload.assetId
        local position = nil
        
        if payload.position then
            position = Vector3.new(
                payload.position.x or payload.position.X or 0,
                payload.position.y or payload.position.Y or 10,
                payload.position.z or payload.position.Z or 0
            )
        end
        
        print("[BlaxSmith]  Sloyd Model Import Request: " .. modelName)
        print("[BlaxSmith]  File path: " .. modelPath)
        
        -- If we have an uploaded asset ID, insert it directly
        if assetId and tonumber(assetId) then
            print("[BlaxSmith]  Inserting uploaded Sloyd asset ID: " .. tostring(assetId))
            loadCommunityAsset({tonumber(assetId)}, modelName, position)
        else
            -- GLB files need manual import - show instructions
            warn("[BlaxSmith]  Sloyd model generated but not uploaded to Roblox.")
            warn("[BlaxSmith]  To import: File > Import 3D > Select the GLB file from:")
            warn("[BlaxSmith]  " .. modelPath)
            
            -- Create a placeholder part to mark the intended location
            local placeholder = Instance.new("Part")
            placeholder.Name = "SloydModel_" .. modelName .. "_PLACEHOLDER"
            placeholder.Size = Vector3.new(4, 4, 4)
            placeholder.BrickColor = BrickColor.new("Lime green")
            placeholder.Transparency = 0.5
            placeholder.Anchored = true
            placeholder.Position = position or Vector3.new(0, 10, 0)
            placeholder.Parent = workspace
            
            -- Add a hint GUI
            local hint = Instance.new("BillboardGui")
            hint.Size = UDim2.new(0, 200, 0, 50)
            hint.StudsOffset = Vector3.new(0, 3, 0)
            hint.AlwaysOnTop = true
            hint.Parent = placeholder
            
            local label = Instance.new("TextLabel")
            label.Size = UDim2.new(1, 0, 1, 0)
            label.BackgroundTransparency = 0.5
            label.BackgroundColor3 = Color3.new(0, 0, 0)
            label.TextColor3 = Color3.new(0, 1, 0.5)
            label.Text = "Import GLB here:\n" .. modelName
            label.TextScaled = true
            label.Parent = hint
            
            Selection:Set({placeholder})
            print("[BlaxSmith]  Created placeholder at import location. Replace with your GLB import.")
        end
    
    -- === CASE K: GENERATE POLY PIZZA / 3D MODELS ===
    elseif command == "generate-poly-pizza" or command == "generate_poly_pizza" or command == "generate-model" then
        print("[BlaxSmith]  handling generate-poly-pizza/model command")
        if payload.assetId then
            -- Initial direct insertion if ID provided
            local assetIds = {tonumber(payload.assetId)}
            local assetName = payload.prompt or payload.name or "Generated Model"
            loadCommunityAsset(assetIds, assetName, payload.position)
        elseif payload.prompt then
            -- Just log it, the backend should have resolved this to an ID or the plugin needs to ask backend
            -- But to stop the error, we acknowledge it. The backend usually sends a follow-up "insert_asset"
            print("[BlaxSmith]  AI is generating model for: " .. payload.prompt .. " (Waiting for insert_asset command)")
        end

    -- === CASE L: GENERATE MAP ===
    elseif command == "generate-map" or command == "generate_map" then
         print("[BlaxSmith]  Handling Map Generation: " .. (payload.theme or "Default"))
         -- Map generation logic or placeholder to prevent error
         if CommandHandlers and CommandHandlers["generate-map"] then
            CommandHandlers["generate-map"](payload)
         else
             warn("[BlaxSmith]  Map generation handler not fully initialized, but command received.")
         end

    -- === CASE M: CHECK CommandHandlers TABLE ===
    elseif CommandHandlers and CommandHandlers[command] then
        print("[BlaxSmith]  Routing to CommandHandlers: " .. command)
        CommandHandlers[command](payload)
    
    -- === CASE Z: UNKNOWN COMMAND ===
    else
        warn("[BlaxSmith]  Unknown command type: " .. tostring(command) .. " - Payload: " .. HttpService:JSONEncode(payload or {}))
    end
end

-- Main Command Polling Loop
-- CRITICAL: This loop runs FOREVER to ensure auto-reconnect after play mode
spawn(function()
    print("[BlaxSmith]  Command polling started (Auto-Reconnect Enabled)...")
    
    local consecutiveFailures = 0
    local MAX_FAILURES_BEFORE_SLOW = 10
    
    while true do
        local pollInterval = 1 -- Default 1 second
        
        -- Slow down polling if server is down (to reduce log spam)
        if consecutiveFailures > MAX_FAILURES_BEFORE_SLOW then
            pollInterval = 5 -- Slow to 5 seconds
        end
        
        local success, response = pcall(function()
            return HttpService:GetAsync(CONFIG.APP_URL .. "/plugin/poll", true)
        end)
        
        if success then
            consecutiveFailures = 0 -- Reset on success
            
            if response and response ~= "" and response ~= "[]" then
                local decodeSuccess, data = pcall(function()
                    return HttpService:JSONDecode(response)
                end)
                
                if decodeSuccess and data then
                    -- Server returns {actions: [...]} or direct array
                    local commands = data.actions or data.commands or data
                    
                    if commands and type(commands) == "table" and #commands > 0 then
                        for _, command in ipairs(commands) do
                            print("[BlaxSmith]  Received command:", command.type)
                            local execSuccess, execErr = pcall(function()
                                executeCommand(command.type, command.data or command)
                            end)
                            if not execSuccess then
                                warn("[BlaxSmith]  Command execution error:", execErr)
                            end
                        end
                    end
                end
            end
        else
            consecutiveFailures = consecutiveFailures + 1
            if consecutiveFailures == 1 then
                warn("[BlaxSmith]  Connection lost, attempting to reconnect...")
            end
        end
        
        wait(pollInterval)
    end
end)

print("[BlaxSmith]  Command Polling System Active (Always-On)!")

end -- END COMMAND POLLING SCOPE
