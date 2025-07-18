'use client'

import React, { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { Activity, Heart, Target, TrendingUp, Users, Zap } from 'lucide-react'
import Dashboard from '@/components/Dashboard'
import ExerciseMonitor from '@/components/ExerciseMonitor'
import SessionHistory from '@/components/SessionHistory'
import BackendTest from '@/components/BackendTest'
import Navigation from '@/components/Navigation'
import { APIService, HealthStatus } from '@/lib/api'

export default function Home() {
  const [currentView, setCurrentView] = useState('dashboard')
  const [backendStatus, setBackendStatus] = useState<'checking' | 'online' | 'offline'>('checking')
  const [systemInfo, setSystemInfo] = useState<HealthStatus | null>(null)

  useEffect(() => {
    checkBackendStatus()
    const interval = setInterval(checkBackendStatus, 30000) // Check every 30 seconds
    return () => clearInterval(interval)
  }, [])

  const checkBackendStatus = async () => {
    try {
      const response = await APIService.checkHealth()
      setBackendStatus('online')
      setSystemInfo(response)
    } catch (error) {
      setBackendStatus('offline')
      setSystemInfo(null)
    }
  }

  const renderCurrentView = () => {
    switch (currentView) {
      case 'dashboard':
        return <Dashboard systemInfo={systemInfo} onViewChange={setCurrentView} />
      case 'exercise':
        return <ExerciseMonitor />
      case 'history':
        return <SessionHistory />
      case 'test':
        return <BackendTest />
      default:
        return <Dashboard systemInfo={systemInfo} onViewChange={setCurrentView} />
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50">
      {/* Header */}
      <header className="bg-white/80 backdrop-blur-sm border-b border-gray-200 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            {/* Logo */}
            <div className="flex items-center space-x-2">
              <div className="w-10 h-10 bg-gradient-to-r from-blue-500 to-indigo-600 rounded-lg flex items-center justify-center">
                <Activity className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-gray-900">PhysioTracker</h1>
                <p className="text-xs text-gray-500">AI Exercise Monitoring</p>
              </div>
            </div>

            {/* Status Indicator */}
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-2">
                <div className={`w-3 h-3 rounded-full ${
                  backendStatus === 'online' ? 'bg-green-500 animate-pulse' : 
                  backendStatus === 'offline' ? 'bg-red-500' : 'bg-yellow-500'
                }`} />
                <span className="text-sm text-gray-600">
                  Backend {backendStatus === 'checking' ? 'Connecting...' : backendStatus}
                </span>
              </div>
              
              {systemInfo && (
                <div className="text-xs text-gray-500">
                  {systemInfo.ml_framework || 'Mock'} Mode
                </div>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Navigation */}
      <Navigation currentView={currentView} onViewChange={setCurrentView} />

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Welcome Banner */}
        {currentView === 'dashboard' && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-8 bg-gradient-to-r from-blue-600 to-indigo-700 rounded-2xl p-8 text-white relative overflow-hidden"
          >
            <div className="absolute inset-0 bg-black/10" />
            <div className="relative z-10">
              <h2 className="text-3xl font-bold mb-2">Welcome to PhysioTracker</h2>
              <p className="text-blue-100 text-lg mb-6">
                AI-powered exercise monitoring for better rehabilitation outcomes
              </p>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="flex items-center space-x-3">
                  <div className="w-12 h-12 bg-white/20 rounded-lg flex items-center justify-center">
                    <Target className="w-6 h-6" />
                  </div>
                  <div>
                    <p className="font-semibold">Real-time Tracking</p>
                    <p className="text-sm text-blue-100">Monitor exercise form and count reps</p>
                  </div>
                </div>
                
                <div className="flex items-center space-x-3">
                  <div className="w-12 h-12 bg-white/20 rounded-lg flex items-center justify-center">
                    <TrendingUp className="w-6 h-6" />
                  </div>
                  <div>
                    <p className="font-semibold">Progress Analytics</p>
                    <p className="text-sm text-blue-100">Track improvements over time</p>
                  </div>
                </div>
                
                <div className="flex items-center space-x-3">
                  <div className="w-12 h-12 bg-white/20 rounded-lg flex items-center justify-center">
                    <Zap className="w-6 h-6" />
                  </div>
                  <div>
                    <p className="font-semibold">AI-Powered</p>
                    <p className="text-sm text-blue-100">Advanced pose detection technology</p>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        )}

        {/* Render Current View */}
        <motion.div
          key={currentView}
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -20 }}
          transition={{ duration: 0.3 }}
        >
          {renderCurrentView()}
        </motion.div>
      </main>

      {/* Footer */}
      <footer className="bg-gray-50 border-t border-gray-200 mt-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="flex flex-col md:flex-row justify-between items-center">
            <div className="flex items-center space-x-2 mb-4 md:mb-0">
              <Activity className="w-5 h-5 text-blue-600" />
              <span className="text-gray-600">© 2024 PhysioTracker. Powered by AI.</span>
            </div>
            
            <div className="flex items-center space-x-6 text-sm text-gray-500">
              <span>Backend Status: {backendStatus}</span>
              {systemInfo && (
                <>
                  <span>•</span>
                  <span>Exercises: {systemInfo.available_exercises?.length || 0}</span>
                  <span>•</span>
                  <span>ML Framework: {systemInfo.ml_framework || 'Mock'}</span>
                </>
              )}
            </div>
          </div>
        </div>
      </footer>
    </div>
  )
}
