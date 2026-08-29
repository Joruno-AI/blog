'use client'

import React, { useMemo } from 'react'
import { motion } from 'framer-motion'
import { cn } from '@/lib/utils'

/**
 * Advanced Background Beams component inspired by high-end UI libraries.
 * Creates a sense of motion and depth.
 */
const BackgroundBeams = () => {
  const beams = useMemo(
    () => [
      { left: '10%', delay: 0, duration: 12 },
      { left: '30%', delay: 2, duration: 10 },
      { left: '50%', delay: 1, duration: 14 },
      { left: '70%', delay: 4, duration: 11 },
      { left: '90%', delay: 3, duration: 13 },
    ],
    []
  )

  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none opacity-20 dark:opacity-40">
      {beams.map((beam, i) => (
        <motion.div
          key={i}
          initial={{ top: '-20%', opacity: 0 }}
          animate={{
            top: '120%',
            opacity: [0, 1, 1, 0],
          }}
          transition={{
            duration: beam.duration,
            repeat: Infinity,
            delay: beam.delay,
            ease: 'linear',
          }}
          style={{ left: beam.left }}
          className="absolute w-[1px] h-[40%] bg-gradient-to-b from-transparent via-blue-500 to-transparent dark:via-purple-500 blur-[1px]"
        />
      ))}
    </div>
  )
}

export function AuthBackground({ children, className }: { children?: React.ReactNode; className?: string }) {
  return (
    <div className={cn('relative min-h-screen w-full flex flex-col items-center justify-center overflow-hidden transition-colors duration-700', 'bg-slate-50 dark:bg-neutral-950', className)}>
      {/* 1. Geometric Base Layer */}
      <div className="absolute inset-0 w-full h-full pointer-events-none">
        {/* Animated Grid - Perspective Feel */}
        <div
          className={cn(
            'absolute inset-0',
            'bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)]',
            'bg-[size:40px_40px] [mask-image:radial-gradient(ellipse_80%_50%_at_50%_0%,#000_70%,transparent_100%)]'
          )}
        />

        {/* Secondary finer grid */}
        <div
          className={cn(
            'absolute inset-0 opacity-50',
            'bg-[linear-gradient(to_right,#80808008_1px,transparent_1px),linear-gradient(to_bottom,#80808008_1px,transparent_1px)]',
            'bg-[size:10px_10px] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_50%,#000_70%,transparent_100%)]'
          )}
        />
      </div>

      {/* 2. Motion Layer - Beams */}
      <BackgroundBeams />

      {/* 3. Ambient Light Layer - Floating Orbs */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {/* Top left blue orb */}
        <motion.div
          animate={{
            scale: [1, 1.2, 1],
            opacity: [0.15, 0.25, 0.15],
            x: [0, 50, 0],
            y: [0, -30, 0],
          }}
          transition={{ duration: 15, repeat: Infinity, ease: 'easeInOut' }}
          className="absolute -top-[10%] -left-[10%] w-[50%] h-[50%] rounded-full bg-blue-400/20 dark:bg-blue-600/10 blur-[120px]"
        />

        {/* Bottom right purple orb */}
        <motion.div
          animate={{
            scale: [1, 1.3, 1],
            opacity: [0.1, 0.2, 0.1],
            x: [0, -80, 0],
            y: [0, 40, 0],
          }}
          transition={{ duration: 20, repeat: Infinity, ease: 'easeInOut', delay: 2 }}
          className="absolute -bottom-[20%] -right-[10%] w-[60%] h-[60%] rounded-full bg-purple-400/20 dark:bg-purple-600/10 blur-[120px]"
        />

        {/* Center subtle glow */}
        <div className="absolute inset-0 bg-transparent bg-[radial-gradient(circle_at_center,rgba(59,130,246,0.05)_0%,transparent_70%)] dark:bg-[radial-gradient(circle_at_center,rgba(139,92,246,0.03)_0%,transparent_70%)]" />
      </div>

      {/* 4. Content Layer */}
      <div className="relative z-10 w-full flex items-center justify-center p-4">{children}</div>

      {/* Bottom decorative line */}
      <div className="absolute bottom-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-neutral-200 dark:via-neutral-800 to-transparent" />
    </div>
  )
}
