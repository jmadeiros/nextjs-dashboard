import { useState, useEffect } from 'react'
import { startOfMonth, endOfMonth } from 'date-fns'
import { getSupabaseClient } from '@/lib/supabase-client'
import type { Partner, EnhancedGuestVisit, Room } from '@/components/partner-dashboard/types'

interface UsePartnerDataOptions {
  currentDate: Date
}

export function usePartnerData({ currentDate }: UsePartnerDataOptions) {
  const [partners, setPartners] = useState<Partner[]>([])
  const [visits, setVisits] = useState<EnhancedGuestVisit[]>([])
  const [rooms, setRooms] = useState<Room[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [debugInfo, setDebugInfo] = useState<string>("")

  const supabase = getSupabaseClient()

  const fetchData = async () => {
    setIsLoading(true)
    setError(null)

    try {
      // Fetch partners
      const { data: partnersData, error: partnersError } = await supabase
        .from("partners")
        .select("id, name, email, company, phone")
        .order("name")

      if (partnersError) {
        console.error("Error fetching partners:", partnersError)
        setError(`Failed to load partners: ${partnersError.message}`)
        setPartners([])
        setDebugInfo(`Partner error: ${partnersError.message}`)
      } else {
        console.log("Loaded partners:", partnersData)
        setPartners(partnersData || [])
        setDebugInfo(`Loaded ${partnersData?.length || 0} partners`)
      }

      // Fetch visits for the current month
      const monthStart = startOfMonth(currentDate)
      const monthEnd = endOfMonth(currentDate)

      const { data: visitsData, error: visitsError } = await supabase
        .from("guest_visits")
        .select("*, partners(name)")
        .gte("visit_date", monthStart.toISOString())
        .lte("visit_date", monthEnd.toISOString())
        .order("visit_date")

      if (visitsError) {
        throw new Error(`Failed to fetch visits: ${visitsError.message}`)
      }

      setVisits(visitsData || [])

      // Fetch rooms
      const { data: roomsData, error: roomsError } = await supabase
        .from("rooms")
        .select("id, name")
        .order("name")

      if (roomsError) {
        console.error("Error fetching rooms:", roomsError)
        setRooms([])
      } else {
        setRooms(roomsData || [])
      }
    } catch (error) {
      console.error("Error fetching data:", error)
      setError(`Error: ${error instanceof Error ? error.message : String(error)}`)
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    fetchData()
  }, [currentDate])

  const refetch = () => {
    fetchData()
  }

  const getPartnerName = (partnerId: string) => {
    const partner = partners.find((p) => p.id === partnerId)
    return partner ? partner.name : "Unknown Partner"
  }

  return {
    partners,
    visits,
    rooms,
    isLoading,
    error,
    debugInfo,
    refetch,
    getPartnerName,
    setPartners, // Expose for adding new partners
  }
} 