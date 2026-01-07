import { redirect } from "next/navigation"

export default function DashboardPage() {
    // Redirect to forge - the main app interface
    redirect("/forge")
}
