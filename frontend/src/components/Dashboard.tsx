'use client'

import React, { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { 
  Activity, 
  Heart, 
  Target, 
  TrendingUp, 
  Users, 
  Zap,
  CheckCircle,
  AlertCircle,
  XCircle,
  Clock,
  BarChart3,
  Settings
} from 'lucide-react'
import { APIService, HealthStatus, APIUtils } from '@/lib/api'

interface DashboardProps {
  systemInfo: HealthStatus | null
  onViewChange?: (view: string) => void
}

const Dashboard: React.FC<DashboardProps> = ({ systemInfo, onViewChange }) => {
  const [exercises, setExercises] = useState<string[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [isRetraining, setIsRetraining] = useState(false)
  const [retrainMessage, setRetrainMessage] = useState<string | null>(null)

  useEffect(() => {
    loadExercises()
  }, [])

  const loadExercises = async () => {
    try {
      setIsLoading(true)
      const response = await APIService.getExercises()
      setExercises(response.exercises || [])
      setError(null)
    } catch (err) {
      setError('Failed to load exercises')
      console.error('Error loading exercises:', err)
    } finally {
      setIsLoading(false)
    }
  }

  const retrainModel = async () => {
    try {
      setIsRetraining(true)
      setRetrainMessage(null)
      const response = await APIService.retrainModel()
      setRetrainMessage(`Model retrained successfully! ${response.available_exercises.length} exercises available.`)
      // Reload exercises after retraining
      await loadExercises()
    } catch (err) {
      setRetrainMessage('Failed to retrain model. Please try again.')
      console.error('Error retraining model:', err)
    } finally {
      setIsRetraining(false)
    }
  }

  const getSystemStatusColor = () => {
    if (!systemInfo) return 'text-red-500'
    if (systemInfo.model_loaded && systemInfo.encoder_loaded && 
        (systemInfo.scaler_loaded !== false)) return 'text-green-500'
    return 'text-yellow-500'
  }

  const getSystemStatusIcon = () => {
    if (!systemInfo) return XCircle
    if (systemInfo.model_loaded && systemInfo.encoder_loaded && 
        (systemInfo.scaler_loaded !== false)) return CheckCircle
    return AlertCircle
  }

  const StatusIcon = getSystemStatusIcon()

  return (
    <div className="space-y-6">
      {/* System Status Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* Backend Status */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-white rounded-xl p-6 shadow-sm border border-gray-200"
        >
          <div className="flex items-center space-x-3">
            <StatusIcon className={`w-8 h-8 ${getSystemStatusColor()}`} />
            <div>
              <p className="text-sm font-medium text-gray-900">Backend Status</p>
              <p className="text-xs text-gray-500">
                {systemInfo ? 'Connected' : 'Disconnected'}
              </p>
            </div>
          </div>
        </motion.div>

        {/* ML Framework */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="bg-white rounded-xl p-6 shadow-sm border border-gray-200"
        >
          <div className="flex items-center space-x-3">
            <Zap className="w-8 h-8 text-blue-500" />
            <div>
              <p className="text-sm font-medium text-gray-900">ML Framework</p>
              <p className="text-xs text-gray-500">
                {systemInfo?.ml_framework || 'Unknown'}
                {systemInfo?.opencv_version && ` (OpenCV ${systemInfo.opencv_version})`}
                {systemInfo?.sklearn_version && ` (sklearn ${systemInfo.sklearn_version})`}
                {systemInfo?.ml_version && !systemInfo?.opencv_version && ` v${systemInfo.ml_version}`}
              </p>
            </div>
          </div>
        </motion.div>

        {/* Available Exercises */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="bg-white rounded-xl p-6 shadow-sm border border-gray-200"
        >
          <div className="flex items-center space-x-3">
            <Activity className="w-8 h-8 text-green-500" />
            <div>
              <p className="text-sm font-medium text-gray-900">Exercises</p>
              <p className="text-xs text-gray-500">
                {exercises.length} Available
              </p>
            </div>
          </div>
        </motion.div>

        {/* Session State */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="bg-white rounded-xl p-6 shadow-sm border border-gray-200"
        >
          <div className="flex items-center space-x-3">
            <Target className="w-8 h-8 text-orange-500" />
            <div>
              <p className="text-sm font-medium text-gray-900">Session</p>
              <p className="text-xs text-gray-500">
                {systemInfo?.session_state.rep_count || 0} Reps
              </p>
            </div>
          </div>
        </motion.div>
      </div>

      {/* System Information Details */}
      {systemInfo && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className="bg-white rounded-xl p-6 shadow-sm border border-gray-200"
        >
          <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
            <Settings className="w-5 h-5 mr-2" />
            System Configuration
          </h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <div>
              <p className="text-sm font-medium text-gray-700">Confidence Threshold</p>
              <p className="text-2xl font-bold text-blue-600">
                {(systemInfo.config.confidence_threshold * 100).toFixed(0)}%
              </p>
            </div>
            
            <div>
              <p className="text-sm font-medium text-gray-700">Phase Threshold</p>
              <p className="text-2xl font-bold text-green-600">
                {(systemInfo.config.phase_threshold * 100).toFixed(0)}%
              </p>
            </div>
            
            <div>
              <p className="text-sm font-medium text-gray-700">Debug Mode</p>
              <p className="text-2xl font-bold text-orange-600">
                {systemInfo.config.debug_mode ? 'ON' : 'OFF'}
              </p>
            </div>
          </div>
          
          <div className="mt-4 pt-4 border-t border-gray-200">
            <div className="flex justify-between items-center">
              <p className="text-xs text-gray-500">
                Last updated: {APIUtils.formatTimestamp(systemInfo.timestamp)}
              </p>
              
              {/* Retrain Model Button (only show for OpenCV backend) */}
              {systemInfo.ml_framework === 'opencv-sklearn' && (
                <button
                  onClick={retrainModel}
                  disabled={isRetraining}
                  className="px-3 py-1 text-xs bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  {isRetraining ? 'Retraining...' : 'Retrain Model'}
                </button>
              )}
            </div>
            
            {/* Retrain Message */}
            {retrainMessage && (
              <div className={`mt-2 p-2 rounded text-xs ${
                retrainMessage.includes('successfully') ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
              }`}>
                {retrainMessage}
              </div>
            )}
          </div>
        </motion.div>
      )}

      {/* Available Exercises Grid */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.6 }}
        className="bg-white rounded-xl p-6 shadow-sm border border-gray-200"
      >
        <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
          <Activity className="w-5 h-5 mr-2" />
          Available Exercises ({exercises.length})
        </h3>
        
        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            <span className="ml-2 text-gray-600">Loading exercises...</span>
          </div>
        ) : error ? (
          <div className="flex items-center justify-center py-8 text-red-600">
            <XCircle className="w-5 h-5 mr-2" />
            {error}
          </div>
        ) : exercises.length > 0 ? (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
            {exercises.map((exercise, index) => (
              <motion.div
                key={exercise}
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.1 * index }}
                className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-lg p-3 border border-blue-200 hover:border-blue-300 transition-all duration-200 hover:shadow-md"
              >
                <div className="text-center">
                  <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center mx-auto mb-2">
                    <Activity className="w-4 h-4 text-blue-600" />
                  </div>
                  <p className="text-xs font-medium text-gray-800 text-center">
                    {APIUtils.formatExerciseName(exercise)}
                  </p>
                </div>
              </motion.div>
            ))}
          </div>
        ) : (
          <div className="text-center py-8 text-gray-500">
            No exercises available
          </div>
        )}
      </motion.div>

      {/* Quick Actions */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.7 }}
        className="grid grid-cols-1 md:grid-cols-3 gap-6"
      >
        <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl p-6 text-white">
          <div className="flex items-center space-x-3 mb-4">
            <Activity className="w-8 h-8" />
            <h3 className="text-lg font-semibold">Start Exercise</h3>
          </div>
          <p className="text-blue-100 text-sm mb-4">
            Begin real-time exercise monitoring with AI pose detection
          </p>
          <button 
            onClick={() => onViewChange?.('exercise')}
            className="bg-white/20 hover:bg-white/30 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
          >
            Start Now
          </button>
        </div>

        <div className="bg-gradient-to-br from-green-500 to-green-600 rounded-xl p-6 text-white">
          <div className="flex items-center space-x-3 mb-4">
            <BarChart3 className="w-8 h-8" />
            <h3 className="text-lg font-semibold">View Analytics</h3>
          </div>
          <p className="text-green-100 text-sm mb-4">
            Track your progress and analyze workout performance
          </p>
          <button 
            onClick={() => onViewChange?.('history')}
            className="bg-white/20 hover:bg-white/30 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
          >
            View Stats
          </button>
        </div>

        <div className="bg-gradient-to-br from-purple-500 to-purple-600 rounded-xl p-6 text-white">
          <div className="flex items-center space-x-3 mb-4">
            <Users className="w-8 h-8" />
            <h3 className="text-lg font-semibold">Session History</h3>
          </div>
          <p className="text-purple-100 text-sm mb-4">
            Review past workouts and track improvements
          </p>
          <button 
            onClick={() => onViewChange?.('history')}
            className="bg-white/20 hover:bg-white/30 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
          >
            Browse History
          </button>
        </div>
      </motion.div>
    </div>
  )
}

export default Dashboard
