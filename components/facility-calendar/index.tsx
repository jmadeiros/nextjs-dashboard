"use client"

import { useState, useEffect, useMemo, useCallback } from "react"
import { isSameDay, startOfMonth, endOfMonth, startOfWeek, endOfWeek } from "date-fns"
import { getSupabaseClient } from "@/lib/supabase-client"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { CalendarIcon, AlertCircle } from "lucide-react"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { toast } from "sonner"

// Import our new components
import CalendarHeader from "./calendar-header"
import EventFilters from "./event-filters"
import RoomFilters from "./room-filters"
import CalendarViews from "./calendar-views"
import WeekendAssignmentModal from "../weekend-assignment-modal"

// Import hooks
import { useCalendarNavigation } from "@/hooks/use-calendar-navigation"
import { useEventProcessing } from "@/hooks/use-event-processing"

// Import types
import type { 
  FacilityCalendarProps, 
  FilterState, 
  Booking, 
  ContractorVisit, 
  GuestVisit, 
  WeekendAssignment 
} from "./types"

export default function FacilityCalendar({ rooms }: FacilityCalendarProps) {
  // Calendar navigation
  const { 
    currentDate, 
    selectedDate, 
    view, 
    setSelectedDate, 
    navigatePrevious, 
    navigateNext, 
    goToToday,
    changeView 
  } = useCalendarNavigation()

  // Filter states
  const [filters, setFilters] = useState<FilterState>({
    showRoomBookings: true,
    showContractorVisits: true,
    showPartnerVisits: true,
    showRecurringEvents: true,
    selectedRooms: [],
    searchQuery: "",
  })

  const [isFilterOpen, setIsFilterOpen] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Weekend assignment states
  const [isWeekendModalOpen, setIsWeekendModalOpen] = useState(false)
  const [selectedWeekendDate, setSelectedWeekendDate] = useState<Date>(new Date())

  // Data states
  const [roomBookings, setRoomBookings] = useState<Booking[]>([])
  const [contractorVisits, setContractorVisits] = useState<ContractorVisit[]>([])
  const [guestVisits, setGuestVisits] = useState<GuestVisit[]>([])
  const [contractors, setContractors] = useState<Array<{
    id: string
    name: string
    type: string
  }>>([])
  const [partners, setPartners] = useState<Array<{
    id: string
    name: string
  }>>([])
  const [weekendAssignments, setWeekendAssignments] = useState<WeekendAssignment[]>([])
  const [isLoading, setIsLoading] = useState(true)

  // Data fetching using Supabase client
  const supabase = getSupabaseClient()

  const fetchData = useCallback(async () => {
    setIsLoading(true)
    setError(null)

    const monthStart = startOfMonth(currentDate)
    const monthEnd = endOfMonth(currentDate)
    const viewStart = startOfWeek(monthStart, { weekStartsOn: 1 })
    const viewEnd = endOfWeek(monthEnd, { weekStartsOn: 1 })

    try {
      // Fetch room bookings
      const { data: bookingsData, error: bookingsError } = await supabase
        .from("bookings")
        .select("*")
        .gte("start_time", viewStart.toISOString())
        .lte("end_time", viewEnd.toISOString())
        .order("start_time")

      if (bookingsError) {
        setError(`Failed to load bookings: ${bookingsError.message}`)
        toast.error("Failed to load bookings", { description: bookingsError.message })
      } else {
        setRoomBookings(bookingsData || [])
      }

      // Fetch contractor visits
      const { data: contractorData, error: contractorError } = await supabase
        .from("contractor_visits")
        .select("*, contractors(name, type)")
        .gte("visit_date", viewStart.toISOString().split("T")[0])
        .lte("visit_date", viewEnd.toISOString().split("T")[0])
        .order("visit_date")

      if (contractorError) {
        setError(`Failed to load contractor visits: ${contractorError.message}`)
        toast.error("Failed to load contractor visits", { description: contractorError.message })
      } else {
        setContractorVisits(contractorData || [])
      }

      // Fetch partner visits
      const { data: partnerData, error: partnerError } = await supabase
        .from("guest_visits")
        .select("*, partners(name)")
        .gte("visit_date", viewStart.toISOString().split("T")[0])
        .lte("visit_date", viewEnd.toISOString().split("T")[0])
        .order("visit_date")

      if (partnerError) {
        setError(`Failed to load partner visits: ${partnerError.message}`)
        toast.error("Failed to load partner visits", { description: partnerError.message })
      } else {
        setGuestVisits(partnerData || [])
      }

      // Fetch contractors for name lookups
      const { data: contractorsData } = await supabase.from("contractors").select("id, name, type").order("name")
      setContractors(contractorsData || [])

      // Fetch partners for name lookups
      const { data: partnersData } = await supabase.from("partners").select("id, name").order("name")
      setPartners(partnersData || [])

      // Fetch weekend assignments
      const { data: weekendData } = await supabase
        .from("weekend_assignments")
        .select("*, caretakers(name, color)")
        .gte("weekend_start_date", viewStart.toISOString().split("T")[0])
        .lte("weekend_start_date", viewEnd.toISOString().split("T")[0])
        .order("weekend_start_date")

      setWeekendAssignments(weekendData || [])

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : String(err)
      setError(`Failed to load data: ${errorMessage}`)
      toast.error("Failed to load calendar data", { description: errorMessage })
    } finally {
      setIsLoading(false)
    }
  }, [currentDate, supabase])

  // Fetch data when currentDate changes
  useEffect(() => {
    fetchData()
  }, [fetchData])

  // Process events using our custom hook
  const { events } = useEventProcessing({
    roomBookings,
    contractorVisits,
    guestVisits,
    rooms,
    contractors,
    partners,
    filters,
  })

  // Get events for selected date
  const selectedEvents = useMemo(() => {
    return events.filter((event) => isSameDay(event.start, selectedDate))
  }, [events, selectedDate])

  // Filter handlers
  const handleFiltersChange = (newFilters: Partial<FilterState>) => {
    setFilters(prev => ({ ...prev, ...newFilters }))
  }

  const handleRoomToggle = (roomId: string) => {
    setFilters(prev => ({
      ...prev,
      selectedRooms: prev.selectedRooms.includes(roomId)
        ? prev.selectedRooms.filter(id => id !== roomId)
        : [...prev.selectedRooms, roomId]
    }))
  }

  // Weekend assignment handlers
  const handleWeekendClick = (day: Date) => {
    setSelectedWeekendDate(day)
    setIsWeekendModalOpen(true)
  }

  const refreshWeekendAssignments = async () => {
    const monthStart = startOfMonth(currentDate)
    const monthEnd = endOfMonth(currentDate)
    const viewStart = startOfWeek(monthStart, { weekStartsOn: 1 })
    const viewEnd = endOfWeek(monthEnd, { weekStartsOn: 1 })

    const { data: weekendData } = await supabase
      .from("weekend_assignments")
      .select("*, caretakers(name, color)")
      .gte("weekend_start_date", viewStart.toISOString().split("T")[0])
      .lte("weekend_start_date", viewEnd.toISOString().split("T")[0])
      .order("weekend_start_date")

    setWeekendAssignments(weekendData || [])
  }

  const handleWeekendAssignmentChange = () => {
    refreshWeekendAssignments()
  }

  return (
    <div className="space-y-6">
      {/* Tailwind CSS Safelist - Hidden div to ensure classes are included */}
      <div className="hidden">
        <div className="bg-blue-100 border-blue-300 text-blue-700 hover:bg-blue-200 bg-blue-50"></div>
        <div className="bg-purple-100 border-purple-300 text-purple-700 hover:bg-purple-200 bg-purple-50"></div>
        <div className="bg-orange-100 border-orange-300 text-orange-700 hover:bg-orange-200 bg-orange-50"></div>
        <div className="bg-green-100 border-green-300 text-green-700 hover:bg-green-200 bg-green-50"></div>
        <div className="bg-primary/5 bg-primary/10 bg-primary/20 bg-primary/40 bg-primary/70 text-primary-foreground"></div>
      </div>

      {/* Header */}
      <div className="bg-gradient-to-r from-primary/10 to-primary/5 rounded-lg p-6 shadow-sm">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Master Calendar</h1>
            <p className="text-muted-foreground mt-1">
              View all room bookings, contractor visits, and partner visitors
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" onClick={goToToday} className="shadow-sm">
              <CalendarIcon className="mr-2 h-4 w-4" />
              Today
            </Button>
            <Button variant="outline" onClick={() => (window.location.href = "/debug")} className="shadow-sm">
              <AlertCircle className="mr-2 h-4 w-4" />
              Debug
            </Button>
          </div>
        </div>
      </div>

      {/* Main Calendar Card */}
      <Card className="shadow-md border-primary/10">
        <CardHeader className="bg-muted/50 border-b">
          <div className="flex flex-col gap-4">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
              <div>
                <CardTitle>Master Calendar</CardTitle>
                <CardDescription>View all events in one place</CardDescription>
              </div>
              
              {/* Calendar Header Controls */}
              <CalendarHeader
                currentDate={currentDate}
                view={view}
                onViewChange={changeView}
                onPrevious={navigatePrevious}
                onNext={navigateNext}
                onToday={goToToday}
              />
            </div>

            {/* Event Filters */}
            <EventFilters
              filters={filters}
              onFiltersChange={handleFiltersChange}
              isFilterOpen={isFilterOpen}
              setIsFilterOpen={setIsFilterOpen}
            />
          </div>
        </CardHeader>

        <CardContent className="p-4">
          {/* Error Display */}
          {error && (
            <Alert variant="destructive" className="mb-4">
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>Error Loading Data</AlertTitle>
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {/* Room Filters */}
          {filters.showRoomBookings && (
            <RoomFilters
              rooms={rooms}
              selectedRooms={filters.selectedRooms}
              onRoomToggle={handleRoomToggle}
            />
          )}

          {/* Calendar Views */}
          <CalendarViews
            view={view}
            currentDate={currentDate}
            selectedDate={selectedDate}
            onDateSelect={setSelectedDate}
            events={events}
            selectedEvents={selectedEvents}
            isLoading={isLoading}
            weekendAssignments={weekendAssignments}
            onWeekendClick={handleWeekendClick}
            guestVisits={guestVisits}
          />
        </CardContent>
      </Card>

      {/* Weekend Assignment Modal */}
      <WeekendAssignmentModal
        isOpen={isWeekendModalOpen}
        onClose={() => setIsWeekendModalOpen(false)}
        selectedDate={selectedWeekendDate}
        onAssignmentChange={handleWeekendAssignmentChange}
      />
    </div>
  )
} 