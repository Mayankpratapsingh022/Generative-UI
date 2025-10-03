"use client"

import { cn } from "@/lib/utils"
import { LucideIcon } from "lucide-react"

interface SidebarItemProps {
  icon: LucideIcon
  label: string
  active?: boolean
  isCollapsed: boolean
  href?: string
  onClick?: () => void
}

const SidebarItem: React.FC<SidebarItemProps> = ({
  icon: Icon,
  label,
  active = false,
  isCollapsed,
  href = '#',
  onClick,
}) => {
  const content = (
    <div
      className={cn(
        'group flex items-center rounded-lg px-3 py-2 text-sm transition-all duration-200',
        active
          ? 'bg-neutral-800 text-white'
          : 'text-neutral-400 hover:bg-neutral-800 hover:text-white',
        isCollapsed ? 'justify-center' : 'justify-start'
      )}
      onClick={onClick}
    >
      <Icon
        className={cn(
          'size-4 flex-shrink-0 transition-colors',
          active ? 'text-white' : 'text-neutral-400 group-hover:text-white',
          isCollapsed ? 'mx-0' : 'mr-3'
        )}
      />
      <span
        className={cn(
          'font-medium transition-all duration-200',
          isCollapsed && 'hidden opacity-0'
        )}
      >
        {label}
      </span>
    </div>
  )

  if (href && href !== '#') {
    return (
      <a href={href} className="block">
        {content}
      </a>
    )
  }

  return content
}

export default SidebarItem
