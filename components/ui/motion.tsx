'use client'

import { motion, HTMLMotionProps, Variants, AnimatePresence } from 'framer-motion'
import { ReactNode, forwardRef } from 'react'

// Animation Variants
export const fadeIn: Variants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { duration: 0.3 } },
  exit: { opacity: 0, transition: { duration: 0.2 } },
}

export const fadeInUp: Variants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.4, ease: [0.25, 0.46, 0.45, 0.94] } },
  exit: { opacity: 0, y: -10, transition: { duration: 0.2 } },
}

export const fadeInDown: Variants = {
  hidden: { opacity: 0, y: -20 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.4, ease: [0.25, 0.46, 0.45, 0.94] } },
  exit: { opacity: 0, y: 10, transition: { duration: 0.2 } },
}

export const fadeInLeft: Variants = {
  hidden: { opacity: 0, x: -20 },
  visible: { opacity: 1, x: 0, transition: { duration: 0.4, ease: [0.25, 0.46, 0.45, 0.94] } },
  exit: { opacity: 0, x: 20, transition: { duration: 0.2 } },
}

export const fadeInRight: Variants = {
  hidden: { opacity: 0, x: 20 },
  visible: { opacity: 1, x: 0, transition: { duration: 0.4, ease: [0.25, 0.46, 0.45, 0.94] } },
  exit: { opacity: 0, x: -20, transition: { duration: 0.2 } },
}

export const scaleIn: Variants = {
  hidden: { opacity: 0, scale: 0.9 },
  visible: { opacity: 1, scale: 1, transition: { duration: 0.3, ease: [0.25, 0.46, 0.45, 0.94] } },
  exit: { opacity: 0, scale: 0.95, transition: { duration: 0.2 } },
}

export const slideInFromBottom: Variants = {
  hidden: { opacity: 0, y: 50 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.5, ease: [0.25, 0.46, 0.45, 0.94] } },
  exit: { opacity: 0, y: 20, transition: { duration: 0.3 } },
}

export const staggerContainer: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.08,
      delayChildren: 0.1,
    },
  },
}

export const staggerItem: Variants = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.4, ease: [0.25, 0.46, 0.45, 0.94] }
  },
}

export const cardHover = {
  rest: { scale: 1, y: 0, boxShadow: '0 1px 3px rgba(0,0,0,0.1)' },
  hover: {
    scale: 1.02,
    y: -4,
    boxShadow: '0 12px 24px rgba(0,0,0,0.12)',
    transition: { duration: 0.3, ease: 'easeOut' }
  },
}

export const buttonTap = {
  scale: 0.98,
  transition: { duration: 0.1 },
}

export const listItem: Variants = {
  hidden: { opacity: 0, x: -10 },
  visible: (i: number) => ({
    opacity: 1,
    x: 0,
    transition: {
      delay: i * 0.05,
      duration: 0.3,
      ease: [0.25, 0.46, 0.45, 0.94],
    },
  }),
}

// Spring configs
export const springConfig = {
  gentle: { type: 'spring', stiffness: 120, damping: 14 },
  wobbly: { type: 'spring', stiffness: 180, damping: 12 },
  stiff: { type: 'spring', stiffness: 300, damping: 30 },
  slow: { type: 'spring', stiffness: 100, damping: 20 },
} as const

// Motion Components
interface MotionPageProps extends HTMLMotionProps<'div'> {
  children: ReactNode
}

export function MotionPage({ children, ...props }: MotionPageProps) {
  return (
    <motion.div
      initial="hidden"
      animate="visible"
      exit="exit"
      variants={fadeInUp}
      {...props}
    >
      {children}
    </motion.div>
  )
}

interface MotionCardProps extends HTMLMotionProps<'div'> {
  children: ReactNode
  delay?: number
  hover?: boolean
}

export const MotionCard = forwardRef<HTMLDivElement, MotionCardProps>(
  ({ children, delay = 0, hover = true, ...props }, ref) => {
    return (
      <motion.div
        ref={ref}
        initial="hidden"
        animate="visible"
        variants={fadeInUp}
        transition={{ delay }}
        whileHover={hover ? { y: -4, boxShadow: '0 12px 24px rgba(0,0,0,0.12)' } : undefined}
        style={{ transition: 'box-shadow 0.3s ease' }}
        {...props}
      >
        {children}
      </motion.div>
    )
  }
)
MotionCard.displayName = 'MotionCard'

interface MotionListProps extends HTMLMotionProps<'div'> {
  children: ReactNode
}

export function MotionList({ children, ...props }: MotionListProps) {
  return (
    <motion.div
      initial="hidden"
      animate="visible"
      variants={staggerContainer}
      {...props}
    >
      {children}
    </motion.div>
  )
}

interface MotionItemProps extends HTMLMotionProps<'div'> {
  children: ReactNode
}

export function MotionItem({ children, ...props }: MotionItemProps) {
  return (
    <motion.div variants={staggerItem} {...props}>
      {children}
    </motion.div>
  )
}

interface MotionFadeProps extends HTMLMotionProps<'div'> {
  children: ReactNode
  direction?: 'up' | 'down' | 'left' | 'right' | 'none'
  delay?: number
}

export function MotionFade({ children, direction = 'up', delay = 0, ...props }: MotionFadeProps) {
  const variants = {
    up: fadeInUp,
    down: fadeInDown,
    left: fadeInLeft,
    right: fadeInRight,
    none: fadeIn,
  }

  return (
    <motion.div
      initial="hidden"
      animate="visible"
      exit="exit"
      variants={variants[direction]}
      transition={{ delay }}
      {...props}
    >
      {children}
    </motion.div>
  )
}

interface MotionScaleProps extends HTMLMotionProps<'div'> {
  children: ReactNode
  delay?: number
}

export function MotionScale({ children, delay = 0, ...props }: MotionScaleProps) {
  return (
    <motion.div
      initial="hidden"
      animate="visible"
      exit="exit"
      variants={scaleIn}
      transition={{ delay }}
      {...props}
    >
      {children}
    </motion.div>
  )
}

// Number Counter Animation
interface CounterProps {
  value: number
  duration?: number
  className?: string
}

export function Counter({ value, duration = 1, className }: CounterProps) {
  return (
    <motion.span
      className={className}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration }}
      key={value}
    >
      <motion.span
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
      >
        {value}
      </motion.span>
    </motion.span>
  )
}

// Progress Bar Animation
interface AnimatedProgressProps {
  value: number
  className?: string
  barClassName?: string
}

export function AnimatedProgress({ value, className, barClassName }: AnimatedProgressProps) {
  return (
    <div className={className}>
      <motion.div
        className={barClassName}
        initial={{ width: 0 }}
        animate={{ width: `${value}%` }}
        transition={{ duration: 0.8, ease: [0.25, 0.46, 0.45, 0.94] }}
      />
    </div>
  )
}

// Skeleton Pulse Animation
export function SkeletonPulse({ className }: { className?: string }) {
  return (
    <motion.div
      className={className}
      animate={{ opacity: [0.5, 1, 0.5] }}
      transition={{ duration: 1.5, repeat: Infinity, ease: 'easeInOut' }}
    />
  )
}

// Re-export AnimatePresence
export { AnimatePresence, motion }
