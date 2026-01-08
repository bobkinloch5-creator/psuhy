"use client"

import { Box, Map, Code, Package } from "lucide-react"
import { useState, useEffect } from "react"
import { createClient } from "@/lib/supabase/client"

interface Creation {
  id: string
  type: string
  name: string
  description: string
  created_at: string
  preview_url?: string
}

export function CreationGallery() {
  const [creations, setCreations] = useState<Creation[]>([])
  const [loading, setLoading] = useState(true)
  const supabase = createClient()

  useEffect(() => {
    fetchCreations()
  }, [])

  const fetchCreations = async () => {
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) return

    const { data: userData } = await supabase.from("users").select("id").eq("discord_id", user.id).single()

    if (userData) {
      const { data: creations } = await supabase
        .from("creations")
        .select("*")
        .eq("user_id", userData.id)
        .order("created_at", { ascending: false })
        .limit(20)

      if (creations) {
        setCreations(creations)
      }
    }
    setLoading(false)
  }

  const getIcon = (type: string) => {
    switch (type) {
      case "model":
        return <Box className="w-5 h-5" />
      case "world":
        return <Map className="w-5 h-5" />
      case "script":
        return <Code className="w-5 h-5" />
      case "system":
        return <Package className="w-5 h-5" />
      default:
        return <Box className="w-5 h-5" />
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center p-12">
        <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  if (creations.length === 0) {
    return (
      <div className="text-center p-12">
        <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mx-auto mb-4">
          <Package className="w-8 h-8 text-muted-foreground" />
        </div>
        <h3 className="text-lg font-bold text-foreground mb-2">No creations yet</h3>
        <p className="text-muted-foreground">Start forging to see your creations here</p>
      </div>
    )
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {creations.map((creation) => (
        <div
          key={creation.id}
          className="bg-card border border-border rounded-lg p-4 hover:border-primary/50 transition-colors"
        >
          <div className="flex items-start gap-3 mb-3">
            <div className="w-10 h-10 bg-primary/20 rounded-lg flex items-center justify-center text-primary flex-shrink-0">
              {getIcon(creation.type)}
            </div>
            <div className="flex-1 min-w-0">
              <h4 className="font-bold text-foreground truncate">{creation.name}</h4>
              <p className="text-xs text-muted-foreground capitalize">{creation.type}</p>
            </div>
          </div>
          {creation.description && (
            <p className="text-sm text-muted-foreground line-clamp-2 mb-3">{creation.description}</p>
          )}
          <div className="flex items-center justify-between">
            <span className="text-xs text-muted-foreground">{new Date(creation.created_at).toLocaleDateString()}</span>
            <button className="text-xs text-primary hover:underline font-medium">View</button>
          </div>
        </div>
      ))}
    </div>
  )
}

