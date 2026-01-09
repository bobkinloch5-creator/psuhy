import { createClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"
import { CreationGallery } from "@/components/creation-gallery"
import Image from "next/image"
import Link from "next/link"

export default async function GalleryPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect("/")
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border/50 backdrop-blur-sm sticky top-0 z-50 bg-background/80">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <Link href="/forge" className="flex items-center gap-3">
            <Image src="/logo.png" alt="BlaxSmith AI" width={48} height={48} className="w-12 h-12" />
            <h1 className="text-xl font-bold bg-gradient-to-r from-primary via-accent to-primary bg-clip-text text-transparent">
              BlaxSmith AI
            </h1>
          </Link>
          <Link
            href="/forge"
            className="px-6 py-2.5 forge-gradient text-white font-semibold rounded-lg hover:scale-105 transition-transform"
          >
            Back to Forge
          </Link>
        </div>
      </header>

      <main className="container mx-auto px-4 py-12 max-w-6xl">
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-foreground mb-3">My Creations</h1>
          <p className="text-muted-foreground">All your forged models, worlds, scripts, and systems</p>
        </div>

        <CreationGallery />
      </main>
    </div>
  )
}

