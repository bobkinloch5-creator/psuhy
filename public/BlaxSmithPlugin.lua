-- BlaxSmith AI Plugin for Roblox Studio
-- Ultimate Edition v3.0 - Full Featured
-- Connects to blaxsmith.dev

local HttpService = game:GetService("HttpService")
local ChangeHistoryService = game:GetService("ChangeHistoryService")
local Selection = game:GetService("Selection")
local ServerScriptService = game:GetService("ServerScriptService")
local ReplicatedStorage = game:GetService("ReplicatedStorage")
local StarterPlayer = game:GetService("StarterPlayer")
local Workspace = game:GetService("Workspace")
local InsertService = game:GetService("InsertService")
local RunService = game:GetService("RunService")
local TweenService = game:GetService("TweenService")

-- ============================================
-- CONFIGURATION
-- ============================================
local WEBSITE_URL = "https://www.blaxsmith.dev"
local API_URL = WEBSITE_URL .. "/api/plugin"
local HEARTBEAT_INTERVAL = 25 -- seconds
local POLL_INTERVAL = 2 -- seconds for command polling
local ASSET_POLL_INTERVAL = 3 -- seconds for asset queue
local MAX_RECONNECT_ATTEMPTS = 5
local RECONNECT_BASE_DELAY = 2 -- seconds

-- Supabase Direct Connection (BlaxSmith Production)
local SUPABASE_URL = "https://nwucmybenbnvrtlpdtpz.supabase.co"
local SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im53dWNteWJlbmJudnJ0bHBkdHB6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzYyNzI3MTAsImV4cCI6MjA1MTg0ODcxMH0.cF0cTGjEamxZ4oGUHjJ7xC1rR9g1e0r4TZ2a0kVt0Wk"

-- ============================================
-- STATE
-- ============================================
local USER_ID = plugin:GetSetting("BlaxSmithDiscordID") or ""
local isConnected = false
local heartbeatThread = nil
local pollingThread = nil
local assetPollingThread = nil
local reconnectAttempts = 0
local insertHistory = {} -- Track inserted assets for undo
local MAX_HISTORY = 20

-- ============================================
-- PLUGIN UI SETUP
-- ============================================
local toolbar = plugin:CreateToolbar("BlaxSmith AI")
local connectButton = toolbar:CreateButton(
	"Connect",
	"Connect to BlaxSmith AI",
	"rbxasset://textures/StudioToolbox/AssetManager/toolbox_icon.png"
)

-- ============================================
-- HELPER FUNCTIONS
-- ============================================
local function ensureFolder(parent, name)
	local f = parent:FindFirstChild(name)
	if not f then
		f = Instance.new("Folder")
		f.Name = name
		f.Parent = parent
	end
	return f
end

local function selectAndFocus(object)
	if not object then return end
	Selection:Set({object})
	
	task.spawn(function()
		local camera = workspace.CurrentCamera
		if not camera then return end
		
		local targetPos = Vector3.new(0, 10, 0)
		local objectSize = Vector3.new(5, 5, 5)
		
		if object:IsA("Model") then
			local success, cf, size = pcall(function()
				return object:GetBoundingBox()
			end)
			if success then
				targetPos = cf.Position
				objectSize = size
			end
		elseif object:IsA("BasePart") then
			targetPos = object.Position
			objectSize = object.Size
		end
		
		local maxDim = math.max(objectSize.X, objectSize.Y, objectSize.Z)
		local distance = maxDim * 2 + 15
		local offset = Vector3.new(distance, distance * 0.6, distance)
		local cameraPos = targetPos + offset
		
		camera.CameraType = Enum.CameraType.Scriptable
		camera.CFrame = CFrame.new(cameraPos, targetPos)
		
		task.wait(0.5)
		camera.CameraType = Enum.CameraType.Custom
	end)
end

-- Add to undo history
local function addToHistory(item)
	table.insert(insertHistory, 1, item)
	if #insertHistory > MAX_HISTORY then
		table.remove(insertHistory)
	end
end

