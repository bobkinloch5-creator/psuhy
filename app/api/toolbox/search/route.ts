import { NextResponse } from "next/server"

// FULL Roblox Toolbox API - Searches the ENTIRE toolbox
const TOOLBOX_V2_SEARCH = "https://apis.roblox.com/toolbox-service/v2/assets:search"
const TOOLBOX_V1_SEARCH = "https://apis.roblox.com/toolbox-service/v1/items/search"
const CATALOG_SEARCH = "https://catalog.roblox.com/v1/search/items/details"
const ROBLOX_SEARCH = "https://search.roblox.com/catalog/json"

// Asset type IDs for different categories
const ASSET_TYPE_MAP: Record<string, number[]> = {
    "all": [10, 4, 40, 3, 13, 24],  // Search multiple types for "all"
    "model": [10],      // Models
    "audio": [3],       // Audio
    "decal": [13],      // Decal/Image
    "mesh": [4, 40],    // Mesh & MeshPart
    "animation": [24],  // Animation
    "plugin": [38],     // Plugin
    "image": [13],      // Image
    "video": [21],      // Video
}

// In-memory cache (5 minute TTL)
const searchCache = new Map<string, { data: any; timestamp: number }>()
const CACHE_TTL = 5 * 60 * 1000

function getCachedResult(key: string): any | null {
    const cached = searchCache.get(key)
    if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
        return cached.data
    }
    return null
}

function setCachedResult(key: string, data: any): void {
    if (searchCache.size > 200) {
        const firstKey = searchCache.keys().next().value
        if (firstKey) searchCache.delete(firstKey)
    }
    searchCache.set(key, { data, timestamp: Date.now() })
}

export async function GET(request: Request) {
    try {
        const { searchParams } = new URL(request.url)
        const query = searchParams.get("query") || ""
        const category = searchParams.get("category") || "all"
        const limit = Math.min(parseInt(searchParams.get("limit") || "50"), 100)
        const pageNumber = parseInt(searchParams.get("page") || "1")
        const cursor = searchParams.get("cursor") || ""

        console.log("[Toolbox] Full search:", { query, category, limit, pageNumber })

        // Check cache
        const cacheKey = `${query}:${category}:${pageNumber}:${limit}`
        const cached = getCachedResult(cacheKey)
        if (cached) {
            console.log("[Toolbox] Cache hit")
            return NextResponse.json(cached)
        }

        const assetTypes = ASSET_TYPE_MAP[category] || ASSET_TYPE_MAP["model"]
        let allAssets: any[] = []
        let nextCursor: string | null = null

        // Try multiple APIs in parallel for comprehensive results
        const searchPromises = []

        // 1. Toolbox V2 API (newest, most comprehensive)
        if (query.trim()) {
            searchPromises.push(
                searchToolboxV2(query, assetTypes, limit, cursor)
                    .catch(err => { console.log("[Toolbox] V2 failed:", err.message); return { assets: [], nextCursor: null } })
            )
        }

        // 2. Toolbox V1 API (fallback)
        searchPromises.push(
            searchToolboxV1(query, assetTypes[0], limit, pageNumber)
                .catch(err => { console.log("[Toolbox] V1 failed:", err.message); return { assets: [], nextCursor: null } })
        )

        // 3. Catalog API (for avatar items and more)
        if (query.trim()) {
            searchPromises.push(
                searchCatalog(query, limit)
                    .catch(err => { console.log("[Toolbox] Catalog failed:", err.message); return { assets: [] } })
            )
        }

        // 4. Roblox Search API (additional results)
        if (query.trim()) {
            searchPromises.push(
                searchRobloxCatalog(query, limit)
                    .catch(err => { console.log("[Toolbox] Roblox search failed:", err.message); return { assets: [] } })
            )
        }

        // Wait for all searches
        const results = await Promise.all(searchPromises)

        // Merge and deduplicate results
        const seenIds = new Set<number>()
        for (const result of results) {
            if (result.assets) {
                for (const asset of result.assets) {
                    if (!seenIds.has(asset.id)) {
                        seenIds.add(asset.id)
                        allAssets.push(asset)
                    }
                }
            }
            if (result.nextCursor && !nextCursor) {
                nextCursor = result.nextCursor
            }
        }

        // Sort by relevance (favorites, verified creator)
        allAssets.sort((a, b) => {
            // Verified creators first
            if (a.creatorVerified && !b.creatorVerified) return -1
            if (!a.creatorVerified && b.creatorVerified) return 1
            // Then by favorites
            return (b.favoriteCount || 0) - (a.favoriteCount || 0)
        })

        // Limit results
        allAssets = allAssets.slice(0, limit)

        const response = {
            success: true,
            query,
            category,
            assets: allAssets,
            nextCursor,
            totalResults: allAssets.length,
            hasMore: !!nextCursor || allAssets.length >= limit,
        }

        // Cache results
        if (allAssets.length > 0) {
            setCachedResult(cacheKey, response)
        }

        return NextResponse.json(response)
    } catch (error: any) {
        console.error("[Toolbox] Search error:", error)
        return NextResponse.json({
            success: false,
            error: "Search failed",
            details: error.message,
            assets: [],
        }, { status: 500 })
    }
}

