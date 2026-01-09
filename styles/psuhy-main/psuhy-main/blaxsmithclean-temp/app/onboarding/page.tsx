"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import Image from "next/image"

export default function OnboardingPage() {
  const [step, setStep] = useState(1)
  const [projectName, setProjectName] = useState("")
  const [projectDescription, setProjectDescription] = useState("")
  const [isCreating, setIsCreating] = useState(false)
  const router = useRouter()

  const handleCreateProject = async () => {
    if (!projectName.trim()) {
      alert("Please enter a project name")
      return
    }

    setIsCreating(true)
    try {
      const response = await fetch("/api/projects/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: projectName,
          description: projectDescription,
        }),
      })

      if (response.ok) {
        setStep(2)
      } else {
        alert("Failed to create project. Please try again.")
      }
    } catch (error) {
      console.error("[v0] Project creation error:", error)
      alert("Failed to create project. Please try again.")
    } finally {
      setIsCreating(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-orange-950/20 to-slate-950 flex items-center justify-center p-4">
      <div className="w-full max-w-2xl">
        {/* Logo */}
        <div className="flex justify-center mb-8">
          <Image
            src="/logo.png"
            alt="BlaxSmith AI"
            width={200}
            height={80}
            className="drop-shadow-[0_0_15px_rgba(255,140,30,0.5)]"
          />
        </div>

        {/* Step Indicator */}
        <div className="flex justify-center gap-3 mb-8">
          <div
            className={`w-12 h-1 rounded-full transition-all ${step >= 1 ? "bg-gradient-to-r from-orange-500 to-yellow-500" : "bg-slate-700"}`}
          />
          <div
            className={`w-12 h-1 rounded-full transition-all ${step >= 2 ? "bg-gradient-to-r from-orange-500 to-yellow-500" : "bg-slate-700"}`}
          />
        </div>

        <div className="bg-slate-900/80 backdrop-blur-sm border border-orange-900/30 rounded-xl p-8 shadow-2xl">
          {step === 1 && (
            <div className="space-y-6">
              <div className="text-center space-y-2">
                <h1 className="text-3xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-orange-400 to-yellow-400">
                  Create Your First Project
                </h1>
                <p className="text-slate-400">Start forging your Roblox game with AI-powered creation tools</p>
              </div>

              <div className="space-y-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium text-slate-300">Project Name</label>
                  <Input
                    value={projectName}
                    onChange={(e) => setProjectName(e.target.value)}
                    placeholder="My Awesome Game"
                    className="bg-slate-800 border-slate-700 text-white placeholder:text-slate-500"
                    maxLength={50}
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium text-slate-300">Description (Optional)</label>
                  <Textarea
                    value={projectDescription}
                    onChange={(e) => setProjectDescription(e.target.value)}
                    placeholder="A brief description of your game..."
                    className="bg-slate-800 border-slate-700 text-white placeholder:text-slate-500 min-h-24"
                    maxLength={200}
                  />
                </div>
              </div>

              <Button
                onClick={handleCreateProject}
                disabled={isCreating || !projectName.trim()}
                className="w-full bg-gradient-to-r from-orange-600 to-yellow-600 hover:from-orange-500 hover:to-yellow-500 text-white font-semibold py-6 text-lg"
              >
                {isCreating ? "Creating Project..." : "Create Project"}
              </Button>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-6">
              <div className="text-center space-y-2">
                <div className="w-16 h-16 bg-gradient-to-r from-orange-600 to-yellow-600 rounded-full flex items-center justify-center mx-auto mb-4">
                  <svg className="w-8 h-8 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <h1 className="text-3xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-orange-400 to-yellow-400">
                  Connect Roblox Studio
                </h1>
                <p className="text-slate-400">Download and install the BlaxSmith plugin to start creating</p>
              </div>

              <div className="space-y-4">
                <Button
                  onClick={() => router.push("/setup")}
                  className="w-full bg-gradient-to-r from-orange-600 to-yellow-600 hover:from-orange-500 hover:to-yellow-500 text-white font-semibold py-6 text-lg"
                >
                  Download Plugin & See Instructions
                </Button>

                <Button
                  onClick={() => router.push("/forge")}
                  variant="outline"
                  className="w-full border-orange-900/30 text-slate-300 hover:bg-slate-800 py-6 text-lg"
                >
                  Skip for Now
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
