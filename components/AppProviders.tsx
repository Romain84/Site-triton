'use client'

import { ReactNode, useState } from 'react'
import { CartProvider } from '@/context/CartContext'
import { PublicSettingsProvider } from '@/context/PublicSettingsContext'
import ToastProvider from '@/components/ToastProvider'
import CartDrawer from '@/components/cart/CartDrawer'
import { ConfirmDialogProvider } from '@/components/ConfirmDialog'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'

export default function AppProviders({ children }: { children: ReactNode }) {
  const [queryClient] = useState(() => new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 60 * 1000, // 1 minute
        refetchOnWindowFocus: false,
      },
    },
  }))

  return (
    <QueryClientProvider client={queryClient}>
      <PublicSettingsProvider>
        <CartProvider>
          <ConfirmDialogProvider>
            {children}
            <CartDrawer />
            <ToastProvider />
          </ConfirmDialogProvider>
        </CartProvider>
      </PublicSettingsProvider>
    </QueryClientProvider>
  )
}

