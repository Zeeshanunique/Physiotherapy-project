'use client'

import React, { useState } from 'react'
import { motion } from 'framer-motion'
import { 
  Play, 
  RefreshCw, 
  Activity, 
  CheckCircle2, 
  XCircle,
  AlertTriangle,
  Settings
} from 'lucide-react'
import { APIService, ExercisePrediction, HealthStatus, APIUtils } from '@/lib/api'

interface BackendTestProps {}

const BackendTest: React.FC<BackendTestProps> = () => {
  const [isLoading, setIsLoading] = useState(false)
  const [healthStatus, setHealthStatus] = useState<HealthStatus | null>(null)
  const [testResults, setTestResults] = useState<{
    health: boolean
    exercises: boolean
    prediction: boolean
    session: boolean
    retrain: boolean
  } | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [testLogs, setTestLogs] = useState<string[]>([])

  const addLog = (message: string) => {
    setTestLogs(prev => [...prev, `${new Date().toLocaleTimeString()}: ${message}`])
  }

  const runFullTest = async () => {
    setIsLoading(true)
    setError(null)
    setTestLogs([])
    setTestResults(null)

    const results = {
      health: false,
      exercises: false,
      prediction: false,
      session: false,
      retrain: false
    }

    try {
      addLog('🚀 Starting comprehensive backend test...')

      // Test 1: Health Check
      addLog('1️⃣ Testing health endpoint...')
      try {
        const health = await APIService.checkHealth()
        setHealthStatus(health)
        results.health = true
        addLog(`✅ Health check passed - ML Framework: ${health.ml_framework}`)
      } catch (err) {
        addLog(`❌ Health check failed: ${err}`)
      }

      // Test 2: Get Exercises
      addLog('2️⃣ Testing exercises endpoint...')
      try {
        const exercisesResponse = await APIService.getExercises()
        results.exercises = exercisesResponse.exercises.length > 0
        addLog(`✅ Exercises loaded: ${exercisesResponse.exercises.length} available`)
      } catch (err) {
        addLog(`❌ Exercises test failed: ${err}`)
      }

      // Test 3: Prediction
      addLog('3️⃣ Testing prediction endpoint...')
      try {
        const mockAngles = APIUtils.generateMockJointAngles('squat')
        const prediction = await APIService.predictExercise(mockAngles, 'squat')
        results.prediction = prediction.confidence > 0
        addLog(`✅ Prediction test passed - Exercise: ${prediction.exercise}, Confidence: ${prediction.confidence.toFixed(3)}`)
      } catch (err) {
        addLog(`❌ Prediction test failed: ${err}`)
      }

      // Test 4: Session Management
      addLog('4️⃣ Testing session management...')
      try {
        await APIService.resetSession()
        await APIService.logSession({
          user_id: 'test_user',
          exercise: 'squat',
          total_reps: 5,
          duration: 60
        })
        const sessions = await APIService.getUserSessions('test_user')
        results.session = true
        addLog(`✅ Session management test passed`)
      } catch (err) {
        addLog(`❌ Session test failed: ${err}`)
      }

      // Test 5: Model Retraining (only for OpenCV backend)
      if (healthStatus?.ml_framework === 'opencv-sklearn') {
        addLog('5️⃣ Testing model retraining...')
        try {
          const retrainResponse = await APIService.retrainModel()
          results.retrain = retrainResponse.message.includes('successfully')
          addLog(`✅ Retraining test passed: ${retrainResponse.available_exercises.length} exercises`)
        } catch (err) {
          addLog(`❌ Retraining test failed: ${err}`)
        }
      } else {
        results.retrain = true // Skip for non-OpenCV backends
        addLog('⏭️ Skipping retrain test (not OpenCV backend)')
      }

      setTestResults(results)
      const passedTests = Object.values(results).filter(Boolean).length
      const totalTests = Object.keys(results).length
      addLog(`🎉 Test completed: ${passedTests}/${totalTests} tests passed`)

    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error')
      addLog(`💥 Critical error: ${err}`)
    } finally {
      setIsLoading(false)
    }
  }

  const testSpecificExercise = async (exerciseName: string) => {
    setIsLoading(true)
    try {
      addLog(`🎯 Testing specific exercise: ${exerciseName}`)
      const testResult = await APIService.testExercise(exerciseName)
      addLog(`✅ ${exerciseName} test - Exercise: ${testResult.exercise}, Confidence: ${testResult.confidence.toFixed(3)}, Reps: ${testResult.rep_count}`)
    } catch (err) {
      addLog(`❌ ${exerciseName} test failed: ${err}`)
    } finally {
      setIsLoading(false)
    }
  }

  const getOverallStatus = () => {
    if (!testResults) return 'pending'
    const passedTests = Object.values(testResults).filter(Boolean).length
    const totalTests = Object.keys(testResults).length
    if (passedTests === totalTests) return 'success'
    if (passedTests > totalTests / 2) return 'warning'
    return 'error'
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'success': return 'text-green-600 bg-green-100'
      case 'warning': return 'text-yellow-600 bg-yellow-100'
      case 'error': return 'text-red-600 bg-red-100'
      default: return 'text-gray-600 bg-gray-100'
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'success': return CheckCircle2
      case 'warning': return AlertTriangle
      case 'error': return XCircle
      default: return Settings
    }
  }

  const exercisesToTest = ['squat', 'push_up', 'bicep_curl', 'high_knees', 'wall_sits']

  return (
    <div className="space-y-6">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-white rounded-xl p-6 shadow-sm border border-gray-200"
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <Settings className="w-8 h-8 text-blue-600" />
            <div>
              <h2 className="text-xl font-bold text-gray-900">Backend Integration Test</h2>
              <p className="text-sm text-gray-600">Comprehensive testing of all API endpoints</p>
            </div>
          </div>
          
          <button
            onClick={runFullTest}
            disabled={isLoading}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
          >
            {isLoading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4" />}
            <span>{isLoading ? 'Testing...' : 'Run Full Test'}</span>
          </button>
        </div>
      </motion.div>

      {/* Test Results Summary */}
      {testResults && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white rounded-xl p-6 shadow-sm border border-gray-200"
        >
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Test Results</h3>
          
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            {Object.entries(testResults).map(([test, passed]) => {
              const StatusIcon = passed ? CheckCircle2 : XCircle
              return (
                <div key={test} className="text-center">
                  <StatusIcon className={`w-8 h-8 mx-auto mb-2 ${passed ? 'text-green-600' : 'text-red-600'}`} />
                  <p className="text-sm font-medium text-gray-900 capitalize">{test}</p>
                  <p className={`text-xs ${passed ? 'text-green-600' : 'text-red-600'}`}>
                    {passed ? 'Passed' : 'Failed'}
                  </p>
                </div>
              )
            })}
          </div>
        </motion.div>
      )}

      {/* Health Status */}
      {healthStatus && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white rounded-xl p-6 shadow-sm border border-gray-200"
        >
          <h3 className="text-lg font-semibold text-gray-900 mb-4">System Health</h3>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <p className="text-sm font-medium text-gray-700">ML Framework</p>
              <p className="text-lg font-bold text-blue-600">{healthStatus.ml_framework}</p>
            </div>
            
            <div>
              <p className="text-sm font-medium text-gray-700">Available Exercises</p>
              <p className="text-lg font-bold text-green-600">{healthStatus.available_exercises.length}</p>
            </div>
            
            <div>
              <p className="text-sm font-medium text-gray-700">Current Reps</p>
              <p className="text-lg font-bold text-orange-600">{healthStatus.session_state.rep_count}</p>
            </div>
          </div>
        </motion.div>
      )}

      {/* Exercise Tests */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-white rounded-xl p-6 shadow-sm border border-gray-200"
      >
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Individual Exercise Tests</h3>
        
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
          {exercisesToTest.map((exercise) => (
            <button
              key={exercise}
              onClick={() => testSpecificExercise(exercise)}
              disabled={isLoading}
              className="p-3 bg-gray-50 rounded-lg hover:bg-gray-100 disabled:opacity-50 text-center"
            >
              <Activity className="w-5 h-5 mx-auto mb-1 text-blue-600" />
              <p className="text-xs font-medium text-gray-900 capitalize">
                {exercise.replace('_', ' ')}
              </p>
            </button>
          ))}
        </div>
      </motion.div>

      {/* Test Logs */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-white rounded-xl p-6 shadow-sm border border-gray-200"
      >
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Test Logs</h3>
        
        <div className="bg-gray-900 rounded-lg p-4 max-h-96 overflow-y-auto">
          {testLogs.length === 0 ? (
            <p className="text-gray-400 text-sm">No logs yet. Run a test to see output.</p>
          ) : (
            <div className="space-y-1">
              {testLogs.map((log, index) => (
                <p key={index} className="text-green-400 text-sm font-mono">
                  {log}
                </p>
              ))}
            </div>
          )}
        </div>
      </motion.div>

      {/* Error Display */}
      {error && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-red-50 border border-red-200 rounded-xl p-4"
        >
          <div className="flex items-center space-x-2">
            <XCircle className="w-5 h-5 text-red-600" />
            <p className="text-red-800 font-medium">Test Error</p>
          </div>
          <p className="text-red-700 text-sm mt-1">{error}</p>
        </motion.div>
      )}
    </div>
  )
}

export default BackendTest