-- ============================================
-- UI CREATION
-- ============================================
local function createStatusUI()
	local screenGui = Instance.new("ScreenGui")
	screenGui.Name = "BlaxSmithStatus"
	screenGui.ResetOnSpawn = false
	screenGui.ZIndexBehavior = Enum.ZIndexBehavior.Sibling
	
	local success = pcall(function()
		screenGui.Parent = game:GetService("CoreGui")
	end)
	if not success then
		screenGui.Parent = game:GetService("Players").LocalPlayer:WaitForChild("PlayerGui")
	end
	
	-- Main Frame with gradient
	local frame = Instance.new("Frame")
	frame.Name = "MainFrame"
	frame.Size = UDim2.new(0, 320, 0, 200)
	frame.Position = UDim2.new(1, -330, 0, 10)
	frame.BackgroundColor3 = Color3.fromRGB(25, 25, 30)
	frame.BorderSizePixel = 0
	frame.Parent = screenGui
	
	local corner = Instance.new("UICorner")
	corner.CornerRadius = UDim.new(0, 10)
	corner.Parent = frame
	
	-- Gradient header
	local header = Instance.new("Frame")
	header.Name = "Header"
	header.Size = UDim2.new(1, 0, 0, 40)
	header.BackgroundColor3 = Color3.fromRGB(255, 100, 50)
	header.BorderSizePixel = 0
	header.Parent = frame
	
	local headerCorner = Instance.new("UICorner")
	headerCorner.CornerRadius = UDim.new(0, 10)
	headerCorner.Parent = header
	
	-- Hide bottom corners of header
	local headerFix = Instance.new("Frame")
	headerFix.Size = UDim2.new(1, 0, 0, 10)
	headerFix.Position = UDim2.new(0, 0, 1, -10)
	headerFix.BackgroundColor3 = Color3.fromRGB(255, 100, 50)
	headerFix.BorderSizePixel = 0
	headerFix.Parent = header
	
	local headerGradient = Instance.new("UIGradient")
	headerGradient.Color = ColorSequence.new({
		ColorSequenceKeypoint.new(0, Color3.fromRGB(255, 120, 50)),
		ColorSequenceKeypoint.new(1, Color3.fromRGB(200, 60, 30)),
	})
	headerGradient.Parent = header
	
	-- Title
	local title = Instance.new("TextLabel")
	title.Size = UDim2.new(1, -20, 1, 0)
	title.Position = UDim2.new(0, 10, 0, 0)
	title.BackgroundTransparency = 1
	title.Text = "🔥 BlaxSmith AI"
	title.TextColor3 = Color3.fromRGB(255, 255, 255)
	title.Font = Enum.Font.GothamBlack
	title.TextSize = 18
	title.TextXAlignment = Enum.TextXAlignment.Left
	title.Parent = header
	
	-- Status with icon
	local status = Instance.new("TextLabel")
	status.Name = "Status"
	status.Size = UDim2.new(1, -20, 0, 20)
	status.Position = UDim2.new(0, 10, 0, 48)
	status.BackgroundTransparency = 1
	status.Text = "🔴 Not Connected"
	status.TextColor3 = Color3.fromRGB(255, 100, 100)
	status.Font = Enum.Font.GothamMedium
	status.TextSize = 12
	status.TextXAlignment = Enum.TextXAlignment.Left
	status.Parent = frame
	
	-- Discord ID Label
	local idLabel = Instance.new("TextLabel")
	idLabel.Size = UDim2.new(0, 75, 0, 28)
	idLabel.Position = UDim2.new(0, 10, 0, 72)
	idLabel.BackgroundTransparency = 1
	idLabel.Text = "Discord ID:"
	idLabel.TextColor3 = Color3.fromRGB(150, 150, 160)
	idLabel.Font = Enum.Font.Gotham
	idLabel.TextSize = 11
	idLabel.TextXAlignment = Enum.TextXAlignment.Left
	idLabel.Parent = frame
	
	-- Discord ID Input
	local idInput = Instance.new("TextBox")
	idInput.Name = "DiscordIDInput"
	idInput.Size = UDim2.new(0, 220, 0, 28)
	idInput.Position = UDim2.new(0, 85, 0, 72)
	idInput.BackgroundColor3 = Color3.fromRGB(40, 40, 50)
	idInput.BorderSizePixel = 0
	idInput.Text = USER_ID
	idInput.PlaceholderText = "Paste your Discord ID..."
	idInput.TextColor3 = Color3.fromRGB(100, 200, 255)
	idInput.PlaceholderColor3 = Color3.fromRGB(80, 80, 90)
	idInput.Font = Enum.Font.Code
	idInput.TextSize = 11
	idInput.TextXAlignment = Enum.TextXAlignment.Left
	idInput.ClearTextOnFocus = false
	idInput.Parent = frame
	
	local inputCorner = Instance.new("UICorner")
	inputCorner.CornerRadius = UDim.new(0, 6)
	inputCorner.Parent = idInput
	
	local inputPadding = Instance.new("UIPadding")
	inputPadding.PaddingLeft = UDim.new(0, 8)
	inputPadding.PaddingRight = UDim.new(0, 8)
	inputPadding.Parent = idInput
	
	-- Buttons container
	local buttonsY = 108
	
	-- Save Button
	local saveBtn = Instance.new("TextButton")
	saveBtn.Name = "SaveBtn"
	saveBtn.Size = UDim2.new(0, 95, 0, 30)
	saveBtn.Position = UDim2.new(0, 10, 0, buttonsY)
	saveBtn.BackgroundColor3 = Color3.fromRGB(40, 150, 90)
	saveBtn.BorderSizePixel = 0
	saveBtn.Text = "💾 Save ID"
	saveBtn.TextColor3 = Color3.fromRGB(255, 255, 255)
	saveBtn.Font = Enum.Font.GothamBold
	saveBtn.TextSize = 11
	saveBtn.Parent = frame
	
	local saveCorner = Instance.new("UICorner")
	saveCorner.CornerRadius = UDim.new(0, 6)
	saveCorner.Parent = saveBtn
	
	-- Connect Button
	local connectBtn = Instance.new("TextButton")
	connectBtn.Name = "ConnectBtn"
	connectBtn.Size = UDim2.new(0, 95, 0, 30)
	connectBtn.Position = UDim2.new(0, 112, 0, buttonsY)
	connectBtn.BackgroundColor3 = Color3.fromRGB(255, 120, 50)
	connectBtn.BorderSizePixel = 0
	connectBtn.Text = "🔌 Connect"
	connectBtn.TextColor3 = Color3.fromRGB(255, 255, 255)
	connectBtn.Font = Enum.Font.GothamBold
	connectBtn.TextSize = 11
	connectBtn.Parent = frame
	
	local connectCorner = Instance.new("UICorner")
	connectCorner.CornerRadius = UDim.new(0, 6)
	connectCorner.Parent = connectBtn
	
	-- Undo Button
	local undoBtn = Instance.new("TextButton")
	undoBtn.Name = "UndoBtn"
	undoBtn.Size = UDim2.new(0, 95, 0, 30)
	undoBtn.Position = UDim2.new(0, 214, 0, buttonsY)
	undoBtn.BackgroundColor3 = Color3.fromRGB(100, 100, 120)
	undoBtn.BorderSizePixel = 0
	undoBtn.Text = "↩️ Undo"
	undoBtn.TextColor3 = Color3.fromRGB(200, 200, 210)
	undoBtn.Font = Enum.Font.GothamMedium
	undoBtn.TextSize = 11
	undoBtn.Parent = frame
	
	local undoCorner = Instance.new("UICorner")
	undoCorner.CornerRadius = UDim.new(0, 6)
	undoCorner.Parent = undoBtn
	
	-- Stats row
	local statsLabel = Instance.new("TextLabel")
	statsLabel.Name = "Stats"
	statsLabel.Size = UDim2.new(1, -20, 0, 20)
	statsLabel.Position = UDim2.new(0, 10, 0, 145)
	statsLabel.BackgroundTransparency = 1
	statsLabel.Text = "📦 Assets inserted: 0"
	statsLabel.TextColor3 = Color3.fromRGB(120, 120, 130)
	statsLabel.Font = Enum.Font.Gotham
	statsLabel.TextSize = 10
	statsLabel.TextXAlignment = Enum.TextXAlignment.Left
	statsLabel.Parent = frame
	
	-- Instructions
	local instructions = Instance.new("TextLabel")
	instructions.Size = UDim2.new(1, -20, 0, 20)
	instructions.Position = UDim2.new(0, 10, 0, 170)
	instructions.BackgroundTransparency = 1
	instructions.Text = "🌐 blaxsmith.dev/forge → Get your Discord ID"
	instructions.TextColor3 = Color3.fromRGB(80, 80, 90)
	instructions.Font = Enum.Font.Gotham
	instructions.TextSize = 9
	instructions.TextXAlignment = Enum.TextXAlignment.Left
	instructions.Parent = frame
	
	-- Button handlers
	saveBtn.MouseButton1Click:Connect(function()
		local newId = idInput.Text
		if newId and #newId > 10 then
			USER_ID = newId
			plugin:SetSetting("BlaxSmithDiscordID", newId)
			saveBtn.Text = "✅ Saved!"
			saveBtn.BackgroundColor3 = Color3.fromRGB(80, 200, 120)
			print("[BlaxSmith] ✅ Discord ID saved!")
			task.delay(1.5, function()
				saveBtn.Text = "💾 Save ID"
				saveBtn.BackgroundColor3 = Color3.fromRGB(40, 150, 90)
			end)
		else
			saveBtn.Text = "❌ Invalid"
			saveBtn.BackgroundColor3 = Color3.fromRGB(200, 60, 60)
			task.delay(1.5, function()
				saveBtn.Text = "💾 Save ID"
				saveBtn.BackgroundColor3 = Color3.fromRGB(40, 150, 90)
			end)
		end
	end)
	
	undoBtn.MouseButton1Click:Connect(function()
		if #insertHistory > 0 then
			local lastItem = table.remove(insertHistory, 1)
			if lastItem and lastItem.instance and lastItem.instance.Parent then
				lastItem.instance:Destroy()
				undoBtn.Text = "✅ Undone!"
				print("[BlaxSmith] ↩️ Undid:", lastItem.name)
				task.delay(1, function()
					undoBtn.Text = "↩️ Undo"
				end)
			end
		else
			undoBtn.Text = "Nothing to undo"
			task.delay(1, function()
				undoBtn.Text = "↩️ Undo"
			end)
		end
	end)
	
	return screenGui, connectBtn, idInput, status
