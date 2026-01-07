-- BlaxSmith Roblox Studio Plugin
-- Version: 6.4.0
-- Connects to BlaxSmith web app for AI-powered asset generation

local HttpService = game:GetService("HttpService")
local InsertService = game:GetService("InsertService")

-- Configuration
local CONFIG = {
    APP_URL = "http://localhost:3000",  -- Change to production URL when deployed
    PLUGIN_VERSION = "6.4.0",
    SDK_VERSION = "6.1",
    POLL_INTERVAL = 2, -- seconds
}

local toolbar = plugin:CreateToolbar("BlaxSmith AI")
local connectButton = toolbar:CreateButton("Connect", "Connect to BlaxSmith web app", "rbxasset://textures/icon.png")

local isConnected = false
local studioId = game.JobId
local pollingConnection = nil

-- UI Creation
local function createUI()
    local screenGui = Instance.new("ScreenGui")
    screenGui.Name = "BlaxSmithUI"
    screenGui.ResetOnSpawn = false
    screenGui.Parent = game:GetService("CoreGui")

    local frame = Instance.new("Frame")
    frame.Size = UDim2.new(0, 300, 0, 200)
    frame.Position = UDim2.new(0.5, -150, 0.5, -100)
    frame.BackgroundColor3 = Color3.fromRGB(30, 30, 35)
    frame.BorderSizePixel = 0
    frame.Parent = screenGui

    local corner = Instance.new("UICorner")
    corner.CornerRadius = UDim.new(0, 12)
    corner.Parent = frame

    local title = Instance.new("TextLabel")
    title.Size = UDim2.new(1, 0, 0, 40)
    title.BackgroundTransparency = 1
    title.Text = "BlaxSmith AI"
    title.TextColor3 = Color3.fromRGB(255, 160, 50)
    title.TextSize = 18
    title.Font = Enum.Font.GothamBold
    title.Parent = frame

    local statusLabel = Instance.new("TextLabel")
    statusLabel.Size = UDim2.new(1, -20, 0, 30)
    statusLabel.Position = UDim2.new(0, 10, 0, 50)
    statusLabel.BackgroundTransparency = 1
    statusLabel.Text = "Status: Disconnected"
    statusLabel.TextColor3 = Color3.fromRGB(200, 200, 200)
    statusLabel.TextSize = 14
    statusLabel.Font = Enum.Font.Gotham
    statusLabel.TextXAlignment = Enum.TextXAlignment.Left
    statusLabel.Parent = frame

    local connectBtn = Instance.new("TextButton")
    connectBtn.Size = UDim2.new(1, -20, 0, 40)
    connectBtn.Position = UDim2.new(0, 10, 1, -50)
    connectBtn.BackgroundColor3 = Color3.fromRGB(255, 140, 30)
    connectBtn.Text = "Connect to Web App"
    connectBtn.TextColor3 = Color3.fromRGB(255, 255, 255)
    connectBtn.TextSize = 14
    connectBtn.Font = Enum.Font.GothamBold
    connectBtn.Parent = frame

    local btnCorner = Instance.new("UICorner")
    btnCorner.CornerRadius = UDim.new(0, 8)
    btnCorner.Parent = connectBtn

    return screenGui, statusLabel, connectBtn
end

-- HTTP Request Helper
local function httpRequest(method, endpoint, data)
    local url = CONFIG.APP_URL .. endpoint
    local success, result = pcall(function()
        if method == "POST" then
            return HttpService:PostAsync(url, HttpService:JSONEncode(data or {}), Enum.HttpContentType.ApplicationJson)
        else
            return HttpService:GetAsync(url .. "?studioId=" .. studioId)
        end
    end)
    
    if success then
        return true, result
    else
        warn("[BlaxSmith] HTTP Error:", result)
        return false, nil
    end
end

