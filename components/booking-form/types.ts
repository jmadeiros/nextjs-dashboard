import type { Database, RecurrenceType, DayOfWeek, RecurrencePattern } from "@/types/supabase"

export type Room = Database["public"]["Tables"]["rooms"]["Row"]
export type Booking = Database["public"]["Tables"]["bookings"]["Row"]

export interface BookingFormProps {
  isOpen: boolean
  onClose: () => void
  rooms: Room[]
  selectedRoom: Room | null
  userId: string
  selectedDate: Date
  onBookingCreated: (booking: Booking) => void
}

export interface BookingFormData {
  title: string
  description: string
  date: Date
  startTime: string
  endTime: string
  roomId: string
  authorizer: string
  customAuthorizer: string
  isCustomAuthorizer: boolean
  isMultipleRooms: boolean
  selectedRoomIds: string[]
  isRecurring: boolean
  recurrenceType: RecurrenceType
  recurrenceInterval: number
  selectedDaysOfWeek: DayOfWeek[]
  recurrenceEndDate: Date | undefined
  showRecurrenceEndDate: boolean
}

export interface BookingFormState {
  isSubmitting: boolean
  error: string | null
}

export interface DayOption {
  value: DayOfWeek
  label: string
}

export interface CreateBookingParams {
  roomId: string
  startDateTime: Date
  endDateTime: Date
  userId: string
  title: string
  description: string
  authorizer: string
  isRecurring: boolean
  recurrencePattern?: RecurrencePattern | null
}

export interface RecurringDateRange {
  start: Date
  end: Date
}

export { type RecurrenceType, type DayOfWeek, type RecurrencePattern } 