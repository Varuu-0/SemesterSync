'use client'
import { AppContextProvider } from '@/context/AppContext'
import { ThemeProvider } from '@/context/ThemeContext'

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider>
      <AppContextProvider>{children}</AppContextProvider>
    </ThemeProvider>
  )
}
