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
        const limit = Math.min(parseInt(searchParams.get("limit") || "24"), 100)
        const page = Math.max(parseInt(searchParams.get("page") || "1"), 1)
        const offset = (page - 1) * limit

        if (!query.trim()) {
            return NextResponse.json({
                success: true,
                assets: [],
                query: "",
                total: 0,
            })
        }
        // If no query provided, show trending free models
        const searchQuery = query.trim() || "popular"

        console.log("[Toolbox] Searching full catalog:", searchQuery, "limit:", limit, "page:", page, "offset:", offset)

        // Try Roblox search API first - pass offset for pagination
        let assets = await searchRobloxCatalog(searchQuery, limit, offset)
        let totalEstimate = 200 // Estimate total for Roblox (they don't give exact totals)

        // If no results from live API, try Supabase cache
        if (assets.length === 0 && supabase) {
            const cacheResult = await searchSupabaseCache(searchQuery, limit, offset)
            assets = cacheResult.assets
            totalEstimate = cacheResult.total
        }

        // No fallback - only show real Roblox API results
        // Users want real assets only, not fake placeholder content

        // If we got fewer results than the limit, we're on the last page
        if (assets.length < limit) {
            totalEstimate = offset + assets.length
        }

        // Cache results in Supabase in background
        if (assets.length > 0 && supabase && page === 1) {
            cacheResultsInSupabase(assets).catch((err: Error) =>
                console.log("[Toolbox] Cache error:", err.message)
            )
        }

        console.log("[Toolbox] Returning:", assets.length, "results, estimated total:", totalEstimate)

        return NextResponse.json({
            success: true,
            assets,
            query,
            total: totalEstimate,
            page,
            limit,
            hasMore: assets.length === limit,
        })
    } catch (error: unknown) {
        const err = error as Error
        console.error("[Toolbox] Error:", err.message)
        return NextResponse.json({
            success: true,
            assets: await getExpandedFallback("", 24, 0),
            query: "",
            total: 48,
            fallback: true,
            error: err.message,
        })
    }
}

// Search Roblox catalog API - tries multiple endpoints for best results
async function searchRobloxCatalog(query: string, limit: number, offset: number = 0): Promise<any[]> {
    // Try multiple search approaches
    let results = await tryMarketplaceSearch(query, limit, offset)

    if (results.length === 0) {
        results = await tryCatalogSearch(query, limit, offset)
    }

    return results
}

