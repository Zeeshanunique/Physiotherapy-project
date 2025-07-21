import { NextRequest, NextResponse } from 'next/server'
import OpenAI from 'openai'

// Initialize OpenAI client
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
})

export async function POST(request: NextRequest) {
  try {
    const { message, systemPrompt, conversationHistory } = await request.json()

    if (!message) {
      return NextResponse.json(
        { error: 'Message is required' },
        { status: 400 }
      )
    }

    // Prepare conversation messages for OpenAI
    const messages = [
      {
        role: 'system' as const,
        content: systemPrompt || "You are ExerciseBuddy, an AI fitness coach specializing in physiotherapy and exercise guidance. Provide helpful, encouraging, and accurate exercise guidance. Keep responses concise but informative. Focus on form, safety, and motivation. Use emojis occasionally to keep it friendly."
      },
      // Add conversation history (last 10 messages)
      ...conversationHistory.map((msg: any) => ({
        role: msg.role as 'user' | 'assistant',
        content: msg.content
      })),
      {
        role: 'user' as const,
        content: message
      }
    ]

    // Call OpenAI API
    const completion = await openai.chat.completions.create({
      model: 'gpt-3.5-turbo',
      messages,
      max_tokens: 250,
      temperature: 0.8,
      presence_penalty: 0.2,
      frequency_penalty: 0.1,
      top_p: 0.9,
    })

    const response = completion.choices[0]?.message?.content || "I'm sorry, I couldn't generate a response right now."

    return NextResponse.json({
      response,
      usage: completion.usage
    })

  } catch (error) {
    console.error('ExerciseBuddy API error:', error)
    
    return NextResponse.json(
      { 
        error: 'Failed to get response from ExerciseBuddy',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
} 