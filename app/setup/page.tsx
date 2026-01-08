import { Download, Play, Folder, CheckCircle } from "lucide-react"
import { Button } from "@/components/ui/button"
import Link from "next/link"
import Image from "next/image"

export default function SetupPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-orange-950/20 to-slate-950 p-8">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <Image
            src="/logo.png"
            alt="BlaxSmith AI"
            width={150}
            height={60}
            className="drop-shadow-[0_0_15px_rgba(255,140,30,0.5)]"
          />
          <Link href="/forge">
            <Button variant="outline" className="border-orange-900/30 text-slate-300 hover:bg-slate-800 bg-transparent">
              Go to Forge
            </Button>
          </Link>
        </div>

        <div className="space-y-8">
          <div className="text-center space-y-3">
            <h1 className="text-4xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-orange-400 to-yellow-400">
              Setup Roblox Studio Plugin
            </h1>
            <p className="text-slate-400 text-lg">Connect BlaxSmith to Roblox Studio for automatic asset insertion</p>
          </div>

          {/* Step 1: Download Plugin */}
          <div className="bg-slate-900/80 backdrop-blur-sm border border-orange-900/30 rounded-xl p-6 shadow-xl">
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 bg-gradient-to-r from-orange-600 to-yellow-600 rounded-full flex items-center justify-center flex-shrink-0">
                <Download className="w-6 h-6 text-white" />
              </div>
              <div className="flex-1 space-y-4">
                <div>
                  <h2 className="text-2xl font-bold text-white mb-2">Step 1: Download the Plugin</h2>
                  <p className="text-slate-400">Download the BlaxSmith plugin file to your computer</p>
                </div>
                <a href="/BlaxSmith_Plugin.lua" download>
                  <Button className="bg-gradient-to-r from-orange-600 to-yellow-600 hover:from-orange-500 hover:to-yellow-500 text-white font-semibold">
                    <Download className="w-4 h-4 mr-2" />
                    Download BlaxSmith_Plugin.lua
                  </Button>
                </a>
              </div>
            </div>
          </div>

          {/* Step 2: Install Plugin */}
          <div className="bg-slate-900/80 backdrop-blur-sm border border-orange-900/30 rounded-xl p-6 shadow-xl">
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 bg-gradient-to-r from-orange-600 to-yellow-600 rounded-full flex items-center justify-center flex-shrink-0">
                <Folder className="w-6 h-6 text-white" />
              </div>
              <div className="flex-1 space-y-4">
                <div>
                  <h2 className="text-2xl font-bold text-white mb-2">Step 2: Install to Roblox Studio</h2>
                  <p className="text-slate-400 mb-4">Move the plugin file to your Roblox Studio plugins folder</p>
                </div>

                <div className="bg-slate-950/50 border border-slate-800 rounded-lg p-4 space-y-3">
                  <div className="flex items-start gap-3">
                    <CheckCircle className="w-5 h-5 text-orange-500 flex-shrink-0 mt-0.5" />
                    <div className="text-sm text-slate-300">
                      <span className="font-semibold text-white">Windows:</span> Copy the file to{" "}
                      <code className="bg-slate-800 px-2 py-1 rounded text-orange-400">
                        %LOCALAPPDATA%\Roblox\Plugins
                      </code>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <CheckCircle className="w-5 h-5 text-orange-500 flex-shrink-0 mt-0.5" />
                    <div className="text-sm text-slate-300">
                      <span className="font-semibold text-white">Mac:</span> Copy the file to{" "}
                      <code className="bg-slate-800 px-2 py-1 rounded text-orange-400">~/Documents/Roblox/Plugins</code>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <CheckCircle className="w-5 h-5 text-orange-500 flex-shrink-0 mt-0.5" />
                    <div className="text-sm text-slate-300">If the Plugins folder doesn't exist, create it first</div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Step 3: Connect */}
          <div className="bg-slate-900/80 backdrop-blur-sm border border-orange-900/30 rounded-xl p-6 shadow-xl">
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 bg-gradient-to-r from-orange-600 to-yellow-600 rounded-full flex items-center justify-center flex-shrink-0">
                <Play className="w-6 h-6 text-white" />
              </div>
              <div className="flex-1 space-y-4">
                <div>
                  <h2 className="text-2xl font-bold text-white mb-2">Step 3: Connect in Studio</h2>
                  <p className="text-slate-400 mb-4">Launch Roblox Studio and connect the plugin to BlaxSmith</p>
                </div>

                <div className="bg-slate-950/50 border border-slate-800 rounded-lg p-4 space-y-3">
                  <div className="flex items-start gap-3">
                    <CheckCircle className="w-5 h-5 text-orange-500 flex-shrink-0 mt-0.5" />
                    <div className="text-sm text-slate-300">Open or create a Roblox Studio project</div>
                  </div>
                  <div className="flex items-start gap-3">
                    <CheckCircle className="w-5 h-5 text-orange-500 flex-shrink-0 mt-0.5" />
                    <div className="text-sm text-slate-300">
                      Look for the <span className="font-semibold text-orange-400">BlaxSmith AI</span> toolbar button at
                      the top
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <CheckCircle className="w-5 h-5 text-orange-500 flex-shrink-0 mt-0.5" />
                    <div className="text-sm text-slate-300">
                      Click <span className="font-semibold text-orange-400">Connect</span> button in the toolbar
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <CheckCircle className="w-5 h-5 text-orange-500 flex-shrink-0 mt-0.5" />
                    <div className="text-sm text-slate-300">
                      The plugin will connect to your BlaxSmith account automatically
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* How It Works */}
          <div className="bg-gradient-to-r from-orange-900/20 to-yellow-900/20 border border-orange-900/30 rounded-xl p-6">
            <h3 className="text-xl font-bold text-white mb-3">How Automatic Insertion Works</h3>
            <div className="space-y-2 text-sm text-slate-300">
              <p>Once connected, the plugin will automatically:</p>
              <ul className="list-disc list-inside space-y-1 ml-4">
                <li>Poll BlaxSmith every 2 seconds for new creations</li>
                <li>Insert generated models directly into your workspace</li>
                <li>Create terrain and structures for world generation</li>
                <li>Add scripts with your AI-generated code</li>
                <li>Organize everything in folders for easy management</li>
              </ul>
              <p className="mt-4 text-orange-400 font-semibold">
                No manual export needed - everything appears in Studio automatically!
              </p>
            </div>
          </div>

          <div className="text-center pt-4">
            <Link href="/forge">
              <Button
                size="lg"
                className="bg-gradient-to-r from-orange-600 to-yellow-600 hover:from-orange-500 hover:to-yellow-500 text-white font-semibold px-8"
              >
                Start Creating
              </Button>
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}

