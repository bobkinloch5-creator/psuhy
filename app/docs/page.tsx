import { BookOpen, Code, Plug, Sparkles, Shield, Zap } from "lucide-react"
import Link from "next/link"

export default function DocsPage() {
    return (
        <div className="min-h-screen bg-background">
            {/* Header */}
            <header className="border-b border-border bg-card/50 backdrop-blur-xl sticky top-0 z-50">
                <div className="container mx-auto px-4 py-4 flex items-center justify-between">
                    <Link href="/" className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-red-500 via-orange-500 to-yellow-500 flex items-center justify-center">
                            <BookOpen className="w-6 h-6 text-white" />
                        </div>
                        <h1 className="text-xl font-bold bg-gradient-to-r from-red-400 via-orange-400 to-yellow-400 bg-clip-text text-transparent">
                            BlaxSmith Docs
                        </h1>
                    </Link>
                    <Link href="/forge" className="px-4 py-2 bg-gradient-to-r from-orange-500 to-red-500 text-white rounded-xl text-sm font-bold hover:shadow-lg transition-all">
                        Open Forge
                    </Link>
                </div>
            </header>

            <div className="container mx-auto px-4 py-12 max-w-4xl">
                {/* Hero */}
                <div className="mb-12 text-center">
                    <h1 className="text-5xl font-black mb-4 bg-gradient-to-r from-orange-400 to-red-400 bg-clip-text text-transparent">
                        Documentation
                    </h1>
                    <p className="text-xl text-muted-foreground">
                        Everything you need to create amazing Roblox games with AI
                    </p>
                </div>

                {/* Quick Start */}
                <section className="mb-12 bg-card border border-border rounded-2xl p-8">
                    <div className="flex items-center gap-3 mb-6">
                        <Zap className="w-6 h-6 text-orange-400" />
                        <h2 className="text-2xl font-bold">Quick Start</h2>
                    </div>

                    <div className="space-y-4">
                        <div className="bg-muted/50 rounded-xl p-4">
                            <h3 className="font-bold mb-2">1. Login with Discord</h3>
                            <p className="text-sm text-muted-foreground">Connect your Discord account to get started. You'll receive 50 free generation credits!</p>
                        </div>

                        <div className="bg-muted/50 rounded-xl p-4">
                            <h3 className="font-bold mb-2">2. Create a Project</h3>
                            <p className="text-sm text-muted-foreground">Create your first Roblox project to unlock the AI Forge.</p>
                        </div>

                        <div className="bg-muted/50 rounded-xl p-4">
                            <h3 className="font-bold mb-2">3. Install Roblox Plugin</h3>
                            <p className="text-sm text-muted-foreground">Download and install the BlaxSmith plugin in Roblox Studio to connect your workspace.</p>
                        </div>

                        <div className="bg-muted/50 rounded-xl p-4">
                            <h3 className="font-bold mb-2">4. Start Generating!</h3>
                            <p className="text-sm text-muted-foreground">Describe what you want to create and let AI build it for you instantly.</p>
                        </div>
                    </div>
                </section>

                {/* Features */}
                <section className="mb-12">
                    <h2 className="text-3xl font-bold mb-6">Features</h2>

                    <div className="grid md:grid-cols-2 gap-6">
                        <div className="bg-card border border-border rounded-2xl p-6">
                            <div className="w-12 h-12 rounded-xl bg-blue-500/20 flex items-center justify-center mb-4">
                                <Code className="w-6 h-6 text-blue-400" />
                            </div>
                            <h3 className="text-xl font-bold mb-2">Script Generation</h3>
                            <p className="text-muted-foreground">Generate production-ready Lua scripts with AI. Perfect for game mechanics, systems, and tools.</p>
                        </div>

                        <div className="bg-card border border-border rounded-2xl p-6">
                            <div className="w-12 h-12 rounded-xl bg-purple-500/20 flex items-center justify-center mb-4">
                                <Sparkles className="w-6 h-6 text-purple-400" />
                            </div>
                            <h3 className="text-xl font-bold mb-2">World Generation</h3>
                            <p className="text-muted-foreground">Create entire game environments with lighting, terrain, and Toolbox assets in seconds.</p>
                        </div>

                        <div className="bg-card border border-border rounded-2xl p-6">
                            <div className="w-12 h-12 rounded-xl bg-green-500/20 flex items-center justify-center mb-4">
                                <Shield className="w-6 h-6 text-green-400" />
                            </div>
                            <h3 className="text-xl font-bold mb-2">System Design</h3>
                            <p className="text-muted-foreground">Design modular game systems with components, configuration, and dependencies.</p>
                        </div>

                        <div className="bg-card border border-border rounded-2xl p-6">
                            <div className="w-12 h-12 rounded-xl bg-orange-500/20 flex items-center justify-center mb-4">
                                <Plug className="w-6 h-6 text-orange-400" />
                            </div>
                            <h3 className="text-xl font-bold mb-2">Studio Integration</h3>
                            <p className="text-muted-foreground">Direct connection to Roblox Studio. Generated content appears instantly in your workspace.</p>
                        </div>
                    </div>
                </section>

                {/* AI Models */}
                <section className="mb-12 bg-card border border-border rounded-2xl p-8">
                    <h2 className="text-2xl font-bold mb-6">AI Models</h2>

                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead className="border-b border-border">
                                <tr>
                                    <th className="text-left py-3 px-4 font-bold">Tier</th>
                                    <th className="text-left py-3 px-4 font-bold">Scripts</th>
                                    <th className="text-left py-3 px-4 font-bold">Worlds</th>
                                    <th className="text-left py-3 px-4 font-bold">Systems</th>
                                    <th className="text-left py-3 px-4 font-bold">Credits</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-border">
                                <tr>
                                    <td className="py-3 px-4">
                                        <span className="px-2 py-1 bg-gray-500/20 text-gray-300 rounded text-xs font-bold">FREE</span>
                                    </td>
                                    <td className="py-3 px-4 text-muted-foreground">Grok-3</td>
                                    <td className="py-3 px-4 text-muted-foreground">Grok-3</td>
                                    <td className="py-3 px-4 text-muted-foreground">Grok-3</td>
                                    <td className="py-3 px-4 text-muted-foreground">50</td>
                                </tr>
                                <tr>
                                    <td className="py-3 px-4">
                                        <span className="px-2 py-1 bg-blue-500/20 text-blue-300 rounded text-xs font-bold">PRO</span>
                                    </td>
                                    <td className="py-3 px-4 text-blue-400">Claude Haiku</td>
                                    <td className="py-3 px-4 text-blue-400">GPT-4o-mini</td>
                                    <td className="py-3 px-4 text-blue-400">Claude Haiku</td>
                                    <td className="py-3 px-4 text-blue-400">500</td>
                                </tr>
                            </tbody>
                        </table>
                    </div>
                </section>

                {/* Plugin Setup */}
                <section className="mb-12 bg-gradient-to-br from-orange-500/10 to-red-500/10 border border-orange-500/30 rounded-2xl p-8">
                    <h2 className="text-2xl font-bold mb-6">Roblox Studio Plugin Setup</h2>

                    <ol className="space-y-4">
                        <li className="flex gap-4">
                            <span className="flex-shrink-0 w-8 h-8 bg-orange-500 rounded-full flex items-center justify-center text-white font-bold">1</span>
                            <div>
                                <h3 className="font-bold mb-1">Download Plugin</h3>
                                <p className="text-sm text-muted-foreground">Get the BlaxSmith plugin from the Roblox plugin marketplace or our Discord server.</p>
                            </div>
                        </li>

                        <li className="flex gap-4">
                            <span className="flex-shrink-0 w-8 h-8 bg-orange-500 rounded-full flex items-center justify-center text-white font-bold">2</span>
                            <div>
                                <h3 className="font-bold mb-1">Install in Studio</h3>
                                <p className="text-sm text-muted-foreground">Open Roblox Studio, go to Plugins tab, and install the BlaxSmith plugin.</p>
                            </div>
                        </li>

                        <li className="flex gap-4">
                            <span className="flex-shrink-0 w-8 h-8 bg-orange-500 rounded-full flex items-center justify-center text-white font-bold">3</span>
                            <div>
                                <h3 className="font-bold mb-1">Connect to BlaxSmith</h3>
                                <p className="text-sm text-muted-foreground">Click the plugin button and login with your Discord account to connect.</p>
                            </div>
                        </li>

                        <li className="flex gap-4">
                            <span className="flex-shrink-0 w-8 h-8 bg-orange-500 rounded-full flex items-center justify-center text-white font-bold">4</span>
                            <div>
                                <h3 className="font-bold mb-1">Start Creating</h3>
                                <p className="text-sm text-muted-foreground">Your Forge will show "Connected" status and generated assets will appear automatically!</p>
                            </div>
                        </li>
                    </ol>
                </section>

                {/* Support */}
                <section className="bg-card border border-border rounded-2xl p-8 text-center">
                    <h2 className="text-2xl font-bold mb-4">Need Help?</h2>
                    <p className="text-muted-foreground mb-6">
                        Join our Discord community for support, updates, and to share your creations!
                    </p>
                    <div className="flex gap-4 justify-center">
                        <a
                            href="https://discord.gg/sC9A9Fzss3"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="px-6 py-3 bg-gradient-to-r from-blue-500 to-purple-500 text-white rounded-xl font-bold hover:shadow-lg transition-all hover:scale-105"
                        >
                            Join Discord
                        </a>
                        <Link
                            href="/faq"
                            className="px-6 py-3 bg-muted text-foreground rounded-xl font-bold hover:bg-muted/80 transition-all"
                        >
                            Read FAQ
                        </Link>
                    </div>
                </section>
            </div>
        </div>
    )
}

