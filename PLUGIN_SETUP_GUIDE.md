# 🔌 Roblox Studio Plugin Setup

## Quick Setup (5 minutes)

### Step 1: Get Your Discord ID

1. Go to https://blaxsmith.dev
2. Login with Discord
3. Open browser console (F12)
4. Type: `localStorage.getItem('discord_id')` or find it in your profile
5. Copy your Discord ID

### Step 2: Install Plugin

1. **Open Roblox Studio**
2. Click **Plugins** tab → **Plugins Folder**
3. Create a new file: `BlaxSmithPlugin.lua`
4. Copy the code from `roblox-plugin/BlaxSmithPlugin.lua`
5. **IMPORTANT:** Replace `YOUR_DISCORD_ID_HERE` with your actual Discord ID
6. Save the file
7. Restart Roblox Studio

### Step 3: Connect

1. In Roblox Studio, look for the **BlaxSmith AI** toolbar
2. Click the **Connect** button
3. You should see "🟢 Connected" in the top-right corner
4. Check https://blaxsmith.dev/forge - Studio status should show "Connected"!

## Features

✅ **Real-time Connection** - Heartbeat every 30 seconds
✅ **Status Indicator** - See connection status in Studio
✅ **Model Import** - Receive models from website
✅ **World Import** - Receive world scripts from website
✅ **Auto-reconnect** - Stays connected while you work

## Troubleshooting

### "Failed to connect" error

**Cause:** HTTP requests disabled or Discord ID incorrect

**Fix:**
1. In Roblox Studio: **File** → **Settings** → **Network**
2. Enable **Allow HTTP Requests**
3. Double-check your Discord ID in the plugin code
4. Save and restart Studio

### Plugin doesn't appear

**Fix:**
1. Make sure the file is named `BlaxSmithPlugin.lua`
2. File should be in the **Plugins** folder
3. Restart Roblox Studio completely
4. Check Output for error messages

### Connection keeps dropping

**Fix:**
- Check your internet connection
- Make sure blaxsmith.dev is accessible
- Heartbeat interval might need adjustment (increase from 30s to 60s)

## Advanced Usage

### Get Connection Status

Open Command Bar in Studio:
```lua
print(_G.BlaxSmithAPI.getStatus())
```

### Manually Import Model

```lua
_G.BlaxSmithAPI.importModel({
    name = "My Model",
    url = "https://..."
})
```

### Manually Import World

```lua
_G.BlaxSmithAPI.importWorld({
    name = "My World",
    assets = {...}
})
```

## Next Steps

Once connected:
1. Generate models on blaxsmith.dev
2. Click "Send to Studio" (coming soon)
3. Model appears in your Roblox Studio workspace!

---

**Need help?** Check the full guide at https://blaxsmith.dev/docs/plugin
