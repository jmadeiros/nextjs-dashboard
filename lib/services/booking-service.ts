import { format, parseISO, addDays, addWeeks, addMonths, isBefore } from "date-fns"
import { getSupabaseClient } from "@/lib/supabase-client"
import type { 
  Booking, 
  Room, 
  CreateBookingParams,
  RecurringDateRange,
  RecurrencePattern,
  DayOfWeek,
  RecurrenceType
} from "@/components/booking-form/types"

class BookingService {
  private supabase = getSupabaseClient()

  /**
   * Check if a room has conflicts for the given time range
   */
  async checkRoomConflict(roomId: string, startDateTime: Date, endDateTime: Date): Promise<boolean> {
    const { data: existingBookings, error } = await this.supabase
      .from("bookings")
      .select("*")
      .eq("room_id", roomId)
      .lt("start_time", endDateTime.toISOString())
      .gt("end_time", startDateTime.toISOString())

    if (error) {
      console.error("[BookingService] Error checking availability:", error)
      throw new Error("Error checking availability: " + error.message)
    }

    return existingBookings && existingBookings.length > 0
  }

  /**
   * Get conflict details for error messages
   */
  async getConflictDetails(roomId: string, startDateTime: Date, endDateTime: Date, rooms: Room[]) {
    const { data: existingBookings, error } = await this.supabase
      .from("bookings")
      .select("*")
      .eq("room_id", roomId)
      .lt("start_time", endDateTime.toISOString())
      .gt("end_time", startDateTime.toISOString())

    if (error) {
      throw new Error("Error checking availability: " + error.message)
    }

    if (existingBookings && existingBookings.length > 0) {
      const conflictingBooking = existingBookings[0]
      const conflictStart = format(parseISO(conflictingBooking.start_time), "h:mm a")
      const conflictEnd = format(parseISO(conflictingBooking.end_time), "h:mm a")
      const room = rooms.find(r => r.id === roomId)

      return {
        hasConflict: true,
        message: `Time conflict: ${room?.name || "Room"} already booked from ${conflictStart} to ${conflictEnd}. Please select a different time.`
      }
    }

    return { hasConflict: false, message: null }
  }

  /**
   * Create a single booking
   */
  async createSingleBooking(params: CreateBookingParams, rooms: Room[]): Promise<Booking> {
    const { roomId, startDateTime, endDateTime, userId, title, description, authorizer } = params

    console.log(`[BookingService] Creating single booking for room ${roomId}`)

    // Check for conflicts
    const conflict = await this.getConflictDetails(roomId, startDateTime, endDateTime, rooms)
    if (conflict.hasConflict) {
      throw new Error(conflict.message!)
    }

    // Create booking data
    const bookingData = {
      room_id: roomId,
      user_id: userId,
      title,
      description,
      start_time: startDateTime.toISOString(),
      end_time: endDateTime.toISOString(),
      is_recurring: false,
      recurrence_pattern: null,
      authorizer,
    }

    console.log("[BookingService] Booking data to insert:", bookingData)

    const { data, error } = await this.supabase
      .from("bookings")
      .insert([bookingData])
      .select()
      .single()

    if (error) {
      console.error("[BookingService] Error creating booking:", error)
      throw new Error("Error creating booking: " + error.message)
    }

    console.log("[BookingService] Booking created successfully:", data)
    return data
  }

  /**
   * Generate recurring date ranges based on pattern
   */
  generateRecurringDates(
    startDateTime: Date,
    endDateTime: Date,
    recurrenceType: RecurrenceType,
    recurrenceInterval: number,
    selectedDaysOfWeek: DayOfWeek[],
    recurrenceEndDate?: Date
  ): RecurringDateRange[] {
    const durationMinutes = (endDateTime.getTime() - startDateTime.getTime()) / (1000 * 60)
    const maxEndDate = recurrenceEndDate || addMonths(startDateTime, 3) // Default to 3 months
    const recurringDates: RecurringDateRange[] = []
    let currentDate = new Date(startDateTime)

    while (isBefore(currentDate, maxEndDate)) {
      if (recurrenceType === "daily") {
        recurringDates.push({
          start: new Date(currentDate),
          end: new Date(new Date(currentDate).setMinutes(currentDate.getMinutes() + durationMinutes)),
        })
        currentDate = addDays(currentDate, recurrenceInterval)
      } else if (recurrenceType === "weekly") {
        if (selectedDaysOfWeek.length > 0) {
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

          currentDate = addDays(currentDate, 1)

          // If we've gone through a full week, add the interval
          if (currentDate.getDay() === 0) {
            currentDate = addDays(currentDate, (recurrenceInterval - 1) * 7)
          }
        } else {
          recurringDates.push({
            start: new Date(currentDate),
            end: new Date(new Date(currentDate).setMinutes(currentDate.getMinutes() + durationMinutes)),
          })
          currentDate = addWeeks(currentDate, recurrenceInterval)
        }
      } else if (recurrenceType === "monthly") {
        recurringDates.push({
          start: new Date(currentDate),
          end: new Date(new Date(currentDate).setMinutes(currentDate.getMinutes() + durationMinutes)),
        })
        currentDate = addMonths(currentDate, recurrenceInterval)
      }
    }

    return recurringDates
  }