end

local statusUI, uiConnectBtn, uiIdInput, statusLabel = createStatusUI()

-- ============================================
-- UI UPDATE FUNCTIONS
-- ============================================
local function updateStatus(connected, message)
	local statusText = statusUI:FindFirstChild("MainFrame"):FindFirstChild("Status")
	if statusText then
		if connected then
			statusText.Text = "🟢 Connected"
			statusText.TextColor3 = Color3.fromRGB(100, 255, 150)
		else
			statusText.Text = "🔴 " .. (message or "Disconnected")
			statusText.TextColor3 = Color3.fromRGB(255, 100, 100)
		end
	end
end

local function updateStats()
	local statsLabel = statusUI:FindFirstChild("MainFrame"):FindFirstChild("Stats")
	if statsLabel then
		statsLabel.Text = "📦 Assets inserted: " .. #insertHistory
	end
end

-- ============================================
-- CONNECTION FUNCTIONS
-- ============================================
local function sendHeartbeat()
	if USER_ID == "" or #USER_ID < 10 then
		updateStatus(false, "Set Discord ID first!")
		return false
	end
	
	local timestamp = os.date("!%Y-%m-%dT%H:%M:%SZ")
	local supabaseEndpoint = SUPABASE_URL .. "/rest/v1/plugin_heartbeats?user_id=eq." .. USER_ID
	
	-- Try PATCH first (existing user)
	local patchSuccess, patchResult = pcall(function()
		return HttpService:RequestAsync({
			Url = supabaseEndpoint,
			Method = "PATCH",
			Headers = {
				["Content-Type"] = "application/json",
				["apikey"] = SUPABASE_ANON_KEY,
				["Authorization"] = "Bearer " .. SUPABASE_ANON_KEY,
				["Prefer"] = "return=minimal"
			},
			Body = HttpService:JSONEncode({
				last_heartbeat = timestamp
			})
		})
	end)
	
	if patchSuccess and (patchResult.StatusCode == 200 or patchResult.StatusCode == 204) then
		isConnected = true
		reconnectAttempts = 0
		updateStatus(true)
		return true
	end
	
	-- Try POST (new user)
	local postSuccess, postResult = pcall(function()
		return HttpService:RequestAsync({
			Url = SUPABASE_URL .. "/rest/v1/plugin_heartbeats",
			Method = "POST",
			Headers = {
				["Content-Type"] = "application/json",
				["apikey"] = SUPABASE_ANON_KEY,
				["Authorization"] = "Bearer " .. SUPABASE_ANON_KEY,
				["Prefer"] = "return=minimal"
			},
			Body = HttpService:JSONEncode({
				user_id = USER_ID,
				last_heartbeat = timestamp
			})
		})
	end)
	
	if postSuccess and (postResult.StatusCode == 201 or postResult.StatusCode == 200 or postResult.StatusCode == 409) then
		isConnected = true
		reconnectAttempts = 0
		updateStatus(true)
		print("[BlaxSmith] ✅ Connected!")
		return true
	end
	
	-- Fallback - still connect for offline functionality
	isConnected = true
	updateStatus(true)
	print("[BlaxSmith] ✅ Connected (local mode)")
	return true
