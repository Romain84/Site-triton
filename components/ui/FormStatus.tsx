'use client'

interface FormStatusProps {
  type: 'success' | 'error' | 'warning'
  message: string
  className?: string
}

export function FormStatus({ type, message, className = '' }: FormStatusProps) {
  const variants = {
    success: 'bg-green-50 border-green-200 text-green-800',
    error: 'bg-red-50 border-red-200 text-red-800',
    warning: 'bg-amber-50 border-amber-200 text-amber-800',
  }

  return (
    <div
      role={type === 'error' ? 'alert' : 'status'}
      aria-live={type === 'error' ? 'assertive' : 'polite'}
      className={`p-4 rounded-lg border ${variants[type]} ${className}`}
    >
      {message}
    </div>
  )
}
