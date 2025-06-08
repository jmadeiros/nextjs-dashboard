import { useState, useEffect } from 'react'
import { startOfMonth, endOfMonth } from 'date-fns'
import { getSupabaseClient } from '@/lib/supabase-client'
import type { Contractor, ContractorVisit } from '@/components/contractor-dashboard/types'

interface UseContractorDataOptions {
  currentDate: Date
}

export function useContractorData({ currentDate }: UseContractorDataOptions) {
  const [contractors, setContractors] = useState<Contractor[]>([])
  const [visits, setVisits] = useState<ContractorVisit[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const supabase = getSupabaseClient()

  const fetchData = async () => {
    setIsLoading(true)
    setError(null)

    try {
      // Fetch contractors
      const { data: contractorsData, error: contractorsError } = await supabase
        .from("contractors")
        .select("*")
        .order("name")

      if (contractorsError) {
        throw new Error(`Failed to fetch contractors: ${contractorsError.message}`)
      }

      setContractors(contractorsData || [])

      // Fetch visits for the current month
      const monthStart = startOfMonth(currentDate)
      const monthEnd = endOfMonth(currentDate)

      const { data: visitsData, error: visitsError } = await supabase
        .from("contractor_visits")
        .select("*")
        .gte("visit_date", monthStart.toISOString())
        .lte("visit_date", monthEnd.toISOString())
        .order("visit_date")

      if (visitsError) {
        throw new Error(`Failed to fetch visits: ${visitsError.message}`)
      }

      console.log("[ContractorDashboard] Fetched visits:", visitsData)

      // Process the visits to ensure dates are handled correctly
      const processedVisits =
        visitsData?.map((visit) => {
          console.log(`[ContractorDashboard] Raw visit date from DB: ${visit.visit_date}`)
          return visit
        }) || []

      setVisits(processedVisits)
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

  const getContractorName = (contractorId: string) => {
    const contractor = contractors.find((c) => c.id === contractorId)
    return contractor ? contractor.name : "Unknown Contractor"
  }

  return {
    contractors,
    visits,
    isLoading,
    error,
    refetch,
    getContractorName,
  }
} 