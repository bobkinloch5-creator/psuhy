# 🔌 BlaxSmith AI - Roblox Studio Plugin

This is the companion plugin for connecting Roblox Studio to blaxsmith.dev

## Installation

1. Download this plugin folder
2. Place in: `%LOCALAPPDATA%\Roblox\Plugins`
3. Restart Roblox Studio
4. Plugin will appear in toolbar

## Quick Setup

Add this to your plugin's main script:

\`\`\`lua
local HttpService = game:GetService("HttpService")
local USER_ID = "YOUR_DISCORD_ID" -- Get from blaxsmith.dev/forge

-- Heartbeat to website
task.spawn(function()
    while true do
        pcall(function()
            HttpService:RequestAsync({
                Url = "https://blaxsmith.dev/api/plugin/status",
                Method = "POST",
                Headers = { ["Content-Type"] = "application/json" },
                Body = HttpService:JSONEncode({ userId = USER_ID })
            })
            print("[BlaxSmith] Connected ✓")
        end)
        task.wait(5)
    end
end)
\`\`\`

## Features

- ✅ Auto-connect to blaxsmith.dev
- ✅ Receive generated models
- ✅ Import worlds with one click
- ✅ Real-time status indicator

## Getting Your Discord ID

1. Go to https://blaxsmith.dev
2. Login with Discord
3. Open browser console (F12)
4. Your ID is shown in the profile section

## Troubleshooting

**Plugin not connecting?**
- Enable HTTP requests in Studio settings
- Check that URL is `blaxsmith.dev` (not `blaxsmith`)
- Verify your Discord ID is correct

**Assets not importing?**
- Check Studio Output for errors
- Ensure assets IDs are valid
- Try importing manually first

## Support

Visit https://blaxsmith.dev for documentation and support