  /**
   * Create recurring bookings
   */
  async createRecurringBookings(
    params: CreateBookingParams,
    recurrenceType: RecurrenceType,
    recurrenceInterval: number,
    selectedDaysOfWeek: DayOfWeek[],
    recurrenceEndDate: Date | undefined,
    rooms: Room[]
  ): Promise<Booking[]> {
    const { roomId, startDateTime, endDateTime, userId, title, description, authorizer } = params

    console.log(`[BookingService] Creating recurring bookings for room ${roomId}`)

    // Generate all recurring dates
    const recurringDates = this.generateRecurringDates(
      startDateTime,
      endDateTime,
      recurrenceType,
      recurrenceInterval,
      selectedDaysOfWeek,
      recurrenceEndDate
    )

    // Create recurrence pattern
    const recurrencePattern: RecurrencePattern = {
      type: recurrenceType,
      interval: recurrenceInterval,
      daysOfWeek: selectedDaysOfWeek.length > 0 ? selectedDaysOfWeek : undefined,
      endDate: recurrenceEndDate ? recurrenceEndDate.toISOString() : undefined,
    }

    // Check for conflicts on all dates
    for (const dateRange of recurringDates) {
      const conflict = await this.getConflictDetails(roomId, dateRange.start, dateRange.end, rooms)
      if (conflict.hasConflict) {
        const conflictDate = format(dateRange.start, "MMMM d, yyyy")
        throw new Error(`Time conflict on ${conflictDate}: ${conflict.message}`)
      }
    }

    // Create all bookings
    const bookingsToInsert = recurringDates.map(dateRange => ({
      room_id: roomId,
      user_id: userId,
      title,
      description,
      start_time: dateRange.start.toISOString(),
      end_time: dateRange.end.toISOString(),
      is_recurring: true,
      recurrence_pattern: recurrencePattern,
      authorizer,
    }))

    console.log(`[BookingService] Creating ${bookingsToInsert.length} recurring bookings`)

    const { data, error } = await this.supabase
      .from("bookings")
      .insert(bookingsToInsert)
      .select()

    if (error) {
      console.error("[BookingService] Error creating recurring bookings:", error)
      throw new Error("Error creating recurring bookings: " + error.message)
    }

    console.log(`[BookingService] Created ${data?.length || 0} recurring bookings successfully`)
    return data || []
  }

  /**
   * Create bookings for multiple rooms
   */
  async createMultipleRoomBookings(
    params: CreateBookingParams,
    selectedRoomIds: string[],
    rooms: Room[]
  ): Promise<Booking[]> {
    const results: Booking[] = []

    for (const roomId of selectedRoomIds) {
      const roomParams = { ...params, roomId }
      const booking = await this.createSingleBooking(roomParams, rooms)
      results.push(booking)
    }

    return results
  }

  /**
   * Create recurring bookings for multiple rooms
   */
  async createMultipleRoomRecurringBookings(
    params: CreateBookingParams,
    selectedRoomIds: string[],
    recurrenceType: RecurrenceType,
    recurrenceInterval: number,
    selectedDaysOfWeek: DayOfWeek[],
    recurrenceEndDate: Date | undefined,
    rooms: Room[]
  ): Promise<Booking[]> {
    const results: Booking[] = []

    for (const roomId of selectedRoomIds) {
      const roomParams = { ...params, roomId }
      const bookings = await this.createRecurringBookings(
        roomParams,
        recurrenceType,
        recurrenceInterval,
        selectedDaysOfWeek,
        recurrenceEndDate,
        rooms
      )
      results.push(...bookings)
    }

    return results
  }
}

export const bookingService = new BookingService() 