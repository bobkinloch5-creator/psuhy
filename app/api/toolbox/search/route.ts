import { NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"

// Roblox API endpoints for full catalog access
const ROBLOX_CATALOG_API = "https://catalog.roblox.com/v1/search/items"
const ROBLOX_TOOLBOX_API = "https://apis.roblox.com/toolbox-service/v1/items/details"
const ROBLOX_MARKETPLACE_API = "https://www.roblox.com/catalog/json"
const THUMBNAIL_API = "https://thumbnails.roblox.com/v1/assets"

// Supabase for caching
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || ""
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ""
const supabase = supabaseUrl && supabaseAnonKey ? createClient(supabaseUrl, supabaseAnonKey) : null

export async function GET(request: Request) {
    try {
        const { searchParams } = new URL(request.url)
        const query = searchParams.get("query") || ""
        const limit = Math.min(parseInt(searchParams.get("limit") || "48"), 100)

        if (!query.trim()) {
            return NextResponse.json({
                success: true,
                assets: [],
                query: "",
            })
        }

        console.log("[Toolbox] Searching full catalog:", query, "limit:", limit)

        // Try Roblox search API first
        let assets = await searchRobloxCatalog(query, limit)

        // If no results from live API, try Supabase cache
        if (assets.length === 0 && supabase) {
            assets = await searchSupabaseCache(query, limit)
        }

        // Final fallback to curated models
        if (assets.length === 0) {
            assets = await getExpandedFallback(query)
        }

        // Cache results in Supabase in background
        if (assets.length > 0 && supabase) {
            cacheResultsInSupabase(assets).catch((err: Error) =>
                console.log("[Toolbox] Cache error:", err.message)
            )
        }

        console.log("[Toolbox] Returning:", assets.length, "results")

        return NextResponse.json({
            success: true,
            assets,
            query,
            totalResults: assets.length,
        })
    } catch (error: unknown) {
        const err = error as Error
        console.error("[Toolbox] Error:", err.message)
        return NextResponse.json({
            success: true,
            assets: await getExpandedFallback(""),
            query: "",
            fallback: true,
            error: err.message,
        })
    }
}

// Search Roblox catalog API - tries multiple endpoints for best results
async function searchRobloxCatalog(query: string, limit: number): Promise<any[]> {
    // Try multiple search approaches
    let results = await tryMarketplaceSearch(query, limit)

    if (results.length === 0) {
        results = await tryCatalogSearch(query, limit)
    }

    return results
}

// Try the marketplace/catalog JSON endpoint
async function tryMarketplaceSearch(query: string, limit: number): Promise<any[]> {
    try {
        const params = new URLSearchParams({
            Keyword: query,
            Category: "6", // Models
            Subcategory: "0",
            SortType: "Relevance",
            SortAggregation: "5",
            ResultsPerPage: Math.min(limit, 100).toString(),
            IncludeNotForSale: "false",
        })

        const response = await fetch(`${ROBLOX_MARKETPLACE_API}?${params}`, {
            headers: {
                "Accept": "application/json",
                "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36"
            },
            cache: "no-store",
        })

        if (!response.ok) {
            console.log("[Toolbox] Marketplace API failed:", response.status)
            return []
        }

        const items = await response.json()
        if (!Array.isArray(items) || items.length === 0) {
            return []
        }

        // Get thumbnails
        const assetIds = items.map((item: any) => item.AssetId || item.Id).filter(Boolean).join(",")
        const thumbnails = await getThumbnails(assetIds)

        return items.slice(0, limit).map((item: any) => ({
            id: item.AssetId || item.Id,
            name: item.Name || "Unnamed",
            description: item.Description || "",
            price: item.Price || 0,
            priceLabel: (item.Price === 0 || !item.Price) ? "Free" : `R$ ${item.Price}`,
            assetType: "Model",
            creatorName: item.Creator?.Name || item.CreatorName || "Roblox",
            creatorVerified: item.Creator?.HasVerifiedBadge || false,
            favoriteCount: item.FavoriteCount || 0,
            thumbnailUrl: thumbnails[item.AssetId || item.Id] || `https://tr.rbxcdn.com/${item.AssetId || item.Id}/420/420/Image/Png`,
            productUrl: `https://www.roblox.com/library/${item.AssetId || item.Id}`,
        }))
    } catch (err) {
        console.log("[Toolbox] Marketplace search error:", err)
        return []
    }
}

// Try the catalog v1 API
async function tryCatalogSearch(query: string, limit: number): Promise<any[]> {
    try {
        const params = new URLSearchParams({
            keyword: query,
            category: "Models",
            limit: Math.min(limit, 30).toString(),
            sortType: "Relevance",
        })

        const response = await fetch(`${ROBLOX_CATALOG_API}?${params}`, {
            headers: { "Accept": "application/json" },
            cache: "no-store",
        })

        if (!response.ok) {
            console.log("[Toolbox] Catalog API failed:", response.status)
            return []
        }

        const data = await response.json()
        const items = data.data || []

        if (items.length === 0) return []

        // Get thumbnails
        const assetIds = items.map((item: any) => item.id).filter(Boolean).join(",")
        const thumbnails = await getThumbnails(assetIds)

        return items.slice(0, limit).map((item: any) => ({
            id: item.id,
            name: item.name || "Unnamed",
            description: item.description || "",
            price: item.price || 0,
            priceLabel: (item.price === 0 || !item.price) ? "Free" : `R$ ${item.price}`,
            assetType: item.assetType || "Model",
            creatorName: item.creatorName || "Roblox",
            creatorVerified: false,
            favoriteCount: item.favoriteCount || 0,
            thumbnailUrl: thumbnails[item.id] || `https://tr.rbxcdn.com/${item.id}/420/420/Image/Png`,
            productUrl: `https://www.roblox.com/library/${item.id}`,
        }))
    } catch (err) {
        console.log("[Toolbox] Catalog search error:", err)
        return []
    }
}

// Search cached results in Supabase
async function searchSupabaseCache(query: string, limit: number): Promise<any[]> {
    if (!supabase) return []

    try {
        const { data, error } = await supabase
            .from("toolbox_cache")
            .select("*")
            .ilike("name", `%${query}%`)
            .limit(limit)
            .order("favorite_count", { ascending: false })

        if (error || !data) return []

        return data.map(item => ({
            id: item.id,
            name: item.name,
            description: item.description || "",
            price: item.price || 0,
            priceLabel: (item.price === 0 || !item.price) ? "Free" : `R$ ${item.price}`,
            assetType: item.asset_type || "Model",
            creatorName: item.creator_name || "Roblox",
            creatorVerified: item.creator_verified || false,
            favoriteCount: item.favorite_count || 0,
            thumbnailUrl: item.thumbnail_url,
            productUrl: item.product_url,
        }))
    } catch {
        return []
    }
}

// Cache results to Supabase
async function cacheResultsInSupabase(assets: any[]): Promise<void> {
    if (!supabase || assets.length === 0) return

    const records = assets.slice(0, 50).map(asset => ({
        id: asset.id,
        name: asset.name,
        description: asset.description,
        creator_name: asset.creatorName,
        creator_verified: asset.creatorVerified,
        favorite_count: asset.favoriteCount,
        price: asset.price,
        asset_type: asset.assetType,
        thumbnail_url: asset.thumbnailUrl,
        product_url: asset.productUrl,
        updated_at: new Date().toISOString(),
    }))

    await supabase
        .from("toolbox_cache")
        .upsert(records, { onConflict: "id" })
}

// Get thumbnails from Roblox API
async function getThumbnails(assetIds: string): Promise<Record<number, string>> {
    if (!assetIds) return {}

    try {
        const response = await fetch(
            `${THUMBNAIL_API}?assetIds=${assetIds}&size=420x420&format=Png&isCircular=false`,
            { cache: "no-store" }
        )
        if (!response.ok) return {}

        const data = await response.json()
        const thumbnails: Record<number, string> = {}

        for (const item of data.data || []) {
            if (item.imageUrl) {
                thumbnails[item.targetId] = item.imageUrl
            }
        }
        return thumbnails
    } catch {
        return {}
    }
}

// Expanded curated fallback models (50+ popular models)
async function getExpandedFallback(query: string): Promise<any[]> {
    const curatedModels = [
        // Weapons
        { id: 920587473, name: "Basic Sword", favoriteCount: 15000, tags: ["sword", "weapon", "melee"] },
        { id: 10561326, name: "Linked Sword", favoriteCount: 80000, tags: ["sword", "weapon", "classic"] },
        { id: 21294053, name: "Rocket Launcher", favoriteCount: 45000, tags: ["weapon", "gun", "explosive"] },
        { id: 95354311, name: "Crossbow", favoriteCount: 25000, tags: ["weapon", "bow", "ranged"] },
        { id: 130113146, name: "Battle Axe", favoriteCount: 18000, tags: ["axe", "weapon", "melee"] },
        { id: 12221695, name: "Classic Sword", favoriteCount: 60000, tags: ["sword", "weapon", "classic"] },

        // NPCs & Characters
        { id: 27699497, name: "Drooling Zombie", favoriteCount: 50000, tags: ["zombie", "npc", "enemy", "monster"] },
        { id: 7074827, name: "NPC Zombie", favoriteCount: 22000, tags: ["zombie", "npc", "enemy"] },
        { id: 505942927, name: "Custom NPC", favoriteCount: 35000, tags: ["npc", "character", "human"] },
        { id: 194966866, name: "Skeleton", favoriteCount: 28000, tags: ["skeleton", "npc", "enemy", "monster"] },
        { id: 430749282, name: "Robot Enemy", favoriteCount: 20000, tags: ["robot", "npc", "enemy", "sci-fi"] },

        // Buildings & Structures
        { id: 155401426, name: "Medieval Castle", favoriteCount: 45000, tags: ["castle", "building", "medieval"] },
        { id: 17385737, name: "Basic House", favoriteCount: 30000, tags: ["house", "building", "home"] },
        { id: 94920100, name: "Modern House", favoriteCount: 40000, tags: ["house", "building", "modern"] },
        { id: 4819780, name: "Wooden Cabin", favoriteCount: 25000, tags: ["cabin", "house", "wood"] },
        { id: 358546284, name: "Sci-Fi Building", favoriteCount: 18000, tags: ["building", "sci-fi", "futuristic"] },
        { id: 1818436, name: "Tower", favoriteCount: 22000, tags: ["tower", "building", "medieval"] },

        // Nature
        { id: 9738946, name: "Oak Tree", favoriteCount: 35000, tags: ["tree", "nature", "oak"] },
        { id: 505202876, name: "Pine Tree", favoriteCount: 28000, tags: ["tree", "nature", "pine", "forest"] },
        { id: 1033714, name: "Bush", favoriteCount: 20000, tags: ["bush", "nature", "plant"] },
        { id: 176269859, name: "Rock Formation", favoriteCount: 25000, tags: ["rock", "nature", "stone"] },
        { id: 20985806, name: "Flowers", favoriteCount: 18000, tags: ["flower", "nature", "plant"] },
        { id: 417605, name: "Grass Patch", favoriteCount: 15000, tags: ["grass", "nature", "terrain"] },

        // Vehicles
        { id: 29665753, name: "Car Model", favoriteCount: 40000, tags: ["car", "vehicle", "automobile"] },
        { id: 95858377, name: "Sports Car", favoriteCount: 55000, tags: ["car", "vehicle", "sports", "racing"] },
        { id: 131396952, name: "Truck", favoriteCount: 30000, tags: ["truck", "vehicle", "pickup"] },
        { id: 502330679, name: "Helicopter", favoriteCount: 45000, tags: ["helicopter", "vehicle", "aircraft"] },
        { id: 1560120, name: "Boat", favoriteCount: 25000, tags: ["boat", "vehicle", "water"] },
        { id: 102611803, name: "Motorcycle", favoriteCount: 35000, tags: ["motorcycle", "vehicle", "bike"] },

        // Furniture & Objects
        { id: 358799, name: "Chair", favoriteCount: 25000, tags: ["chair", "furniture", "seat"] },
        { id: 7670069, name: "Table", favoriteCount: 28000, tags: ["table", "furniture", "desk"] },
        { id: 32812040, name: "Lamp", favoriteCount: 18000, tags: ["lamp", "furniture", "light"] },
        { id: 255893032, name: "Treasure Chest", favoriteCount: 40000, tags: ["chest", "treasure", "loot", "gold"] },
        { id: 1014539, name: "Door", favoriteCount: 35000, tags: ["door", "building", "entrance"] },
        { id: 28737, name: "Window", favoriteCount: 22000, tags: ["window", "building", "glass"] },

        // Effects & Special
        { id: 9856898, name: "Fire Effect", favoriteCount: 30000, tags: ["fire", "effect", "particle"] },
        { id: 3432369, name: "Explosion", favoriteCount: 45000, tags: ["explosion", "effect", "particle"] },
        { id: 83353855, name: "Portal", favoriteCount: 50000, tags: ["portal", "magic", "teleport"] },
        { id: 17127372, name: "Spawn Point", favoriteCount: 35000, tags: ["spawn", "checkpoint", "respawn"] },

        // Classic & Popular
        { id: 43808, name: "Linked Hat", favoriteCount: 100000, tags: ["hat", "accessory", "classic"] },
        { id: 1055299, name: "Gravity Coil", favoriteCount: 150000, tags: ["coil", "gear", "gravity"] },
        { id: 16469427, name: "Speed Coil", favoriteCount: 120000, tags: ["coil", "gear", "speed"] },

        // Animals & Pets
        { id: 266936477, name: "Dog", favoriteCount: 28000, tags: ["dog", "pet", "animal"] },
        { id: 262531173, name: "Cat", favoriteCount: 25000, tags: ["cat", "pet", "animal"] },
        { id: 257489726, name: "Dragon", favoriteCount: 60000, tags: ["dragon", "monster", "fantasy"] },
        { id: 179502767, name: "Bird", favoriteCount: 18000, tags: ["bird", "animal", "flying"] },

        // Tools & Items
        { id: 73089166, name: "Flashlight", favoriteCount: 30000, tags: ["flashlight", "tool", "light"] },
        { id: 32557814, name: "Key", favoriteCount: 22000, tags: ["key", "item", "unlock"] },
        { id: 107779339, name: "Potion", favoriteCount: 35000, tags: ["potion", "item", "health", "magic"] },
        { id: 1091570, name: "Money", favoriteCount: 40000, tags: ["money", "coin", "currency", "gold"] },
    ]

    const q = query.toLowerCase().trim()

    // Filter by query tags or name
    let filtered = curatedModels
    if (q) {
        filtered = curatedModels.filter(m =>
            m.name.toLowerCase().includes(q) ||
            m.tags.some(tag => tag.includes(q) || q.includes(tag))
        )
    }

    // If no matches, return popular items
    const results = filtered.length > 0 ? filtered : curatedModels.slice(0, 24)

    // Fetch real thumbnails for these assets
    const assetIds = results.map(m => m.id).join(",")
    const thumbnails = await getThumbnails(assetIds)

    return results.slice(0, 48).map(m => ({
        id: m.id,
        name: m.name,
        description: "",
        price: 0,
        priceLabel: "Free",
        assetType: "Model",
        creatorName: "Roblox",
        creatorVerified: true,
        favoriteCount: m.favoriteCount,
        thumbnailUrl: thumbnails[m.id] || `https://tr.rbxcdn.com/${m.id}/420/420/Image/Png`,
        productUrl: `https://www.roblox.com/library/${m.id}`,
    }))
}
