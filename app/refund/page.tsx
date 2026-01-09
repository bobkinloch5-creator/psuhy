import Link from "next/link"
import Image from "next/image"
import { Footer } from "@/components/footer"

export default function RefundPage() {
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
                <h1 className="text-4xl font-bold text-white mb-8">Refund Policy</h1>
                <p className="text-zinc-400 mb-8">Last updated: January 2026</p>

                <div className="prose prose-invert prose-zinc max-w-none space-y-8">
                    <section>
                        <h2 className="text-2xl font-bold text-white mb-4">1. Credit Purchases</h2>
                        <p className="text-zinc-400">
                            All credit purchases are final. Once credits have been added to your account, they cannot be refunded. Credits do not expire and can be used at any time.
                        </p>
                    </section>

                    <section>
                        <h2 className="text-2xl font-bold text-white mb-4">2. Subscription Refunds</h2>
                        <p className="text-zinc-400">
                            If you are unsatisfied with your subscription, you may request a refund within 7 days of your initial purchase, provided:
                        </p>
                        <ul className="list-disc list-inside text-zinc-400 mt-4 space-y-2">
                            <li>You have not used more than 10% of your monthly credits</li>
                            <li>This is your first refund request</li>
                            <li>You contact us within 7 days of the charge</li>
                        </ul>
                    </section>

                    <section>
                        <h2 className="text-2xl font-bold text-white mb-4">3. Failed Generations</h2>
                        <p className="text-zinc-400">
                            If a generation fails due to a system error on our end, the credits will be automatically refunded to your account. If you believe credits were incorrectly deducted, please contact support.
                        </p>
                    </section>

                    <section>
                        <h2 className="text-2xl font-bold text-white mb-4">4. Cancellation</h2>
                        <p className="text-zinc-400">
                            You may cancel your subscription at any time. Upon cancellation, you will retain access to your subscription benefits until the end of your current billing period.
                        </p>
                    </section>

                    <section>
                        <h2 className="text-2xl font-bold text-white mb-4">5. How to Request a Refund</h2>
                        <p className="text-zinc-400">To request a refund:</p>
                        <ul className="list-disc list-inside text-zinc-400 mt-4 space-y-2">
                            <li>Email us at <a href="mailto:support@blaxsmith.dev" className="text-orange-400 hover:underline">support@blaxsmith.dev</a></li>
                            <li>Include your account email and transaction ID</li>
                            <li>Explain the reason for your refund request</li>
                        </ul>
                        <p className="text-zinc-400 mt-4">
                            Refunds are typically processed within 5-10 business days.
                        </p>
                    </section>

                    <section>
                        <h2 className="text-2xl font-bold text-white mb-4">6. Contact Us</h2>
                        <p className="text-zinc-400">
                            Questions about refunds? Contact us at{" "}
                            <a href="mailto:support@blaxsmith.dev" className="text-orange-400 hover:underline">support@blaxsmith.dev</a>
                            {" "}or join our{" "}
                            <a href="https://discord.gg/xdFVu6cagw" target="_blank" rel="noopener noreferrer" className="text-orange-400 hover:underline">Discord</a>
                        </p>
                    </section>
                </div>
            </main>

            <Footer />
        </div>
    )
}
