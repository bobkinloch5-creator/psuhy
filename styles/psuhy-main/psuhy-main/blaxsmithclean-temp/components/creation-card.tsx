"use client"

import { Clock, MoreVertical } from "lucide-react"
import Link from "next/link"

interface CreationCardProps {
  id: string
  type: "world" | "model" | "script" | "system"
  title: string
  description: string
  timestamp: string
  thumbnail?: string
}

const typeConfig = {
  world: { label: "World", color: "text-chart-3 bg-chart-3/10" },
  model: { label: "Model", color: "text-chart-2 bg-chart-2/10" },
  script: { label: "Script", color: "text-chart-4 bg-chart-4/10" },
  system: { label: "System", color: "text-accent bg-accent/10" },
}

export function CreationCard({ id, type, title, description, timestamp, thumbnail }: CreationCardProps) {
  const config = typeConfig[type]

  return (
    <Link
      href={`/creation/${id}`}
      className="group block bg-card border border-border rounded-xl hover:border-accent/50 hover:shadow-lg transition-all duration-200 overflow-hidden"
    >
      {/* Thumbnail */}
      <div className="aspect-video bg-muted relative overflow-hidden">
        {thumbnail ? (
          <img src={thumbnail || "/placeholder.svg"} alt={title} className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-muted-foreground text-4xl">
            {type === "world" && "🌍"}
            {type === "model" && "📦"}
            {type === "script" && "💻"}
            {type === "system" && "⚙️"}
          </div>
        )}
        <div className="absolute top-3 left-3">
          <span className={`px-2.5 py-1 text-xs font-semibold rounded-md ${config.color}`}>{config.label}</span>
        </div>
      </div>

      {/* Content */}
      <div className="p-4">
        <div className="flex items-start justify-between gap-2 mb-2">
          <h3 className="font-semibold text-foreground group-hover:text-accent transition-colors line-clamp-1">
            {title}
          </h3>
          <button
            onClick={(e) => {
              e.preventDefault()
              // Menu action
            }}
            className="text-muted-foreground hover:text-foreground transition-colors p-1"
          >
            <MoreVertical className="w-4 h-4" />
          </button>
        </div>
        <p className="text-sm text-muted-foreground leading-relaxed line-clamp-2 mb-3">{description}</p>
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <Clock className="w-3.5 h-3.5" />
          <span>{timestamp}</span>
        </div>
      </div>
    </Link>
  )
}
