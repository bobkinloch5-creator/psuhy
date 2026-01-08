"use client"

import { useState, useEffect } from "react"
import { Search, Sparkles } from "lucide-react"

export function CommandBar() {
  const [isOpen, setIsOpen] = useState(false)
  const [query, setQuery] = useState("")

  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault()
        setIsOpen((open) => !open)
      }
    }

    document.addEventListener("keydown", down)
    return () => document.removeEventListener("keydown", down)
  }, [])

  const suggestions = [
    "Generate a low-poly medieval village with a river",
    "Create a pet system with leveling and rarity",
    "Build a fantasy castle with interior rooms",
    "Generate an inventory system with crafting",
    "Create a combat system with health bars",
    "Build a tropical island world with palm trees",
  ]

  return (
    <>
      {/* Trigger Button */}
      <button
        onClick={() => setIsOpen(true)}
        className="flex items-center gap-3 w-full max-w-2xl mx-auto px-5 py-3.5 bg-card border border-border rounded-xl hover:border-accent/50 transition-colors group"
      >
        <Search className="w-5 h-5 text-muted-foreground group-hover:text-accent transition-colors" />
        <span className="text-muted-foreground text-sm font-medium">{"Type anything to create..."}</span>
        <kbd className="ml-auto hidden sm:inline-flex items-center gap-1 px-2 py-1 bg-muted text-muted-foreground text-xs rounded-md font-mono">
          <span className="text-xs">⌘</span>K
        </kbd>
      </button>

      {/* Command Palette Overlay */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-foreground/20 backdrop-blur-sm z-50 animate-in fade-in"
          onClick={() => setIsOpen(false)}
        >
          <div className="container max-w-2xl mx-auto pt-24 px-4">
            <div
              className="bg-card border border-border rounded-2xl shadow-2xl animate-in zoom-in-95 duration-200"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Search Input */}
              <div className="flex items-center gap-3 px-5 py-4 border-b border-border">
                <Sparkles className="w-5 h-5 text-accent" />
                <input
                  type="text"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Generate a world, model, script, or system..."
                  className="flex-1 bg-transparent outline-none text-foreground placeholder:text-muted-foreground text-base"
                  autoFocus
                />
                <button
                  onClick={() => setIsOpen(false)}
                  className="text-muted-foreground hover:text-foreground text-sm"
                >
                  esc
                </button>
              </div>

              {/* Suggestions */}
              <div className="p-2 max-h-96 overflow-y-auto">
                <div className="px-3 py-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  {"Suggestions"}
                </div>
                {suggestions.map((suggestion, i) => (
                  <button
                    key={i}
                    onClick={() => {
                      setQuery(suggestion)
                      // Simulate generation
                      setTimeout(() => setIsOpen(false), 300)
                    }}
                    className="w-full flex items-start gap-3 px-3 py-2.5 rounded-lg hover:bg-muted transition-colors text-left group"
                  >
                    <Sparkles className="w-4 h-4 mt-0.5 text-muted-foreground group-hover:text-accent transition-colors flex-shrink-0" />
                    <span className="text-sm text-foreground/90 leading-relaxed">{suggestion}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  )
}

