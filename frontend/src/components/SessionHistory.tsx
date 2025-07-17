'use client'

import React, { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { 
  History,
  Clock,
  Activity,
  TrendingUp,
  Calendar,
  Filter,
  Download,
  Trash2,
  Eye
} from 'lucide-react'
import { APIService, UserSession, APIUtils } from '@/lib/api'

interface SessionHistoryProps {}

const SessionHistory: React.FC<SessionHistoryProps> = () => {
  const [sessions, setSessions] = useState<UserSession[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [selectedUserId, setSelectedUserId] = useState('demo_user')
  const [filterExercise, setFilterExercise] = useState('')
  const [sortBy, setSortBy] = useState<'date' | 'exercise' | 'reps' | 'duration'>('date')
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc')

  useEffect(() => {
    loadSessions()
  }, [selectedUserId])

  const loadSessions = async () => {
    try {
      setIsLoading(true)
      setError(null)
      
      let response
      if (selectedUserId === 'all') {
        response = await APIService.getAllSessions()
        setSessions(response.sessions || [])
      } else {
        response = await APIService.getUserSessions(selectedUserId)
        setSessions(response.sessions || [])
      }
    } catch (error) {
      console.error('Failed to load sessions:', error)
      setError('Failed to load session history')
    } finally {
      setIsLoading(false)
    }
  }

  const filteredAndSortedSessions = () => {
    let filtered = sessions
    
    // Filter by exercise
    if (filterExercise) {
      filtered = filtered.filter(session => 
        session.exercise.toLowerCase().includes(filterExercise.toLowerCase())
      )
    }
    
    // Sort sessions
    const sorted = [...filtered].sort((a, b) => {
      let aValue: any, bValue: any
      
      switch (sortBy) {
        case 'date':
          aValue = new Date(a.timestamp)
          bValue = new Date(b.timestamp)
          break
        case 'exercise':
          aValue = a.exercise
          bValue = b.exercise
          break
        case 'reps':
          aValue = a.total_reps
          bValue = b.total_reps
          break
        case 'duration':
          aValue = a.duration
          bValue = b.duration
          break
        default:
          return 0
      }
      
      if (sortOrder === 'asc') {
        return aValue > bValue ? 1 : -1
      } else {
        return aValue < bValue ? 1 : -1
      }
    })
    
    return sorted
  }

  const getUniqueExercises = () => {
    const exercises = Array.from(new Set(sessions.map(session => session.exercise)))
    return exercises.sort()
  }

  const calculateStats = () => {
    const filtered = filteredAndSortedSessions()
    
    return {
      totalSessions: filtered.length,
      totalReps: filtered.reduce((sum, session) => sum + session.total_reps, 0),
      totalDuration: filtered.reduce((sum, session) => sum + session.duration, 0),
      averageReps: filtered.length > 0 ? Math.round(filtered.reduce((sum, session) => sum + session.total_reps, 0) / filtered.length) : 0,
      averageDuration: filtered.length > 0 ? Math.round(filtered.reduce((sum, session) => sum + session.duration, 0) / filtered.length) : 0,
      exerciseBreakdown: filtered.reduce((acc: any, session) => {
        acc[session.exercise] = (acc[session.exercise] || 0) + 1
        return acc
      }, {})
    }
  }

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  const exportSessions = () => {
    const filtered = filteredAndSortedSessions()
    const csv = [
      ['Date', 'Exercise', 'Reps', 'Duration (s)', 'User ID'].join(','),
      ...filtered.map(session => [
        new Date(session.timestamp).toLocaleDateString(),
        session.exercise,
        session.total_reps,
        session.duration,
        session.user_id
      ].join(','))
    ].join('\n')
    
    const blob = new Blob([csv], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `physiotherapy-sessions-${new Date().toISOString().split('T')[0]}.csv`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  const stats = calculateStats()
  const displaySessions = filteredAndSortedSessions()

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Session History</h2>
          <p className="text-gray-600">Track your exercise progress over time</p>
        </div>
        
        <div className="mt-4 sm:mt-0 flex items-center space-x-2">
          <button
            onClick={exportSessions}
            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium transition-colors flex items-center space-x-2"
          >
            <Download className="w-4 h-4" />
            <span>Export</span>
          </button>
          
          <button
            onClick={loadSessions}
            disabled={isLoading}
            className="bg-gray-600 hover:bg-gray-700 text-white px-4 py-2 rounded-lg font-medium transition-colors flex items-center space-x-2 disabled:opacity-50"
          >
            <History className="w-4 h-4" />
            <span>Refresh</span>
          </button>
        </div>
      </div>

      {/* Statistics Overview */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white rounded-xl p-6 shadow-sm border border-gray-200"
        >
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
              <History className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">{stats.totalSessions}</p>
              <p className="text-sm text-gray-600">Total Sessions</p>
            </div>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-white rounded-xl p-6 shadow-sm border border-gray-200"
        >
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
              <Activity className="w-5 h-5 text-green-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">{stats.totalReps}</p>
              <p className="text-sm text-gray-600">Total Reps</p>
            </div>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="bg-white rounded-xl p-6 shadow-sm border border-gray-200"
        >
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-orange-100 rounded-lg flex items-center justify-center">
              <Clock className="w-5 h-5 text-orange-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">{formatDuration(stats.totalDuration)}</p>
              <p className="text-sm text-gray-600">Total Duration</p>
            </div>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="bg-white rounded-xl p-6 shadow-sm border border-gray-200"
        >
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
              <TrendingUp className="w-5 h-5 text-purple-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">{stats.averageReps}</p>
              <p className="text-sm text-gray-600">Avg Reps</p>
            </div>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="bg-white rounded-xl p-6 shadow-sm border border-gray-200"
        >
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-red-100 rounded-lg flex items-center justify-center">
              <Calendar className="w-5 h-5 text-red-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">{formatDuration(stats.averageDuration)}</p>
              <p className="text-sm text-gray-600">Avg Duration</p>
            </div>
          </div>
        </motion.div>
      </div>

      {/* Filters and Controls */}
      <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-4 sm:space-y-0">
          <div className="flex flex-col sm:flex-row sm:items-center space-y-2 sm:space-y-0 sm:space-x-4">
            {/* User Filter */}
            <div className="flex items-center space-x-2">
              <Filter className="w-4 h-4 text-gray-500" />
              <select
                value={selectedUserId}
                onChange={(e) => setSelectedUserId(e.target.value)}
                className="px-3 py-1 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="demo_user">Demo User</option>
                <option value="all">All Users</option>
              </select>
            </div>

            {/* Exercise Filter */}
            <div className="flex items-center space-x-2">
              <select
                value={filterExercise}
                onChange={(e) => setFilterExercise(e.target.value)}
                className="px-3 py-1 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="">All Exercises</option>
                {getUniqueExercises().map(exercise => (
                  <option key={exercise} value={exercise}>
                    {APIUtils.formatExerciseName(exercise)}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Sort Controls */}
          <div className="flex items-center space-x-2">
            <span className="text-sm text-gray-600">Sort by:</span>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
              className="px-3 py-1 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="date">Date</option>
              <option value="exercise">Exercise</option>
              <option value="reps">Reps</option>
              <option value="duration">Duration</option>
            </select>
            
            <button
              onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
              className="px-3 py-1 border border-gray-300 rounded-lg text-sm hover:bg-gray-50 transition-colors"
            >
              {sortOrder === 'asc' ? '↑' : '↓'}
            </button>
          </div>
        </div>
      </div>

      {/* Sessions Table */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            <span className="ml-3 text-gray-600">Loading sessions...</span>
          </div>
        ) : error ? (
          <div className="flex items-center justify-center py-12 text-red-600">
            <span>{error}</span>
          </div>
        ) : displaySessions.length === 0 ? (
          <div className="flex items-center justify-center py-12 text-gray-500">
            <div className="text-center">
              <History className="w-12 h-12 mx-auto mb-4 text-gray-300" />
              <p>No sessions found</p>
              <p className="text-sm">Start exercising to see your history here</p>
            </div>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Date
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Exercise
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Reps
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Duration
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    User
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {displaySessions.map((session, index) => (
                  <motion.tr
                    key={`${session.user_id}-${session.timestamp}-${index}`}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.05 }}
                    className="hover:bg-gray-50 transition-colors"
                  >
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {new Date(session.timestamp).toLocaleDateString()}
                      <div className="text-xs text-gray-500">
                        {new Date(session.timestamp).toLocaleTimeString()}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center mr-3">
                          <Activity className="w-4 h-4 text-blue-600" />
                        </div>
                        <span className="text-sm font-medium text-gray-900">
                          {APIUtils.formatExerciseName(session.exercise)}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      <span className="font-semibold">{session.total_reps}</span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {formatDuration(session.duration)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {session.user_id}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium space-x-2">
                      <button className="text-blue-600 hover:text-blue-900 transition-colors">
                        <Eye className="w-4 h-4" />
                      </button>
                      <button className="text-red-600 hover:text-red-900 transition-colors">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  </motion.tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}

export default SessionHistory
