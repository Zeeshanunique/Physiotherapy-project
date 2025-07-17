'use client'

import React, { useState } from 'react'
import { APIService } from '@/lib/api'

const ApiTest: React.FC = () => {
  const [result, setResult] = useState<any>(null)
  const [loading, setLoading] = useState(false)

  const testHealth = async () => {
    setLoading(true)
    try {
      const health = await APIService.checkHealth()
      setResult({ test: 'health', data: health })
    } catch (error) {
      setResult({ test: 'health', error: error instanceof Error ? error.message : String(error) })
    }
    setLoading(false)
  }

  const testPredict = async () => {
    setLoading(true)
    try {
      // Test with sample joint angles for push-up
      const angles = [90, 90, 120, 120, 90, 90, 90, 90, 175] // Elbow bent (down position)
      const prediction = await APIService.predictExercise(angles, 'push_up')
      setResult({ test: 'predict', data: prediction })
    } catch (error) {
      setResult({ test: 'predict', error: error instanceof Error ? error.message : String(error) })
    }
    setLoading(false)
  }

  const testReset = async () => {
    setLoading(true)
    try {
      const reset = await APIService.resetSession()
      setResult({ test: 'reset', data: reset })
    } catch (error) {
      setResult({ test: 'reset', error: error instanceof Error ? error.message : String(error) })
    }
    setLoading(false)
  }

  const testMultiplePredictions = async () => {
    setLoading(true)
    try {
      // Reset first
      await APIService.resetSession()
      
      const results: any[] = []
      
      // Simulate push-up sequence: down -> up -> down -> up
      const sequences = [
        { name: 'down1', angles: [90, 90, 120, 120, 90, 90, 90, 90, 175] },
        { name: 'up1', angles: [90, 90, 160, 160, 90, 90, 90, 90, 175] },
        { name: 'down2', angles: [90, 90, 120, 120, 90, 90, 90, 90, 175] },
        { name: 'up2', angles: [90, 90, 160, 160, 90, 90, 90, 90, 175] },
        { name: 'down3', angles: [90, 90, 120, 120, 90, 90, 90, 90, 175] },
      ]
      
      for (const seq of sequences) {
        const prediction = await APIService.predictExercise(seq.angles, 'push_up')
        results.push({ sequence: seq.name, ...prediction })
        // Small delay between predictions
        await new Promise(resolve => setTimeout(resolve, 100))
      }
      
      setResult({ test: 'multiple_predictions', data: results })
    } catch (error) {
      setResult({ test: 'multiple_predictions', error: error instanceof Error ? error.message : String(error) })
    }
    setLoading(false)
  }

  const testSessionLogging = async () => {
    setLoading(true)
    try {
      // Test logging a sample session
      const sessionData = {
        user_id: 'test_user',
        exercise: 'push_up',
        total_reps: 5,
        duration: 30,
        session_data: [
          { exercise: 'push_up', confidence: 0.8, phase: 'up', rep_count: 1 },
          { exercise: 'push_up', confidence: 0.9, phase: 'down', rep_count: 1 },
          { exercise: 'push_up', confidence: 0.85, phase: 'up', rep_count: 2 },
        ]
      }
      
      const logResult = await APIService.logSession(sessionData)
      
      // Then get sessions to verify it was logged
      const sessions = await APIService.getUserSessions('test_user')
      
      setResult({ 
        test: 'session_logging', 
        data: { 
          log_result: logResult, 
          sessions: sessions 
        } 
      })
    } catch (error) {
      setResult({ test: 'session_logging', error: error instanceof Error ? error.message : String(error) })
    }
    setLoading(false)
  }

  return (
    <div className="p-4 bg-gray-100 rounded-lg">
      <h3 className="text-lg font-bold mb-4">API Test Panel</h3>
      
      <div className="space-x-2 mb-4">
        <button 
          onClick={testHealth}
          disabled={loading}
          className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:opacity-50"
        >
          Test Health
        </button>
        <button 
          onClick={testReset}
          disabled={loading}
          className="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600 disabled:opacity-50"
        >
          Test Reset
        </button>
        <button 
          onClick={testPredict}
          disabled={loading}
          className="px-4 py-2 bg-purple-500 text-white rounded hover:bg-purple-600 disabled:opacity-50"
        >
          Test Predict
        </button>
        <button 
          onClick={testMultiplePredictions}
          disabled={loading}
          className="px-4 py-2 bg-orange-500 text-white rounded hover:bg-orange-600 disabled:opacity-50"
        >
          Test Rep Counting
        </button>
        <button 
          onClick={testSessionLogging}
          disabled={loading}
          className="px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600 disabled:opacity-50"
        >
          Test Session Logging
        </button>
      </div>

      {loading && <p>Loading...</p>}
      
      {result && (
        <div className="mt-4 p-3 bg-white rounded border">
          <h4 className="font-semibold">Test: {result.test}</h4>
          {result.error ? (
            <div className="text-red-600">Error: {result.error}</div>
          ) : (
            <pre className="text-sm overflow-auto">
              {JSON.stringify(result.data, null, 2)}
            </pre>
          )}
        </div>
      )}
    </div>
  )
}

export default ApiTest
