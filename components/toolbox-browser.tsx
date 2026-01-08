"use client"

import { useState, useEffect } from "react"
import { Search, Loader2, Star, Grid3X3, Check, Package, Plus, ChevronRight, ChevronLeft, Car, Building, Lightbulb, Cpu, Swords, Trees, Sofa, Code, Palette, Box } from "lucide-react"

interface Asset {
    id: number
    name: string
    description: string
    price: number
    priceLabel: string
    assetType: string
    creatorName: string
    creatorVerified: boolean
    favoriteCount: number
    thumbnailUrl: string
    productUrl: string
}

// Categories matching Roblox Creator Store - with real Roblox asset thumbnails
const CATEGORIES = [
    { id: "vehicle", name: "Vehicles", assetId: 95858377, color: "from-blue-500 to-cyan-500" },
    { id: "building", name: "Buildings", assetId: 155401426, color: "from-amber-500 to-orange-500" },
    { id: "weapon", name: "Weapons", assetId: 10561326, color: "from-red-500 to-orange-500" },
    { id: "tree", name: "Nature", assetId: 9738946, color: "from-green-500 to-emerald-500" },
    { id: "furniture", name: "Furniture", assetId: 358799, color: "from-purple-500 to-pink-500" },
    { id: "zombie", name: "NPCs", assetId: 27699497, color: "from-gray-600 to-gray-800" },
    { id: "sword", name: "Classic", assetId: 12221695, color: "from-yellow-500 to-orange-500" },
    { id: "effect", name: "Effects", assetId: 83353855, color: "from-cyan-400 to-blue-500" },
    { id: "treasure", name: "Items", assetId: 255893032, color: "from-yellow-400 to-amber-500" },
]

// Tab types matching Roblox
const TABS = ["Models", "Plugins", "Audio", "Decals", "MeshParts"]

