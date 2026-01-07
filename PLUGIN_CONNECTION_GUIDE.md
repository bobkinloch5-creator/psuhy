# 🔌 Roblox Studio Plugin Connection Guide

## Overview
Connect your Roblox Studio plugin to **blaxsmith.dev** to send generated models and worlds directly to Studio.

---

## How It Works

The plugin communicates with your website via REST API:

1. **Heartbeat System**: Plugin sends regular "I'm alive" signals
2. **Status Check**: Website shows "Connected" when heartbeat is recent
3. **Asset Transfer**: Models/worlds sent from website to Studio

---

## API Endpoints

### 1. Heartbeat (Keep-Alive)

**Endpoint:** `POST https://blaxsmith.dev/api/plugin/status`

**Purpose:** Tell the website your plugin is active

**Example (Luau):**
```lua
local HttpService = game:GetService("HttpService")

-- Send heartbeat every 5 seconds
while true do
    local success = pcall(function()
        HttpService:RequestAsync({
            Url = "https://blaxsmith.dev/api/plugin/status",
            Method = "POST"
        })
    end)
    
    if success then
        print("[BlaxSmith] Heartbeat sent")
    else
        warn("[BlaxSmith] Heartbeat failed")
    end
    
    wait(5) -- Wait 5 seconds
end
```

**Response:**
```json
{
  "success": true,
  "message": "Heartbeat received"
}
```

---

### 2. Check Connection Status

**Endpoint:** `GET https://blaxsmith.dev/api/plugin/status`

**Purpose:** Check if plugin is connected (used by website)

**Response:**
```json
{
  "connected": true
}
```

---

### 3. Send Asset to Studio

**Endpoint:** `POST https://blaxsmith.dev/api/plugin/send-to-studio`

**Body:**
```json
{
  "creationId": "uuid-here"
}
```

**Response:**
```json
{
  "success": true,
  "creation": {
    "id": "...",
    "type": "model",
    "name": "Medieval Sword",
    "asset_data": { ... }
  }
}
```

---

## Complete Plugin Code Example

```lua
-- BlaxSmith AI Plugin
-- Main Script

local HttpService = game:GetService("HttpService")
local BASE_URL = "https://blaxsmith.dev/api"

local BlaxSmithPlugin = {}
BlaxSmithPlugin.__index = BlaxSmithPlugin

function BlaxSmithPlugin.new()
    local self = setmetatable({}, BlaxSmithPlugin)
    self.connected = false
    self.heartbeatThread = nil
    return self
end

-- Start heartbeat system
function BlaxSmithPlugin:startHeartbeat()
    self.heartbeatThread = task.spawn(function()
        while true do
            local success = pcall(function()
                local response = HttpService:RequestAsync({
                    Url = BASE_URL .. "/plugin/status",
                    Method = "POST"
                })
                
                if response.StatusCode == 200 then
                    self.connected = true
                    print("[BlaxSmith] Connected to blaxsmith.dev")
                end
            end)
            
            if not success then
                self.connected = false
                warn("[BlaxSmith] Connection lost")
            end
            
            task.wait(5) -- Heartbeat every 5 seconds
        end
    end)
end

-- Receive asset from website
function BlaxSmithPlugin:receiveAsset(creationId)
    local success, result = pcall(function()
        local response = HttpService:RequestAsync({
            Url = BASE_URL .. "/plugin/send-to-studio",
            Method = "POST",
            Headers = {
                ["Content-Type"] = "application/json"
            },
            Body = HttpService:JSONEncode({
                creationId = creationId
            })
        })
        
        if response.StatusCode == 200 then
            local data = HttpService:JSONDecode(response.Body)
            return data.creation
        end
    end)
    
    if success and result then
        self:importAsset(result)
    else
        warn("[BlaxSmith] Failed to receive asset")
    end
end

-- Import asset into Studio
function BlaxSmithPlugin:importAsset(creation)
    if creation.type == "model" then
        -- Import 3D model
        local model = Instance.new("Model")
        model.Name = creation.name
        
        -- Parse asset_data and create MeshParts
        -- ... model import logic ...
        
        model.Parent = workspace
        print("[BlaxSmith] Imported model:", creation.name)
        
    elseif creation.type == "world" then
        -- Import world/terrain
        print("[BlaxSmith] Imported world:", creation.name)
        -- ... terrain import logic ...
    end
end

-- Initialize plugin
local plugin = BlaxSmithPlugin.new()
plugin:startHeartbeat()

return plugin
```

---

## Testing Connection

### Step 1: Run Plugin in Studio
1. Open Roblox Studio
2. Install/run BlaxSmith AI plugin
3. Check output for: `[BlaxSmith] Connected to blaxsmith.dev`

### Step 2: Check Website
1. Go to `https://blaxsmith.dev/forge`
2. Look for plugin status indicator
3. Should show: **"Studio Connected"** with green dot

### Step 3: Test Asset Transfer
1. Generate a model on the website
2. Plugin should automatically receive it
3. Check Studio workspace for imported asset

---

## Troubleshooting

### ❌ "Studio Offline" on Website

**Problem:** Heartbeat not reaching server

**Solutions:**
- Check Studio HTTP requests are enabled
- Verify plugin is running (check Studio output)
- Confirm URL is `https://blaxsmith.dev` (not `blaxsmith`)

### ❌ Assets Not Importing

**Problem:** Plugin receiving but not importing

**Solutions:**
- Check Studio output for errors
- Verify asset_data format
- Ensure workspace is not locked

### ❌ Connection Drops Frequently

**Problem:** Heartbeat failing

**Solutions:**
- Check internet connection
- Increase heartbeat interval to 10 seconds
- Add retry logic with exponential backoff

---

## Security Notes

- ✅ All communication over HTTPS
- ✅ No sensitive data in heartbeat
- ✅ Plugin runs locally in Studio
- ✅ Website validates all asset data

---

## Next Steps

Once connected:
1. Generate models on blaxsmith.dev
2. They appear automatically in Studio
3. Edit and use in your game!

Need help? Check the console output in both Studio and your browser dev tools for debugging info.