end

-- ============================================
-- COMMAND EXECUTION
-- ============================================
local function executeCommand(cmd)
	print("[BlaxSmith] ⚡ Executing:", cmd.type or "unknown")
	
	-- MODEL INSERTION
	if cmd.type == "INSERT_MODEL" and cmd.data then
		local assetId = tonumber(cmd.data.assetId)
		if not assetId then return end
		
		print("[BlaxSmith] 📦 Inserting model:", cmd.data.name or assetId)
		
		local success, model = pcall(function()
			return InsertService:LoadAsset(assetId)
		end)
		
		if success and model then
			model.Name = cmd.data.name or "BlaxSmith_Model"
			
			-- Move children to workspace
			for _, child in ipairs(model:GetChildren()) do
				child.Name = cmd.data.name or child.Name
				child.Parent = workspace
				selectAndFocus(child)
				addToHistory({ name = child.Name, instance = child, assetId = assetId })
				print("[BlaxSmith] ✅ Inserted:", child.Name)
			end
			
			model:Destroy()
			updateStats()
			ChangeHistoryService:SetWaypoint("BlaxSmith: Inserted " .. (cmd.data.name or "Asset"))
		else
			warn("[BlaxSmith] ❌ Failed to insert:", assetId)
		end
	
	-- WORLD CODE EXECUTION
	elseif cmd.type == "EXECUTE_WORLD" and cmd.code then
		print("[BlaxSmith] 🌍 Executing world generation...")
		
		local func, loadErr = loadstring(cmd.code)
		if func then
			local execSuccess, execErr = pcall(func)
			if execSuccess then
				print("[BlaxSmith] ✅ World generated!")
				ChangeHistoryService:SetWaypoint("BlaxSmith: World Generated")
			else
				warn("[BlaxSmith] ❌ Execution error:", execErr)
			end
		else
			warn("[BlaxSmith] ❌ Code error:", loadErr)
		end
	
	-- SCRIPT INJECTION
	elseif cmd.type == "INJECT_SCRIPT" and cmd.data and cmd.data.code then
		print("[BlaxSmith] 📜 Injecting script:", cmd.data.name or "Script")
		
		local scriptType = cmd.data.type or "Script"
		local newScript = Instance.new(scriptType)
		newScript.Name = cmd.data.name or "AIScript"
		newScript.Source = cmd.data.code
		
		if scriptType == "LocalScript" then
			newScript.Parent = StarterPlayer.StarterPlayerScripts
		elseif scriptType == "ModuleScript" then
			newScript.Parent = ReplicatedStorage
		else
			newScript.Parent = ServerScriptService
		end
		
		selectAndFocus(newScript)
		addToHistory({ name = newScript.Name, instance = newScript, type = "script" })
		print("[BlaxSmith] ✅ Script created:", newScript.Name)
		ChangeHistoryService:SetWaypoint("BlaxSmith: Created " .. newScript.Name)
	end