export default function ToolboxBrowser() {
    const [query, setQuery] = useState("")
    const [assets, setAssets] = useState<Asset[]>([])
    const [trendingAssets, setTrendingAssets] = useState<Asset[]>([])
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState<string | null>(null)
    const [activeTab, setActiveTab] = useState("Models")
    const [selectedCategory, setSelectedCategory] = useState<string | null>(null)

    // Pagination state
    const [currentPage, setCurrentPage] = useState(1)
    const [totalResults, setTotalResults] = useState(0)
    const ITEMS_PER_PAGE = 24
    const totalPages = Math.ceil(totalResults / ITEMS_PER_PAGE)

    // Load trending on mount
    useEffect(() => {
        loadTrending()
    }, [])

    const loadTrending = async () => {
        try {
            const response = await fetch(`/api/toolbox/search?query=popular&limit=8`)
            const data = await response.json()
            if (data.success && data.assets) {
                setTrendingAssets(data.assets)
            }
        } catch (err) {
            console.error("Failed to load trending:", err)
        }
    }

    const searchAssets = async (searchQuery: string, page: number = 1) => {
        if (!searchQuery.trim()) {
            setAssets([])
            return
        }

        setLoading(true)
        setError(null)
        try {
            const params = new URLSearchParams({
                query: searchQuery,
                limit: String(ITEMS_PER_PAGE),
                page: String(page),
            })
            const response = await fetch(`/api/toolbox/search?${params}`)
            const data = await response.json()

            if (data.success) {
                setAssets(data.assets || [])
                setTotalResults(data.total || data.assets?.length || 0)
                setCurrentPage(page)
            } else {
                setError(data.error || "Search failed")
                setAssets([])
            }
        } catch (err) {
            setError("Failed to search toolbox")
            setAssets([])
        } finally {
            setLoading(false)
        }
    }

    const handleSearch = () => {
        setSelectedCategory(null)
        setCurrentPage(1)
        searchAssets(query, 1)
    }

    const handleCategoryClick = (categoryId: string) => {
        setSelectedCategory(categoryId)
        setQuery(categoryId)
        setCurrentPage(1)
        searchAssets(categoryId, 1)
    }

    const handlePageChange = (newPage: number) => {
        if (newPage >= 1 && newPage <= totalPages) {
            searchAssets(query, newPage)
            window.scrollTo({ top: 0, behavior: 'smooth' })
        }
    }

    return (
        <div className="glassmorphism rounded-2xl overflow-hidden border-white/10">
            {/* Header - Roblox Store Style */}
            <div className="bg-[#1a1a2e] border-b border-white/5 p-3">
                <div className="flex items-center gap-2 mb-3">
                    <div className="p-1.5 rounded-lg bg-gradient-to-br from-orange-500 to-red-500 shadow-lg shadow-orange-500/30">
                        <Grid3X3 className="w-4 h-4 text-white" />
                    </div>
                    <div>
                        <h2 className="text-sm font-bold text-white">Store</h2>
                        <p className="text-[10px] text-white/50">Browse models and assets</p>
                    </div>
                </div>

                {/* Tabs - Roblox style */}
                <div className="flex gap-1 overflow-x-auto pb-1">
                    {TABS.map((tab) => (
                        <button
                            key={tab}
                            onClick={() => setActiveTab(tab)}
                            className={`px-3 py-1.5 text-xs font-medium rounded-lg whitespace-nowrap transition-all ${activeTab === tab
                                ? "bg-white/10 text-white"
                                : "text-white/50 hover:text-white hover:bg-white/5"
                                }`}
                        >
                            {tab}
                        </button>
                    ))}
                </div>
            </div>

            <div className="p-3 space-y-4">
                {/* Search Bar - Roblox style */}
                <div className="flex gap-2">
                    <div className="flex-1 relative">
                        <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-white/40" />
                        <input
                            type="text"
                            value={query}
                            onChange={(e) => setQuery(e.target.value)}
                            onKeyDown={(e) => e.key === "Enter" && handleSearch()}
                            placeholder='Search models...'
                            className="w-full pl-8 pr-3 py-2 bg-[#2a2a3e] border border-white/5 rounded-lg text-white placeholder:text-white/40 focus:outline-none focus:border-orange-500/50 text-xs"
                        />
                    </div>
                    <button
                        onClick={handleSearch}
                        disabled={loading || !query.trim()}
                        className="px-4 py-2 bg-gradient-to-r from-orange-500 to-red-500 text-white rounded-lg font-semibold hover:shadow-lg hover:shadow-orange-500/30 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1.5 text-xs"
                    >
                        {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Search className="w-3.5 h-3.5" />}
                        Search
                    </button>
                </div>

                {/* Categories - Roblox Store Style */}
                {!loading && assets.length === 0 && (
                    <>
                        <div>
                            <div className="flex items-center justify-between mb-2">
                                <h3 className="text-white font-semibold text-xs flex items-center gap-1">
                                    Categories
                                    <ChevronRight className="w-3 h-3 text-white/40" />
                                </h3>
                            </div>
                            <div className="grid grid-cols-5 sm:grid-cols-9 gap-1.5">
                                {CATEGORIES.map((cat) => (
                                    <button
                                        key={cat.id}
                                        onClick={() => handleCategoryClick(cat.id)}
                                        className={`aspect-square rounded-lg overflow-hidden relative group hover:scale-105 transition-transform shadow-lg ${selectedCategory === cat.id ? "ring-2 ring-white" : ""
                                            }`}
                                    >
                                        <img
                                            src={`https://tr.rbxcdn.com/${cat.assetId}/150/150/Image/Png`}
                                            alt={cat.name}
                                            className="w-full h-full object-cover"
                                            onError={(e) => {
                                                const target = e.target as HTMLImageElement
                                                target.style.display = 'none'
                                            }}
                                        />
                                        <div className={`absolute inset-0 bg-gradient-to-t ${cat.color} opacity-40 group-hover:opacity-20 transition-opacity`} />
                                        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
                                        <span className="absolute bottom-1 left-0 right-0 text-[8px] font-bold text-white text-center drop-shadow-lg">{cat.name}</span>
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Trending Section */}
                        {trendingAssets.length > 0 && (
                            <div>
                                <div className="flex items-center justify-between mb-2">
                                    <h3 className="text-white font-semibold text-xs flex items-center gap-1">
                                        Trending
                                        <ChevronRight className="w-3 h-3 text-white/40" />
                                    </h3>
                                </div>
                                <div className="grid grid-cols-4 sm:grid-cols-8 gap-1.5">
                                    {trendingAssets.map((asset) => (
                                        <AssetCard key={asset.id} asset={asset} compact />
                                    ))}
                                </div>
                            </div>
                        )}
                    </>
                )}

                {/* Search Results */}
                {loading ? (
                    <div className="flex flex-col items-center justify-center py-16">
                        <Loader2 className="w-10 h-10 animate-spin text-orange-400 mb-3" />
                        <p className="text-white/50 text-sm">Searching Roblox Toolbox...</p>
                    </div>
                ) : error ? (
                    <div className="text-center py-16 text-red-400">
                        <p className="text-sm">{error}</p>
                    </div>
                ) : assets.length > 0 ? (
                    <div>
                        <div className="flex items-center justify-between mb-3">
                            <p className="text-xs text-white/50">
                                Showing {((currentPage - 1) * ITEMS_PER_PAGE) + 1}-{Math.min(currentPage * ITEMS_PER_PAGE, totalResults)} of {totalResults} results for "{query}"
                            </p>
                            {totalPages > 1 && (
                                <p className="text-xs text-white/40">Page {currentPage} of {totalPages}</p>
                            )}
                        </div>
                        <div className="grid grid-cols-4 sm:grid-cols-6 lg:grid-cols-8 gap-2">
                            {assets.map((asset) => (
                                <AssetCard key={asset.id} asset={asset} />
                            ))}
                        </div>

                        {/* Pagination Controls */}
                        {totalPages > 1 && (
                            <div className="flex items-center justify-center gap-2 mt-6 pt-4 border-t border-white/10">
                                <button
                                    onClick={() => handlePageChange(currentPage - 1)}
                                    disabled={currentPage === 1}
                                    className="p-2 rounded-lg bg-white/10 hover:bg-white/20 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                                >
                                    <ChevronLeft className="w-4 h-4 text-white" />
                                </button>

                                <div className="flex items-center gap-1">
                                    {/* First page */}
                                    {currentPage > 3 && (
                                        <>
                                            <button
                                                onClick={() => handlePageChange(1)}
                                                className="w-8 h-8 rounded-lg text-xs font-medium bg-white/10 hover:bg-white/20 text-white transition-colors"
                                            >
                                                1
                                            </button>
                                            {currentPage > 4 && <span className="text-white/40 px-1">...</span>}
                                        </>
                                    )}

                                    {/* Page numbers around current */}
                                    {Array.from({ length: 5 }, (_, i) => currentPage - 2 + i)
                                        .filter(page => page >= 1 && page <= totalPages)
                                        .map(page => (
                                            <button
                                                key={page}
                                                onClick={() => handlePageChange(page)}
                                                className={`w-8 h-8 rounded-lg text-xs font-medium transition-colors ${page === currentPage
                                                        ? "bg-gradient-to-r from-orange-500 to-red-500 text-white"
                                                        : "bg-white/10 hover:bg-white/20 text-white"
                                                    }`}
                                            >
                                                {page}
                                            </button>
                                        ))
                                    }

                                    {/* Last page */}
                                    {currentPage < totalPages - 2 && (
                                        <>
                                            {currentPage < totalPages - 3 && <span className="text-white/40 px-1">...</span>}
                                            <button
                                                onClick={() => handlePageChange(totalPages)}
                                                className="w-8 h-8 rounded-lg text-xs font-medium bg-white/10 hover:bg-white/20 text-white transition-colors"
                                            >
                                                {totalPages}
                                            </button>
                                        </>
                                    )}
                                </div>

                                <button
                                    onClick={() => handlePageChange(currentPage + 1)}
                                    disabled={currentPage === totalPages}
                                    className="p-2 rounded-lg bg-white/10 hover:bg-white/20 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                                >
                                    <ChevronRight className="w-4 h-4 text-white" />
                                </button>
                            </div>
                        )}
                    </div>
                ) : query && !loading ? (
                    <div className="text-center py-16 text-white/40">
                        <Package className="w-16 h-16 mx-auto mb-4 opacity-30" />
                        <p className="text-sm">No models found for "{query}"</p>
                    </div>
                ) : null}
            </div>
        </div>
    )
}

function AssetCard({ asset, compact = false }: { asset: Asset; compact?: boolean }) {
    const [imgError, setImgError] = useState(false)
    const [sending, setSending] = useState(false)
    const [sent, setSent] = useState(false)

    const insertToStudio = async () => {
        if (sending || sent) return

        setSending(true)
        try {
            const response = await fetch("/api/toolbox/insert", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    assetId: asset.id,
                    assetType: asset.assetType || "Model",
                    assetName: asset.name,
                }),
            })

            const data = await response.json()
            if (data.success) {
                setSent(true)
                setTimeout(() => setSent(false), 2000)
            }
        } catch (error) {
            console.error("Failed to insert:", error)
        } finally {
            setSending(false)
        }
    }

    return (
        <div className="group relative bg-[#2a2a3e] rounded-lg overflow-hidden border border-white/5 hover:border-orange-500/50 transition-all hover:shadow-lg hover:shadow-orange-500/10">
            {/* Thumbnail - Roblox style with consistent sizing */}
            <div className={`${compact ? "aspect-square" : "aspect-square"} bg-[#1a1a2e] relative overflow-hidden`}>
                {!imgError ? (
                    <img
                        src={asset.thumbnailUrl}
                        alt={asset.name}
                        className="w-full h-full object-cover"
                        onError={() => setImgError(true)}
                        loading="lazy"
                    />
                ) : (
                    <div className="w-full h-full flex items-center justify-center text-white/20 bg-gradient-to-br from-gray-800 to-gray-900">
                        <Box className="w-8 h-8" />
                    </div>
                )}

                {/* Hover overlay with Insert button */}
                <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                    <button
                        onClick={insertToStudio}
                        disabled={sending}
                        className={`px-3 py-1.5 rounded-lg font-semibold text-xs flex items-center gap-1.5 transition-all ${sent
                            ? "bg-green-500 text-white"
                            : "bg-orange-500 hover:bg-orange-400 text-white"
                            }`}
                    >
                        {sending ? (
                            <Loader2 className="w-3 h-3 animate-spin" />
                        ) : sent ? (
                            <>
                                <Check className="w-3 h-3" />
                                Sent!
                            </>
                        ) : (
                            <>
                                <Plus className="w-3 h-3" />
                                Insert
                            </>
                        )}
                    </button>
                </div>

                {/* Price badge - Roblox style */}
                <div className="absolute bottom-1 left-1">
                    <span className={`px-1.5 py-0.5 text-[9px] font-bold rounded ${asset.price === 0
                        ? "bg-green-500/90 text-white"
                        : "bg-[#1a1a2e]/90 text-white"
                        }`}>
                        {asset.price === 0 ? "FREE" : asset.priceLabel || `$${asset.price}`}
                    </span>
                </div>
            </div>

            {/* Info - Roblox style */}
            {!compact && (
                <div className="p-2 bg-[#2a2a3e]">
                    <h3 className="text-xs font-medium text-white truncate">{asset.name}</h3>
                    <div className="flex items-center justify-between mt-1">
                        <span className="text-[10px] text-white/40 truncate max-w-[60%]">{asset.creatorName}</span>
                        <span className="text-[10px] text-yellow-400 flex items-center gap-0.5">
                            <Star className="w-2.5 h-2.5 fill-yellow-400" />
                            {asset.favoriteCount >= 1000 ? `${(asset.favoriteCount / 1000).toFixed(0)}k` : asset.favoriteCount}
                        </span>
                    </div>
                </div>
            )}
        </div>
    )
}
