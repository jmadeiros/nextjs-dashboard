"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { format, parseISO, addDays, addWeeks, addMonths, isBefore, isToday, startOfDay } from "date-fns"
import { getSupabaseClient } from "@/lib/supabase-client"
import { Button } from "@/components/ui/button"
import { Calendar } from "@/components/ui/calendar"
import { Checkbox } from "@/components/ui/checkbox"
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
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { CalendarIcon, AlertCircle, RefreshCw, X } from "lucide-react"
import type { Database, RecurrenceType, DayOfWeek, RecurrencePattern } from "@/types/supabase"
import { v4 as uuidv4 } from "uuid"
import { Badge } from "@/components/ui/badge"
import { toast } from "sonner"

type Room = Database["public"]["Tables"]["rooms"]["Row"]
type Booking = Database["public"]["Tables"]["bookings"]["Row"]

interface BookingFormProps {
  isOpen: boolean
  onClose: () => void
  rooms: Room[]
  selectedRoom: Room | null
  userId: string
  selectedDate: Date
  onBookingCreated: (booking: Booking) => void
}

export default function BookingForm({
  isOpen,
  onClose,
  rooms,
  selectedRoom,
  userId,
  selectedDate,
  onBookingCreated,
}: BookingFormProps) {
  // Add diagnostic logging
  useEffect(() => {
    console.log("[BookingForm] Component mounted")
    return () => console.log("[BookingForm] Component unmounted")
  }, [])

  const [title, setTitle] = useState("")
  const [description, setDescription] = useState("")
  const [date, setDate] = useState<Date>(selectedDate)
  const [startTime, setStartTime] = useState("09:00")
  const [endTime, setEndTime] = useState("10:00")
  const [roomId, setRoomId] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [authorizer, setAuthorizer] = useState<string>("")
  const [customAuthorizer, setCustomAuthorizer] = useState<string>("")
  const [isCustomAuthorizer, setIsCustomAuthorizer] = useState<boolean>(false)

  // Multiple rooms booking states
  const [isMultipleRooms, setIsMultipleRooms] = useState(false)
  const [selectedRoomIds, setSelectedRoomIds] = useState<string[]>([])

  // Recurring booking states
  const [isRecurring, setIsRecurring] = useState(false)
  const [recurrenceType, setRecurrenceType] = useState<RecurrenceType>("none")
  const [recurrenceInterval, setRecurrenceInterval] = useState(1)
  const [selectedDaysOfWeek, setSelectedDaysOfWeek] = useState<DayOfWeek[]>([])
  const [recurrenceEndDate, setRecurrenceEndDate] = useState<Date | undefined>(undefined)
  const [showRecurrenceEndDate, setShowRecurrenceEndDate] = useState(false)

  const predefinedAuthorizers = ["Georgina", "Lesley", "Jocelyn", "Elizabeth", "Sasha"]

  // Get Supabase client once during component initialization
  const supabase = getSupabaseClient()

  // Update form when selectedRoom or selectedDate changes
  useEffect(() => {
    if (isOpen) {
      console.log(
        `[BookingForm] Form opened with room: ${selectedRoom?.name || "none"} and date: ${format(selectedDate, "yyyy-MM-dd")}`,
      )

      if (selectedRoom) {
        setRoomId(selectedRoom.id)
        // Initialize the selected rooms array with the current room
        setSelectedRoomIds(selectedRoom.id ? [selectedRoom.id] : [])
      }

      // Ensure the selected date is not in the past
      const today = startOfDay(new Date())
      if (isBefore(selectedDate, today) && !isToday(selectedDate)) {
        setDate(today)
      } else {
        setDate(selectedDate)
      }
    }
  }, [selectedRoom, selectedDate, isOpen])

  // Reset form when closed
  useEffect(() => {
    if (!isOpen) {
      setTitle("")
      setDescription("")
      setStartTime("09:00")
      setEndTime("10:00")
      setIsRecurring(false)
      setRecurrenceType("none")
      setRecurrenceInterval(1)
      setSelectedDaysOfWeek([])
      setRecurrenceEndDate(undefined)
      setShowRecurrenceEndDate(false)
      setIsSubmitting(false)
      setError(null)
      setAuthorizer("")
      setCustomAuthorizer("")
      setIsCustomAuthorizer(false)
      setIsMultipleRooms(false)
      setSelectedRoomIds([])
    }
  }, [isOpen])

  // Update selected rooms when roomId changes and not in multiple rooms mode
  useEffect(() => {
    if (!isMultipleRooms && roomId) {
      setSelectedRoomIds([roomId])
    }
  }, [roomId, isMultipleRooms])

  // Handle adding a room to the selected rooms
  const handleAddRoom = () => {
    if (roomId && !selectedRoomIds.includes(roomId)) {
      setSelectedRoomIds([...selectedRoomIds, roomId])
    }
  }

  // Handle removing a room from the selected rooms
  const handleRemoveRoom = (id: string) => {
    setSelectedRoomIds(selectedRoomIds.filter((roomId) => roomId !== id))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    // Validate room selection
    if (isMultipleRooms) {
      if (selectedRoomIds.length === 0) {
        setError("Please select at least one room")
        return
      }
    } else {
      if (!roomId) {
        setError("Please select a room")
        return
      }
    }

    if (!isCustomAuthorizer && !authorizer) {
      setError("Please select who authorized this booking")
      return
    }

    if (isCustomAuthorizer && !customAuthorizer.trim()) {
      setError("Please enter the name of who authorized this booking")
      return
    }

    // Validate that the date is not in the past
    const today = startOfDay(new Date())
    if (isBefore(date, today) && !isToday(date)) {
      setError("Cannot book dates in the past")
      return
    }

    console.log(
      `[BookingForm] Submitting booking for ${isMultipleRooms ? "multiple rooms" : `room: ${roomId}`}, date: ${format(date, "yyyy-MM-dd")}`,
    )
    setIsSubmitting(true)
    setError(null)

    // Parse times with explicit timezone handling
    const [startHour, startMinute] = startTime.split(":").map(Number)
    const [endHour, endMinute] = endTime.split(":").map(Number)

    // Create date objects with the correct time
    const startDateTime = new Date(date)
    startDateTime.setHours(startHour, startMinute, 0, 0)

    const endDateTime = new Date(date)
    endDateTime.setHours(endHour, endMinute, 0, 0)

    console.log(`[BookingForm] Start time: ${startDateTime.toISOString()}`)
    console.log(`[BookingForm] End time: ${endDateTime.toISOString()}`)

    // Validate that the start time is not in the past
    const now = new Date()
    if (isBefore(startDateTime, now)) {
      setError("Cannot book a time that has already passed")
      setIsSubmitting(false)
      return
    }

    // Validate times
    if (endDateTime <= startDateTime) {
      setError("End time must be after start time")
      setIsSubmitting(false)
      return
    }

    // Ensure we have a valid UUID for the user
    const validUserId = userId === "current-user" ? uuidv4() : userId
    console.log(`[BookingForm] Using user ID: ${validUserId}`)

    try {
      if (isMultipleRooms) {
        // Handle multiple room bookings
        const roomsToBook = isMultipleRooms ? selectedRoomIds : [roomId]
        let successfulBookings = 0
        const failedRooms: string[] = []

        // Check for conflicts for all rooms first
        for (const roomIdToBook of roomsToBook) {
          const hasConflict = await checkRoomConflict(roomIdToBook, startDateTime, endDateTime)
          if (hasConflict) {
            const room = rooms.find((r) => r.id === roomIdToBook)
            failedRooms.push(room?.name || roomIdToBook)
          }
        }

        if (failedRooms.length > 0) {
          throw new Error(`Time conflict for room(s): ${failedRooms.join(", ")}. Please select a different time.`)
        }

        // Create bookings for each room
        for (const roomIdToBook of roomsToBook) {
          if (!isRecurring) {
            // Single booking for each room
            const newBooking = await createSingleBooking(roomIdToBook, startDateTime, endDateTime, validUserId)
            if (newBooking) {
              successfulBookings++
            }
          } else {
            // Recurring booking for each room
            const newBookings = await createRecurringBookings(roomIdToBook, startDateTime, endDateTime, validUserId)
            if (newBookings && newBookings.length > 0) {
              successfulBookings++
            }
          }
        }

        console.log(`[BookingForm] Successfully created bookings for ${successfulBookings} rooms`)

        // Use the first room's booking as a reference for the callback
        const firstRoomId = roomsToBook[0]
        const { data: firstBooking } = await supabase
          .from("bookings")
          .select("*")
          .eq("room_id", firstRoomId)
          .eq("start_time", startDateTime.toISOString())
          .eq("end_time", endDateTime.toISOString())
          .order("created_at", { ascending: false })
          .limit(1)
          .single()

        if (firstBooking) {
          onBookingCreated(firstBooking)
        }
      } else {
        // Single room booking (original logic)
        if (!isRecurring) {
          // Single booking
          const newBooking = await createSingleBooking(roomId, startDateTime, endDateTime, validUserId)
          if (newBooking) {
            console.log(`[BookingForm] Successfully created booking: ${newBooking.id}`)
            onBookingCreated(newBooking)
          }
        } else {
          // Recurring booking
          const newBookings = await createRecurringBookings(roomId, startDateTime, endDateTime, validUserId)
          if (newBookings && newBookings.length > 0) {
            console.log(`[BookingForm] Successfully created ${newBookings.length} recurring bookings`)
            onBookingCreated(newBookings[0])
          }
        }
      }

      // Close the form
      onClose()
      toast.success("Booking created successfully!", {
        description: `Your booking has been created for ${format(date, "PPP")} from ${startTime} to ${endTime}.`,
      })
    } catch (error) {
      console.error("[BookingForm] Exception creating booking:", error)
      setError(`Error: ${error instanceof Error ? error.message : String(error)}`)
      toast.error("Error creating booking.", {
        description: error instanceof Error ? error.message : String(error),
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  // Check if a room has a conflict for the given time
  const checkRoomConflict = async (roomIdToCheck: string, startDateTime: Date, endDateTime: Date) => {
    const { data: existingBookings, error: fetchError } = await supabase
      .from("bookings")
      .select("*")
      .eq("room_id", roomIdToCheck)
      .lt("start_time", endDateTime.toISOString())
      .gt("end_time", startDateTime.toISOString())

    if (fetchError) {
      console.error("[BookingForm] Error checking availability:", fetchError)
      throw new Error("Error checking availability: " + fetchError.message)
    }

    return existingBookings && existingBookings.length > 0
  }

  const createSingleBooking = async (
    roomIdToBook: string,
    startDateTime: Date,
    endDateTime: Date,
    validUserId: string,
  ) => {
    // Check for overlapping bookings
    console.log(`[BookingForm] Checking for overlapping bookings for room ${roomIdToBook}`)
    const { data: existingBookings, error: fetchError } = await supabase
      .from("bookings")
      .select("*")
      .eq("room_id", roomIdToBook)
      .lt("start_time", endDateTime.toISOString())
      .gt("end_time", startDateTime.toISOString())

    if (fetchError) {
      console.error("[BookingForm] Error checking availability:", fetchError)
      throw new Error("Error checking availability: " + fetchError.message)
    }

    if (existingBookings && existingBookings.length > 0) {
      // Find the conflicting booking for a more helpful error message
      const conflictingBooking = existingBookings[0]
      const conflictStart = format(parseISO(conflictingBooking.start_time), "h:mm a")
      const conflictEnd = format(parseISO(conflictingBooking.end_time), "h:mm a")
      const room = rooms.find((r) => r.id === roomIdToBook)

      console.log(`[BookingForm] Found conflicting booking: ${conflictingBooking.id}`)
      throw new Error(
        `Time conflict: ${room?.name || "Room"} already booked from ${conflictStart} to ${conflictEnd}. Please select a different time.`,
      )
    }

    // Create booking
    console.log(`[BookingForm] Creating new booking with user ID: ${validUserId} for room ${roomIdToBook}`)

    const bookingData = {
      room_id: roomIdToBook,
      user_id: validUserId,
      title,
      description,
      start_time: startDateTime.toISOString(),
      end_time: endDateTime.toISOString(),
      is_recurring: false,
      recurrence_pattern: null,
      authorizer: isCustomAuthorizer ? customAuthorizer : authorizer,
    }

    console.log("[BookingForm] Booking data to insert:", bookingData)

    const { data, error: insertError } = await supabase.from("bookings").insert([bookingData]).select().single()

    if (insertError) {
      console.error("[BookingForm] Error creating booking:", insertError)
      throw new Error("Error creating booking: " + insertError.message)
    }

    console.log(`[BookingForm] Booking created successfully:`, data)
    return data
  }

  const createRecurringBookings = async (
    roomIdToBook: string,
    startDateTime: Date,
    endDateTime: Date,
    validUserId: string,
  ) => {
    // Calculate the duration of the booking in minutes
    const durationMinutes = (endDateTime.getTime() - startDateTime.getTime()) / (1000 * 60)

    // Determine the end date for recurrence
    const maxEndDate = recurrenceEndDate || addMonths(startDateTime, 3) // Default to 3 months if no end date

    // Generate all the recurring dates
    const recurringDates: { start: Date; end: Date }[] = []
    let currentDate = new Date(startDateTime)

    // Create a recurrence pattern object for storage
    const recurrencePattern: RecurrencePattern = {
      type: recurrenceType,
      interval: recurrenceInterval,
      daysOfWeek: selectedDaysOfWeek.length > 0 ? selectedDaysOfWeek : undefined,
      endDate: recurrenceEndDate ? recurrenceEndDate.toISOString() : undefined,
    }

    // Generate dates based on recurrence type
    while (isBefore(currentDate, maxEndDate)) {
      if (recurrenceType === "daily") {
        // For daily recurrence
        recurringDates.push({
          start: new Date(currentDate),
          end: new Date(new Date(currentDate).setMinutes(currentDate.getMinutes() + durationMinutes)),
        })
        currentDate = addDays(currentDate, recurrenceInterval)
      } else if (recurrenceType === "weekly") {
        // For weekly recurrence
        if (selectedDaysOfWeek.length > 0) {
          // If specific days are selected, create bookings for each selected day
          const dayIndex = currentDate.getDay() // 0 = Sunday, 1 = Monday, etc.
          const dayName = ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"][
            dayIndex
          ] as DayOfWeek

          if (selectedDaysOfWeek.includes(dayName)) {
            recurringDates.push({
              start: new Date(currentDate),
              end: new Date(new Date(currentDate).setMinutes(currentDate.getMinutes() + durationMinutes)),
            })
          }

          // Move to the next day
          currentDate = addDays(currentDate, 1)

          // If we've gone through a full week, add the interval
          if (currentDate.getDay() === 0) {
            currentDate = addDays(currentDate, (recurrenceInterval - 1) * 7)
          }
        } else {
          // If no specific days are selected, just repeat on the same day each week
          recurringDates.push({
            start: new Date(currentDate),
            end: new Date(new Date(currentDate).setMinutes(currentDate.getMinutes() + durationMinutes)),
          })
          currentDate = addWeeks(currentDate, recurrenceInterval)
        }
      } else if (recurrenceType === "monthly") {
        // For monthly recurrence
        recurringDates.push({
          start: new Date(currentDate),
          end: new Date(new Date(currentDate).setMinutes(currentDate.getMinutes() + durationMinutes)),
        })
        currentDate = addMonths(currentDate, recurrenceInterval)
      }
    }

    // Check for conflicts with all recurring dates
    for (const recurringDate of recurringDates) {
      const { data: existingBookings, error: fetchError } = await supabase
        .from("bookings")
        .select("*")
        .eq("room_id", roomIdToBook)
        .lt("start_time", recurringDate.end.toISOString())
        .gt("end_time", recurringDate.start.toISOString())

      if (fetchError) {
        console.error("[BookingForm] Error checking availability:", fetchError)
        throw new Error("Error checking availability: " + fetchError.message)
      }

      if (existingBookings && existingBookings.length > 0) {
        // Find the conflicting booking for a more helpful error message
        const conflictingBooking = existingBookings[0]
        const conflictDate = format(parseISO(conflictingBooking.start_time), "MMMM d, yyyy")
        const conflictStart = format(parseISO(conflictingBooking.start_time), "h:mm a")
        const conflictEnd = format(parseISO(conflictingBooking.end_time), "h:mm a")
        const room = rooms.find((r) => r.id === roomIdToBook)

        console.log(`[BookingForm] Found conflicting booking: ${conflictingBooking.id}`)
        throw new Error(
          `Time conflict: ${room?.name || "Room"} already booked on ${conflictDate} from ${conflictStart} to ${conflictEnd}. Please select a different time or pattern.`,
        )
      }
    }

    const bookingsToInsert = recurringDates.map((date) => ({
      room_id: roomIdToBook,
      user_id: validUserId,
      title,
      description,
      start_time: date.start.toISOString(),
      end_time: date.end.toISOString(),
      is_recurring: true,
      recurrence_pattern: JSON.stringify(recurrencePattern),
      authorizer: isCustomAuthorizer ? customAuthorizer : authorizer,
    }))

    console.log(`[BookingForm] Inserting ${bookingsToInsert.length} recurring bookings`)

    // Insert all bookings
    const { data, error: insertError } = await supabase.from("bookings").insert(bookingsToInsert).select()

    if (insertError) {
      console.error("[BookingForm] Error creating recurring bookings:", insertError)
      throw new Error("Error creating recurring bookings: " + insertError.message)
    }

    console.log(`[BookingForm] ${bookingsToInsert.length} recurring bookings created successfully:`, data)
    return data
  }

  // Generate time options (30 min intervals)
  const timeOptions = []
  for (let hour = 7; hour < 22; hour++) {
    for (let minute = 0; minute < 60; minute += 30) {
      const formattedHour = hour.toString().padStart(2, "0")
      const formattedMinute = minute.toString().padStart(2, "0")
      timeOptions.push(`${formattedHour}:${formattedMinute}`)
    }
  }

  // Days of week options for weekly recurrence
  const daysOfWeek: { value: DayOfWeek; label: string }[] = [
    { value: "sunday", label: "Sunday" },
    { value: "monday", label: "Monday" },
    { value: "tuesday", label: "Tuesday" },
    { value: "wednesday", label: "Wednesday" },
    { value: "thursday", label: "Thursday" },
    { value: "friday", label: "Friday" },
    { value: "saturday", label: "Saturday" },
  ]

  // Get today's date for calendar disabled dates
  const today = new Date()

  useEffect(() => {
    if (authorizer === "custom") {
      setIsCustomAuthorizer(true)
      setAuthorizer("")
    }
  }, [authorizer])

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle className="flex items-center">
              <CalendarIcon className="mr-2 h-5 w-5 text-primary" />
              New Booking
            </DialogTitle>
            <DialogDescription>Create a new room booking. Fill out the details below.</DialogDescription>
          </DialogHeader>
          <div className="grid gap-3 py-3">
            <div className="grid gap-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="room" className="font-medium">
                  Room
                </Label>
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="isMultipleRooms"
                    checked={isMultipleRooms}
                    onCheckedChange={(checked) => setIsMultipleRooms(checked === true)}
                  />
                  <Label htmlFor="isMultipleRooms" className="text-sm cursor-pointer">
                    Book multiple rooms
                  </Label>
                </div>
              </div>

              {isMultipleRooms ? (
                <div className="space-y-3">
                  <div className="flex gap-2">
                    <Select value={roomId} onValueChange={setRoomId} className="flex-1">
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
                    <Button
                      type="button"
                      onClick={handleAddRoom}
                      disabled={!roomId || selectedRoomIds.includes(roomId)}
                      className="h-10"
                    >
                      Add
                    </Button>
                  </div>

                  {selectedRoomIds.length > 0 && (
                    <div className="flex flex-wrap gap-2 p-2 bg-muted/20 rounded-md">
                      {selectedRoomIds.map((id) => {
                        const room = rooms.find((r) => r.id === id)
                        return (
                          <Badge key={id} variant="secondary" className="flex items-center gap-1 py-1">
                            {room?.name || "Unknown Room"}
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              className="h-4 w-4 p-0 ml-1"
                              onClick={() => handleRemoveRoom(id)}
                            >
                              <X className="h-3 w-3" />
                              <span className="sr-only">Remove</span>
                            </Button>
                          </Badge>
                        )
                      })}
                    </div>
                  )}
                </div>
              ) : (
                <Select value={roomId} onValueChange={setRoomId}>
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
              )}
            </div>
            <div className="grid gap-2">
              <Label htmlFor="title" className="font-medium">
                Title
              </Label>
              <Input
                id="title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Meeting title"
                className="h-10"
                required
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="description" className="font-medium">
                Description (Optional)
              </Label>
              <Textarea
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Meeting details"
                rows={3}
              />
            </div>
            <div className="grid gap-2">
              <Label className="font-medium">Date</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className="justify-start text-left font-normal h-10">
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {format(date, "PPP")}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={date}
                    onSelect={(newDate) => newDate && setDate(newDate)}
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
                <Select value={startTime} onValueChange={setStartTime}>
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
                <Select value={endTime} onValueChange={setEndTime}>
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

            {/* Recurring booking options */}
            <div className="space-y-3 pt-2 border-t">
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="isRecurring"
                  checked={isRecurring}
                  onCheckedChange={(checked) => {
                    setIsRecurring(checked === true)
                    if (checked === false) {
                      setRecurrenceType("none")
                    } else {
                      setRecurrenceType("weekly")
                    }
                  }}
                />
                <Label htmlFor="isRecurring" className="font-medium cursor-pointer">
                  Recurring Booking
                </Label>
              </div>

              {isRecurring && (
                <div className="space-y-3 pl-4 border-l-2 border-muted">
                  <div className="grid gap-1">
                    <Label className="font-medium text-sm">Recurrence Pattern</Label>
                    <RadioGroup
                      value={recurrenceType}
                      onValueChange={(value) => setRecurrenceType(value as RecurrenceType)}
                      className="flex flex-col space-y-1"
                    >
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="daily" id="daily" />
                        <Label htmlFor="daily" className="cursor-pointer text-sm">
                          Daily
                        </Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="weekly" id="weekly" />
                        <Label htmlFor="weekly" className="cursor-pointer text-sm">
                          Weekly
                        </Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="monthly" id="monthly" />
                        <Label htmlFor="monthly" className="cursor-pointer" id="monthly" />
                        <Label htmlFor="monthly" className="cursor-pointer text-sm">
                          Monthly
                        </Label>
                      </div>
                    </RadioGroup>
                  </div>

                  <div className="grid gap-1">
                    <Label className="font-medium text-sm">Repeat every</Label>
                    <div className="flex items-center space-x-2">
                      <Input
                        type="number"
                        min="1"
                        max="12"
                        value={recurrenceInterval}
                        onChange={(e) => setRecurrenceInterval(Number.parseInt(e.target.value) || 1)}
                        className="w-16 h-8"
                      />
                      <span className="text-sm">
                        {recurrenceType === "daily" ? "days" : recurrenceType === "weekly" ? "weeks" : "months"}
                      </span>
                    </div>
                  </div>

                  {recurrenceType === "weekly" && (
                    <div className="grid gap-2">
                      <Label className="font-medium text-sm">On these days</Label>
                      <div className="grid grid-cols-7 gap-2 mt-1 bg-muted/20 p-2 rounded-md">
                        {daysOfWeek.map((day) => (
                          <div key={day.value} className="flex flex-col items-center">
                            <Checkbox
                              id={`day-${day.value}`}
                              checked={selectedDaysOfWeek.includes(day.value)}
                              onCheckedChange={(checked) => {
                                if (checked) {
                                  setSelectedDaysOfWeek([...selectedDaysOfWeek, day.value])
                                } else {
                                  setSelectedDaysOfWeek(selectedDaysOfWeek.filter((d) => d !== day.value))
                                }
                              }}
                              className="mb-1"
                            />
                            <Label htmlFor={`day-${day.value}`} className="text-xs cursor-pointer font-medium">
                              {day.label.substring(0, 3)}
                            </Label>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  <div className="grid gap-1">
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id="hasEndDate"
                        checked={showRecurrenceEndDate}
                        onCheckedChange={(checked) => setShowRecurrenceEndDate(checked === true)}
                      />
                      <Label htmlFor="hasEndDate" className="font-medium text-sm cursor-pointer">
                        End date
                      </Label>
                    </div>

                    {showRecurrenceEndDate && (
                      <Popover>
                        <PopoverTrigger asChild>
                          <Button variant="outline" className="justify-start text-left font-normal h-8 mt-1 text-sm">
                            <CalendarIcon className="mr-2 h-3 w-3" />
                            {recurrenceEndDate ? format(recurrenceEndDate, "PPP") : "Select end date"}
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="start">
                          <Calendar
                            mode="single"
                            selected={recurrenceEndDate}
                            onSelect={(newDate) => newDate && setRecurrenceEndDate(newDate)}
                            disabled={(date) => isBefore(date, today)}
                            initialFocus
                          />
                        </PopoverContent>
                      </Popover>
                    )}
                  </div>

                  {isRecurring && (
                    <div className="flex items-center text-xs text-muted-foreground bg-muted/30 p-1.5 rounded">
                      <RefreshCw className="h-3 w-3 mr-1.5 text-primary/70" />
                      {recurrenceType === "daily" &&
                        `Repeats daily${recurrenceInterval > 1 ? ` every ${recurrenceInterval} days` : ""}`}
                      {recurrenceType === "weekly" &&
                        `Repeats weekly${recurrenceInterval > 1 ? ` every ${recurrenceInterval} weeks` : ""}${selectedDaysOfWeek.length > 0 ? ` on ${selectedDaysOfWeek.map((d) => d.charAt(0).toUpperCase() + d.slice(1)).join(", ")}` : ""}`}
                      {recurrenceType === "monthly" &&
                        `Repeats monthly${recurrenceInterval > 1 ? ` every ${recurrenceInterval} months` : ""}`}
                      {showRecurrenceEndDate && recurrenceEndDate
                        ? ` until ${format(recurrenceEndDate, "MMMM d, yyyy")}`
                        : ""}
                    </div>
                  )}
                </div>
              )}
            </div>
            <div className="grid gap-2">
              <Label htmlFor="authorizer" className="font-medium">
                Authorized By
              </Label>
              {!isCustomAuthorizer ? (
                <div className="flex gap-2">
                  <Select value={authorizer} onValueChange={setAuthorizer} required>
                    <SelectTrigger className="h-10 flex-1">
                      <SelectValue placeholder="Select who authorized this booking" />
                    </SelectTrigger>
                    <SelectContent>
                      {predefinedAuthorizers.map((name) => (
                        <SelectItem key={name} value={name}>
                          {name}
                        </SelectItem>
                      ))}
                      <SelectItem value="custom">+ Add new name</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              ) : (
                <div className="flex gap-2">
                  <Input
                    id="customAuthorizer"
                    value={customAuthorizer}
                    onChange={(e) => setCustomAuthorizer(e.target.value)}
                    placeholder="Enter name"
                    className="h-10 flex-1"
                    required
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setIsCustomAuthorizer(false)}
                    className="h-10"
                  >
                    Cancel
                  </Button>
                </div>
              )}
            </div>

            {error && (
              <div className="text-sm font-medium text-red-500 bg-red-50 p-3 rounded-md border border-red-100 flex items-start">
                <AlertCircle className="h-5 w-5 mr-2 shrink-0 mt-0.5" />
                {error}
              </div>
            )}
          </div>
          <DialogFooter className="sticky bottom-0 pt-2 pb-1 bg-background border-t mt-2">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting} className="gap-2">
              {isSubmitting ? "Creating..." : isRecurring ? "Create Recurring Bookings" : "Create Booking"}
              {!isSubmitting && <CalendarIcon className="h-4 w-4" />}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
