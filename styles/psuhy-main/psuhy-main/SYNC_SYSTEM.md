# Supabase Sync System

## 🔄 Complete Sync Architecture

All ForgeMind generations are **automatically saved to Supabase** and synced to Roblox Studio.

### Database Tables

#### `creations` Table
Stores ALL generated content:
\`\`\`sql
- id: UUID
- user_id: UUID
- type: 'script'|'world'|'system'|'model'
- name: TEXT
- description: TEXT  
- prompt: TEXT (original user prompt)
- preview_url: TEXT (thumbnail/preview)
- asset_data: JSONB (full generation data)
- status: 'generating'|'ready'|'failed'
- synced_to_studio: BOOLEAN
- roblox_instance_path: TEXT (where it is in Studio)
- metadata: JSONB (tags, complexity, etc.)
- created_at: TIMESTAMP
- updated_at: TIMESTAMP
\`\`\`

#### `sloyd_models` Table
Stores 3D model generations:
\`\`\`sql
- id: UUID
- user_id: UUID
- prompt: TEXT
- sloyd_model_id: TEXT
- preview_url: TEXT (3D preview)
- download_url: TEXT (FBX download)
- mesh_data: JSONB
- status: 'generating'|'ready'|'failed'
- created_at: TIMESTAMP
\`\`\`

### Sync Flow

\`\`\`
User generates → Saved to Supabase → Plugin polls → Auto-inserts to Studio
                      ↓
                 Updates sync status
                      ↓
                 Marks as synced
\`\`\`

### Functions

#### `get_unsynced_creations(discord_id)`
Returns all creations that haven't been synced to Studio yet.

#### `mark_creation_synced(creation_id, instance_path)`
Marks a creation as synced and stores where it is in Studio.

#### Recent Creations View
Shows recent generations with user info for gallery display.

---

## 🔌 Plugin Integration

The Roblox Studio plugin:
1. **Polls** for new creations every 5 seconds
2. **Gets** unsynced creations via API
3. **Inserts** them automatically (scripts, models, worlds)
4. **Marks** them as synced with the Studio path

---

## 📊 Features

### ✅ Automatic Saving
Every generation is saved immediately:
- Scripts → `creations` table
- Worlds → `creations` table with asset arrays
- Systems → `creations` table with components
- 3D Models → `sloyd_models` table with preview URLs

### ✅ Sync Status Tracking
- Know which creations are in Studio
- See the exact Roblox instance path
- Track sync timestamps

### ✅ Search & Filter
- Search by name or description
- Filter by type (script/world/system/model)
- Sort by date

### ✅ Gallery View
- See all your creations
- Preview thumbnails
- Quick re-sync to Studio

### ✅ Metadata
- Add tags for organization
- Store complexity ratings
- Track performance metrics
- Custom notes

---

## 🚀 API Endpoints

### Get Unsynced
\`\`\`
GET /api/sync/unsynced
Returns: Array of creations not yet in Studio
\`\`\`

### Mark Synced
\`\`\`
POST /api/sync/mark-synced
Body: { creationId, instancePath }
\`\`\`

### Get All Creations
\`\`\`
GET /api/creations
Query: ?type=script&search=combat
Returns: Filtered creations
\`\`\`

### Delete Creation
\`\`\`
DELETE /api/creations/:id
\`\`\`

---

## 💾 Data Persistence

Everything is stored in Supabase PostgreSQL:
- **Durable** - Never lose your generations
- **Searchable** - Find anything instantly
- **Versioned** - Track changes over time
- **Shareable** - Export or share creations

---

## 🔧 Setup

Run migration:
\`\`\`sql
scripts/006-sync-enhancements.sql
\`\`\`

This adds:
- Sync status fields
- Instance path tracking
- Metadata storage
- Helper functions
- Optimized indexes

**All models sync automatically!** ✅
