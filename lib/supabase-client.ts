import { createClient } from "@supabase/supabase-js"
import type { Database } from "@/types/supabase"

// Hardcoded credentials to use as fallback
const HARDCODED_SUPABASE_URL = "https://opulkiaxqlfpockirwyu.supabase.co"
const HARDCODED_SUPABASE_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9wdWxraWF4cWxmcG9ja2lyd3l1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDUyMzI2NzMsImV4cCI6MjA2MDgwODY3M30.v6b96kbgpQru8Yl97T1snW-gR-drTczKXXNhPZDLq1g"

// Use environment variables if available, otherwise use hardcoded values
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || HARDCODED_SUPABASE_URL
const SUPABASE_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || HARDCODED_SUPABASE_KEY

// Global variable to store the client instance
let supabaseInstance: ReturnType<typeof createClient<Database>> | null = null

// Generate a unique ID for this browser session
const generateSessionId = () => {
  return Math.random().toString(36).substring(2, 15)
}

// Create a session ID once per page load
const SESSION_ID = generateSessionId()

export const getSupabaseClient = () => {
  if (typeof window === "undefined") {
    // Server-side: Always create a new instance
    console.log("[Supabase] Creating server-side client")
    return createClient<Database>(SUPABASE_URL, SUPABASE_KEY, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
    })
  }

  // Client-side: Use singleton pattern
  if (!supabaseInstance) {
    try {
      console.log("[Supabase] Creating new client instance")
      console.log(`[Supabase] Using URL: ${SUPABASE_URL.substring(0, 20)}...`)

      // Clear any existing Supabase data from localStorage to prevent conflicts
      Object.keys(localStorage).forEach((key) => {
        if (key.includes("supabase") || key.includes("sb-")) {
          console.log(`[Supabase] Clearing localStorage key: ${key}`)
          localStorage.removeItem(key)
        }
      })

      // Create a new client with unique storage key for this session
      supabaseInstance = createClient<Database>(SUPABASE_URL, SUPABASE_KEY, {
        auth: {
          storageKey: `sb-room-booking-${SESSION_ID}`,
          persistSession: false,
          autoRefreshToken: false,
        },
      })

      console.log("[Supabase] Client successfully initialized")
    } catch (error) {
      console.error("[Supabase] Error creating client:", error)

      // Fallback to basic client with no storage
      console.log("[Supabase] Creating fallback client")
      supabaseInstance = createClient<Database>(SUPABASE_URL, SUPABASE_KEY, {
        auth: {
          persistSession: false,
          autoRefreshToken: false,
        },
      })
    }
  }

  return supabaseInstance
}

// Add a helper function to check if Supabase is working
export const testSupabaseConnection = async () => {
  try {
    const client = getSupabaseClient()
    console.log("[Supabase] Testing connection...")

    const { data, error } = await client.from("rooms").select("id").limit(1)

    if (error) {
      console.error("[Supabase] Connection test failed:", error)
      throw error
    }

    console.log("[Supabase] Connection test successful")
    return { success: true, message: "Connection successful" }
  } catch (error) {
    console.error("[Supabase] Connection test failed:", error)
    return {
      success: false,
      message: `Connection failed: ${error instanceof Error ? error.message : String(error)}`,
    }
  }
}

// Function to reset the Supabase client (useful for troubleshooting)
export const resetSupabaseClient = () => {
  if (typeof window !== "undefined") {
    console.log("[Supabase] Resetting client instance")
    supabaseInstance = null

    // Clear any Supabase-related localStorage items
    Object.keys(localStorage).forEach((key) => {
      if (key.includes("supabase") || key.includes("sb-")) {
        localStorage.removeItem(key)
      }
    })
  }
}

// Function to get the current Supabase URL and key being used
export const getSupabaseCredentials = () => {
  return {
    url: SUPABASE_URL,
    key: SUPABASE_KEY,
    isUsingHardcoded: {
      url: SUPABASE_URL === HARDCODED_SUPABASE_URL,
      key: SUPABASE_KEY === HARDCODED_SUPABASE_KEY,
    },
  }
}