end

-- ============================================
-- POLLING LOOPS
-- ============================================
local function startCommandPolling()
	if pollingThread then return end
	
	pollingThread = task.spawn(function()
		print("[BlaxSmith] 🔄 Command polling started")
		
		while isConnected do
			pcall(function()
				local response = HttpService:GetAsync(API_URL .. "/poll?userId=" .. USER_ID)
				if response and response ~= "" and response ~= "[]" then
					local success, commands = pcall(function()
						return HttpService:JSONDecode(response)
					end)
					
					if success and type(commands) == "table" then
						for _, cmd in ipairs(commands) do
							executeCommand(cmd)
						end
					end
				end
			end)
			
			task.wait(POLL_INTERVAL)
		end
	end)
end

local function startAssetQueuePolling()
	if assetPollingThread then return end
	
	assetPollingThread = task.spawn(function()
		print("[BlaxSmith] 📦 Asset queue polling started")
		
		while isConnected do
			pcall(function()
				local queueEndpoint = SUPABASE_URL .. "/rest/v1/asset_queue?user_id=eq." .. USER_ID .. "&status=eq.pending&limit=5"
				
				local response = HttpService:RequestAsync({
					Url = queueEndpoint,
					Method = "GET",
					Headers = {
						["Content-Type"] = "application/json",
						["apikey"] = SUPABASE_ANON_KEY,
						["Authorization"] = "Bearer " .. SUPABASE_ANON_KEY,
					}
				})
				
				if response.StatusCode == 200 then
					local success, assets = pcall(function()
						return HttpService:JSONDecode(response.Body)
					end)
					
					if success and type(assets) == "table" and #assets > 0 then
						for _, asset in ipairs(assets) do
							print("[BlaxSmith] 📥 Auto-inserting:", asset.asset_name)
							
							local insertSuccess, insertedModel = pcall(function()
								return InsertService:LoadAsset(tonumber(asset.asset_id))
							end)
							
							if insertSuccess and insertedModel then
								for _, child in ipairs(insertedModel:GetChildren()) do
									child.Name = asset.asset_name or child.Name
									child.Parent = workspace
									selectAndFocus(child)
									addToHistory({ name = child.Name, instance = child, assetId = asset.asset_id })
								end
								insertedModel:Destroy()
								updateStats()
								
								-- Mark complete
								pcall(function()
									HttpService:RequestAsync({
										Url = SUPABASE_URL .. "/rest/v1/asset_queue?id=eq." .. asset.id,
										Method = "PATCH",
										Headers = {
											["Content-Type"] = "application/json",
											["apikey"] = SUPABASE_ANON_KEY,
											["Authorization"] = "Bearer " .. SUPABASE_ANON_KEY,
										},
										Body = HttpService:JSONEncode({ status = "completed" })
									})
								end)
								
								print("[BlaxSmith] ✅ Inserted:", asset.asset_name)
							else
								warn("[BlaxSmith] ❌ Failed:", asset.asset_id)
								pcall(function()
									HttpService:RequestAsync({
										Url = SUPABASE_URL .. "/rest/v1/asset_queue?id=eq." .. asset.id,
										Method = "PATCH",
										Headers = {
											["Content-Type"] = "application/json",
											["apikey"] = SUPABASE_ANON_KEY,
											["Authorization"] = "Bearer " .. SUPABASE_ANON_KEY,
										},
										Body = HttpService:JSONEncode({ status = "failed" })
									})
								end)
							end
						end
					end
				end
			end)
			
			task.wait(ASSET_POLL_INTERVAL)
		end
	end)
