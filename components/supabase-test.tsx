"use client"

import { useEffect, useState } from "react"
import { testSupabaseConnection, resetSupabaseClient } from "@/lib/supabase-client"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { CheckCircle, AlertCircle, RefreshCw } from "lucide-react"
import { Button } from "@/components/ui/button"

export default function SupabaseTest() {
  const [status, setStatus] = useState<"loading" | "success" | "error">("loading")
  const [message, setMessage] = useState("")
  const [retryCount, setRetryCount] = useState(0)
  const [isRetrying, setIsRetrying] = useState(false)
  const [browserInfo, setBrowserInfo] = useState<string>("")

  useEffect(() => {
    // Collect browser information for debugging
    if (typeof window !== "undefined") {
      const info = {
        userAgent: navigator.userAgent,
        platform: navigator.platform,
        vendor: navigator.vendor,
        language: navigator.language,
        online: navigator.onLine,
        cookiesEnabled: navigator.cookieEnabled,
        localStorage: typeof localStorage !== "undefined",
        sessionStorage: typeof sessionStorage !== "undefined",
      }
      setBrowserInfo(JSON.stringify(info, null, 2))
    }
  }, [])

  const runConnectionTest = async () => {
    setStatus("loading")
    setMessage("Testing connection to Supabase...")
    setIsRetrying(true)

    try {
      console.log("[SupabaseTest] Running connection test")
      const result = await testSupabaseConnection()

      if (result.success) {
        setStatus("success")
        setMessage(result.message)
      } else {
        setStatus("error")
        setMessage(result.message)
      }
    } catch (error) {
      console.error("[SupabaseTest] Test error:", error)
      setStatus("error")
      setMessage(`Connection test error: ${error instanceof Error ? error.message : String(error)}`)
    } finally {
      setIsRetrying(false)
    }
  }

  const handleReset = async () => {
    setIsRetrying(true)
    try {
      resetSupabaseClient()
      setMessage("Connection reset. Retesting...")
      await runConnectionTest()
    } catch (error) {
      console.error("[SupabaseTest] Reset error:", error)
      setStatus("error")
      setMessage(`Reset error: ${error instanceof Error ? error.message : String(error)}`)
    } finally {
      setIsRetrying(false)
    }
  }

  // Initial connection test with delay to ensure component is mounted
  useEffect(() => {
    console.log("[SupabaseTest] Component mounted")
    const timer = setTimeout(() => {
      runConnectionTest()
    }, 1000)

    return () => {
      console.log("[SupabaseTest] Component unmounted")
      clearTimeout(timer)
    }
  }, [retryCount])

  // Auto-retry on error (max 2 times with increasing delay)
  useEffect(() => {
    if (status === "error" && retryCount < 2 && !isRetrying) {
      const timer = setTimeout(
        () => {
          console.log(`[SupabaseTest] Auto-retrying (${retryCount + 1}/3)`)
          setRetryCount((prev) => prev + 1)
        },
        2000 * (retryCount + 1),
      ) // 2s, 4s

      return () => clearTimeout(timer)
    }
  }, [status, retryCount, isRetrying])

  if (status === "loading") {
    return (
      <div className="p-4 text-center">
        <div className="inline-flex items-center">
          <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
          Testing Supabase connection{retryCount > 0 ? ` (Attempt ${retryCount + 1}/3)` : ""}...
        </div>
      </div>
    )
  }

  return (
    <Alert variant={status === "success" ? "default" : "destructive"} className="mb-4">
      <div className="flex flex-col w-full">
        <div className="flex justify-between items-start">
          <div className="flex-1">
            {status === "success" ? <CheckCircle className="h-4 w-4" /> : <AlertCircle className="h-4 w-4" />}
            <AlertTitle>{status === "success" ? "Connection Successful" : "Connection Failed"}</AlertTitle>
            <AlertDescription>{message}</AlertDescription>
          </div>
          <div className="flex gap-2">
            <Button size="sm" variant="outline" onClick={() => setRetryCount((prev) => prev + 1)} disabled={isRetrying}>
              <RefreshCw className={`h-3 w-3 mr-1 ${isRetrying ? "animate-spin" : ""}`} />
              {isRetrying ? "Testing..." : "Test"}
            </Button>
            {status === "error" && (
              <Button size="sm" variant="outline" onClick={handleReset} disabled={isRetrying}>
                Reset
              </Button>
            )}
          </div>
        </div>

        {status === "error" && (
          <details className="mt-2 text-xs">
            <summary className="cursor-pointer">Browser Information</summary>
            <pre className="mt-2 p-2 bg-black/10 rounded overflow-auto max-h-[200px] whitespace-pre-wrap">
              {browserInfo}
            </pre>
          </details>
        )}
      </div>
    </Alert>
  )
}
