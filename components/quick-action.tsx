"use client"

import type { LucideIcon } from "lucide-react"

interface QuickActionProps {
  icon: LucideIcon
  label: string
  description: string
  badge?: string
  onClick?: () => void
}

export function QuickAction({ icon: Icon, label, description, badge, onClick }: QuickActionProps) {
  return (
    <button
      onClick={onClick}
      className="relative flex flex-col items-start gap-3 p-5 bg-card border border-border rounded-xl hover:border-accent/50 hover:shadow-lg transition-all duration-200 text-left group"
    >
      {badge && (
        <span className="absolute top-3 right-3 px-2 py-1 bg-accent/10 text-accent text-xs font-semibold rounded-md">
          {badge}
        </span>
      )}
      <div className="w-10 h-10 flex items-center justify-center bg-muted rounded-lg group-hover:bg-accent/10 transition-colors">
        <Icon className="w-5 h-5 text-muted-foreground group-hover:text-accent transition-colors" />
      </div>
      <div>
        <h3 className="font-semibold text-foreground text-sm mb-1">{label}</h3>
        <p className="text-xs text-muted-foreground leading-relaxed">{description}</p>
      </div>
    </button>
  )
}
