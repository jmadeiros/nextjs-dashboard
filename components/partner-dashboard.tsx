"use client"

import type React from "react"

import { useState, useEffect } from "react"
import {
  format,
  startOfMonth,
  endOfMonth,
  eachDayOfInterval,
  isSameDay,
  parseISO,
  addMonths,
  subMonths,
  isToday,
  isBefore,
} from "date-fns"
import { getSupabaseClient } from "@/lib/supabase-client"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Checkbox } from "@/components/ui/checkbox"
import { Calendar as CalendarComponent } from "@/components/ui/calendar"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import {
  CalendarIcon,
  ChevronLeft,
  ChevronRight,
  Clock,
  Plus,
  AlertCircle,
  Search,
  CalendarPlus2Icon as CalendarIcon2,
  Users,
  Trash2,
} from "lucide-react"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Skeleton } from "@/components/ui/skeleton"
import type { Database } from "@/types/supabase"
import { toast } from "sonner"

type GuestVisit = Database["public"]["Tables"]["guest_visits"]["Row"]

// Define a simple type for partners
type Partner = {
  id: string
  name: string
  company?: string | null
  email?: string | null
  phone?: string | null
}

type Room = {
  id: string
  name: string
}

interface PartnerDashboardProps {
  userId?: string
}

export default function PartnerDashboard({ userId }: PartnerDashboardProps) {
  const [currentDate, setCurrentDate] = useState<Date>(new Date())
  const [selectedDate, setSelectedDate] = useState<Date>(new Date())
  const [partners, setPartners] = useState<Partner[]>([])
  const [visits, setVisits] = useState<GuestVisit[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [view, setView] = useState<"month" | "list">("month")
  const [isFormOpen, setIsFormOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState("")
  const [debugInfo, setDebugInfo] = useState<string>("")
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [visitToDelete, setVisitToDelete] = useState<GuestVisit | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)
  const [rooms, setRooms] = useState<Room[]>([])

  // Form states
  const [formData, setFormData] = useState({
    partnerId: "",
    partnerName: "",
    visitDate: new Date(),
    startTime: "09:00",
    endTime: "17:00",
    guestDetails: "", // This will be used to list the guests
    purpose: "", // Add this new field for the purpose
    isFullDay: false,
    isNewPartner: false,
    includeRoomBooking: false,
    selectedRoomId: "",
    roomBookingTitle: "",
    authorizer: "",
    isCustomAuthorizer: false,
    customAuthorizerName: "",
  })
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)

  // Get Supabase client
  const supabase = getSupabaseClient()

  // Fetch partners and visits
  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true)
      setError(null)

      try {
        // Fetch partners directly from the partners table
        const { data: partnersData, error: partnersError } = await supabase
          .from("partners")
          .select("id, name, email, company, phone")
          .order("name")

        if (partnersError) {
          // If there's an error fetching partners, log it
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
        const { data: roomsData, error: roomsError } = await supabase.from("rooms").select("id, name").order("name")

        if (roomsError) {
          console.error("Error fetching rooms:", roomsError)
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

    fetchData()
  }, [currentDate, supabase])

  // Reset form to default values
  const resetForm = () => {
    setFormData({
      partnerId: "",
      partnerName: "",
      visitDate: new Date(),
      startTime: "09:00",
      endTime: "17:00",
      guestDetails: "",
      purpose: "",
      isFullDay: false,
      isNewPartner: false,
      includeRoomBooking: false,
      selectedRoomId: "",
      roomBookingTitle: "",
      authorizer: "",
      isCustomAuthorizer: false,
      customAuthorizerName: "",
    })
  }

  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)
    setFormError(null)

    try {
      let partnerId = formData.partnerId

      // If it's a new partner, create one first
      if (formData.isNewPartner) {
        if (!formData.partnerName.trim()) {
          throw new Error("Partner name is required")
        }

        const { data: newPartner, error: createPartnerError } = await supabase
          .from("partners")
          .insert([
            {
              name: formData.partnerName,
              email: `partner_${Date.now()}@example.com`, // Placeholder email with timestamp
            },
          ])
          .select()
          .single()

        if (createPartnerError) {
          throw new Error(`Failed to create partner: ${createPartnerError.message}`)
        }

        partnerId = newPartner.id

        // Add the new partner to the partners list
        setPartners([...partners, newPartner])
      } else if (!partnerId) {
        throw new Error("Please select a partner")
      }

      // Set start and end times based on full day selection
      const startTime = formData.isFullDay ? "08:00" : formData.startTime
      const endTime = formData.isFullDay ? "18:00" : formData.endTime

      // Check for room conflicts BEFORE creating any records
      if (formData.includeRoomBooking && formData.selectedRoomId) {
        const visitDate = formData.visitDate
        const startTimeParts = startTime.split(":").map(Number)
        const endTimeParts = endTime.split(":").map(Number)

        const startDateTime = new Date(
          visitDate.getFullYear(),
          visitDate.getMonth(),
          visitDate.getDate(),
          startTimeParts[0],
          startTimeParts[1],
          0,
        )

        const endDateTime = new Date(
          visitDate.getFullYear(),
          visitDate.getMonth(),
          visitDate.getDate(),
          endTimeParts[0],
          endTimeParts[1],
          0,
        )

        // Check for existing room bookings that would conflict
        const { data: existingBookings, error: conflictCheckError } = await supabase
          .from("bookings")
          .select("*")
          .eq("room_id", formData.selectedRoomId)
          .lt("start_time", endDateTime.toISOString())
          .gt("end_time", startDateTime.toISOString())

        if (conflictCheckError) {
          console.error("Error checking for room conflicts:", conflictCheckError)
          throw new Error(`Failed to check room availability: ${conflictCheckError.message}`)
        }

        // If there are conflicting bookings, show an error and don't proceed
        if (existingBookings && existingBookings.length > 0) {
          const conflictingBooking = existingBookings[0]
          const conflictStart = format(parseISO(conflictingBooking.start_time), "h:mm a")
          const conflictEnd = format(parseISO(conflictingBooking.end_time), "h:mm a")

          throw new Error(
            `Room "${rooms.find((r) => r.id === formData.selectedRoomId)?.name}" is already booked from ${conflictStart} to ${conflictEnd}. Please select a different time or room.`,
          )
        }
      }

      // Create the visit
      const visitDate = formData.visitDate
      // Format the date with noon UTC time to avoid timezone issues
      const formattedDate = `${visitDate.getFullYear()}-${String(visitDate.getMonth() + 1).padStart(2, "0")}-${String(visitDate.getDate()).padStart(2, "0")}T12:00:00.000Z`

      const { data: newVisit, error: visitError } = await supabase
        .from("guest_visits")
        .insert([
          {
            partner_id: partnerId,
            partner_name: formData.isNewPartner
              ? formData.partnerName
              : partners.find((p) => p.id === partnerId)?.name || "Unknown Partner",
            guest_id: "00000000-0000-0000-0000-000000000000", // Use the default UUID
            visit_date: formattedDate, // Use the formatted date with noon UTC
            start_time: startTime,
            end_time: endTime,
            purpose: formData.purpose,
            status: "scheduled",
            guest_details: formData.guestDetails,
            authorizer: formData.isCustomAuthorizer ? formData.customAuthorizerName : formData.authorizer,
          },
        ])
        .select()
        .single()

      if (visitError) {
        throw new Error(`Failed to create visit: ${visitError.message}`)
      }

      // Create room booking if requested
      if (formData.includeRoomBooking && formData.selectedRoomId) {
        const roomBookingTitle =
          formData.roomBookingTitle ||
          `${formData.isNewPartner ? formData.partnerName : partners.find((p) => p.id === partnerId)?.name || "Partner"} - Guest Visit`

        // Use the same date and time logic as the visit
        const visitDate = formData.visitDate
        const startTimeParts = startTime.split(":").map(Number)
        const endTimeParts = endTime.split(":").map(Number)

        const startDateTime = new Date(
          visitDate.getFullYear(),
          visitDate.getMonth(),
          visitDate.getDate(),
          startTimeParts[0],
          startTimeParts[1],
          0,
        )

        const endDateTime = new Date(
          visitDate.getFullYear(),
          visitDate.getMonth(),
          visitDate.getDate(),
          endTimeParts[0],
          endTimeParts[1],
          0,
        )

        const { error: roomBookingError } = await supabase.from("bookings").insert([
          {
            room_id: formData.selectedRoomId,
            user_id: userId || "00000000-0000-0000-0000-000000000000",
            title: roomBookingTitle,
            description: `Partner guest visit: ${formData.purpose || formData.guestDetails || "No description"}`,
            start_time: startDateTime.toISOString(),
            end_time: endDateTime.toISOString(),
            is_recurring: false,
            recurrence_pattern: null,
          },
        ])

        if (roomBookingError) {
          // If room booking fails, delete the partner visit we just created
          await supabase.from("guest_visits").delete().eq("id", newVisit.id)
          throw new Error(`Failed to create room booking: ${roomBookingError.message}`)
        }
      }

      // Refresh data
      const { data: updatedVisits, error: fetchError } = await supabase
        .from("guest_visits")
        .select("*, partners(name)")
        .gte("visit_date", startOfMonth(currentDate).toISOString())
        .lte("visit_date", endOfMonth(currentDate).toISOString())
        .order("visit_date")

      if (fetchError) {
        throw new Error(`Failed to refresh visits: ${fetchError.message}`)
      }

      setVisits(updatedVisits || [])

      // Reset form and close dialog
      resetForm()
      setIsFormOpen(false)

      toast.success("Visit scheduled successfully!", {
        description: `Partner: ${formData.partnerName}. Guests: ${formData.guestDetails || "No guests specified"}.`,
      })
    } catch (error) {
      console.error("Error submitting form:", error)
      setFormError(`Error: ${error instanceof Error ? error.message : String(error)}`)
      toast.error("Failed to schedule visit.", {
        description: error instanceof Error ? error.message : String(error),
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  // Delete visit function
  const deleteVisit = async (visit: GuestVisit) => {
    setIsDeleting(true)
    try {
      const { error } = await supabase.from("guest_visits").delete().eq("id", visit.id)

      if (error) {
        throw new Error(`Failed to delete partner visit: ${error.message}`)
      }

      // Refresh data
      const { data: updatedVisits, error: fetchError } = await supabase
        .from("guest_visits")
        .select("*, partners(name)")
        .gte("visit_date", startOfMonth(currentDate).toISOString())
        .lte("visit_date", endOfMonth(currentDate).toISOString())
        .order("visit_date")

      if (fetchError) {
        throw new Error(`Failed to refresh visits: ${fetchError.message}`)
      }

      setVisits(updatedVisits || [])
      setDeleteDialogOpen(false)
      setVisitToDelete(null)

      toast.success("Visit deleted successfully!", {
        description: `Partner: ${visit.partners?.name || "Unknown"}. Purpose: ${visit.purpose || "No purpose specified"}.`,
      })
    } catch (error) {
      console.error("Error deleting visit:", error)
      setError(`Error deleting visit: ${error instanceof Error ? error.message : String(error)}`)
      toast.error("Failed to delete visit.", {
        description: error instanceof Error ? error.message : String(error),
      })
    } finally {
      setIsDeleting(false)
    }
  }

  // Navigation functions
  const previousMonth = () => {
    setCurrentDate((prev) => subMonths(prev, 1))
  }

  const nextMonth = () => {
    setCurrentDate((prev) => addMonths(prev, 1))
  }

  const goToToday = () => {
    setCurrentDate(new Date())
    setSelectedDate(new Date())
  }

  // Generate calendar days for the month
  const monthStart = startOfMonth(currentDate)
  const monthEnd = endOfMonth(currentDate)
  const calendarDays = eachDayOfInterval({ start: monthStart, end: monthEnd })

  // Get visits for a specific day
  const getVisitsForDay = (day: Date) => {
    return visits.filter((visit) => {
      const visitDate = parseISO(visit.visit_date)
      return (
        visitDate.getFullYear() === day.getFullYear() &&
        visitDate.getMonth() === day.getMonth() &&
        visitDate.getDate() === day.getDate()
      )
    })
  }

  // Filter visits based on search query
  const filteredVisits = visits.filter((visit) => {
    const partnerName = visit.partners?.name || ""
    return (
      partnerName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (visit.purpose && visit.purpose.toLowerCase().includes(searchQuery.toLowerCase()))
    )
  })

  // Generate time options for form
  const timeOptions = []
  for (let hour = 7; hour < 22; hour++) {
    for (let minute = 0; minute < 60; minute += 30) {
      const formattedHour = hour.toString().padStart(2, "0")
      const formattedMinute = minute.toString().padStart(2, "0")
      timeOptions.push(`${formattedHour}:${formattedMinute}`)
    }
  }

  // Get today's date for calendar disabled dates
  const today = new Date()

  return (
    <div className="space-y-6">
      <div className="bg-gradient-to-r from-primary/10 to-primary/5 rounded-lg p-6 shadow-sm">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Partner Guest Dashboard</h1>
            <p className="text-muted-foreground mt-1">Manage and track partner guest visits</p>
            {debugInfo && <p className="text-xs text-muted-foreground mt-1">{debugInfo}</p>}
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" onClick={goToToday} className="shadow-sm">
              <CalendarIcon className="mr-2 h-4 w-4" />
              Today
            </Button>
            <Button
              onClick={() => {
                setFormData({
                  ...formData,
                  visitDate: selectedDate,
                })
                setIsFormOpen(true)
              }}
              className="shadow-sm"
            >
              <Plus className="mr-2 h-4 w-4" /> New Guest Visit
            </Button>
            <Button variant="outline" onClick={() => (window.location.href = "/debug")} className="shadow-sm">
              <AlertCircle className="mr-2 h-4 w-4" />
              Debug
            </Button>
          </div>
        </div>
      </div>

      <Card className="shadow-md border-primary/10">
        <CardHeader className="bg-muted/50 border-b">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div>
              <CardTitle>Partner Visits</CardTitle>
              <CardDescription>View and manage partner guest visits</CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <div className="relative">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  type="search"
                  placeholder="Search visits..."
                  className="pl-8 w-[200px]"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
              <Tabs value={view} onValueChange={(v) => setView(v as "month" | "list")} className="mr-0 sm:mr-4">
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger value="month">Calendar</TabsTrigger>
                  <TabsTrigger value="list">List</TabsTrigger>
                </TabsList>
              </Tabs>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-4">
          {error && (
            <Alert variant="destructive" className="mb-4">
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>Error Loading Data</AlertTitle>
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {view === "month" && (
            <div className="space-y-4">
              <div className="flex justify-between items-center mb-4 bg-muted/30 p-3 rounded-md">
                <Button variant="outline" size="icon" onClick={previousMonth} className="shadow-sm">
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <div className="font-medium text-lg">{format(currentDate, "MMMM yyyy")}</div>
                <Button variant="outline" size="icon" onClick={nextMonth} className="shadow-sm">
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>

              {isLoading ? (
                <div className="grid grid-cols-7 gap-2">
                  {Array(31)
                    .fill(0)
                    .map((_, i) => (
                      <Skeleton key={i} className="h-20 w-full" />
                    ))}
                </div>
              ) : (
                <div>
                  <div className="grid grid-cols-7 text-center mb-2">
                    {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((day) => (
                      <div key={day} className="text-sm font-medium text-muted-foreground">
                        {day}
                      </div>
                    ))}
                  </div>

                  <div className="grid grid-cols-7 gap-2">
                    {/* Add empty cells for days before the start of the month */}
                    {Array((monthStart.getDay() + 6) % 7)
                      .fill(null)
                      .map((_, index) => (
                        <div key={`empty-start-${index}`} className="h-24 rounded-md"></div>
                      ))}

                    {/* Calendar days */}
                    {calendarDays.map((day) => {
                      const dayVisits = getVisitsForDay(day)
                      const isCurrentDay = isToday(day)
                      const isSelected = isSameDay(day, selectedDate)

                      return (
                        <div
                          key={day.toString()}
                          className={`h-24 rounded-md border ${
                            isCurrentDay ? "bg-primary/5 border-primary/20" : "bg-card"
                          } ${isSelected ? "ring-2 ring-primary ring-opacity-50" : ""} flex flex-col p-2 cursor-pointer`}
                          onClick={() => setSelectedDate(day)}
                        >
                          <div
                            className={`text-sm font-medium ${
                              isCurrentDay
                                ? "bg-primary text-primary-foreground rounded-full w-6 h-6 flex items-center justify-center"
                                : ""
                            }`}
                          >
                            {format(day, "d")}
                          </div>
                          <div className="mt-1 overflow-y-auto flex-1 space-y-1">
                            {dayVisits.slice(0, 3).map((visit) => (
                              <div
                                key={visit.id}
                                className="text-xs p-1 bg-purple-100 border border-purple-300 rounded"
                                title={`${visit.partners?.name || "Unknown Partner"} (${visit.start_time} - ${visit.end_time})${visit.guest_details ? `: ${visit.guest_details}` : ""}`}
                              >
                                <div className="font-medium truncate">{visit.partners?.name || "Unknown Partner"}</div>
                                {visit.guest_details && (
                                  <div className="text-[10px] text-purple-700 truncate">
                                    {visit.guest_details.length > 20
                                      ? visit.guest_details.substring(0, 20) + "..."
                                      : visit.guest_details}
                                  </div>
                                )}
                              </div>
                            ))}
                            {dayVisits.length > 3 && (
                              <div className="text-xs text-center py-1 text-primary font-medium bg-primary/5 rounded-md">
                                +{dayVisits.length - 3} more
                              </div>
                            )}
                          </div>
                        </div>
                      )
                    })}

                    {/* Add empty cells for days after the end of the month */}
                    {Array(7 - ((monthEnd.getDay() + 6) % 7 || 7))
                      .fill(null)
                      .map((_, index) => (
                        <div key={`empty-end-${index}`} className="h-24 rounded-md"></div>
                      ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {view === "list" && (
            <div className="space-y-4">
              {isLoading ? (
                <div className="space-y-4">
                  {Array(5)
                    .fill(0)
                    .map((_, i) => (
                      <Skeleton key={i} className="h-20 w-full" />
                    ))}
                </div>
              ) : filteredVisits.length > 0 ? (
                <div className="space-y-3">
                  {filteredVisits.map((visit) => {
                    const visitDate = parseISO(visit.visit_date)
                    const isUpcoming = isSameDay(visitDate, new Date()) || visitDate > new Date()

                    return (
                      <Card
                        key={visit.id}
                        className={`overflow-hidden ${isUpcoming ? "border-purple-300" : "border-gray-200"}`}
                      >
                        <CardContent className="p-0">
                          <div
                            className={`border-l-4 p-4 ${
                              isUpcoming ? "border-purple-400 bg-purple-50" : "border-gray-300 bg-gray-50"
                            }`}
                          >
                            <div className="flex justify-between items-start">
                              <div>
                                <div className="flex items-center gap-2">
                                  <h3 className="font-medium text-lg">{visit.partners?.name || "Unknown Partner"}</h3>
                                  <div
                                    className={`text-xs px-2 py-0.5 rounded-full ${
                                      visit.status === "scheduled"
                                        ? "bg-purple-100 text-purple-700"
                                        : visit.status === "checked-in"
                                          ? "bg-green-100 text-green-700"
                                          : visit.status === "completed"
                                            ? "bg-gray-100 text-gray-700"
                                            : "bg-red-100 text-red-700"
                                    }`}
                                  >
                                    {visit.status.charAt(0).toUpperCase() + visit.status.slice(1)}
                                  </div>
                                </div>
                                <div className="flex items-center text-sm text-muted-foreground mt-2">
                                  <CalendarIcon2 className="h-4 w-4 mr-1.5 text-primary/70" />
                                  <span className="font-medium">
                                    {format(parseISO(visit.visit_date), "EEEE, MMMM d, yyyy")}
                                  </span>
                                </div>
                                <div className="flex items-center text-sm text-muted-foreground mt-1">
                                  <Clock className="h-4 w-4 mr-1.5 text-primary/70" />
                                  <span className="font-medium">
                                    {visit.start_time === "08:00" && visit.end_time === "18:00"
                                      ? "Full Day"
                                      : `${visit.start_time} - ${visit.end_time}`}
                                  </span>
                                </div>
                                {visit.purpose && (
                                  <div className="mt-2 text-sm">
                                    <span className="font-medium">Purpose:</span> {visit.purpose}
                                  </div>
                                )}
                                {visit.guest_details && (
                                  <div className="mt-2 text-sm">
                                    <span className="font-medium">Guests:</span> {visit.guest_details}
                                  </div>
                                )}
                              </div>
                              <div className="flex gap-2">
                                <Button
                                  variant="outline"
                                  size="sm"
                                  className="text-red-600 hover:text-red-700 hover:bg-red-50"
                                  onClick={() => {
                                    setVisitToDelete(visit)
                                    setDeleteDialogOpen(true)
                                  }}
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                                {visit.status === "scheduled" && isUpcoming && (
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    className="text-green-600 border-green-200 hover:bg-green-50"
                                  >
                                    Check In
                                  </Button>
                                )}
                                {visit.status === "checked-in" && (
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    className="text-blue-600 border-blue-200 hover:bg-blue-50"
                                  >
                                    Complete
                                  </Button>
                                )}
                              </div>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    )
                  })}
                </div>
              ) : (
                <div className="text-center py-12 px-4 bg-muted/20 rounded-lg border border-dashed border-muted">
                  <Users className="h-12 w-12 mx-auto text-muted-foreground mb-3" />
                  <h3 className="text-lg font-medium mb-1">No partner visits found</h3>
                  <p className="text-muted-foreground mb-4">
                    {searchQuery ? "Try a different search term" : "Click 'New Guest Visit' to schedule one"}
                  </p>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Selected day visits - only show in month view */}
      {view === "month" && (
        <Card className="shadow-md border-primary/10">
          <CardHeader className="bg-muted/50 border-b">
            <div className="flex justify-between items-center">
              <CardTitle className="flex items-center text-base md:text-lg">
                <CalendarIcon className="mr-2 h-4 w-4 md:h-5 md:w-5 text-primary" />
                Visits for {format(selectedDate, "MMMM d, yyyy")}
                {isToday(selectedDate) && (
                  <span className="ml-2 text-xs bg-primary/20 text-primary px-2 py-1 rounded-full">Today</span>
                )}
              </CardTitle>
              <Button
                size="sm"
                onClick={() => {
                  setFormData({
                    ...formData,
                    visitDate: selectedDate,
                  })
                  setIsFormOpen(true)
                }}
                className="shadow-sm gap-1"
                variant="outline"
              >
                <Plus className="h-3.5 w-3.5" /> Add Guest Visit
              </Button>
            </div>
          </CardHeader>
          <CardContent className="p-4">
            {isLoading ? (
              <div className="space-y-4">
                {Array(3)
                  .fill(0)
                  .map((_, i) => (
                    <Skeleton key={i} className="h-20 w-full" />
                  ))}
              </div>
            ) : (
              <div className="space-y-3">
                {getVisitsForDay(selectedDate).length > 0 ? (
                  getVisitsForDay(selectedDate).map((visit) => (
                    <Card key={visit.id} className="overflow-hidden border-purple-300 shadow-sm">
                      <CardContent className="p-0">
                        <div className="border-l-4 border-purple-400 p-4 bg-purple-50">
                          <div className="flex justify-between items-start">
                            <div>
                              <div className="flex items-center gap-2">
                                <h3 className="font-medium text-lg">{visit.partners?.name || "Unknown Partner"}</h3>
                                <div
                                  className={`text-xs px-2 py-0.5 rounded-full ${
                                    visit.status === "scheduled"
                                      ? "bg-purple-100 text-purple-700"
                                      : visit.status === "checked-in"
                                        ? "bg-green-100 text-green-700"
                                        : visit.status === "completed"
                                          ? "bg-gray-100 text-gray-700"
                                          : "bg-red-100 text-red-700"
                                  }`}
                                >
                                  {visit.status.charAt(0).toUpperCase() + visit.status.slice(1)}
                                </div>
                              </div>
                              <div className="flex items-center text-sm text-muted-foreground mt-2">
                                <Clock className="h-4 w-4 mr-1.5 text-primary/70" />
                                <span className="font-medium">
                                  {visit.start_time === "08:00" && visit.end_time === "18:00"
                                    ? "Full Day"
                                    : `${visit.start_time} - ${visit.end_time}`}
                                </span>
                              </div>
                              {visit.purpose && (
                                <div className="mt-2 text-sm">
                                  <span className="font-medium">Purpose:</span> {visit.purpose}
                                </div>
                              )}
                              {visit.guest_details && (
                                <div className="mt-2 text-sm">
                                  <span className="font-medium">Guests:</span> {visit.guest_details}
                                </div>
                              )}
                            </div>
                            <div className="flex gap-2">
                              <Button
                                variant="outline"
                                size="sm"
                                className="text-red-600 hover:text-red-700 hover:bg-red-50"
                                onClick={() => {
                                  setVisitToDelete(visit)
                                  setDeleteDialogOpen(true)
                                }}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                              {visit.status === "checked-in" && (
                                <Button
                                  variant="outline"
                                  size="sm"
                                  className="text-blue-600 border-blue-200 hover:bg-blue-50"
                                >
                                  Complete
                                </Button>
                              )}
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))
                ) : (
                  <div className="text-center py-8 px-4 bg-muted/20 rounded-lg border border-dashed border-muted">
                    <Users className="h-10 w-10 mx-auto text-muted-foreground mb-2" />
                    <h3 className="text-base font-medium mb-1">No partner visits for this day</h3>
                    <p className="text-sm text-muted-foreground mb-3">Click 'Add Guest Visit' to schedule one</p>
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* New Visit Form Dialog */}
      <Dialog open={isFormOpen} onOpenChange={(open) => !open && setIsFormOpen(false)}>
        <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
          <form onSubmit={handleSubmit}>
            <DialogHeader>
              <DialogTitle className="flex items-center">
                <Users className="mr-2 h-5 w-5 text-primary" />
                Schedule Guest Visit
              </DialogTitle>
              <DialogDescription>
                Let us know which partner you are and tell us about the guests you're bringing along.
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label htmlFor="partner" className="font-medium">
                  Select Partner
                </Label>
                <div className="flex items-center gap-2">
                  <Select
                    value={formData.partnerId}
                    onValueChange={(value) => {
                      if (value === "new") {
                        setFormData({
                          ...formData,
                          partnerId: "",
                          partnerName: "",
                          isNewPartner: true,
                        })
                      } else {
                        const selectedPartner = partners.find((p) => p.id === value)
                        setFormData({
                          ...formData,
                          partnerId: value,
                          partnerName: selectedPartner ? selectedPartner.name : "",
                          isNewPartner: false,
                        })
                      }
                    }}
                    disabled={isSubmitting}
                  >
                    <SelectTrigger className="h-10 flex-1">
                      <SelectValue placeholder="Select a partner" />
                    </SelectTrigger>
                    <SelectContent>
                      {partners.length > 0 ? (
                        partners.map((partner) => (
                          <SelectItem key={partner.id} value={partner.id}>
                            {partner.name} {partner.company ? `(${partner.company})` : ""}
                          </SelectItem>
                        ))
                      ) : (
                        <SelectItem value="no-partners" disabled>
                          No partners available
                        </SelectItem>
                      )}
                      <SelectItem value="new">+ Add New Partner</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                {partners.length === 0 && !isLoading && (
                  <p className="text-xs text-amber-600">No partners loaded. You may need to create a new partner.</p>
                )}
              </div>

              {formData.isNewPartner && (
                <div className="grid gap-2">
                  <Label htmlFor="partnerName" className="font-medium">
                    New Partner Name
                  </Label>
                  <Input
                    id="partnerName"
                    value={formData.partnerName}
                    onChange={(e) => setFormData({ ...formData, partnerName: e.target.value })}
                    placeholder="Enter partner name"
                    className="h-10"
                    required={formData.isNewPartner}
                    disabled={isSubmitting}
                  />
                </div>
              )}

              <div className="grid gap-2">
                <Label htmlFor="visitDate" className="font-medium">
                  Visit Date
                </Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className="justify-start text-left font-normal h-10 w-full"
                      disabled={isSubmitting}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {formData.visitDate ? format(formData.visitDate, "PPP") : "Select a date"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <CalendarComponent
                      mode="single"
                      selected={formData.visitDate}
                      onSelect={(date) => date && setFormData({ ...formData, visitDate: date })}
                      disabled={(date) => isBefore(date, today) && !isToday(date)}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
              </div>

              <div className="flex items-center space-x-2 mb-2">
                <Checkbox
                  id="isFullDay"
                  checked={formData.isFullDay}
                  onCheckedChange={(checked) =>
                    setFormData({
                      ...formData,
                      isFullDay: checked === true,
                      startTime: checked === true ? "08:00" : formData.startTime,
                      endTime: checked === true ? "18:00" : formData.endTime,
                    })
                  }
                  disabled={isSubmitting}
                />
                <Label htmlFor="isFullDay" className="font-medium cursor-pointer">
                  Full Day Visit (8:00 AM - 6:00 PM)
                </Label>
              </div>

              {!formData.isFullDay && (
                <div className="grid grid-cols-2 gap-4">
                  <div className="grid gap-2">
                    <Label htmlFor="startTime" className="font-medium">
                      Start Time
                    </Label>
                    <Select
                      value={formData.startTime}
                      onValueChange={(value) => setFormData({ ...formData, startTime: value })}
                      disabled={isSubmitting || formData.isFullDay}
                    >
                      <SelectTrigger id="startTime" className="h-10">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {timeOptions.map((time) => (
                          <SelectItem key={`start-${time}`} value={time}>
                            {time}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="endTime" className="font-medium">
                      End Time
                    </Label>
                    <Select
                      value={formData.endTime}
                      onValueChange={(value) => setFormData({ ...formData, endTime: value })}
                      disabled={isSubmitting || formData.isFullDay}
                    >
                      <SelectTrigger id="endTime" className="h-10">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {timeOptions.map((time) => (
                          <SelectItem key={`end-${time}`} value={time}>
                            {time}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              )}

              <div className="grid gap-2">
                <Label htmlFor="guestDetails" className="font-medium">
                  Guests
                </Label>
                <Textarea
                  id="guestDetails"
                  value={formData.guestDetails}
                  onChange={(e) => setFormData({ ...formData, guestDetails: e.target.value })}
                  placeholder="List the guests you are bringing (names, companies, etc.)"
                  rows={3}
                  disabled={isSubmitting}
                  className="resize-none"
                />
                <p className="text-xs text-muted-foreground">
                  Please list all guests that will be visiting with you, including their names and organizations if
                  applicable.
                </p>
              </div>

              <div className="grid gap-2">
                <Label htmlFor="purpose" className="font-medium">
                  Purpose of Visit
                </Label>
                <Textarea
                  id="purpose"
                  value={formData.purpose}
                  onChange={(e) => setFormData({ ...formData, purpose: e.target.value })}
                  placeholder="Describe the purpose of this visit"
                  rows={3}
                  disabled={isSubmitting}
                  className="resize-none"
                />
              </div>

              <div className="grid gap-2">
                <Label htmlFor="authorizer" className="font-medium">
                  Authorized By <span className="text-red-500">*</span>
                </Label>
                {!formData.isCustomAuthorizer ? (
                  <div className="flex gap-2">
                    <Select
                      value={formData.authorizer}
                      onValueChange={(value) => {
                        if (value === "custom") {
                          setFormData({ ...formData, isCustomAuthorizer: true, authorizer: "" })
                        } else {
                          setFormData({ ...formData, authorizer: value })
                        }
                      }}
                      disabled={isSubmitting}
                    >
                      <SelectTrigger className="h-10 flex-1">
                        <SelectValue placeholder="Select who authorized this booking" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Georgina">Georgina</SelectItem>
                        <SelectItem value="Lesley">Lesley</SelectItem>
                        <SelectItem value="Jocelyn">Jocelyn</SelectItem>
                        <SelectItem value="Elizabeth">Elizabeth</SelectItem>
                        <SelectItem value="Sasha">Sasha</SelectItem>
                        <SelectItem value="custom">+ Add new name</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                ) : (
                  <div className="flex gap-2">
                    <Input
                      value={formData.customAuthorizerName}
                      onChange={(e) => setFormData({ ...formData, customAuthorizerName: e.target.value })}
                      placeholder="Enter authorizer name"
                      className="h-10 flex-1"
                      disabled={isSubmitting}
                    />
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setFormData({ ...formData, isCustomAuthorizer: false, customAuthorizerName: "" })}
                      disabled={isSubmitting}
                    >
                      Cancel
                    </Button>
                  </div>
                )}
                <p className="text-xs text-muted-foreground">
                  Select the person who authorized this partner guest visit
                </p>
              </div>

              <div className="space-y-4 border-t pt-4">
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="includeRoomBooking"
                    checked={formData.includeRoomBooking}
                    onCheckedChange={(checked) => setFormData({ ...formData, includeRoomBooking: !!checked })}
                    disabled={isSubmitting}
                  />
                  <Label htmlFor="includeRoomBooking" className="font-medium cursor-pointer">
                    Also book a room for this visit
                  </Label>
                </div>

                {formData.includeRoomBooking && (
                  <div className="space-y-4 border-l-2 border-primary/20 pl-4">
                    <div className="grid gap-2">
                      <Label htmlFor="selectedRoom" className="font-medium">
                        Room
                      </Label>
                      <Select
                        value={formData.selectedRoomId}
                        onValueChange={(value) => setFormData({ ...formData, selectedRoomId: value })}
                        disabled={isSubmitting}
                      >
                        <SelectTrigger className="h-10">
                          <SelectValue placeholder="Select a room" />
                        </SelectTrigger>
                        <SelectContent>
                          {rooms.map((room) => (
                            <SelectItem key={room.id} value={room.id}>
                              {room.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="grid gap-2">
                      <Label htmlFor="roomBookingTitle" className="font-medium">
                        Room Booking Title (Optional)
                      </Label>
                      <Input
                        id="roomBookingTitle"
                        value={formData.roomBookingTitle}
                        onChange={(e) => setFormData({ ...formData, roomBookingTitle: e.target.value })}
                        placeholder="Leave empty to auto-generate"
                        className="h-10"
                        disabled={isSubmitting}
                      />
                      <p className="text-xs text-muted-foreground">
                        If left empty, will use:{" "}
                        {formData.isNewPartner
                          ? formData.partnerName
                          : partners.find((p) => p.id === formData.partnerId)?.name || "Partner Name"}{" "}
                        - Guest Visit
                      </p>
                    </div>
                  </div>
                )}
              </div>

              {formError && (
                <div className="text-sm font-medium text-red-500 bg-red-50 p-3 rounded-md border border-red-100 flex items-start">
                  <AlertCircle className="h-5 w-5 mr-2 shrink-0 mt-0.5" />
                  {formError}
                </div>
              )}
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setIsFormOpen(false)} disabled={isSubmitting}>
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={
                  isSubmitting ||
                  (formData.isNewPartner && !formData.partnerName) ||
                  (!formData.isCustomAuthorizer && !formData.authorizer) ||
                  (formData.isCustomAuthorizer && !formData.customAuthorizerName.trim())
                }
              >
                {isSubmitting ? "Scheduling..." : "Schedule Visit"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Partner Visit</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete this partner visit?
              <br />
              <strong>
                {visitToDelete?.partners?.name || "Unknown Partner"} -{" "}
                {visitToDelete?.purpose || visitToDelete?.guest_details}
              </strong>
              <br />
              This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setDeleteDialogOpen(false)
                setVisitToDelete(null)
              }}
              disabled={isDeleting}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={() => visitToDelete && deleteVisit(visitToDelete)}
              disabled={isDeleting}
            >
              {isDeleting ? "Deleting..." : "Delete"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
