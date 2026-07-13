'use client'

import { useState, useCallback, createContext, useContext, ReactNode } from 'react'

interface ConfirmDialogOptions {
  title?: string
  message: string
  confirmText?: string
  cancelText?: string
  variant?: 'danger' | 'warning' | 'info'
}

interface ConfirmDialogContextType {
  confirm: (options: ConfirmDialogOptions) => Promise<boolean>
}

const ConfirmDialogContext = createContext<ConfirmDialogContextType | null>(null)

export function useConfirmDialog() {
  const context = useContext(ConfirmDialogContext)
  if (!context) {
    throw new Error('useConfirmDialog must be used within a ConfirmDialogProvider')
  }
  return context
}

interface ConfirmDialogProviderProps {
  children: ReactNode
}

export function ConfirmDialogProvider({ children }: ConfirmDialogProviderProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [options, setOptions] = useState<ConfirmDialogOptions | null>(null)
  const [resolveRef, setResolveRef] = useState<((value: boolean) => void) | null>(null)

  const confirm = useCallback((opts: ConfirmDialogOptions): Promise<boolean> => {
    return new Promise((resolve) => {
      setOptions(opts)
      setResolveRef(() => resolve)
      setIsOpen(true)
    })
  }, [])

  const handleConfirm = () => {
    setIsOpen(false)
    resolveRef?.(true)
  }

  const handleCancel = () => {
    setIsOpen(false)
    resolveRef?.(false)
  }

  const variantStyles = {
    danger: {
      icon: '🗑️',
      buttonClass: 'bg-red-600 hover:bg-red-700',
    },
    warning: {
      icon: '⚠️',
      buttonClass: 'bg-yellow-600 hover:bg-yellow-700',
    },
    info: {
      icon: 'ℹ️',
      buttonClass: 'bg-primary hover:bg-primary-dark',
    },
  }

  const variant = options?.variant || 'danger'
  const styles = variantStyles[variant]

  return (
    <ConfirmDialogContext.Provider value={{ confirm }}>
      {children}

      {isOpen && options && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[100] p-4">
          <div className="bg-white rounded-lg max-w-md w-full shadow-xl">
            <div className="p-6">
              <div className="flex items-start gap-4">
                <div className="text-3xl">{styles.icon}</div>
                <div className="flex-1">
                  <h3 className="text-lg font-bold text-gray-900 mb-2">
                    {options.title || 'Confirmation'}
                  </h3>
                  <p className="text-gray-600">{options.message}</p>
                </div>
              </div>
            </div>

            <div className="flex gap-3 p-4 bg-gray-50 rounded-b-lg">
              <button
                onClick={handleCancel}
                className="flex-1 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-100 font-medium"
              >
                {options.cancelText || 'Annuler'}
              </button>
              <button
                onClick={handleConfirm}
                className={`flex-1 px-4 py-2 text-white rounded-lg font-medium ${styles.buttonClass}`}
              >
                {options.confirmText || 'Confirmer'}
              </button>
            </div>
          </div>
        </div>
      )}
    </ConfirmDialogContext.Provider>
  )
}
