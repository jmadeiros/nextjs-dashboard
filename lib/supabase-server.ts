import { createClient } from "@supabase/supabase-js"
import { cookies } from "next/headers"
import type { Database } from "@/types/supabase"

// Hardcoded credentials to use as fallback
const HARDCODED_SUPABASE_URL = "https://opulkiaxqlfpockirwyu.supabase.co"
const HARDCODED_SUPABASE_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9wdWxraWF4cWxmcG9ja2lyd3l1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDUyMzI2NzMsImV4cCI6MjA2MDgwODY3M30.v6b96kbgpQru8Yl97T1snW-gR-drTczKXXNhPZDLq1g"

// Use environment variables if available, otherwise use hardcoded values
const SUPABASE_URL = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || HARDCODED_SUPABASE_URL
const SUPABASE_KEY =
  process.env.SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || HARDCODED_SUPABASE_KEY

export const createServerClient = () => {
  try {
    console.log("[Server] Creating Supabase server client")
    console.log(`[Server] Using URL: ${SUPABASE_URL.substring(0, 20)}...`)

    const cookieStore = cookies()

    // Create a direct client without relying on auth-helpers
    return createClient<Database>(SUPABASE_URL, SUPABASE_KEY, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
      cookies: {
        get(name: string) {
          return cookieStore.get(name)?.value
        },
      },
    })
  } catch (error) {
    console.error("[Server] Error creating server client:", error)

    // Fallback to a basic client if there's an error
    return createClient<Database>(SUPABASE_URL, SUPABASE_KEY, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
    })
  }
}
