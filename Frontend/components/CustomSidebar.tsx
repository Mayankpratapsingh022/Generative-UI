"use client"

import { ChevronLeft, Home, History, Settings, Plus, Bot, Sparkles, User, LogOut } from 'lucide-react'
import React, { useState } from 'react'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'
import SidebarItem from './ui/sidebar-item'
import { useUser, useClerk } from '@clerk/nextjs'

interface CustomSidebarProps {
  className?: string
}

const CustomSidebar: React.FC<CustomSidebarProps> = ({ className }) => {
  const [isCollapsed, setIsCollapsed] = useState(false)
  const pathname = usePathname()
  const { user } = useUser()
  const { openUserProfile } = useClerk()

  const toggleSidebar = () => {
    setIsCollapsed((prev) => !prev)
  }

  const handleManageAccount = () => {
    openUserProfile()
  }

  const menuItems = [
    { icon: Home, label: 'Home', active: pathname === '/', href: '/' },
    // { icon: Bot, label: 'Builder', active: pathname === '/use', href: '/use' },
    // { icon: History, label: 'History', active: pathname === '/use', href: '/use' },
    // { icon: Settings, label: 'Settings', active: pathname === '/use', href: '/use' },
  ]

  const generatedApps = [
    // { icon: Bot, label: 'Todo App', active: false, href: '/app/todo' },
    // { icon: Bot, label: 'Weather Dashboard', active: false, href: '/app/weather' },
    // { icon: Bot, label: 'E-commerce Store', active: false, href: '/app/ecommerce' },
  ]

  const userActions = [
    { icon: Plus, label: 'New App', active: false, href: '/use' },
  ]

  return (
    <aside
      className={cn(
        'flex h-screen flex-col border-r border-neutral-800 bg-neutral-950 transition-all duration-300',
        isCollapsed ? 'w-16' : 'w-64',
        className,
      )}
    >
      {/* Header */}
      <div className="relative px-4 py-4">
        <div className="flex items-center space-x-3">
          <div className="flex aspect-square size-8 items-center justify-center rounded-lg bg-neutral-800 text-white">
            <Sparkles className="size-4" />
          </div>
          <div
            className={cn(
              'flex flex-col transition-all duration-200',
              isCollapsed && 'hidden opacity-0'
            )}
          >
            <span className="text-sm font-semibold text-white">Generative UI</span>
            {/* <span className="text-xs text-neutral-400">AI App Builder</span> */}
          </div>
        </div>
        <button
          onClick={toggleSidebar}
          aria-label="Toggle Sidebar"
          className="absolute top-4 -right-3 cursor-pointer rounded-full border border-neutral-700 bg-neutral-900 p-1.5 text-neutral-400 hover:bg-neutral-800 hover:text-white transition-colors duration-200"
        >
          <ChevronLeft
            className={cn('h-3 w-3 transition-transform duration-200', isCollapsed && 'rotate-180')}
          />
        </button>
      </div>

      {/* Navigation */}
      <nav className="mt-4 flex-1 px-2">
        <div className="space-y-1">
          <div className={cn(
            'px-2 py-1 text-xs font-medium text-neutral-500 uppercase tracking-wider',
            isCollapsed && 'hidden'
          )}>
            Platform
          </div>
          <ul className="space-y-1">
            {menuItems.map((item, idx) => (
              <li key={idx}>
                <SidebarItem {...item} isCollapsed={isCollapsed} />
              </li>
            ))}
          </ul>
        </div>

        {/* Generated Apps Section */}
        <div className="mt-6 space-y-1">
          <div className={cn(
            'px-2 py-1 text-xs font-medium text-neutral-500 uppercase tracking-wider',
            isCollapsed && 'hidden'
          )}>
            Generated Apps
          </div>
          <ul className="space-y-1">
            {generatedApps.map((item, idx) => (
              <li key={idx}>
                <SidebarItem {...item} isCollapsed={isCollapsed} />
              </li>
            ))}
          </ul>
        </div>
      </nav>

      {/* Footer/User Section */}
      <div className="mt-auto border-t border-neutral-800">
        {/* User Actions */}
        <div className="px-2 py-2">
          {userActions.map((item, idx) => (
            <SidebarItem key={idx} {...item} isCollapsed={isCollapsed} />
          ))}
        </div>

        {/* User Profile */}
        <div className="flex cursor-pointer items-center px-4 py-3 transition hover:bg-neutral-800">
          <div className="flex aspect-square size-8 items-center justify-center rounded-full bg-neutral-800 text-white text-sm font-medium">
            {user?.firstName?.charAt(0) || user?.emailAddresses[0]?.emailAddress?.charAt(0) || 'U'}
          </div>
          <div
            className={cn(
              'ml-3 flex flex-col transition-all duration-200',
              isCollapsed && 'hidden opacity-0',
            )}
          >
            <span className="text-sm font-medium text-white">
              {user?.firstName || user?.emailAddresses[0]?.emailAddress || 'User'}
            </span>
            <span className="text-xs text-neutral-400">Free</span>
          </div>
        </div>

        {/* Account Management Options */}
        <div className="px-2 py-1">
          <button
            onClick={handleManageAccount}
            className={cn(
              'flex w-full items-center space-x-3 rounded-lg px-3 py-2 text-sm text-neutral-300 transition hover:bg-neutral-800 hover:text-white',
              isCollapsed && 'justify-center px-2'
            )}
          >
            <User className="h-4 w-4" />
            {!isCollapsed && <span>Manage Account</span>}
          </button>
        </div>

        {/* Footer */}
        <div className="px-4 py-3">
          <div className={cn(
            'flex items-center justify-between',
            isCollapsed && 'justify-center'
          )}>
            <span
              className={cn(
                'text-xs text-neutral-500 transition-all duration-200',
                isCollapsed && 'hidden opacity-0'
              )}
            >
              © 2025 Generative UI
            </span>
            {/* <div className={cn(
              'flex items-center space-x-1',
              isCollapsed && 'hidden'
            )}>
              <div className="h-2 w-2 rounded-full bg-red-500"></div>
              <span className="text-xs text-neutral-500">1 Issue</span>
            </div> */}
          </div>
        </div>
      </div>
    </aside>
  )
}

export default CustomSidebar
