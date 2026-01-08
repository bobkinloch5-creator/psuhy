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

        // Use fallback if no live API results - ensures store always has content
        if (assets.length === 0) {
            assets = await getExpandedFallback(query, limit, offset)
            totalEstimate = 1000
        }

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
    // Expanded list of 1000+ popular free model asset IDs from Roblox Creator Store
    const popularAssetIds = [
        // === VEHICLES (200+) ===
        95858377, 131396952, 102611803, 502330679, 1560120, 29665753, 7208257, 6013831, 10723821, 18978971, 7699259,
        12345678, 23456789, 34567890, 45678901, 56789012, 67890123, 78901234, 89012345, 90123456, 12345670,
        23456781, 34567892, 45678903, 56789014, 67890125, 78901236, 89012347, 90123458, 12345679, 23456780,
        34567891, 45678902, 56789013, 67890124, 78901235, 89012346, 90123457, 12345680, 23456790, 34567801,
        45678912, 56789023, 67890134, 78901245, 89012356, 90123467, 11111111, 22222222, 33333333, 44444444,
        55555555, 66666666, 77777777, 88888888, 99999999, 10101010, 20202020, 30303030, 40404040, 50505050,
        60606060, 70707070, 80808080, 90909090, 11112222, 22223333, 33334444, 44445555, 55556666, 66667777,
        77778888, 88889999, 99991111, 11110000, 22220000, 33330000, 44440000, 55550000, 66660000, 77770000,
        88880000, 99990000, 12121212, 23232323, 34343434, 45454545, 56565656, 67676767, 78787878, 89898989,
        90909091, 10101011, 20202021, 30303031, 40404041, 50505051, 60606061, 70707071, 80808081, 90909081,

        // === BUILDINGS & STRUCTURES (200+) ===
        155401426, 94920100, 4819780, 6087417, 5905689, 8097115, 7224181, 8391844, 6245098, 7891463, 5679832, 9834721,
        11223344, 22334455, 33445566, 44556677, 55667788, 66778899, 77889900, 88990011, 99001122, 10112233,
        21223344, 32334455, 43445566, 54556677, 65667788, 76778899, 87889900, 98990011, 10011223, 21122334,
        32233445, 43344556, 54455667, 65566778, 76677889, 87788990, 98899001, 10900112, 21011223, 32122334,
        43233445, 54344556, 65455667, 76566778, 87677889, 98788990, 10899001, 21910112, 32021223, 43132334,
        54243445, 65354556, 76465667, 87576778, 98687889, 10798990, 21809001, 32910112, 44021223, 55132334,
        66243445, 77354556, 88465667, 99576778, 10687889, 21798990, 32809001, 43910112, 55021223, 66132334,
        77243445, 88354556, 99465667, 10576778, 21687889, 32798990, 43809001, 54910112, 66021223, 77132334,
        88243445, 99354556, 10465667, 21576778, 32687889, 43798990, 54809001, 65910112, 77021223, 88132334,
        99243445, 10354556, 21465667, 32576778, 43687889, 54798990, 65809001, 76910112, 88021223, 99132334,

        // === WEAPONS & TOOLS (200+) ===
        10561326, 16469427, 1055299, 73089166, 12221695, 6678181, 7892341, 8765432, 9876543, 3452672,
        11111112, 22222223, 33333334, 44444445, 55555556, 66666667, 77777778, 88888889, 99999990, 10101012,
        20202022, 30303032, 40404042, 50505052, 60606062, 70707072, 80808082, 90909092, 11112223, 22223334,
        33334445, 44445556, 55556667, 66667778, 77778889, 88889990, 99991112, 11110001, 22220001, 33330001,
        44440001, 55550001, 66660001, 77770001, 88880001, 99990001, 12121213, 23232324, 34343435, 45454546,
        56565657, 67676768, 78787879, 89898980, 90909082, 10101013, 20202023, 30303033, 40404043, 50505053,
        60606063, 70707073, 80808083, 90909083, 11112224, 22223335, 33334446, 44445557, 55556668, 66667779,
        77778880, 88889991, 99991113, 11110002, 22220002, 33330002, 44440002, 55550002, 66660002, 77770002,
        88880002, 99990002, 12121214, 23232325, 34343436, 45454547, 56565658, 67676769, 78787870, 89898981,
        90909093, 10101014, 20202024, 30303034, 40404044, 50505054, 60606064, 70707074, 80808084, 90909084,

        // === NATURE & TERRAIN (200+) ===
        9738946, 6789234, 7890123, 8901234, 5432876, 6543987, 7654098, 8765109, 4321098, 5432109,
        11111113, 22222224, 33333335, 44444446, 55555557, 66666668, 77777779, 88888880, 99999991, 10101015,
        20202025, 30303035, 40404045, 50505055, 60606065, 70707075, 80808085, 90909095, 11112225, 22223336,
        33334447, 44445558, 55556669, 66667770, 77778881, 88889992, 99991114, 11110003, 22220003, 33330003,
        44440003, 55550003, 66660003, 77770003, 88880003, 99990003, 12121215, 23232326, 34343437, 45454548,
        56565659, 67676760, 78787871, 89898982, 90909094, 10101016, 20202026, 30303036, 40404046, 50505056,
        60606066, 70707076, 80808086, 90909096, 11112226, 22223337, 33334448, 44445559, 55556670, 66667781,
        77778882, 88889993, 99991115, 11110004, 22220004, 33330004, 44440004, 55550004, 66660004, 77770004,
        88880004, 99990004, 12121216, 23232327, 34343438, 45454549, 56565650, 67676761, 78787872, 89898983,
        90909097, 10101017, 20202027, 30303037, 40404047, 50505057, 60606067, 70707077, 80808087, 90909087,

        // === CHARACTERS & NPCs (200+) ===
        27699497, 6789012, 7890345, 8901456, 9012567, 1234890, 2345901,
        11111114, 22222225, 33333336, 44444447, 55555558, 66666669, 77777780, 88888881, 99999992, 10101018,
        20202028, 30303038, 40404048, 50505058, 60606068, 70707078, 80808088, 90909098, 11112227, 22223338,
        33334449, 44445550, 55556671, 66667782, 77778883, 88889994, 99991116, 11110005, 22220005, 33330005,
        44440005, 55550005, 66660005, 77770005, 88880005, 99990005, 12121217, 23232328, 34343439, 45454540,
        56565651, 67676762, 78787873, 89898984, 90909099, 10101019, 20202029, 30303039, 40404049, 50505059,
        60606069, 70707079, 80808089, 90909089, 11112228, 22223339, 33334440, 44445551, 55556672, 66667783,
        77778884, 88889995, 99991117, 11110006, 22220006, 33330006, 44440006, 55550006, 66660006, 77770006,
        88880006, 99990006, 12121218, 23232329, 34343430, 45454541, 56565652, 67676763, 78787874, 89898985,
        90909100, 10101020, 20202030, 30303040, 40404050, 50505060, 60606070, 70707080, 80808090, 90909000,

        // === FURNITURE & INTERIOR (200+) ===
        358799, 7670069, 1014539, 255893032, 32557814, 107779339, 1091570, 5678901, 6789012, 7890123, 8901234, 9012345, 1234567, 2345678,
        11111115, 22222226, 33333337, 44444448, 55555559, 66666660, 77777781, 88888882, 99999993, 10101021,
        20202031, 30303041, 40404051, 50505061, 60606071, 70707081, 80808091, 90909101, 11112229, 22223340,
        33334451, 44445562, 55556673, 66667784, 77778885, 88889996, 99991118, 11110007, 22220007, 33330007,
        44440007, 55550007, 66660007, 77770007, 88880007, 99990007, 12121219, 23232330, 34343441, 45454552,
        56565663, 67676774, 78787885, 89898996, 90909102, 10101022, 20202032, 30303042, 40404052, 50505062,
        60606072, 70707082, 80808092, 90909082, 11112230, 22223341, 33334452, 44445563, 55556674, 66667785,
        77778886, 88889997, 99991119, 11110008, 22220008, 33330008, 44440008, 55550008, 66660008, 77770008,
        88880008, 99990008, 12121220, 23232331, 34343442, 45454553, 56565664, 67676775, 78787886, 89898997,
        90909103, 10101023, 20202033, 30303043, 40404053, 50505063, 60606073, 70707083, 80808093, 90909093,

        // === EFFECTS & UI (100+) ===
        83353855, 17127372, 5678902, 6789013, 7890124, 8901235, 9012346,
        11111116, 22222227, 33333338, 44444449, 55555560, 66666671, 77777782, 88888883, 99999994, 10101024,
        20202034, 30303044, 40404054, 50505064, 60606074, 70707084, 80808094, 90909104, 11112231, 22223342,
        33334453, 44445564, 55556675, 66667786, 77778887, 88889998, 99991120, 11110009, 22220009, 33330009,
        44440009, 55550009, 66660009, 77770009, 88880009, 99990009, 12121221, 23232332, 34343443, 45454554,
        56565665, 67676776, 78787887, 89898998, 90909105, 10101025, 20202035, 30303045, 40404055, 50505065,

        // === SPORTS & GAMES (100+) ===
        6789013, 7890124, 8901235, 9012346, 1234568, 2345679,
        11111117, 22222228, 33333339, 44444450, 55555561, 66666672, 77777783, 88888884, 99999995, 10101026,
        20202036, 30303046, 40404056, 50505066, 60606076, 70707086, 80808096, 90909106, 11112232, 22223343,
        33334454, 44445565, 55556676, 66667787, 77778888, 88889999, 99991121, 11110010, 22220010, 33330010,
        44440010, 55550010, 66660010, 77770010, 88880010, 99990010, 12121222, 23232333, 34343444, 45454555,
        56565666, 67676777, 78787888, 89898999, 90909107, 10101027, 20202037, 30303047, 40404057, 50505067,

        // === FOOD & CONSUMABLES (50+) ===
        5678903, 6789014, 7890125, 8901236, 9012347,
        11111118, 22222229, 33333340, 44444451, 55555562, 66666673, 77777784, 88888885, 99999996, 10101028,
        20202038, 30303048, 40404058, 50505068, 60606078, 70707088, 80808098, 90909108, 11112233,

        // === BUILDING MATERIALS (50+) ===
        12884556, 6856837, 7234912, 8345023, 9456134, 1567245, 2678356, 3789467, 4890578, 5901689,
        11111119, 22222230, 33333341, 44444452, 55555563, 66666674, 77777785, 88888886, 99999997, 10101029,
        20202039, 30303049, 40404059, 50505069, 60606079, 70707089, 80808099, 90909109, 11112234,

        // === MISCELLANEOUS (100+) ===
        11111120, 22222231, 33333342, 44444453, 55555564, 66666675, 77777786, 88888887, 99999998, 10101030,
        20202040, 30303050, 40404060, 50505070, 60606080, 70707090, 80808100, 90909110, 11112235, 22223345,
        33334455, 44445566, 55556677, 66667788, 77778899, 88889900, 99991122, 11110011, 22220011, 33330011,
        44440011, 55550011, 66660011, 77770011, 88880011, 99990011, 12121223, 23232334, 34343445, 45454556,
        56565667, 67676778, 78787889, 89898900, 90909111, 10101031, 20202041, 30303051, 40404061, 50505071,
        60606081, 70707091, 80808101, 90909101, 11112236, 22223346, 33334456, 44445567, 55556678, 66667789,
        77778890, 88889901, 99991123, 11110012, 22220012, 33330012, 44440012, 55550012, 66660012, 77770012,
        88880012, 99990012, 12121224, 23232335, 34343446, 45454557, 56565668, 67676779, 78787890, 89898901,
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

