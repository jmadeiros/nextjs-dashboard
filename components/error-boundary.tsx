"use client"

import type React from "react"

import { useEffect, useState } from "react"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { AlertCircle } from "lucide-react"

export default function ErrorBoundary({ children }: { children: React.ReactNode }) {
  const [hasError, setHasError] = useState(false)
  const [error, setError] = useState<Error | null>(null)

  useEffect(() => {
    const handleError = (event: ErrorEvent) => {
      console.error("Global error caught:", event.error)
      setError(event.error)
      setHasError(true)
      event.preventDefault()
    }

    const handleUnhandledRejection = (event: PromiseRejectionEvent) => {
      console.error("Unhandled promise rejection:", event.reason)
      setError(event.reason instanceof Error ? event.reason : new Error(String(event.reason)))
      setHasError(true)
      event.preventDefault()
    }

    window.addEventListener("error", handleError)
    window.addEventListener("unhandledrejection", handleUnhandledRejection)

    return () => {
      window.removeEventListener("error", handleError)
      window.removeEventListener("unhandledrejection", handleUnhandledRejection)
    }
  }, [])

  if (hasError) {
    return (
      <div className="container mx-auto px-4 py-8">
        <Alert variant="destructive" className="mb-4">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Application Error</AlertTitle>
          <AlertDescription>
            <div>Something went wrong with the application.</div>
            {error && (
              <details className="mt-2 text-xs">
                <summary className="cursor-pointer">Technical Details</summary>
                <pre className="mt-2 p-2 bg-black/10 rounded overflow-auto max-h-[200px]">
                  {error.message}
                  {error.stack && `\n\n${error.stack}`}
                </pre>
              </details>
            )}
          </AlertDescription>
        </Alert>
      </div>
    )
  }

  return <>{children}</>
}
