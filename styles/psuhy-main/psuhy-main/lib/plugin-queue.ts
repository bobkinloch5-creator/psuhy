// Helper function to queue commands for connected plugins
export async function queuePluginCommand(userId: string, command: any) {
    try {
        const response = await fetch(`${process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'}/api/plugin/poll`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ userId, command })
        })

        if (!response.ok) {
            console.error('[Plugin Queue] Failed to queue command')
            return false
        }

        return true
    } catch (error) {
        console.error('[Plugin Queue] Error:', error)
        return false
    }
}
