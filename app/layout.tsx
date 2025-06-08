import type React from "react"
import type { Metadata } from "next"
import "./globals.css"
import { SonnerProvider } from "@/components/sonner-provider"
import { ThemeProvider } from "@/components/theme-provider"
import NavBar from "@/components/nav-bar"

export const metadata: Metadata = {
  title: "v0 App",
  description: "Created with v0",
  generator: "v0.dev",
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body>
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          <NavBar />
          {children}
          <SonnerProvider />
        </ThemeProvider>
      </body>
    </html>
  )
}