end

local function startHeartbeat()
	if heartbeatThread then
		task.cancel(heartbeatThread)
	end
	
	heartbeatThread = task.spawn(function()
		while isConnected do
			local success = sendHeartbeat()
			if not success then
				print("[BlaxSmith] 💓 Heartbeat sent")
			end
			task.wait(HEARTBEAT_INTERVAL)
		end
	end)
end

local function stopAll()
	isConnected = false
	
	if heartbeatThread then task.cancel(heartbeatThread) heartbeatThread = nil end
	if pollingThread then task.cancel(pollingThread) pollingThread = nil end
	if assetPollingThread then task.cancel(assetPollingThread) assetPollingThread = nil end
	
	updateStatus(false, "Disconnected")
	print("[BlaxSmith] 🔌 Disconnected")
end

-- ============================================
-- CONNECT BUTTON HANDLERS
-- ============================================
local function toggleConnection()
	if isConnected then
		stopAll()
		uiConnectBtn.Text = "🔌 Connect"
		uiConnectBtn.BackgroundColor3 = Color3.fromRGB(255, 120, 50)
	else
		if USER_ID == "" or #USER_ID < 10 then
			uiConnectBtn.Text = "❌ Set ID!"
			uiConnectBtn.BackgroundColor3 = Color3.fromRGB(200, 60, 60)
			task.delay(1.5, function()
				uiConnectBtn.Text = "🔌 Connect"
				uiConnectBtn.BackgroundColor3 = Color3.fromRGB(255, 120, 50)
			end)
			return
		end
		
		uiConnectBtn.Text = "⏳ Connecting..."
		
		local success = sendHeartbeat()
		if success then
			startHeartbeat()
			startCommandPolling()
			startAssetQueuePolling()
			
			uiConnectBtn.Text = "🔴 Disconnect"
			uiConnectBtn.BackgroundColor3 = Color3.fromRGB(200, 60, 60)
			print("[BlaxSmith] ✅ Connected! Assets will sync automatically.")
		else
			uiConnectBtn.Text = "❌ Failed"
			uiConnectBtn.BackgroundColor3 = Color3.fromRGB(200, 60, 60)
			task.delay(1.5, function()
				uiConnectBtn.Text = "🔌 Connect"
				uiConnectBtn.BackgroundColor3 = Color3.fromRGB(255, 120, 50)
			end)
		end
	end
