import Image from "next/image"
import Link from "next/link"
import { ChevronDown } from "lucide-react"

export default function FAQPage() {
  const faqs = [
    {
      question: "What is BlaxSmith AI?",
      answer:
        "BlaxSmith AI is an AI-powered creation studio for Roblox developers. It allows you to generate 3D models, entire worlds, Lua scripts, and game systems using natural language prompts. The platform integrates directly with Roblox Studio through a plugin.",
    },
    {
      question: "How do I connect Roblox Studio to BlaxSmith?",
      answer:
        "Download and install the BlaxSmith plugin from the Roblox Studio plugin marketplace or manually from our website. Once installed, click the 'Connect' button in the plugin toolbar. Make sure you're logged into BlaxSmith in your web browser.",
    },
    {
      question: "How many generations do I get per month?",
      answer:
        "Every user receives 50 generation credits per month for free. Each model, world, script, or system generation uses 1 credit. Credits reset on the first day of each month and do not roll over.",
    },
    {
      question: "What types of content can I generate?",
      answer:
        "You can generate: 3D Models (characters, props, buildings), Complete Worlds (environments with lighting and terrain), Lua Scripts (game mechanics and functionality), and Game Systems (inventory, combat, quests, etc.).",
    },
    {
      question: "Do I own the content I generate?",
      answer:
        "Yes! You retain full ownership of all content generated using BlaxSmith AI. You're free to use it in your Roblox games, modify it, or distribute it as you see fit.",
    },
    {
      question: "Can I use BlaxSmith for commercial Roblox games?",
      answer:
        "All generated content can be used in commercial Roblox projects without any additional licensing requirements.",
    },
    {
      question: "What AI models power BlaxSmith?",
      answer:
        "BlaxSmith uses PollyPizza for 3D model generation and OpenAI GPT-4 for script, world plan, and system generation. We continuously update our AI models to provide the best results.",
    },
    {
      question: "How do I send generated content to Roblox Studio?",
      answer:
        "After generating content, click the 'Send to Studio' button. Make sure your Roblox Studio plugin is connected and running. The content will automatically appear in your workspace.",
    },
    {
      question: "Can I edit generated content?",
      answer:
        "Yes! Once content is inserted into Roblox Studio, you can edit it like any other asset. For models, use Studio's built-in tools. For scripts, edit the code directly in the script editor.",
    },
    {
      question: "What happens if generation fails?",
      answer:
        "If a generation fails, your credit is automatically refunded. Check the error message for details. Common issues include overly complex prompts or API service downtime.",
    },
    {
      question: "Is BlaxSmith affiliated with Roblox?",
      answer:
        "No, BlaxSmith AI is an independent third-party tool. We are not affiliated with, endorsed by, or partnered with Roblox Corporation.",
    },
    {
      question: "How can I get more generation credits?",
      answer:
        "Currently, all users receive 50 credits per month. We're working on premium plans and additional ways to earn credits. Stay tuned for updates!",
    },
  ]

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border/50 backdrop-blur-sm sticky top-0 z-50 bg-background/80">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-3">
            <Image src="/logo.png" alt="BlaxSmith AI" width={48} height={48} className="w-12 h-12" />
            <h1 className="text-xl font-bold bg-gradient-to-r from-primary via-accent to-primary bg-clip-text text-transparent">
              BlaxSmith AI
            </h1>
          </Link>
          <Link
            href="/"
            className="px-6 py-2.5 bg-secondary text-secondary-foreground font-semibold rounded-lg hover:bg-secondary/80 transition-colors"
          >
            Back to Home
          </Link>
        </div>
      </header>

      <main className="container mx-auto px-4 py-12 max-w-4xl">
        <div className="mb-12 text-center">
          <h1 className="text-4xl md:text-5xl font-bold text-foreground mb-4">Frequently Asked Questions</h1>
          <p className="text-muted-foreground text-lg">
            Everything you need to know about BlaxSmith AI and how to forge amazing Roblox creations
          </p>
        </div>

        <div className="space-y-4">
          {faqs.map((faq, index) => (
            <details key={index} className="group bg-card border border-border rounded-xl overflow-hidden">
              <summary className="flex items-center justify-between p-6 cursor-pointer hover:bg-card/80 transition-colors">
                <h3 className="text-lg font-bold text-foreground pr-4">{faq.question}</h3>
                <ChevronDown className="w-5 h-5 text-muted-foreground group-open:rotate-180 transition-transform flex-shrink-0" />
              </summary>
              <div className="px-6 pb-6">
                <p className="text-muted-foreground leading-relaxed">{faq.answer}</p>
              </div>
            </details>
          ))}
        </div>

        {/* Contact Section */}
        <div className="mt-12 p-8 bg-gradient-to-br from-primary/10 to-accent/10 border border-primary/20 rounded-xl text-center">
          <h2 className="text-2xl font-bold text-foreground mb-3">Still have questions?</h2>
          <p className="text-muted-foreground mb-6">
            Join our Discord community or reach out to our support team for help
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <button className="px-6 py-3 forge-gradient text-white font-semibold rounded-lg hover:scale-105 transition-transform">
              Join Discord Community
            </button>
            <button className="px-6 py-3 bg-secondary text-secondary-foreground font-semibold rounded-lg hover:bg-secondary/80 transition-colors">
              Contact Support
            </button>
          </div>
        </div>
      </main>
    </div>
  )
}

