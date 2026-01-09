# 🔌 Quick Plugin Connection Guide

## For Your Roblox Studio Plugin

Add this code to your BlaxSmith AI plugin:

\`\`\`lua
local HttpService = game:GetService("HttpService")

-- Your Discord/User ID (get from website)
local USER_ID = "YOUR_DISCORD_ID_HERE"  -- Replace with your actual Discord ID

local function sendHeartbeat()
    while true do
        local success, response = pcall(function()
            return HttpService:RequestAsync({
                Url = "https://blaxsmith.dev/api/plugin/status",
                Method = "POST",
                Headers = {
                    ["Content-Type"] = "application/json"
                },
                Body = HttpService:JSONEncode({
                    userId = USER_ID
                })
            })
        end)
        
        if success then
            print("[BlaxSmith] Connected to blaxsmith.dev ✓")
        else
            warn("[BlaxSmith] Connection failed")
        end
        
        wait(5) -- Send heartbeat every 5 seconds
    end
end

-- Start heartbeat in background
task.spawn(sendHeartbeat)
\`\`\`

## How to Get Your Discord ID

1. Go to https://blaxsmith.dev/forge
2. Open browser console (F12)
3. Type: `localStorage.getItem('discord_id')`
4. Copy the ID and paste it in the plugin code above

## Test Connection

1. Run the plugin in Roblox Studio
2. Check Studio Output for: `[BlaxSmith] Connected to blaxsmith.dev ✓`
3. Go to https://blaxsmith.dev/forge
4. Look for **"Studio Connected"** with green dot

That's it! Your plugin is now connected! 🚀
