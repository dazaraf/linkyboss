import './globals.css'
import Providers from './providers'
import { Inter } from 'next/font/google'

const inter = Inter({
  subsets: ['latin'],
  weight: ['400', '600', '700', '800'],
})

// Force dynamic rendering for all pages since the Providers component
// uses WagmiProvider/RainbowKitProvider which require runtime environment variables
export const dynamic = 'force-dynamic';

export const metadata = {
  title: 'linkyboss — Find your LinkedIn voice',
  description: 'Stop posting into the void. Answer 8 questions and get a voice profile that makes your LinkedIn content sound like you.',
}

export default function RootLayout({ children }) {
  return (
    <html lang="en" className={inter.className}>
      <body><Providers>{children}</Providers></body>
    </html>
  )
}
