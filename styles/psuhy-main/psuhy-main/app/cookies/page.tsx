import Link from "next/link"
import Image from "next/image"
import { Footer } from "@/components/footer"

export default function CookiesPage() {
    return (
        <div className="min-h-screen bg-gradient-to-b from-black via-zinc-950 to-black">
            <header className="border-b border-white/10 backdrop-blur-xl bg-black/40 sticky top-0 z-50">
                <div className="container mx-auto px-6 py-4 flex items-center justify-between">
                    <Link href="/" className="flex items-center gap-3">
                        <Image src="/blaxsmith-logo.png" alt="BlaxSmith AI" width={48} height={48} className="w-12 h-12" />
                        <h1 className="text-2xl font-bold bg-gradient-to-r from-orange-400 via-yellow-500 to-orange-600 bg-clip-text text-transparent">
                            BlaxSmith AI
                        </h1>
                    </Link>
                </div>
            </header>

            <main className="container mx-auto px-6 py-16 max-w-4xl">
                <h1 className="text-4xl font-bold text-white mb-8">Cookie Policy</h1>
                <p className="text-zinc-400 mb-8">Last updated: January 2026</p>

                <div className="prose prose-invert prose-zinc max-w-none space-y-8">
                    <section>
                        <h2 className="text-2xl font-bold text-white mb-4">What Are Cookies</h2>
                        <p className="text-zinc-400">
                            Cookies are small text files stored on your device when you visit our website. They help us provide you with a better experience.
                        </p>
                    </section>

                    <section>
                        <h2 className="text-2xl font-bold text-white mb-4">How We Use Cookies</h2>
                        <ul className="list-disc list-inside text-zinc-400 mt-4 space-y-2">
                            <li><strong>Essential Cookies:</strong> Required for authentication and security</li>
                            <li><strong>Analytics Cookies:</strong> Help us understand how visitors use our site</li>
                            <li><strong>Preference Cookies:</strong> Remember your settings and preferences</li>
                        </ul>
                    </section>

                    <section>
                        <h2 className="text-2xl font-bold text-white mb-4">Managing Cookies</h2>
                        <p className="text-zinc-400">
                            You can control cookies through your browser settings. Note that disabling essential cookies may affect your ability to use our services.
                        </p>
                    </section>

                    <section>
                        <h2 className="text-2xl font-bold text-white mb-4">Contact</h2>
                        <p className="text-zinc-400">
                            Questions? Email us at{" "}
                            <a href="mailto:support@blaxsmith.dev" className="text-orange-400 hover:underline">support@blaxsmith.dev</a>
                        </p>
                    </section>
                </div>
            </main>

            <Footer />
        </div>
    )
}
