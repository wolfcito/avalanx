import '../styles/globals.css'
import '@rainbow-me/rainbowkit/styles.css'
import type { AppProps } from 'next/app'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { WagmiProvider } from 'wagmi'
import { darkTheme, RainbowKitProvider } from '@rainbow-me/rainbowkit'
import { config } from '@/src/wagmi'
import { ThemeProvider } from 'next-themes'
import { useEffect, useState } from 'react'

const client = new QueryClient()

function MyApp({ Component, pageProps }: AppProps) {
  const [mounted, setMounted] = useState(false)
  useEffect(() => {
    setMounted(true)
  }, [])

  if (!mounted) return null

  return (
    <WagmiProvider config={config}>
      <QueryClientProvider client={client}>
        <ThemeProvider attribute="class" defaultTheme="dark">
          <RainbowKitProvider theme={darkTheme()}>
            <Component {...pageProps} />
          </RainbowKitProvider>
        </ThemeProvider>
      </QueryClientProvider>
    </WagmiProvider>
  )
}

export default MyApp
