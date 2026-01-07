import { Button } from "@/components/ui/button"
import { CreationCard } from "@/components/creation-card"
import { Box, Plus, FolderOpen, Grid3x3, List, Search } from "lucide-react"
import Link from "next/link"

export default function WorkspacePage() {
  const collections = [
    {
      name: "Game Projects",
      count: 3,
      color: "bg-chart-1/10 text-chart-1",
    },
    {
      name: "Character Models",
      count: 8,
      color: "bg-chart-2/10 text-chart-2",
    },
    {
      name: "World Environments",
      count: 5,
      color: "bg-chart-3/10 text-chart-3",
    },
    {
      name: "Scripts & Systems",
      count: 12,
      color: "bg-chart-4/10 text-chart-4",
    },
  ]

  const allCreations = [
    {
      id: "1",
      type: "world" as const,
      title: "Medieval Village",
      description: "A low-poly medieval village with a river, stone bridges, and timber houses",
      timestamp: "2 hours ago",
    },
    {
      id: "2",
      type: "system" as const,
      title: "Pet System",
      description: "Complete pet system with leveling, rarity tiers, and evolution mechanics",
      timestamp: "5 hours ago",
    },
    {
      id: "3",
      type: "model" as const,
      title: "Fantasy Castle",
      description: "Detailed fantasy castle with towers, battlements, and interior throne room",
      timestamp: "Yesterday",
    },
    {
      id: "4",
      type: "script" as const,
      title: "Inventory Manager",
      description: "Lua script for managing player inventory with item stacking and sorting",
      timestamp: "2 days ago",
    },
    {
      id: "5",
      type: "world" as const,
      title: "Tropical Island",
      description: "Vibrant tropical island with palm trees, beaches, and crystal clear water",
      timestamp: "3 days ago",
    },
    {
      id: "6",
      type: "model" as const,
      title: "Sci-Fi Weapon Pack",
      description: "Collection of futuristic weapons with glowing energy effects",
      timestamp: "4 days ago",
    },
  ]

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border bg-card/50 backdrop-blur-sm sticky top-0 z-40">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link href="/" className="w-8 h-8 bg-accent rounded-lg flex items-center justify-center">
              <Box className="w-5 h-5 text-accent-foreground" />
            </Link>
            <h1 className="text-lg font-bold text-foreground">Bloxsmith</h1>
          </div>
          <div className="flex items-center gap-3">
            <button className="px-4 py-2 text-sm font-medium text-foreground">{"Workspace"}</button>
            <button className="px-4 py-2 bg-primary text-primary-foreground text-sm font-semibold rounded-lg hover:opacity-90 transition-opacity">
              {"Connect Roblox Studio"}
            </button>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8 max-w-6xl">
        {/* Page Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h2 className="text-3xl font-bold text-foreground mb-2">{"Workspace"}</h2>
            <p className="text-muted-foreground">{"Organize and manage all your creations"}</p>
          </div>
          <Button>
            <Plus className="w-4 h-4 mr-2" />
            {"New Collection"}
          </Button>
        </div>

        {/* Search & Filters */}
        <div className="flex flex-col sm:flex-row gap-4 mb-8">
          <div className="flex-1 relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search creations..."
              className="w-full pl-12 pr-4 py-3 bg-card border border-border rounded-xl outline-none focus:border-accent/50 transition-colors text-foreground placeholder:text-muted-foreground"
            />
          </div>
          <div className="flex gap-2">
            <button className="px-4 py-3 bg-card border border-border rounded-xl hover:border-accent/50 transition-colors">
              <Grid3x3 className="w-5 h-5 text-muted-foreground" />
            </button>
            <button className="px-4 py-3 bg-card border border-border rounded-xl hover:border-accent/50 transition-colors">
              <List className="w-5 h-5 text-muted-foreground" />
            </button>
          </div>
        </div>

        {/* Collections */}
        <div className="mb-12">
          <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-4">{"Collections"}</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {collections.map((collection) => (
              <button
                key={collection.name}
                className="flex flex-col items-start gap-3 p-5 bg-card border border-border rounded-xl hover:border-accent/50 hover:shadow-lg transition-all duration-200 text-left group"
              >
                <div className={`w-12 h-12 flex items-center justify-center rounded-lg ${collection.color}`}>
                  <FolderOpen className="w-6 h-6" />
                </div>
                <div>
                  <h4 className="font-semibold text-foreground mb-1">{collection.name}</h4>
                  <p className="text-sm text-muted-foreground">{collection.count + " items"}</p>
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* All Creations */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">{"All Creations"}</h3>
            <select className="px-3 py-2 bg-card border border-border rounded-lg text-sm text-foreground outline-none focus:border-accent/50 transition-colors">
              <option>{"Recent"}</option>
              <option>{"Name"}</option>
              <option>{"Type"}</option>
            </select>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {allCreations.map((creation) => (
              <CreationCard key={creation.id} {...creation} />
            ))}
          </div>
        </div>
      </main>
    </div>
  )
}
