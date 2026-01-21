import { NextResponse } from 'next/server'

export async function POST(request: Request) {
    // Call the Python backend webhook
    // Assuming backend runs on localhost:8000 for local dev
    try {
        const backendUrl = process.env.BACKEND_URL || 'http://localhost:8000'
        const adminKey = process.env.ADMIN_KEY

        await fetch(`${backendUrl}/update-config`, {
            method: 'POST',
            headers: {
                'X-Admin-Key': adminKey || '',
            },
        })
        return NextResponse.json({ status: 'ok' })
    } catch (error) {
        return NextResponse.json({ error: 'Failed to update bot' }, { status: 500 })
    }
}
