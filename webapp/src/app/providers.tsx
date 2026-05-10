'use client'
import { AppContextProvider } from '@/context/AppContext'
import { ThemeProvider } from '@/context/ThemeContext'
import { Toaster } from 'sonner'

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider>
      <AppContextProvider>{children}</AppContextProvider>
      <Toaster
        position="bottom-right"
        toastOptions={{
          style: {
            background: 'rgba(15, 15, 20, 0.9)',
            border: '1px solid rgba(255,255,255,0.1)',
            color: 'white',
            backdropFilter: 'blur(12px)',
          },
        }}
      />
    </ThemeProvider>
  )
}
