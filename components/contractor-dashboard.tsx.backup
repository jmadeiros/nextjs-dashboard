"use client"

import type React from "react"

import { CalendarIcon, Clock, Plus, AlertCircle, Trash2, Search, ChevronLeft, ChevronRight } from "lucide-react"
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
  addDays,
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
import { Calendar } from "@/components/ui/calendar"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Skeleton } from "@/components/ui/skeleton"
import DateDebug from "./date-debug"
import type { Database } from "@/types/supabase"
import { Checkbox } from "@/components/ui/checkbox"
import { toast } from "sonner"

type Contractor = Database["public"]["Tables"]["contractors"]["Row"]
type ContractorVisit = Database["public"]["Tables"]["contractor_visits"]["Row"]
type Room = Database["public"]["Tables"]["rooms"]["Row"]

interface ContractorDashboardProps {
  userId: string
  rooms?: Room[]
}

export default function ContractorDashboard({ userId, rooms = [] }: ContractorDashboardProps) {
  const [currentDate, setCurrentDate] = useState<Date>(new Date())
  const [selectedDate, setSelectedDate] = useState<Date>(new Date())
  const [contractors, setContractors] = useState<Contractor[]>([])
  const [visits, setVisits] = useState<ContractorVisit[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [view, setView] = useState<"month" | "list">("month")
  const [isFormOpen, setIsFormOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState("")
  const [showDebug, setShowDebug] = useState(false)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [visitToDelete, setVisitToDelete] = useState<ContractorVisit | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)

  // Form states
  const [formData, setFormData] = useState({
    contractorId: "",
    contractorName: "",
    company: "",
    email: "",
    phone: "",
    visitDate: new Date(),
    startTime: "09:00",
    endTime: "17:00",
    purpose: "",
    type: "contractor" as "contractor" | "volunteer",
    isNewContractor: false,
    isRecurring: false,
    recurrenceType: "weekly" as "weekly" | "bi-weekly" | "monthly",
    recurrenceEndDate: null as Date | null,
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

  // Fetch contractors and visits
  useEffect(() => {
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
            // Log the raw date from the database
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

    fetchData()
  }, [currentDate, supabase])

  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)
    setFormError(null)

    try {
      let contractorId = formData.contractorId

      // If it's a new contractor, create one first
      if (formData.isNewContractor) {
        const { data: newContractor, error: contractorError } = await supabase
          .from("contractors")
          .insert([
            {
              name: formData.contractorName,
              company: formData.company,
              email: formData.email,
              phone: formData.phone,
              type: formData.type, // Add this line
            },
          ])
          .select()
          .single()

        if (contractorError) {
          throw new Error(`Failed to create contractor: ${contractorError.message}`)
        }

        contractorId = newContractor.id
      }

      // Format the date to ensure it's stored correctly in UTC
      // Use noon UTC to avoid any timezone issues
      const year = formData.visitDate.getFullYear()
      const month = (formData.visitDate.getMonth() + 1).toString().padStart(2, "0")
      const day = formData.visitDate.getDate().toString().padStart(2, "0")
      const formattedDate = `${year}-${month}-${day}T12:00:00.000Z`

      console.log("[ContractorDashboard] Original visit date:", formData.visitDate)
      console.log("[ContractorDashboard] Formatted visit date for storage:", formattedDate)

      // Check for room conflicts BEFORE creating any records
      if (formData.includeRoomBooking && formData.selectedRoomId) {
        const visitDate = formData.visitDate
        const startTimeParts = formData.startTime.split(":").map(Number)
        const endTimeParts = formData.endTime.split(":").map(Number)

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
      const { data: newVisit, error: visitError } = await supabase
        .from("contractor_visits")
        .insert([
          {
            contractor_id: contractorId,
            visit_date: formattedDate,
            start_time: formData.startTime,
            end_time: formData.endTime,
            purpose: formData.purpose,
            status: "scheduled",
            is_recurring: formData.isRecurring,
            recurrence_pattern: formData.isRecurring
              ? JSON.stringify({
                  type: formData.recurrenceType,
                  endDate: formData.recurrenceEndDate?.toISOString(),
                })
              : null,
            authorizer: formData.isCustomAuthorizer ? formData.customAuthorizerName : formData.authorizer,
          },
        ])
        .select()
        .single()

      if (visitError) {
        throw new Error(`Failed to create visit: ${visitError.message}`)
      }

      console.log("[ContractorDashboard] Created new visit:", newVisit)

      // After creating the visit, if it's recurring, create additional visits
      if (formData.isRecurring) {
        const visits = []
        let currentDate = new Date(formData.visitDate)
        const endDate = formData.recurrenceEndDate || addMonths(formData.visitDate, 12) // Default to 1 year if no end date

        while (currentDate <= endDate) {
          if (formData.recurrenceType === "weekly") {
            currentDate = addDays(currentDate, 7)
          } else if (formData.recurrenceType === "bi-weekly") {
            currentDate = addDays(currentDate, 14)
          } else {
            currentDate = addMonths(currentDate, 1)
          }

          if (currentDate <= endDate) {
            const formattedRecurringDate = `${currentDate.getFullYear()}-${String(currentDate.getMonth() + 1).padStart(2, "0")}-${String(currentDate.getDate()).padStart(2, "0")}T12:00:00.000Z`

            visits.push({
              contractor_id: contractorId,
              visit_date: formattedRecurringDate,
              start_time: formData.startTime,
              end_time: formData.endTime,
              purpose: formData.purpose,
              status: "scheduled",
            })
          }
        }

        if (visits.length > 0) {
          const recurringVisits = visits.map((visit) => ({
            ...visit,
            is_recurring: true, // Add this line
            recurrence_pattern: JSON.stringify({
              type: formData.recurrenceType,
              endDate: formData.recurrenceEndDate?.toISOString(),
            }), // Add this line
          }))

          const { error: recurringError } = await supabase.from("contractor_visits").insert(recurringVisits)

          if (recurringError) {
            console.error("Error creating recurring visits:", recurringError)
            // Don't throw error, just log it since the main visit was created
          }
        }
      }

      // Create room booking if requested
      if (formData.includeRoomBooking && formData.selectedRoomId) {
        const contractorName = formData.isNewContractor
          ? formData.contractorName
          : contractors.find((c) => c.id === formData.contractorId)?.name || "Contractor"
        const contractorType = formData.isNewContractor
          ? formData.type
          : contractors.find((c) => c.id === formData.contractorId)?.type || "contractor"
        const roomBookingTitle = formData.roomBookingTitle || `${contractorName} - ${formData.purpose || "Visit"}`

        // Format the date and time for room booking
        const visitDate = formData.visitDate
        const startTime = formData.startTime.split(":").map(Number)
        const endTime = formData.endTime.split(":").map(Number)

        const startDateTime = new Date(
          visitDate.getFullYear(),
          visitDate.getMonth(),
          visitDate.getDate(),
          startTime[0],
          startTime[1],
          0,
        )

        const endDateTime = new Date(
          visitDate.getFullYear(),
          visitDate.getMonth(),
          visitDate.getDate(),
          endTime[0],
          endTime[1],
          0,
        )

        const { error: roomBookingError } = await supabase.from("bookings").insert([
          {
            room_id: formData.selectedRoomId,
            user_id: userId,
            title: roomBookingTitle,
            description: `${contractorType === "volunteer" ? "Volunteer" : "Contractor"} visit: ${formData.purpose || "No description"}`,
            start_time: startDateTime.toISOString(),
            end_time: endDateTime.toISOString(),
            is_recurring: formData.isRecurring,
            recurrence_pattern: formData.isRecurring
              ? JSON.stringify({
                  type: formData.recurrenceType,
                  endDate: formData.recurrenceEndDate?.toISOString(),
                })
              : null,
          },
        ])

        if (roomBookingError) {
          // If room booking fails, delete the contractor visit we just created
          await supabase.from("contractor_visits").delete().eq("id", newVisit.id)
          throw new Error(`Failed to create room booking: ${roomBookingError.message}`)
        }
      }

      // Refresh data
      const { data: updatedVisits, error: fetchError } = await supabase
        .from("contractor_visits")
        .select("*")
        .gte("visit_date", startOfMonth(currentDate).toISOString())
        .lte("visit_date", endOfMonth(currentDate).toISOString())
        .order("visit_date")

      if (fetchError) {
        throw new Error(`Failed to refresh visits: ${fetchError.message}`)
      }

      setVisits(updatedVisits || [])

      // If we created a new contractor, refresh the contractors list
      if (formData.isNewContractor) {
        const { data: updatedContractors, error: contractorsError } = await supabase
          .from("contractors")
          .select("*")
          .order("name")

        if (contractorsError) {
          throw new Error(`Failed to refresh contractors: ${contractorsError.message}`)
        }

        setContractors(updatedContractors || [])
      }

      // Reset form and close dialog
      resetForm()
      setIsFormOpen(false)
      toast.success("Visit scheduled successfully!", {
        description: "The contractor/volunteer visit has been scheduled.",
      })
    } catch (error) {
      console.error("Error submitting form:", error)
      setFormError(`Error: ${error instanceof Error ? error.message : String(error)}`)
      toast.error("Failed to schedule visit.", {
        description: `Error: ${error instanceof Error ? error.message : String(error)}`,
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  // Delete visit function
  const deleteVisit = async () => {
    if (!visitToDelete) return

    setIsDeleting(true)
    try {
      const { error } = await supabase.from("contractor_visits").delete().eq("id", visitToDelete.id)

      if (error) {
        throw new Error(`Failed to delete visit: ${error.message}`)
      }

      // Refresh data
      const { data: updatedVisits, error: fetchError } = await supabase
        .from("contractor_visits")
        .select("*")
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
        description: "The contractor/volunteer visit has been removed.",
      })
    } catch (error) {
      console.error("Error deleting visit:", error)
      setError(`Error: ${error instanceof Error ? error.message : String(error)}`)
      toast.error("Failed to delete visit.", {
        description: `Error: ${error instanceof Error ? error.message : String(error)}`,
      })
    } finally {
      setIsDeleting(false)
    }
  }

  // Reset form to default values
  const resetForm = () => {
    setFormData({
      contractorId: "",
      contractorName: "",
      company: "",
      email: "",
      phone: "",
      visitDate: new Date(),
      startTime: "09:00",
      endTime: "17:00",
      purpose: "",
      type: "contractor",
      isNewContractor: false,
      isRecurring: false,
      recurrenceType: "weekly",
      recurrenceEndDate: null,
      includeRoomBooking: false,
      selectedRoomId: "",
      roomBookingTitle: "",
      authorizer: "",
      isCustomAuthorizer: false,
      customAuthorizerName: "",
    })
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

  // Get contractor name by ID
  const getContractorName = (contractorId: string) => {
    const contractor = contractors.find((c) => c.id === contractorId)
    return contractor ? contractor.name : "Unknown Contractor"
  }

  // Get visits for a specific day - with explicit timezone handling
  const getVisitsForDay = (day: Date) => {
    return visits.filter((visit) => {
      // Parse the visit date from the database
      const visitDate = parseISO(visit.visit_date)

      // Get the date components in local timezone
      const visitYear = visitDate.getFullYear()
      const visitMonth = visitDate.getMonth()
      const visitDay = visitDate.getDate()

      // Get the day components in local timezone
      const dayYear = day.getFullYear()
      const dayMonth = day.getMonth()
      const dayDay = day.getDate()

      // Compare the date components directly
      const isSameDate = visitYear === dayYear && visitMonth === dayMonth && visitDay === dayDay

      if (isSameDate) {
        console.log(`[ContractorDashboard] Visit matches day ${format(day, "yyyy-MM-dd")}:`, visit)
        console.log(`[ContractorDashboard] Visit date: ${format(visitDate, "yyyy-MM-dd")}`)
      }

      return isSameDate
    })
  }

  // Filter visits based on search query
  const filteredVisits = visits.filter((visit) => {
    const contractorName = getContractorName(visit.contractor_id).toLowerCase()
    return contractorName.includes(searchQuery.toLowerCase())
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
            <h1 className="text-3xl font-bold tracking-tight">Contractor & Volunteer Visit Dashboard</h1>
            <p className="text-muted-foreground mt-1">Manage and track contractor and volunteer visits to the site</p>
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
              <Plus className="mr-2 h-4 w-4" /> New Visit
            </Button>
            <Button variant="outline" onClick={() => setShowDebug(!showDebug)}>
              {showDebug ? "Hide Debug" : "Debug"}
            </Button>
          </div>
        </div>
      </div>

      {showDebug && <DateDebug />}

      <Card className="shadow-md border-primary/10">
        <CardHeader className="bg-muted/50 border-b">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div>
              <CardTitle>Contractor & Volunteer Visits</CardTitle>
              <CardDescription>View and manage contractor and volunteer visits</CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <div className="relative">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  type="search"
                  placeholder="Search contractors & volunteers..."
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
                            {dayVisits.slice(0, 3).map((visit) => {
                              const contractor = contractors.find((c) => c.id === visit.contractor_id)
                              const isVolunteer = contractor?.type === "volunteer"

                              return (
                                <div
                                  key={visit.id}
                                  className={`text-xs p-1 border rounded ${
                                    isVolunteer ? "bg-green-100 border-green-300" : "bg-amber-100 border-amber-300"
                                  }`}
                                  title={`${getContractorName(visit.contractor_id)} (${contractor?.type || "contractor"}) (${visit.start_time} - ${visit.end_time})${visit.purpose ? `: ${visit.purpose}` : ""}`}
                                >
                                  <div className="font-medium truncate flex items-center gap-1">
                                    <span
                                      className={`w-2 h-2 rounded-full ${isVolunteer ? "bg-green-500" : "bg-amber-500"}`}
                                    ></span>
                                    {getContractorName(visit.contractor_id)}
                                  </div>
                                  {visit.purpose && (
                                    <div
                                      className={`text-[10px] truncate ${isVolunteer ? "text-green-700" : "text-amber-700"}`}
                                    >
                                      {visit.purpose.length > 20
                                        ? visit.purpose.substring(0, 20) + "..."
                                        : visit.purpose}
                                    </div>
                                  )}
                                </div>
                              )
                            })}
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
                        className={`overflow-hidden ${isUpcoming ? "border-amber-300" : "border-gray-200"}`}
                      >
                        <CardContent className="p-0">
                          <div
                            className={`border-l-4 p-4 ${
                              isUpcoming ? "border-amber-400 bg-amber-50" : "border-gray-300 bg-gray-50"
                            }`}
                          >
                            <div className="flex justify-between items-start">
                              <div>
                                <div className="flex items-center gap-2">
                                  <h3 className="font-medium text-lg">{getContractorName(visit.contractor_id)}</h3>
                                  <div
                                    className={`text-xs px-2 py-0.5 rounded-full ${
                                      contractors.find((c) => c.id === visit.contractor_id)?.type === "volunteer"
                                        ? "bg-green-100 text-green-700 border border-green-200"
                                        : "bg-amber-100 text-amber-700 border border-amber-200"
                                    }`}
                                  >
                                    {contractors.find((c) => c.id === visit.contractor_id)?.type === "volunteer"
                                      ? "Volunteer"
                                      : "Contractor"}
                                  </div>
                                  <div
                                    className={`text-xs px-2 py-0.5 rounded-full ${
                                      visit.status === "scheduled"
                                        ? "bg-blue-100 text-blue-700"
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
                                  <CalendarIcon className="h-4 w-4 mr-1.5 text-primary/70" />
                                  <span className="font-medium">
                                    {format(parseISO(visit.visit_date), "EEEE, MMMM d, yyyy")}
                                  </span>
                                </div>
                                <div className="flex items-center text-sm text-muted-foreground mt-1">
                                  <Clock className="h-4 w-4 mr-1.5 text-primary/70" />
                                  <span className="font-medium">
                                    {visit.start_time} - {visit.end_time}
                                  </span>
                                </div>
                                {visit.purpose && (
                                  <div className="mt-2 text-sm text-muted-foreground">
                                    <span className="font-medium">Purpose:</span> {visit.purpose}
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
                  <CalendarIcon className="h-12 w-12 mx-auto text-muted-foreground mb-3" />
                  <h3 className="text-lg font-medium mb-1">No contractor/volunteer visits found</h3>
                  <p className="text-muted-foreground mb-4">
                    {searchQuery ? "Try a different search term" : "Click 'New Visit' to schedule one"}
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
                <Plus className="h-3.5 w-3.5" /> Add Visit
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
                  getVisitsForDay(selectedDate).map((visit) => {
                    const contractor = contractors.find((c) => c.id === visit.contractor_id)
                    const isVolunteer = contractor?.type === "volunteer"

                    return (
                      <Card
                        key={visit.id}
                        className={`overflow-hidden shadow-sm ${isVolunteer ? "border-green-300" : "border-amber-300"}`}
                      >
                        <CardContent className="p-0">
                          <div
                            className={`border-l-4 p-4 ${isVolunteer ? "border-green-400 bg-green-50" : "border-amber-400 bg-amber-50"}`}
                          >
                            <div className="flex justify-between items-start">
                              <div>
                                <div className="flex items-center gap-2">
                                  <h3 className="font-medium text-lg">{getContractorName(visit.contractor_id)}</h3>
                                  <div
                                    className={`text-xs px-2 py-0.5 rounded-full ${
                                      contractor?.type === "volunteer"
                                        ? "bg-green-100 text-green-700 border border-green-200"
                                        : "bg-amber-100 text-amber-700 border border-amber-200"
                                    }`}
                                  >
                                    {contractor?.type === "volunteer" ? "Volunteer" : "Contractor"}
                                  </div>
                                  <div
                                    className={`text-xs px-2 py-0.5 rounded-full ${
                                      visit.status === "scheduled"
                                        ? "bg-blue-100 text-blue-700"
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
                                    {visit.start_time} - {visit.end_time}
                                  </span>
                                </div>
                                {visit.purpose && (
                                  <div className="mt-2 text-sm text-muted-foreground">
                                    <span className="font-medium">Purpose:</span> {visit.purpose}
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
                              </div>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    )
                  })
                ) : (
                  <div className="text-center py-8 px-4 bg-muted/20 rounded-lg border border-dashed border-muted">
                    <CalendarIcon className="h-10 w-10 mx-auto text-muted-foreground mb-2" />
                    <h3 className="text-base font-medium mb-1">No contractor/volunteer visits for this day</h3>
                    <p className="text-sm text-muted-foreground mb-3">Click 'Add Visit' to schedule one</p>
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
                <CalendarIcon className="mr-2 h-5 w-5 text-primary" />
                Schedule Contractor/Volunteer Visit
              </DialogTitle>
              <DialogDescription>Enter the details for the contractor visit.</DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label htmlFor="contractor" className="font-medium">
                  Contractor/Volunteer
                </Label>
                <div className="flex items-center gap-2">
                  <Select
                    value={formData.contractorId}
                    onValueChange={(value) => {
                      setFormData({
                        ...formData,
                        contractorId: value,
                        isNewContractor: value === "new",
                      })
                    }}
                    disabled={isSubmitting}
                  >
                    <SelectTrigger className="h-10 flex-1">
                      <SelectValue placeholder="Select a contractor" />
                    </SelectTrigger>
                    <SelectContent>
                      {contractors.map((contractor) => (
                        <SelectItem key={contractor.id} value={contractor.id}>
                          <div className="flex items-center gap-2">
                            <span
                              className={`w-2 h-2 rounded-full ${
                                contractor.type === "volunteer" ? "bg-green-500" : "bg-amber-500"
                              }`}
                            ></span>
                            {contractor.name}
                            {contractor.company ? ` (${contractor.company})` : ""}
                            <span className="text-xs text-muted-foreground">
                              ({contractor.type === "volunteer" ? "Volunteer" : "Contractor"})
                            </span>
                          </div>
                        </SelectItem>
                      ))}
                      <SelectItem value="new">+ Add New Contractor/Volunteer</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {formData.isNewContractor && (
                <div className="space-y-4 border-l-2 border-primary/20 pl-4">
                  <div className="grid gap-2">
                    <Label htmlFor="type" className="font-medium">
                      Type
                    </Label>
                    <Select
                      value={formData.type}
                      onValueChange={(value: "contractor" | "volunteer") => setFormData({ ...formData, type: value })}
                      disabled={isSubmitting}
                    >
                      <SelectTrigger className="h-10">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="contractor">Contractor</SelectItem>
                        <SelectItem value="volunteer">Volunteer</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="grid gap-2">
                    <Label htmlFor="contractorName" className="font-medium">
                      {formData.type === "volunteer" ? "Volunteer" : "Contractor"} Name
                    </Label>
                    <Input
                      id="contractorName"
                      value={formData.contractorName}
                      onChange={(e) => setFormData({ ...formData, contractorName: e.target.value })}
                      placeholder={`Enter ${formData.type} name`}
                      className="h-10"
                      required={formData.isNewContractor}
                      disabled={isSubmitting}
                    />
                  </div>

                  <div className="grid gap-2">
                    <Label htmlFor="company" className="font-medium">
                      Company (Optional)
                    </Label>
                    <Input
                      id="company"
                      value={formData.company}
                      onChange={(e) => setFormData({ ...formData, company: e.target.value })}
                      placeholder="Enter company name"
                      className="h-10"
                      disabled={isSubmitting}
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="grid gap-2">
                      <Label htmlFor="email" className="font-medium">
                        Email (Optional)
                      </Label>
                      <Input
                        id="email"
                        type="email"
                        value={formData.email}
                        onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                        placeholder="Enter email"
                        className="h-10"
                        disabled={isSubmitting}
                      />
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor="phone" className="font-medium">
                        Phone (Optional)
                      </Label>
                      <Input
                        id="phone"
                        value={formData.phone}
                        onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                        placeholder="Enter phone number"
                        className="h-10"
                        disabled={isSubmitting}
                      />
                    </div>
                  </div>
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
                    <Calendar
                      mode="single"
                      selected={formData.visitDate}
                      onSelect={(date) => date && setFormData({ ...formData, visitDate: date })}
                      disabled={(date) => isBefore(date, today) && !isToday(date)}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="startTime" className="font-medium">
                    Start Time
                  </Label>
                  <Select
                    value={formData.startTime}
                    onValueChange={(value) => setFormData({ ...formData, startTime: value })}
                    disabled={isSubmitting}
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
                    disabled={isSubmitting}
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

              <div className="grid gap-2">
                <Label htmlFor="purpose" className="font-medium">
                  Purpose (Optional)
                </Label>
                <Textarea
                  id="purpose"
                  value={formData.purpose}
                  onChange={(e) => setFormData({ ...formData, purpose: e.target.value })}
                  placeholder="Enter the purpose of the visit"
                  rows={3}
                  disabled={isSubmitting}
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
                  Select the person who authorized this contractor/volunteer visit
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
                        disabled={isSubmitting || !rooms || rooms.length === 0}
                      >
                        <SelectTrigger className="h-10">
                          <SelectValue
                            placeholder={rooms && rooms.length > 0 ? "Select a room" : "No rooms available"}
                          />
                        </SelectTrigger>
                        <SelectContent>
                          {rooms && rooms.length > 0 ? (
                            rooms.map((room) => (
                              <SelectItem key={room.id} value={room.id}>
                                {room.name}
                              </SelectItem>
                            ))
                          ) : (
                            <SelectItem value="no-rooms" disabled>
                              No rooms available
                            </SelectItem>
                          )}
                        </SelectContent>
                      </Select>
                      {(!rooms || rooms.length === 0) && (
                        <p className="text-xs text-amber-600">No rooms available. Please contact an administrator.</p>
                      )}
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
                        If left empty, will use: {formData.contractorName || "Contractor Name"} -{" "}
                        {formData.purpose || "Visit"}
                      </p>
                    </div>
                  </div>
                )}
              </div>

              <div className="grid gap-2">
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="isRecurring"
                    checked={formData.isRecurring}
                    onCheckedChange={(checked) => setFormData({ ...formData, isRecurring: !!checked })}
                    disabled={isSubmitting}
                  />
                  <Label htmlFor="isRecurring" className="font-medium cursor-pointer">
                    Make this a recurring visit
                  </Label>
                </div>
              </div>

              {formData.isRecurring && (
                <div className="space-y-4 border-l-2 border-primary/20 pl-4">
                  <div className="grid gap-2">
                    <Label htmlFor="recurrenceType" className="font-medium">
                      Repeat
                    </Label>
                    <Select
                      value={formData.recurrenceType}
                      onValueChange={(value: "weekly" | "bi-weekly" | "monthly") =>
                        setFormData({ ...formData, recurrenceType: value })
                      }
                      disabled={isSubmitting}
                    >
                      <SelectTrigger className="h-10">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="weekly">Weekly</SelectItem>
                        <SelectItem value="bi-weekly">Every Two Weeks</SelectItem>
                        <SelectItem value="monthly">Monthly</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="grid gap-2">
                    <Label htmlFor="recurrenceEndDate" className="font-medium">
                      End Date (Optional)
                    </Label>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button
                          variant="outline"
                          className="justify-start text-left font-normal h-10 w-full"
                          disabled={isSubmitting}
                        >
                          <CalendarIcon className="mr-2 h-4 w-4" />
                          {formData.recurrenceEndDate ? format(formData.recurrenceEndDate, "PPP") : "Select end date"}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar
                          mode="single"
                          selected={formData.recurrenceEndDate}
                          onSelect={(date) => setFormData({ ...formData, recurrenceEndDate: date })}
                          disabled={(date) => isBefore(date, formData.visitDate)}
                          initialFocus
                        />
                      </PopoverContent>
                    </Popover>
                    <p className="text-xs text-muted-foreground">Leave empty for ongoing recurring visits</p>
                  </div>
                </div>
              )}

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
                  (formData.isNewContractor && !formData.contractorName) ||
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
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Delete Contractor/Volunteer Visit</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete this contractor/volunteer visit? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            {visitToDelete && (
              <div className="bg-amber-50 p-3 rounded-md border border-amber-200">
                <p className="font-medium">{getContractorName(visitToDelete.contractor_id)}</p>
                <p className="text-sm text-muted-foreground">
                  {format(parseISO(visitToDelete.visit_date), "EEEE, MMMM d, yyyy")}
                </p>
                <p className="text-sm text-muted-foreground">
                  {visitToDelete.start_time} - {visitToDelete.end_time}
                </p>
                {visitToDelete.purpose && (
                  <p className="text-sm text-muted-foreground mt-1">
                    <span className="font-medium">Purpose:</span> {visitToDelete.purpose}
                  </p>
                )}
              </div>
            )}
          </div>
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
            <Button variant="destructive" onClick={deleteVisit} disabled={isDeleting}>
              {isDeleting ? "Deleting..." : "Delete Visit"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