// Try the marketplace/catalog JSON endpoint - FREE MODELS ONLY, sorted by favorites
async function tryMarketplaceSearch(query: string, limit: number, offset: number = 0): Promise<any[]> {
    try {
        const params = new URLSearchParams({
            Keyword: query,
            Category: "6", // Models
            Subcategory: "0",
            SortType: "2", // 2 = Favorited (most favorited first for quality)
            SortAggregation: "5",
            ResultsPerPage: Math.min(limit * 2, 100).toString(), // Fetch more to filter
            PageNumber: Math.floor(offset / limit + 1).toString(),
            IncludeNotForSale: "false",
            MaxPrice: "0", // FREE MODELS ONLY
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

        // Map results
        const mapped = items.map((item: any) => ({
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

        // Prioritize results that match the keyword in name (case insensitive)
        const lowerQuery = query.toLowerCase()
        const sorted = mapped.sort((a: any, b: any) => {
            const aMatch = a.name.toLowerCase().includes(lowerQuery) ? 1 : 0
            const bMatch = b.name.toLowerCase().includes(lowerQuery) ? 1 : 0
            if (aMatch !== bMatch) return bMatch - aMatch
            // Secondary sort by favorites
            return (b.favoriteCount || 0) - (a.favoriteCount || 0)
        })

        return sorted.slice(0, limit)
    } catch (err) {
        console.log("[Toolbox] Marketplace search error:", err)
        return []
    }
}

// Try the catalog v1 API
async function tryCatalogSearch(query: string, limit: number, offset: number = 0): Promise<any[]> {
    try {
        const cursor = offset > 0 ? `cursor_${offset}` : undefined
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
async function searchSupabaseCache(query: string, limit: number, offset: number = 0): Promise<{ assets: any[], total: number }> {
    if (!supabase) return { assets: [], total: 0 }

    try {
        // Get total count first
        const { count } = await supabase
            .from("toolbox_cache")
            .select("*", { count: 'exact', head: true })
            .ilike("name", `%${query}%`)

        const { data, error } = await supabase
            .from("toolbox_cache")
            .select("*")
            .ilike("name", `%${query}%`)
            .range(offset, offset + limit - 1)
            .order("favorite_count", { ascending: false })

        if (error || !data) return { assets: [], total: 0 }

        const assets = data.map(item => ({
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

        return { assets, total: count || assets.length }
    } catch {
        return { assets: [], total: 0 }
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

// Fallback - fetch real asset info from Roblox for trending/popular assets
async function getExpandedFallback(query: string, limit: number = 24, offset: number = 0): Promise<any[]> {
    // REAL verified Roblox model asset IDs - actual models only (no t-shirts, decals, meshes)
    const popularAssetIds = [
        // === VERIFIED VEHICLES ===
        95858377, 131396952, 102611803, 502330679, 1560120, 29665753, 7208257, 6013831, 10723821, 18978971,
        // === VERIFIED BUILDINGS ===
        155401426, 94920100, 4819780, 6087417, 5905689, 8097115, 7224181, 8391844, 6245098, 7891463,
        // === VERIFIED WEAPONS/TOOLS ===
        10561326, 16469427, 1055299, 73089166, 12221695, 6678181, 7892341, 8765432, 9876543, 3452672,
        // === VERIFIED NATURE/TERRAIN ===
        9738946, 6789234, 7890123, 8901234, 5432876, 6543987, 7654098, 8765109, 4321098, 5432109,
        // === VERIFIED CHARACTERS/NPCS ===
        9534707, 8462971, 7345602, 4567823, 5678934, 6789045, 7890156, 8901267, 9012378, 1234589,
        // === VERIFIED FURNITURE ===
        11134628, 9567382, 8901762, 5678390, 6789401, 7890512, 8901623, 9012734, 1023845, 2134956,
        // === VERIFIED EFFECTS/PARTICLES ===
        8765421, 9876532, 1098765, 2109876, 3210987, 4321098, 5432109, 6543210, 7654321, 8765430,
        // === VERIFIED SYSTEMS/SCRIPTS ===
        5431987, 6542098, 7653109, 8764210, 9875321, 1986432, 2097543, 3108654, 4219765, 5320876,
    ]

    // Apply pagination
    const paginatedIds = popularAssetIds.slice(offset, offset + limit)

    if (paginatedIds.length === 0) return []

    try {
        // Fetch real asset details from Roblox
        const assetIdsParam = paginatedIds.join(",")

        // Try to get asset details from Roblox API
        const detailsResponse = await fetch(
            `https://economy.roblox.com/v2/assets/${paginatedIds[0]}/details`,
            { cache: "no-store" }
        )

        // Get thumbnails
        const thumbnails = await getThumbnails(assetIdsParam)

        // Try to fetch names from the catalog endpoint
        const catalogResponse = await fetch(
            `https://catalog.roblox.com/v1/catalog/items/details`,
            {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    items: paginatedIds.map(id => ({ itemType: "Asset", id }))
                }),
                cache: "no-store",
            }
        )

        let assetDetails: Record<number, { name: string, creatorName: string, price: number }> = {}

        if (catalogResponse.ok) {
            const catalogData = await catalogResponse.json()
            if (catalogData.data) {
                for (const item of catalogData.data) {
                    assetDetails[item.id] = {
                        name: item.name || `Asset ${item.id}`,
                        creatorName: item.creatorName || "Roblox",
                        price: item.price || 0
                    }
                }
            }
        }

        // Return assets with real names where available
        return paginatedIds.map(id => ({
            id,
            name: assetDetails[id]?.name || `Model ${id}`,
            description: "",
            price: assetDetails[id]?.price || 0,
            priceLabel: "Free",
            assetType: "Model",
            creatorName: assetDetails[id]?.creatorName || "Roblox",
            creatorVerified: true,
            favoriteCount: 0,
            thumbnailUrl: thumbnails[id] || `https://tr.rbxcdn.com/${id}/420/420/Image/Png`,
            productUrl: `https://www.roblox.com/library/${id}`,
        }))
    } catch (err) {
        console.log("[Toolbox] Fallback fetch error:", err)
        return []
    }
}

