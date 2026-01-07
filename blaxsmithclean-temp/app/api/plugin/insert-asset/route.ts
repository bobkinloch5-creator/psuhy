import { NextResponse } from 'next/server'
import { searchAssets, getAssetsByCategory, VERIFIED_ASSETS } from '@/lib/roblox-assets'
import { addCommand, createInsertModelCommand } from '@/lib/command-queue'

// CORS headers for the plugin
const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
}

export async function OPTIONS() {
    return new NextResponse(null, { headers: corsHeaders })
}

export async function POST(request: Request) {
    try {
        const body = await request.json()
        const { userId, assetId, assetName, query, category } = body

        if (!userId) {
            return NextResponse.json({ error: 'userId required' }, { status: 400, headers: corsHeaders })
        }

        let assetsToInsert: Array<{ id: number, name: string }> = []

        // If specific assetId provided, use it
        if (assetId) {
            assetsToInsert.push({ id: Number(assetId), name: assetName || 'Custom Asset' })
        }
        // If query provided, search for matching assets
        else if (query) {
            const results = searchAssets(query)
            if (results.length > 0) {
                assetsToInsert.push({ id: results[0].id, name: results[0].name })
            } else {
                return NextResponse.json({
                    error: 'No matching assets found',
                    suggestion: 'Try: car, sword, helicopter, house, tree'
                }, { status: 404, headers: corsHeaders })
            }
        }
        // If category provided, get first asset from that category
        else if (category) {
            const results = getAssetsByCategory(category)
            if (results.length > 0) {
                assetsToInsert.push({ id: results[0].id, name: results[0].name })
            }
        }

        if (assetsToInsert.length === 0) {
            return NextResponse.json({
                error: 'No asset specified',
                usage: 'Provide assetId, query, or category'
            }, { status: 400, headers: corsHeaders })
        }

        // Queue the INSERT_MODEL command for each asset
        for (const asset of assetsToInsert) {
            const command = createInsertModelCommand(asset.id, asset.name)
            addCommand(userId, command)
            console.log(`[Insert Asset] Queued for user ${userId}:`, asset.name, `(${asset.id})`)
        }

        return NextResponse.json({
            success: true,
            message: `Asset "${assetsToInsert[0].name}" queued for insertion`,
            assetId: assetsToInsert[0].id,
            assetName: assetsToInsert[0].name
        }, { headers: corsHeaders })

    } catch (error) {
        console.error('[Insert Asset] Error:', error)
        return NextResponse.json({ error: 'Failed to queue asset' }, { status: 500, headers: corsHeaders })
    }
}

// GET: List available assets or search
export async function GET(request: Request) {
    try {
        const { searchParams } = new URL(request.url)
        const query = searchParams.get('query')
        const category = searchParams.get('category')

        if (query) {
            const results = searchAssets(query)
            return NextResponse.json({ assets: results }, { headers: corsHeaders })
        }

        if (category) {
            const results = getAssetsByCategory(category)
            return NextResponse.json({ assets: results }, { headers: corsHeaders })
        }

        // Return available categories
        const categories = Object.keys(VERIFIED_ASSETS)
        return NextResponse.json({
            categories,
            usage: 'Use ?query=car or ?category=vehicles to search'
        }, { headers: corsHeaders })

    } catch (error) {
        console.error('[Insert Asset] Error:', error)
        return NextResponse.json({ error: 'Failed to list assets' }, { status: 500, headers: corsHeaders })
    }
}
