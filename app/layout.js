import './globals.css'
import Providers from './providers'

// Force dynamic rendering for all pages since the Providers component
// uses WagmiProvider/RainbowKitProvider which require runtime environment variables
export const dynamic = 'force-dynamic';

export const metadata = {
  title: 'Linkyboss - Find Your Founder Voice',
  description: 'Answer 16 questions. Get your voice profile. Start creating LinkedIn content that sounds like you.',
}

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet" />
      </head>
      <body><Providers>{children}</Providers></body>
    </html>
  )
}
