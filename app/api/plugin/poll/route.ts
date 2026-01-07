import { NextResponse } from 'next/server'
import { getAndClearCommands, addCommand } from '@/lib/command-queue'

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const userId = searchParams.get('userId')

    if (!userId) {
      return NextResponse.json({ error: 'userId required' }, { status: 400 })
    }

    // Get and clear commands for this user from Supabase
    const commands = await getAndClearCommands(userId)

    // Transform to plugin format
    const pluginCommands = commands.map(cmd => ({
      type: cmd.type,
      data: cmd.data,
      code: cmd.code,
    }))

    return NextResponse.json(pluginCommands)
  } catch (error) {
    console.error('[Plugin Poll] Error:', error)
    return NextResponse.json({ error: 'Failed to poll commands' }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { userId, command } = body

    if (!userId || !command) {
      return NextResponse.json({ error: 'userId and command required' }, { status: 400 })
    }

    // Add command to user's queue in Supabase
    const success = await addCommand(userId, command)

    if (success) {
      console.log(`[Plugin] Command queued for user ${userId}:`, command.type)
      return NextResponse.json({ success: true })
    } else {
      return NextResponse.json({ error: 'Failed to queue command' }, { status: 500 })
    }
  } catch (error) {
    console.error('[Plugin Poll] Error:', error)
    return NextResponse.json({ error: 'Failed to queue command' }, { status: 500 })
  }
}
