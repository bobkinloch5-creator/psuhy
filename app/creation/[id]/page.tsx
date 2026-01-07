import { Button } from "@/components/ui/button"
import { ArrowLeft, Download, Send, Copy, RotateCcw, Sparkles, Clock, Eye } from "lucide-react"
import Link from "next/link"

// Mock data - in a real app this would come from a database
const creationData: Record<string, any> = {
  "1": {
    type: "world",
    title: "Medieval Village",
    description: "A low-poly medieval village with a river, stone bridges, and timber houses",
    prompt: "Generate a low-poly medieval village with a river",
    timestamp: "2 hours ago",
    settings: {
      detailLevel: "Medium",
      style: "Low Poly",
      size: "Large",
    },
  },
  "2": {
    type: "system",
    title: "Pet System",
    description: "Complete pet system with leveling, rarity tiers, and evolution mechanics",
    prompt: "Create a pet system with leveling and rarity",
    timestamp: "5 hours ago",
    settings: {
      complexity: "Advanced",
      framework: "ModuleScript",
    },
  },
  "3": {
    type: "model",
    title: "Fantasy Castle",
    description: "Detailed fantasy castle with towers, battlements, and interior throne room",
    prompt: "Build a fantasy castle with interior rooms",
    timestamp: "Yesterday",
    settings: {
      detailLevel: "High",
      style: "Realistic",
      polyCount: "15k tris",
    },
  },
  "4": {
    type: "script",
    title: "Inventory Manager",
    description: "Lua script for managing player inventory with item stacking and sorting",
    prompt: "Generate an inventory system with crafting",
    timestamp: "2 days ago",
    settings: {
      language: "Lua",
      framework: "ModuleScript",
    },
  },
}

const typeConfig = {
  world: { label: "World", color: "text-chart-3 bg-chart-3/10", emoji: "🌍" },
  model: { label: "Model", color: "text-chart-2 bg-chart-2/10", emoji: "📦" },
  script: { label: "Script", color: "text-chart-4 bg-chart-4/10", emoji: "💻" },
  system: { label: "System", color: "text-accent bg-accent/10", emoji: "⚙️" },
}

export default function CreationPage({ params }: { params: { id: string } }) {
  const creation = creationData[params.id] || creationData["1"]
  const config = typeConfig[creation.type as keyof typeof typeConfig]

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border bg-card/50 backdrop-blur-sm sticky top-0 z-40">
        <div className="container mx-auto px-4 py-4">
          <Link
            href="/"
            className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors text-sm font-medium"
          >
            <ArrowLeft className="w-4 h-4" />
            {"Back to home"}
          </Link>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8 max-w-6xl">
        {/* Header Section */}
        <div className="flex flex-col lg:flex-row gap-8 mb-8">
          {/* Preview */}
          <div className="flex-1">
            <div className="aspect-video bg-muted rounded-2xl border border-border overflow-hidden relative">
              <div className="w-full h-full flex items-center justify-center text-8xl">{config.emoji}</div>
              <div className="absolute top-4 left-4">
                <span className={`px-3 py-1.5 text-sm font-semibold rounded-lg ${config.color}`}>{config.label}</span>
              </div>
              <div className="absolute bottom-4 right-4 flex gap-2">
                <button className="px-3 py-2 bg-card/90 backdrop-blur-sm border border-border rounded-lg hover:bg-card transition-colors text-sm font-medium">
                  <Eye className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>

          {/* Info & Actions */}
          <div className="lg:w-96 space-y-6">
            <div>
              <h1 className="text-3xl font-bold text-foreground mb-2">{creation.title}</h1>
              <p className="text-muted-foreground leading-relaxed">{creation.description}</p>
            </div>

            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Clock className="w-4 h-4" />
              <span>{"Created " + creation.timestamp}</span>
            </div>

            {/* Actions */}
            <div className="space-y-3">
              <Button className="w-full" size="lg">
                <Send className="w-4 h-4 mr-2" />
                {"Send to Roblox Studio"}
              </Button>
              <div className="grid grid-cols-2 gap-3">
                <Button variant="outline" className="w-full bg-transparent">
                  <Download className="w-4 h-4 mr-2" />
                  {"Download"}
                </Button>
                <Button variant="outline" className="w-full bg-transparent">
                  <Copy className="w-4 h-4 mr-2" />
                  {"Duplicate"}
                </Button>
              </div>
              <Button variant="outline" className="w-full bg-transparent">
                <RotateCcw className="w-4 h-4 mr-2" />
                {"Regenerate"}
              </Button>
            </div>

            {/* Generation Settings */}
            <div className="bg-card border border-border rounded-xl p-4">
              <h3 className="font-semibold text-sm text-foreground mb-3">{"Generation Settings"}</h3>
              <div className="space-y-2">
                {Object.entries(creation.settings).map(([key, value]) => (
                  <div key={key} className="flex justify-between text-sm">
                    <span className="text-muted-foreground capitalize">{key.replace(/([A-Z])/g, " $1").trim()}</span>
                    <span className="text-foreground font-medium">{value as string}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Prompt Section */}
        <div className="bg-card border border-border rounded-xl p-6 mb-8">
          <div className="flex items-center gap-2 mb-3">
            <Sparkles className="w-5 h-5 text-accent" />
            <h3 className="font-semibold text-foreground">{"Original Prompt"}</h3>
          </div>
          <p className="text-foreground/90 leading-relaxed">{creation.prompt}</p>
        </div>

        {/* Version History */}
        <div>
          <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-4">
            {"Version History"}
          </h3>
          <div className="space-y-3">
            <div className="bg-card border-2 border-accent rounded-xl p-4">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-3">
                  <span className="px-2.5 py-1 bg-accent text-accent-foreground text-xs font-semibold rounded-md">
                    {"Current"}
                  </span>
                  <span className="text-sm font-medium text-foreground">{"Version 1"}</span>
                </div>
                <span className="text-sm text-muted-foreground">{creation.timestamp}</span>
              </div>
              <p className="text-sm text-muted-foreground">{"Initial generation"}</p>
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}
