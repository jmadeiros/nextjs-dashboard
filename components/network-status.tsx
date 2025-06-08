"use client"

import { useEffect, useState } from "react"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Wifi, WifiOff } from "lucide-react"

export default function NetworkStatus() {
  const [isOnline, setIsOnline] = useState(true)
  const [showAlert, setShowAlert] = useState(false)

  useEffect(() => {
    console.log("[NetworkStatus] Component mounted")

    // Set initial state
    setIsOnline(navigator.onLine)
    setShowAlert(!navigator.onLine) // Only show initially if offline

    // Add event listeners
    const handleOnline = () => {
      console.log("[NetworkStatus] Device is online")
      setIsOnline(true)
      setShowAlert(true)
      // Hide the alert after 3 seconds
      setTimeout(() => setShowAlert(false), 3000)
    }

    const handleOffline = () => {
      console.log("[NetworkStatus] Device is offline")
      setIsOnline(false)
      setShowAlert(true)
    }

    window.addEventListener("online", handleOnline)
    window.addEventListener("offline", handleOffline)

    return () => {
      console.log("[NetworkStatus] Component unmounted")
      window.removeEventListener("online", handleOnline)
      window.removeEventListener("offline", handleOffline)
    }
  }, [])

  if (!showAlert) return null

  return (
    <div className="fixed bottom-4 right-4 z-50 max-w-sm">
      <Alert variant={isOnline ? "default" : "destructive"} className="flex items-center">
        {isOnline ? <Wifi className="h-4 w-4 mr-2 text-green-500" /> : <WifiOff className="h-4 w-4 mr-2" />}
        <AlertDescription>{isOnline ? "You are back online" : "You are currently offline"}</AlertDescription>
      </Alert>
    </div>
  )
}