-- Command Handlers
local function insertModel(data)
    print("[BlaxSmith] Inserting model:", data.modelName)
    
    -- Create model from asset data
    local folder = Instance.new("Folder")
    folder.Name = data.modelName
    folder.Parent = workspace
    
    -- If we have a URL to a model asset, use InsertService
    if data.assetData and data.assetData.assetUrl then
        local success, model = pcall(function()
            return InsertService:LoadAsset(tonumber(data.assetData.assetId))
        end)
        
        if success and model then
            for _, child in ipairs(model:GetChildren()) do
                child.Parent = folder
            end
            model:Destroy()
        end
    end
    
    -- Position the folder
    if data.position then
        folder:MoveTo(Vector3.new(data.position.x, data.position.y, data.position.z))
    end
    
    print("[BlaxSmith] Model inserted successfully!")
end

local function generateWorld(data)
    print("[BlaxSmith] Generating world:", data.worldName)
    local worldPlan = data.worldPlan
    
    -- Create folder for world
    local worldFolder = Instance.new("Folder")
    worldFolder.Name = data.worldName
    worldFolder.Parent = workspace
    
    -- Parse world plan and create basic structures
    if worldPlan and worldPlan.structures then
        for _, structure in ipairs(worldPlan.structures) do
            local part = Instance.new("Part")
            part.Name = structure.name or "Structure"
            part.Size = Vector3.new(
                structure.size and structure.size.x or 10,
                structure.size and structure.size.y or 10,
                structure.size and structure.size.z or 10
            )
            part.Position = Vector3.new(
                structure.position and structure.position.x or 0,
                structure.position and structure.position.y or 5,
                structure.position and structure.position.z or 0
            )
            part.Anchored = true
            part.Parent = worldFolder
        end
    end
    
    print("[BlaxSmith] World generated successfully!")
end

local function insertScript(data)
    print("[BlaxSmith] Inserting script:", data.scriptName)
    
    -- Create script with code
    local script = Instance.new("Script")
    script.Name = data.scriptName
    script.Source = data.code or "-- BlaxSmith generated script"
    script.Parent = workspace
    
    print("[BlaxSmith] Script inserted successfully!")
end

-- Polling Loop
local function startPolling()
    if pollingConnection then
        return
    end

    pollingConnection = game:GetService("RunService").Heartbeat:Connect(function()
        wait(CONFIG.POLL_INTERVAL)
        
        local success, response = httpRequest("GET", "/api/plugin/poll")
        if success and response then
            local commands = HttpService:JSONDecode(response)
            
            for _, cmd in ipairs(commands.commands or {}) do
                print("[BlaxSmith] Received command:", cmd.command_type)
                
                local commandData = cmd.command_data
                
                if cmd.command_type == "insert_model" then
                    insertModel(commandData)
                elseif cmd.command_type == "generate_world" then
                    generateWorld(commandData)
                elseif cmd.command_type == "insert_script" then
                    insertScript(commandData)
                end
                
                -- Mark command as completed
                httpRequest("POST", "/api/plugin/complete", {
                    commandId = cmd.id
                })
            end
        end
    end)
end

local function stopPolling()
    if pollingConnection then
        pollingConnection:Disconnect()
        pollingConnection = nil
    end
end

-- Connect Button Handler
connectButton.Click:Connect(function()
    if not isConnected then
        print("[BlaxSmith] Connecting to web app...")
        
        local success, _ = httpRequest("POST", "/api/plugin/connect", {
            studioId = studioId,
            pluginVersion = CONFIG.PLUGIN_VERSION,
            sdkVersion = CONFIG.SDK_VERSION,
            game = game.Name,
            placeId = tostring(game.PlaceId)
        })
        
        if success then
            isConnected = true
            connectButton.Icon = "rbxasset://textures/success.png"
            print("[BlaxSmith] Connected successfully!")
            startPolling()
        else
            warn("[BlaxSmith] Connection failed")
        end
    else
        isConnected = false
        stopPolling()
        connectButton.Icon = "rbxasset://textures/icon.png"
        print("[BlaxSmith] Disconnected")
    end
end)

-- Initialize UI
local ui, statusLabel, connectBtn = createUI()

print("[BlaxSmith] Plugin loaded! Version:", CONFIG.PLUGIN_VERSION)
