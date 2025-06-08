import { useState, useEffect, useCallback } from 'react'
import { startOfMonth, endOfMonth, startOfWeek, endOfWeek } from 'date-fns'
import { useSupabaseQuery } from './use-supabase-query'
import type { Database } from '@/types/supabase'

type Booking = Database["public"]["Tables"]["bookings"]["Row"]
type ContractorVisit = Database["public"]["Tables"]["contractor_visits"]["Row"]
type GuestVisit = Database["public"]["Tables"]["guest_visits"]["Row"]
type Room = Database["public"]["Tables"]["rooms"]["Row"]

interface UseDataFetchingOptions {
  currentDate: Date
  view?: 'month' | 'week' | 'day'
  selectedRoom?: string | null
  autoRefresh?: boolean
  refreshInterval?: number
}

export function useDataFetching(options: UseDataFetchingOptions) {
  const { currentDate, view = 'month', selectedRoom, autoRefresh = false, refreshInterval = 30000 } = options
  
  const [bookings, setBookings] = useState<Booking[]>([])
  const [contractorVisits, setContractorVisits] = useState<ContractorVisit[]>([])
  const [guestVisits, setGuestVisits] = useState<GuestVisit[]>([])
  const [rooms, setRooms] = useState<Room[]>([])
  
  const { executeQuery, isLoading, error, supabase } = useSupabaseQuery({
    onSuccess: (data) => {
      console.log('[useDataFetching] Data fetched successfully')
    },
    onError: (error) => {
      console.error('[useDataFetching] Error fetching data:', error)
    }
  })

  // Calculate date range based on view
  const getDateRange = useCallback(() => {
    let startDate: Date, endDate: Date

    switch (view) {
      case 'day':
        startDate = new Date(currentDate)
        startDate.setHours(0, 0, 0, 0)
        endDate = new Date(currentDate)
        endDate.setHours(23, 59, 59, 999)
        break
      case 'week':
        startDate = startOfWeek(currentDate, { weekStartsOn: 1 })
        endDate = endOfWeek(currentDate, { weekStartsOn: 1 })
        break
      case 'month':
      default:
        // Extend to full weeks for month view
        const monthStart = startOfMonth(currentDate)
        const monthEnd = endOfMonth(currentDate)
        startDate = startOfWeek(monthStart, { weekStartsOn: 1 })
        endDate = endOfWeek(monthEnd, { weekStartsOn: 1 })
        break
    }

    return { startDate, endDate }
  }, [currentDate, view])

  // Fetch bookings
  const fetchBookings = useCallback(async () => {
    const { startDate, endDate } = getDateRange()
    
    return executeQuery(async () => {
      let query = supabase
        .from('bookings')
        .select('*')
        .gte('start_time', startDate.toISOString())
        .lte('end_time', endDate.toISOString())
        .order('start_time')

      if (selectedRoom) {
        query = query.eq('room_id', selectedRoom)
      }

      const result = await query
      if (result.data) {
        setBookings(result.data)
      }
      return result
    })
  }, [executeQuery, getDateRange, selectedRoom, supabase])

  // Fetch contractor visits
  const fetchContractorVisits = useCallback(async () => {
    const { startDate, endDate } = getDateRange()
    
    return executeQuery(async () => {
      const result = await supabase
        .from('contractor_visits')
        .select('*, contractors(name, type)')
        .gte('visit_date', startDate.toISOString().split('T')[0])
        .lte('visit_date', endDate.toISOString().split('T')[0])
        .order('visit_date')

      if (result.data) {
        setContractorVisits(result.data)
      }
      return result
    })
  }, [executeQuery, getDateRange, supabase])

  // Fetch guest visits
  const fetchGuestVisits = useCallback(async () => {
    const { startDate, endDate } = getDateRange()
    
    return executeQuery(async () => {
      const result = await supabase
        .from('guest_visits')
        .select('*, partners(name)')
        .gte('visit_date', startDate.toISOString().split('T')[0])
        .lte('visit_date', endDate.toISOString().split('T')[0])
        .order('visit_date')

      if (result.data) {
        setGuestVisits(result.data)
      }
      return result
    })
  }, [executeQuery, getDateRange, supabase])

  // Fetch rooms
  const fetchRooms = useCallback(async () => {
    return executeQuery(async () => {
      const result = await supabase
        .from('rooms')
        .select('*')
        .order('name')

      if (result.data) {
        setRooms(result.data)
      }
      return result
    })
  }, [executeQuery, supabase])

  // Fetch all data
  const fetchAllData = useCallback(async () => {
    await Promise.all([
      fetchBookings(),
      fetchContractorVisits(),
      fetchGuestVisits(),
      fetchRooms(),
    ])
  }, [fetchBookings, fetchContractorVisits, fetchGuestVisits, fetchRooms])

  // Auto-refresh effect
  useEffect(() => {
    fetchAllData()
  }, [fetchAllData])

  useEffect(() => {
    if (!autoRefresh) return

    const interval = setInterval(fetchAllData, refreshInterval)
    return () => clearInterval(interval)
  }, [autoRefresh, refreshInterval, fetchAllData])

  return {
    bookings,
    contractorVisits,
    guestVisits,
    rooms,
    isLoading,
    error,
    refetch: fetchAllData,
    fetchBookings,
    fetchContractorVisits,
    fetchGuestVisits,
    fetchRooms,
  }
} 