"use client"

import { useState } from "react"
import { resetSupabaseClient, testSupabaseConnection } from "@/lib/supabase-client"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { AlertCircle, CheckCircle, RefreshCw, Wifi, WifiOff } from "lucide-react"

export default function ConnectionTroubleshooter() {
  const [isOpen, setIsOpen] = useState(false)
  const [isOnline, setIsOnline] = useState(typeof navigator !== "undefined" ? navigator.onLine : true)
  const [isLoading, setIsLoading] = useState(false)
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null)
  const [resetComplete, setResetComplete] = useState(false)

  const checkConnection = async () => {
    setIsLoading(true)
    setTestResult(null)
    setResetComplete(false)

    // Check online status first
    setIsOnline(typeof navigator !== "undefined" ? navigator.onLine : true)

    try {
      const result = await testSupabaseConnection()
      setTestResult(result)
    } catch (error) {
      setTestResult({
        success: false,
        message: `Error: ${error instanceof Error ? error.message : String(error)}`,
      })
    } finally {
      setIsLoading(false)
    }
  }

  const resetConnection = () => {
    setIsLoading(true)
    setResetComplete(false)

    try {
      resetSupabaseClient()
      setResetComplete(true)
    } catch (error) {
      console.error("Error resetting connection:", error)
    } finally {
      setIsLoading(false)
    }
  }

  if (!isOpen) {
    return (
      <div className="fixed bottom-4 right-4 z-50">
        <Button variant="outline" size="sm" className="shadow-md bg-white" onClick={() => setIsOpen(true)}>
          <Wifi className="h-4 w-4 mr-2" />
          Connection Help
        </Button>
      </div>
    )
  }

  return (
    <div className="fixed bottom-4 right-4 z-50 max-w-md">
      <Card className="shadow-lg">
        <CardHeader className="pb-2">
          <CardTitle className="text-lg flex items-center">
            {isOnline ? (
              <Wifi className="h-4 w-4 mr-2 text-green-500" />
            ) : (
              <WifiOff className="h-4 w-4 mr-2 text-red-500" />
            )}
            Connection Troubleshooter
          </CardTitle>
          <CardDescription>Use this tool to diagnose and fix connection issues</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="text-sm">
            <div className="font-medium mb-1">Network Status:</div>
            <div className={`flex items-center ${isOnline ? "text-green-600" : "text-red-600"}`}>
              {isOnline ? (
                <>
                  <CheckCircle className="h-4 w-4 mr-1.5" />
                  Your device is online
                </>
              ) : (
                <>
                  <AlertCircle className="h-4 w-4 mr-1.5" />
                  Your device is offline. Please check your internet connection.
                </>
              )}
            </div>
          </div>

          {testResult && (
            <Alert variant={testResult.success ? "default" : "destructive"}>
              {testResult.success ? <CheckCircle className="h-4 w-4" /> : <AlertCircle className="h-4 w-4" />}
              <AlertTitle>{testResult.success ? "Connection Successful" : "Connection Failed"}</AlertTitle>
              <AlertDescription>{testResult.message}</AlertDescription>
            </Alert>
          )}

          {resetComplete && (
            <Alert>
              <CheckCircle className="h-4 w-4" />
              <AlertTitle>Connection Reset</AlertTitle>
              <AlertDescription>
                The connection has been reset. Please refresh the page to apply changes.
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
        <CardFooter className="flex justify-between">
          <Button variant="outline" onClick={() => setIsOpen(false)}>
            Close
          </Button>
          <div className="space-x-2">
            <Button variant="outline" onClick={checkConnection} disabled={isLoading}>
              {isLoading ? <RefreshCw className="h-4 w-4 mr-2 animate-spin" /> : <RefreshCw className="h-4 w-4 mr-2" />}
              Test Connection
            </Button>
            <Button variant="secondary" onClick={resetConnection} disabled={isLoading}>
              Reset Connection
            </Button>
          </div>
        </CardFooter>
      </Card>
    </div>
  )
}
