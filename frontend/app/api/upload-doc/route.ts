import { NextResponse } from 'next/server'

export async function POST(request: Request) {
    try {
        const formData = await request.formData()
        const file = formData.get('file') as File | null

        if (!file) {
            return NextResponse.json({ error: 'No file uploaded' }, { status: 400 })
        }

        const backendUrl = process.env.BACKEND_URL || 'http://localhost:8000'
        const adminKey = process.env.ADMIN_KEY

        const backendData = new FormData()
        backendData.append('file', file)

        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 60000); // 60s timeout

        const response = await fetch(`${backendUrl}/upload-doc`, {
            method: 'POST',
            body: backendData,
            headers: {
                'X-Admin-Key': adminKey || '',
            },
            signal: controller.signal,
            // @ts-ignore 
            duplex: 'half',
        }).finally(() => clearTimeout(timeoutId));

        if (!response.ok) {
            const errorText = await response.text()
            return NextResponse.json({ error: `Backend error: ${errorText}` }, { status: response.status })
        }

        const data = await response.json()
        return NextResponse.json(data)

    } catch (error) {
        console.error('Upload Error:', error)
        return NextResponse.json({ error: 'Failed to upload document' }, { status: 500 })
    }
}
