// Command queue using Supabase for persistence
// This allows commands to work across serverless function invocations

import { createClient } from "@/lib/supabase/server"

export interface Command {
    id?: string
    user_id: string
    type: string
    data?: any
    code?: string
    status: 'pending' | 'completed' | 'failed'
    created_at?: string
}

// Add a command to the queue (stored in Supabase)
export async function addCommand(userId: string, command: { type: string; data?: any; code?: string }): Promise<boolean> {
    try {
        const supabase = await createClient()

        const { error } = await supabase
            .from('command_queue')
            .insert({
                user_id: userId,
                type: command.type,
                data: command.data || null,
                code: command.code || null,
                status: 'pending'
            })

        if (error) {
            console.error('[CommandQueue] Insert error:', error)
            return false
        }

        console.log('[CommandQueue] Added command for user:', userId, command.type)
        return true
    } catch (error) {
        console.error('[CommandQueue] Error:', error)
        return false
    }
}

// Get and clear pending commands for a user
export async function getAndClearCommands(userId: string): Promise<Command[]> {
    try {
        const supabase = await createClient()

        // Get pending commands
        const { data: commands, error: selectError } = await supabase
            .from('command_queue')
            .select('*')
            .eq('user_id', userId)
            .eq('status', 'pending')
            .order('created_at', { ascending: true })
            .limit(10)

        if (selectError) {
            console.error('[CommandQueue] Select error:', selectError)
            return []
        }

        if (!commands || commands.length === 0) {
            return []
        }

        // Mark as completed
        const ids = commands.map(c => c.id)
        await supabase
            .from('command_queue')
            .update({ status: 'completed' })
            .in('id', ids)

        console.log('[CommandQueue] Retrieved', commands.length, 'commands for user:', userId)
        return commands
    } catch (error) {
        console.error('[CommandQueue] Error:', error)
        return []
    }
}

// Helper to create INSERT_MODEL command
export function createInsertModelCommand(assetId: number, name: string) {
    return {
        type: 'INSERT_MODEL',
        data: {
            assetId,
            name
        }
    }
}

// Helper to create EXECUTE_WORLD command
export function createExecuteWorldCommand(code: string) {
    return {
        type: 'EXECUTE_WORLD',
        code
    }
}

// Helper to create INJECT_SCRIPT command
export function createInjectScriptCommand(code: string, scriptType: string = 'Script', name: string = 'AIScript') {
    return {
        type: 'INJECT_SCRIPT',
        data: {
            code,
            type: scriptType,
            name
        }
    }
}

// Legacy functions for backwards compatibility (deprecated)
export function getCommandQueue(userId: string): any[] {
    console.warn('[CommandQueue] getCommandQueue is deprecated, use getAndClearCommands')
    return []
}

export function setCommandQueue(userId: string, commands: any[]): void {
    console.warn('[CommandQueue] setCommandQueue is deprecated')
}

export function clearCommandQueue(userId: string): any[] {
    console.warn('[CommandQueue] clearCommandQueue is deprecated, use getAndClearCommands')
    return []
}
