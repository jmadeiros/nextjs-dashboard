import { useState, useCallback, useRef } from 'react'
import { getSupabaseClient } from '@/lib/supabase-client'
import { toast } from 'sonner'

interface UseSupabaseQueryOptions {
  onSuccess?: (data: any) => void
  onError?: (error: Error) => void
  maxRetries?: number
  retryDelay?: number
}

export function useSupabaseQuery<T = any>(options: UseSupabaseQueryOptions = {}) {
  const [data, setData] = useState<T | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  
  const fetchInProgress = useRef(false)
  const retryCount = useRef(0)
  const { maxRetries = 3, retryDelay = 1000, onSuccess, onError } = options
  
  const supabase = getSupabaseClient()

  const executeQuery = useCallback(async (queryFn: () => Promise<any>, forceRefresh = false) => {
    if (fetchInProgress.current && !forceRefresh) return
    
    setIsLoading(true)
    setError(null)
    fetchInProgress.current = true

    try {
      const result = await queryFn()
      
      if (result.error) {
        // Handle Supabase rate limiting
        if (result.error.message?.includes('Too Many') || result.error.message?.includes('429')) {
          if (retryCount.current < maxRetries) {
            retryCount.current++
            const delay = retryDelay * Math.pow(2, retryCount.current - 1) // Exponential backoff
            
            setError(`Rate limited. Retrying in ${delay / 1000} seconds...`)
            
            setTimeout(() => {
              fetchInProgress.current = false
              executeQuery(queryFn)
            }, delay)
            return
          } else {
            throw new Error('Too many requests. Please wait a moment before trying again.')
          }
        } else {
          throw new Error(result.error.message)
        }
      }

      setData(result.data)
      retryCount.current = 0 // Reset retry count on success
      onSuccess?.(result.data)
      
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : String(err)
      setError(errorMessage)
      onError?.(err instanceof Error ? err : new Error(errorMessage))
      
      toast.error('Database Error', {
        description: errorMessage,
      })
    } finally {
      setIsLoading(false)
      setTimeout(() => {
        fetchInProgress.current = false
      }, 500)
    }
  }, [maxRetries, retryDelay, onSuccess, onError])

  const refetch = useCallback((queryFn: () => Promise<any>) => {
    executeQuery(queryFn, true)
  }, [executeQuery])

  return {
    data,
    isLoading,
    error,
    executeQuery,
    refetch,
    supabase,
  }
} 