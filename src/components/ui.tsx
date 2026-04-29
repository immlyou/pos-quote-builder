'use client'

import { cn } from '@/lib/utils'
import React from 'react'

// Button
interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger'
  size?: 'sm' | 'md'
}
export function Button({ variant = 'primary', size = 'md', className, children, ...props }: ButtonProps) {
  return (
    <button
      {...props}
      className={cn(
        'inline-flex items-center justify-center gap-1.5 font-medium rounded transition-colors focus:outline-none disabled:opacity-50 disabled:cursor-not-allowed',
        size === 'sm' ? 'px-2.5 py-1 text-xs' : 'px-3 py-1.5 text-sm',
        variant === 'primary' && 'bg-brand-600 text-white hover:bg-brand-700',
        variant === 'secondary' && 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50',
        variant === 'ghost' && 'text-gray-600 hover:bg-gray-100',
        variant === 'danger' && 'bg-red-600 text-white hover:bg-red-700',
        className
      )}
    >
      {children}
    </button>
  )
}

// Card
export function Card({ className, children, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={cn('bg-white border border-gray-200 rounded-lg', className)} {...props}>
      {children}
    </div>
  )
}

export function CardHeader({ className, children, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={cn('px-4 py-3 border-b border-gray-100 flex items-center gap-2', className)} {...props}>
      {children}
    </div>
  )
}

export function CardBody({ className, children, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={cn('p-4', className)} {...props}>
      {children}
    </div>
  )
}

// Badge
interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: 'blue' | 'green' | 'yellow' | 'gray' | 'red'
}
export function Badge({ variant = 'gray', className, children, ...props }: BadgeProps) {
  return (
    <span
      {...props}
      className={cn(
        'inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium',
        variant === 'blue' && 'bg-blue-100 text-blue-700',
        variant === 'green' && 'bg-green-100 text-green-700',
        variant === 'yellow' && 'bg-yellow-100 text-yellow-700',
        variant === 'gray' && 'bg-gray-100 text-gray-600',
        variant === 'red' && 'bg-red-100 text-red-700',
        className
      )}
    >
      {children}
    </span>
  )
}

// Input
export const Input = React.forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement>>(
  ({ className, ...props }, ref) => (
    <input
      ref={ref}
      className={cn(
        'block w-full rounded border border-gray-300 px-2.5 py-1.5 text-sm bg-white focus:outline-none focus:ring-1 focus:ring-brand-500 focus:border-brand-500 disabled:bg-gray-50 disabled:cursor-not-allowed',
        className
      )}
      {...props}
    />
  )
)
Input.displayName = 'Input'

// Textarea
export const Textarea = React.forwardRef<HTMLTextAreaElement, React.TextareaHTMLAttributes<HTMLTextAreaElement>>(
  ({ className, ...props }, ref) => (
    <textarea
      ref={ref}
      className={cn(
        'block w-full rounded border border-gray-300 px-2.5 py-1.5 text-sm bg-white focus:outline-none focus:ring-1 focus:ring-brand-500 focus:border-brand-500',
        className
      )}
      {...props}
    />
  )
)
Textarea.displayName = 'Textarea'

// Select
export const Select = React.forwardRef<HTMLSelectElement, React.SelectHTMLAttributes<HTMLSelectElement>>(
  ({ className, ...props }, ref) => (
    <select
      ref={ref}
      className={cn(
        'block w-full rounded border border-gray-300 px-2.5 py-1.5 text-sm bg-white focus:outline-none focus:ring-1 focus:ring-brand-500 focus:border-brand-500',
        className
      )}
      {...props}
    />
  )
)
Select.displayName = 'Select'

// Label
export function Label({ className, children, ...props }: React.LabelHTMLAttributes<HTMLLabelElement>) {
  return (
    <label className={cn('text-xs font-medium text-gray-600', className)} {...props}>
      {children}
    </label>
  )
}

// Dialog
interface DialogProps {
  open: boolean
  onClose: () => void
  title: string
  children: React.ReactNode
}
export function Dialog({ open, onClose, title, children }: DialogProps) {
  if (!open) return null
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative bg-white rounded-lg shadow-xl w-full max-w-md mx-4 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
          <h2 className="font-semibold text-gray-900">{title}</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-lg leading-none">✕</button>
        </div>
        <div className="p-4">{children}</div>
      </div>
    </div>
  )
}

// Section wrapper with collapsible support
interface SectionProps {
  title: string
  badge?: string | number
  defaultOpen?: boolean
  children: React.ReactNode
  className?: string
}
export function Section({ title, badge, defaultOpen = true, children, className }: SectionProps) {
  const [open, setOpen] = React.useState(defaultOpen)
  return (
    <div className={cn('border border-gray-200 rounded-lg bg-white', className)}>
      <button
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center gap-2 px-4 py-3 text-left hover:bg-gray-50 transition-colors"
      >
        <span className={cn('text-gray-400 text-xs transition-transform', open ? 'rotate-90' : '')}>▶</span>
        <span className="font-semibold text-gray-800">{title}</span>
        {badge !== undefined && badge !== 0 && (
          <Badge variant="blue" className="ml-1">{badge}</Badge>
        )}
      </button>
      {open && <div className="border-t border-gray-100">{children}</div>}
    </div>
  )
}

// QtyInput — text-based with thousands separator on display
interface QtyInputProps {
  value: number
  onChange: (v: number) => void
  min?: number
  max?: number
  className?: string
}
export function QtyInput({ value, onChange, min = 0, max = 99999, className }: QtyInputProps) {
  const [draft, setDraft] = React.useState<string | null>(null)
  const display = draft !== null ? draft : value.toLocaleString('en-US')
  const parse = (s: string) => {
    const clean = s.replace(/[^\d-]/g, '')
    return clean === '' || clean === '-' ? 0 : parseInt(clean, 10) || 0
  }
  const commit = (s: string) => {
    const n = Math.max(min, Math.min(max, parse(s)))
    onChange(n)
    setDraft(null)
  }
  return (
    <div className={cn('flex items-center gap-0', className)}>
      <button
        onClick={() => onChange(Math.max(min, value - 1))}
        className="w-6 h-6 flex items-center justify-center border border-gray-300 rounded-l text-gray-500 hover:bg-gray-50 text-xs"
      >−</button>
      <input
        type="text"
        inputMode="numeric"
        value={display}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={(e) => commit(e.target.value)}
        onKeyDown={(e) => e.key === 'Enter' && (e.target as HTMLInputElement).blur()}
        className={cn(
          'h-6 text-center border-t border-b border-gray-300 text-xs focus:outline-none px-1 bg-white',
          value >= 1000 ? 'w-16' : 'w-12'
        )}
      />
      <button
        onClick={() => onChange(Math.min(max, value + 1))}
        className="w-6 h-6 flex items-center justify-center border border-gray-300 rounded-r text-gray-500 hover:bg-gray-50 text-xs"
      >+</button>
    </div>
  )
}