// Toolbox V2 API - Most comprehensive search
async function searchToolboxV2(keyword: string, assetTypes: number[], limit: number, cursor: string) {
    const params = new URLSearchParams({
        keyword: keyword,
        limit: limit.toString(),
        includeOnlyVerifiedCreators: "false",
    })

    // Add asset types
    for (const type of assetTypes) {
        params.append("assetTypeIds", type.toString())
    }

    if (cursor) {
        params.append("cursor", cursor)
    }

    const response = await fetch(`${TOOLBOX_V2_SEARCH}?${params.toString()}`, {
        headers: {
            "Accept": "application/json",
            "User-Agent": "BlaxSmith/2.0 RobloxStudio",
        },
        cache: "no-store",
    })

    if (!response.ok) {
        throw new Error(`V2 API returned ${response.status}`)
    }

    const data = await response.json()
    return {
        assets: transformAssets(data.data || data.assets || []),
        nextCursor: data.nextPageCursor || data.cursor || null,
    }
}

// Toolbox V1 API
async function searchToolboxV1(keyword: string, assetTypeId: number, limit: number, pageNumber: number) {
    const params = new URLSearchParams({
        keyword: keyword || "",
        assetTypeId: assetTypeId.toString(),
        includeOnlyVerifiedCreators: "false",
        limit: limit.toString(),
        pageNumber: pageNumber.toString(),
    })

    const response = await fetch(`${TOOLBOX_V1_SEARCH}?${params.toString()}`, {
        headers: {
            "Accept": "application/json",
            "User-Agent": "BlaxSmith/2.0 RobloxStudio",
        },
        cache: "no-store",
    })

    if (!response.ok) {
        throw new Error(`V1 API returned ${response.status}`)
    }

    const data = await response.json()
    return {
        assets: transformAssets(data.data || data.results || []),
        nextCursor: data.nextPageCursor || null,
    }
}

// Catalog API - For avatar items and more
async function searchCatalog(keyword: string, limit: number) {
    const params = new URLSearchParams({
        Category: "All",
        Keyword: keyword,
        Limit: Math.min(limit, 30).toString(),
        SortType: "Relevance",
        IncludeNotForSale: "true",
    })

    const response = await fetch(`${CATALOG_SEARCH}?${params.toString()}`, {
        headers: { "Accept": "application/json" },
        cache: "no-store",
    })

    if (!response.ok) {
        throw new Error(`Catalog API returned ${response.status}`)
    }

    const data = await response.json()
    return {
        assets: (data.data || []).map((item: any) => ({
            id: item.id,
            name: item.name || "Unknown",
            description: item.description || "",
            price: item.price || 0,
            priceLabel: item.price === 0 ? "Free" : `R$ ${item.price}`,
            assetType: item.assetType || 10,
            creatorName: item.creatorName || "Roblox",
            creatorVerified: item.creatorHasVerifiedBadge || false,
            favoriteCount: item.favoriteCount || 0,
            thumbnailUrl: `https://www.roblox.com/asset-thumbnail/image?assetId=${item.id}&width=420&height=420&format=png`,
            productUrl: `https://create.roblox.com/store/asset/${item.id}`,
        })),
    }
}

// Roblox Search API - Additional comprehensive search
async function searchRobloxCatalog(keyword: string, limit: number) {
    const params = new URLSearchParams({
        keyword: keyword,
        category: "Models",
        pageNumber: "1",
        limit: Math.min(limit, 30).toString(),
    })

    const response = await fetch(`${ROBLOX_SEARCH}?${params.toString()}`, {
        headers: { "Accept": "application/json" },
        cache: "no-store",
    })

    if (!response.ok) {
        throw new Error(`Roblox search returned ${response.status}`)
    }

    const data = await response.json()

    // Handle both array and object responses
    const items = Array.isArray(data) ? data : (data.data || data.assets || [])

    return {
        assets: items.map((item: any) => ({
            id: item.AssetId || item.id,
            name: item.Name || item.name || "Unknown",
            description: item.Description || item.description || "",
            price: item.Price || item.price || 0,
            priceLabel: (item.Price || item.price) === 0 ? "Free" : `R$ ${item.Price || item.price}`,
            assetType: item.AssetTypeID || item.assetType || 10,
            creatorName: item.Creator?.Name || item.creatorName || "Roblox",
            creatorVerified: item.Creator?.HasVerifiedBadge || false,
            favoriteCount: item.FavoriteCount || item.favoriteCount || 0,
            thumbnailUrl: item.ThumbnailUrl || `https://www.roblox.com/asset-thumbnail/image?assetId=${item.AssetId || item.id}&width=420&height=420&format=png`,
            productUrl: `https://create.roblox.com/store/asset/${item.AssetId || item.id}`,
        })),
    }
}

// Transform Roblox API responses to our format
function transformAssets(items: any[]) {
    return items.map((item: any) => {
        const asset = item.asset || item
        const creator = item.creator || {}

        return {
            id: asset.id || item.id,
            name: asset.name || item.name || "Unknown",
            description: asset.description || item.description || "",
            price: asset.price || 0,
            priceLabel: asset.price === 0 ? "Free" : `R$ ${asset.price}`,
            assetType: asset.typeId || asset.assetType || 10,
            creatorName: creator.name || item.creatorName || "Roblox",
            creatorType: creator.type || "User",
            creatorId: creator.id || item.creatorTargetId,
            creatorVerified: creator.hasVerifiedBadge || false,
            favoriteCount: item.favoriteCount || asset.favoriteCount || 0,
            thumbnailUrl: `https://www.roblox.com/asset-thumbnail/image?assetId=${asset.id || item.id}&width=420&height=420&format=png`,
            productUrl: `https://create.roblox.com/store/asset/${asset.id || item.id}`,
        }
    })
}
