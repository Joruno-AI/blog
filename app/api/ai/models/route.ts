import { NextResponse } from 'next/server'


interface OpenRouterModel {
  id: string
  name: string
  description?: string
  context_length?: number
  pricing?: {
    prompt: string
    completion: string
  }
}

interface OpenRouterModelsResponse {
  data: OpenRouterModel[]
}

export async function GET() {
  try {
    const response = await fetch('https://openrouter.ai/api/v1/models', {
      headers: {
        'Content-Type': 'application/json',
      },
      next: { revalidate: 3600 }, // Cache for 1 hour
    })

    if (!response.ok) {
      throw new Error(`Failed to fetch models: ${response.status}`)
    }

    const data: OpenRouterModelsResponse = await response.json()

    // Transform and sort models
    const models = data.data
      .map((model) => ({
        id: model.id,
        name: model.name || model.id,
        description: model.description,
        contextLength: model.context_length,
        pricing: model.pricing,
      }))
      .sort((a, b) => a.name.localeCompare(b.name))

    return NextResponse.json({ models })
  } catch (error) {
    console.error('Failed to fetch OpenRouter models:', error)
    return NextResponse.json(
      { error: 'Failed to fetch models' },
      { status: 500 }
    )
  }
}
