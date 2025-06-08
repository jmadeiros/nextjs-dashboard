import { createClient as createSupabaseClient } from "@supabase/supabase-js"
import type { Database } from "@/types/supabase"

// Hardcoded credentials to use as fallback
const HARDCODED_SUPABASE_URL = "https://opulkiaxqlfpockirwyu.supabase.co"
const HARDCODED_SUPABASE_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9wdWxraWF4cWxmcG9ja2lyd3l1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDUyMzI2NzMsImV4cCI6MjA2MDgwODY3M30.v6b96kbgpQru8Yl97T1snW-gR-drTczKXXNhPZDLq1g"

// Use environment variables if available, otherwise use hardcoded values
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || HARDCODED_SUPABASE_URL
const SUPABASE_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || HARDCODED_SUPABASE_KEY

// Export the createClient function as expected by the deployment
export const createClient = () => {
  return createSupabaseClient<Database>(SUPABASE_URL, SUPABASE_KEY, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  })
}

// Also export the existing functionality for backward compatibility
export {
  getSupabaseClient,
  testSupabaseConnection,
  resetSupabaseClient,
  getSupabaseCredentials,
} from "@/lib/supabase-client"
