'use client'

import React, { useState, useRef, useEffect } from 'react'
import { Send, Bot, User, Loader2, X, Maximize2, Minimize2 } from 'lucide-react'

interface Message {
  id: string
  role: 'user' | 'assistant'
  content: string
  timestamp: Date
}

interface ExerciseBuddyProps {
  currentExercise?: string
  currentPrediction?: any
  isSessionRunning?: boolean
  sessionStats?: any
}

const ExerciseBuddy: React.FC<ExerciseBuddyProps> = ({
  currentExercise,
  currentPrediction,
  isSessionRunning,
  sessionStats
}) => {
  const [isOpen, setIsOpen] = useState(false)
  const [isMinimized, setIsMinimized] = useState(false)
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      role: 'assistant',
      content: "Hi! I'm ExerciseBuddy, your AI physiotherapy coach! 🤖💪\n\nI can help you with:\n• Real-time form analysis and corrections\n• Exercise-specific guidance and safety tips\n• Progress tracking and motivation\n• Rehabilitation protocols and modifications\n• Performance optimization\n\nI'm connected to your workout data, so I can give you personalized advice based on your current performance!\n\nWhat would you like to know about your exercise session?",
      timestamp: new Date()
    }
  ])
  const [inputMessage, setInputMessage] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  // Auto-focus input when chat opens
  useEffect(() => {
    if (isOpen && !isMinimized) {
      inputRef.current?.focus()
    }
  }, [isOpen, isMinimized])

  // Generate context-aware system prompt
  const generateSystemPrompt = () => {
    let context = `You are ExerciseBuddy, an expert AI physiotherapy and fitness coach with deep knowledge of exercise physiology, biomechanics, and rehabilitation protocols. You provide personalized, evidence-based guidance to help users perform exercises safely and effectively.

Your expertise includes:
- Exercise form correction and optimization
- Injury prevention and rehabilitation
- Progressive training principles
- Real-time performance feedback
- Motivational coaching and goal setting

Current Session Context:`
    
    if (currentExercise) {
      context += `\n- Active Exercise: ${currentExercise.replace('_', ' ').toUpperCase()}`
    }
    
    if (isSessionRunning) {
      context += `\n- Session Status: ACTIVE (real-time monitoring enabled)`
    }
    
    if (currentPrediction) {
      const confidence = (currentPrediction.confidence * 100).toFixed(1)
      const quality = (currentPrediction.quality_score * 100).toFixed(1)
      context += `\n- Current Phase: ${currentPrediction.phase || 'unknown'}`
      context += `\n- Form Confidence: ${confidence}%`
      context += `\n- Movement Quality: ${quality}%`
      
      if (currentPrediction.exercise_match !== undefined) {
        context += `\n- Exercise Match: ${currentPrediction.exercise_match ? '✅ CORRECT' : '❌ INCORRECT'}`
      }
    }
    
    if (sessionStats) {
      const minutes = Math.floor(sessionStats.duration / 60)
      const seconds = sessionStats.duration % 60
      context += `\n- Reps Completed: ${sessionStats.totalReps}`
      context += `\n- Session Duration: ${minutes}:${seconds.toString().padStart(2, '0')}`
      context += `\n- Average Confidence: ${(sessionStats.averageConfidence * 100).toFixed(1)}%`
    }
    
    context += `

RESPONSE GUIDELINES:
1. **Form Focus**: Always prioritize proper form over quantity. Safety first!
2. **Specific Feedback**: Use the real-time data to give precise, actionable advice
3. **Progressive Guidance**: Suggest improvements based on current performance
4. **Motivation**: Be encouraging but realistic about capabilities
5. **Educational**: Explain the "why" behind your recommendations
6. **Concise**: Keep responses under 150 words unless explaining complex concepts
7. **Friendly**: Use occasional emojis and encouraging language

EXERCISE-SPECIFIC KNOWLEDGE:
- **Bicep Curls**: Focus on elbow position, controlled movement, avoid swinging
- **Push-ups**: Maintain plank position, full range of motion, proper hand placement
- **Squats**: Feet shoulder-width, knees track toes, depth based on ability
- **Lunges**: Step length, knee alignment, upright posture
- **Planks**: Neutral spine, engage core, proper breathing

When confidence is low (<70%): Emphasize form correction
When quality is low (<60%): Suggest modifications or rest
When reps are high (>10): Consider progression or variation
When duration is long (>5 min): Check for fatigue and suggest breaks

Always end with an encouraging note or next step! 💪`
    
    return context
  }

  const sendMessage = async (content: string) => {
    if (!content.trim() || isLoading) return

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: content.trim(),
      timestamp: new Date()
    }

    setMessages(prev => [...prev, userMessage])
    setInputMessage('')
    setIsLoading(true)

    try {
      const response = await fetch('/api/exercise-buddy', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message: content,
          systemPrompt: generateSystemPrompt(),
          conversationHistory: messages.slice(-10) // Last 10 messages for context
        })
      })

      if (!response.ok) {
        throw new Error('Failed to get response')
      }

      const data = await response.json()
      
      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: data.response,
        timestamp: new Date()
      }

      setMessages(prev => [...prev, assistantMessage])
    } catch (error) {
      console.error('Error sending message:', error)
      
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: "Sorry, I'm having trouble connecting right now. Please try again in a moment! 🤖",
        timestamp: new Date()
      }

      setMessages(prev => [...prev, errorMessage])
    } finally {
      setIsLoading(false)
    }
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    sendMessage(inputMessage)
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      sendMessage(inputMessage)
    }
  }

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
  }

  if (!isOpen) {
    return (
      <div className="fixed bottom-4 right-4 z-50">
        <button
          onClick={() => setIsOpen(true)}
          className="bg-blue-600 hover:bg-blue-700 text-white rounded-full p-4 shadow-lg transition-all duration-200 hover:scale-110"
          title="Chat with ExerciseBuddy"
        >
          <Bot size={24} />
        </button>
      </div>
    )
  }

  return (
    <div className="fixed bottom-4 right-4 z-50">
      <div className={`bg-white rounded-lg shadow-xl border border-gray-200 transition-all duration-300 ${
        isMinimized ? 'w-80 h-12' : 'w-96 h-[500px]'
      }`}>
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-600 to-purple-600 text-white p-4 rounded-t-lg flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Bot size={20} />
            <span className="font-semibold">ExerciseBuddy</span>
            {isSessionRunning && (
              <span className="bg-green-500 text-xs px-2 py-1 rounded-full">Live</span>
            )}
          </div>
          <div className="flex items-center space-x-2">
            <button
              onClick={() => setIsMinimized(!isMinimized)}
              className="hover:bg-white/20 p-1 rounded"
            >
              {isMinimized ? <Maximize2 size={16} /> : <Minimize2 size={16} />}
            </button>
            <button
              onClick={() => setIsOpen(false)}
              className="hover:bg-white/20 p-1 rounded"
            >
              <X size={16} />
            </button>
          </div>
        </div>

        {!isMinimized && (
          <>
            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4 h-[380px]">
              {messages.map((message) => (
                <div
                  key={message.id}
                  className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  <div
                    className={`max-w-[80%] rounded-lg px-3 py-2 ${
                      message.role === 'user'
                        ? 'bg-blue-600 text-white'
                        : 'bg-gray-100 text-gray-800'
                    }`}
                  >
                    <div className="flex items-start space-x-2">
                      {message.role === 'assistant' && (
                        <Bot size={16} className="mt-0.5 flex-shrink-0" />
                      )}
                      <div className="flex-1">
                        <div className="whitespace-pre-wrap text-sm">{message.content}</div>
                        <div className={`text-xs mt-1 ${
                          message.role === 'user' ? 'text-blue-100' : 'text-gray-500'
                        }`}>
                          {formatTime(message.timestamp)}
                        </div>
                      </div>
                      {message.role === 'user' && (
                        <User size={16} className="mt-0.5 flex-shrink-0" />
                      )}
                    </div>
                  </div>
                </div>
              ))}
              
              {isLoading && (
                <div className="flex justify-start">
                  <div className="bg-gray-100 rounded-lg px-3 py-2">
                    <div className="flex items-center space-x-2">
                      <Bot size={16} />
                      <Loader2 size={16} className="animate-spin" />
                      <span className="text-sm text-gray-600">ExerciseBuddy is thinking...</span>
                    </div>
                  </div>
                </div>
              )}
              
              <div ref={messagesEndRef} />
            </div>

            {/* Input */}
            <div className="border-t border-gray-200 p-4">
              <form onSubmit={handleSubmit} className="flex space-x-2">
                <input
                  ref={inputRef}
                  type="text"
                  value={inputMessage}
                  onChange={(e) => setInputMessage(e.target.value)}
                  onKeyPress={handleKeyPress}
                  placeholder="Ask about exercise form, get tips, or motivation..."
                  className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  disabled={isLoading}
                />
                <button
                  type="submit"
                  disabled={isLoading || !inputMessage.trim()}
                  className="bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white rounded-lg px-3 py-2 transition-colors"
                >
                  <Send size={16} />
                </button>
              </form>
            </div>
          </>
        )}
      </div>
    </div>
  )
}

export default ExerciseBuddy 