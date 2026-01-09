import type React from "react"
import type { Metadata } from "next"
import { Geist, Geist_Mono } from "next/font/google"
import { Analytics } from "@vercel/analytics/next"
import "./globals.css"

const _geist = Geist({ subsets: ["latin"] })
const _geistMono = Geist_Mono({ subsets: ["latin"] })

export const metadata: Metadata = {
  title: "BlaxSmith AI - The Best Roblox Game Builder Today",
  description:
    "The #1 AI-powered Roblox game builder. Generate 3D models, scripts, GUIs, and complete game systems instantly. The best Roblox development studio today.",
  verification: {
    google: ["ODb4v87NvzJECfOXs7_ZBk0Mi3LeImPNFEwkCYtgB00", "nERPff3pMMA8aCS4r39VUoBUN6yOLbGTttYKZ60bm0U"],
  },
  keywords: [
    "Roblox",
    "AI",
    "3D Model Generator",
    "Roblox Studio",
    "Game Development",
    "BlaxSmith",
    "Best Roblox Builder",
    "Roblox Game Maker",
    "AI Game Builder",
    "Roblox Script Generator",
  ],
  generator: "v0.app",
  icons: {
    icon: [
      {
        url: "/logo.png",
        type: "image/png",
      },
    ],
    apple: "/logo.png",
  },
  openGraph: {
    title: "BlaxSmith AI - Forge Your Roblox World",
    description: "AI-powered creation studio for Roblox developers",
    type: "website",
    images: ["/logo.png"],
  },
  twitter: {
    card: "summary_large_image",
    title: "BlaxSmith AI - Forge Your Roblox World",
    description: "AI-powered creation studio for Roblox developers",
    images: ["/logo.png"],
  },
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en">
      <body className={`font-sans antialiased`}>
        {children}
        <Analytics />
      </body>
    </html>
  )
}
