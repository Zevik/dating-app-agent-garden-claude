import type { Metadata } from 'next'
import { Inter, Heebo } from 'next/font/google'
import './globals.css'

const inter = Inter({ subsets: ['latin'], variable: '--font-inter' })
const heebo = Heebo({ subsets: ['hebrew'], variable: '--font-heebo' })

export const metadata: Metadata = {
  title: 'אפליקציית היכרויות - מופעל על ידי AI',
  description: 'אפליקציית היכרויות מבוססת צ\'אט עם בינה מלאכותית',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="he" dir="rtl" className={`${inter.variable} ${heebo.variable}`}>
      <body className="font-sans antialiased">
        {children}
      </body>
    </html>
  )
}
