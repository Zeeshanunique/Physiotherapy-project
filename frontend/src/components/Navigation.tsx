'use client'

import React from 'react'
import { motion } from 'framer-motion'
import { 
  Home, 
  Activity, 
  History, 
  Settings, 
  User, 
  BarChart3,
  Zap,
  TestTube
} from 'lucide-react'

interface NavigationProps {
  currentView: string
  onViewChange: (view: string) => void
}

const Navigation: React.FC<NavigationProps> = ({ currentView, onViewChange }) => {
  const navigationItems = [
    {
      id: 'dashboard',
      label: 'Dashboard',
      icon: Home,
      description: 'Overview and statistics'
    },
    {
      id: 'exercise',
      label: 'Exercise Monitor',
      icon: Activity,
      description: 'Real-time exercise tracking'
    },
    {
      id: 'history',
      label: 'Session History',
      icon: History,
      description: 'View past workouts'
    },
    {
      id: 'test',
      label: 'Backend Test',
      icon: TestTube,
      description: 'API integration testing'
    },
    {
      id: 'analytics',
      label: 'Analytics',
      icon: BarChart3,
      description: 'Progress analysis'
    },
    {
      id: 'profile',
      label: 'Profile',
      icon: User,
      description: 'User settings'
    }
  ]

  return (
    <nav className="bg-white/90 backdrop-blur-sm border-b border-gray-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex space-x-8 overflow-x-auto scrollbar-hide">
          {navigationItems.map((item) => {
            const Icon = item.icon
            const isActive = currentView === item.id
            
            return (
              <motion.button
                key={item.id}
                onClick={() => onViewChange(item.id)}
                className={`relative flex items-center space-x-2 py-4 px-3 text-sm font-medium transition-all duration-200 whitespace-nowrap ${
                  isActive
                    ? 'text-blue-600 border-b-2 border-blue-600'
                    : 'text-gray-500 hover:text-gray-700 border-b-2 border-transparent hover:border-gray-300'
                }`}
                whileHover={{ y: -2 }}
                whileTap={{ y: 0 }}
              >
                <Icon className={`w-4 h-4 ${isActive ? 'text-blue-600' : 'text-gray-400'}`} />
                <span>{item.label}</span>
                
                {/* Active indicator */}
                {isActive && (
                  <motion.div
                    className="absolute inset-0 bg-blue-50 rounded-lg -z-10"
                    layoutId="activeTab"
                    initial={false}
                    transition={{
                      type: "spring",
                      stiffness: 500,
                      damping: 30
                    }}
                  />
                )}
              </motion.button>
            )
          })}
        </div>
      </div>
      
      {/* Mobile Navigation Hint */}
      <div className="sm:hidden bg-gray-50 px-4 py-2">
        <div className="flex items-center justify-center space-x-2 text-xs text-gray-500">
          <Zap className="w-3 h-3" />
          <span>Swipe to navigate between sections</span>
        </div>
      </div>
    </nav>
  )
}

export default Navigation