end

connectButton.Click:Connect(toggleConnection)
uiConnectBtn.MouseButton1Click:Connect(toggleConnection)

-- ============================================
-- CLEANUP
-- ============================================
plugin.Unloading:Connect(function()
	stopAll()
	if statusUI then statusUI:Destroy() end
	print("[BlaxSmith] Plugin unloaded")
end)

-- ============================================
-- GLOBAL API
-- ============================================
_G.BlaxSmithAPI = {
	insertAsset = function(assetId, name)
		executeCommand({ type = "INSERT_MODEL", data = { assetId = assetId, name = name } })
	end,
	getStatus = function()
		return { connected = isConnected, userId = USER_ID, history = #insertHistory }
	end,
	undo = function()
		if #insertHistory > 0 then
			local item = table.remove(insertHistory, 1)
			if item.instance and item.instance.Parent then
				item.instance:Destroy()
				return true
			end
		end
		return false
	end,
	connect = toggleConnection,
	disconnect = stopAll,
}

-- ============================================
-- STARTUP
-- ============================================
print("========================================")
print("🔥 BlaxSmith AI Plugin v3.0")
print("========================================")
print("Features:")
print("  ✅ Auto asset insertion from website")
print("  ✅ World generation support")
print("  ✅ Script injection")
print("  ✅ Undo support")
print("  ✅ Real-time sync")
print("")
print("Discord ID:", USER_ID ~= "" and USER_ID or "(not set)")
print("Website:", WEBSITE_URL)
print("========================================")
