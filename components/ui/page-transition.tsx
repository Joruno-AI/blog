'use client'

import * as React from 'react'
import { cn } from '@/lib/utils'

interface PageTransitionProps {
  children: React.ReactNode
  className?: string
}

/**
 * 页面过渡动画组件
 * 为页面内容添加淡入动画效果
 */
export function PageTransition({ children, className }: PageTransitionProps) {
  return <div className={cn('animate-[fadeInUp_300ms_cubic-bezier(0.4,0,0.2,1)]', className)}>{children}</div>
}

/**
 * 列表项交错动画组件
 * 为列表项添加交错延迟的淡入动画
 */
interface StaggerItemProps {
  children: React.ReactNode
  index: number
  className?: string
  baseDelay?: number
}

export function StaggerItem({ children, index, className, baseDelay = 50 }: StaggerItemProps) {
  return (
    <div
      className={cn('animate-[fadeInUp_300ms_cubic-bezier(0.4,0,0.2,1)]', className)}
      style={{
        animationDelay: `${index * baseDelay}ms`,
        animationFillMode: 'backwards',
      }}
    >
      {children}
    </div>
  )
}
