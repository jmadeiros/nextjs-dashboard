import { useState, useEffect } from "react"
import { startOfDay, isBefore, isToday } from "date-fns"
import type { 
  BookingFormData, 
  BookingFormState, 
  Room,
  RecurrenceType,
  DayOfWeek 
} from "@/components/booking-form/types"

interface UseBookingFormOptions {
  isOpen: boolean
  selectedRoom: Room | null
  selectedDate: Date
}

export function useBookingForm({ isOpen, selectedRoom, selectedDate }: UseBookingFormOptions) {
  // Form data state
  const [formData, setFormData] = useState<BookingFormData>({
    title: "",
    description: "",
    date: selectedDate,
    startTime: "09:00",
    endTime: "10:00",
    roomId: "",
    authorizer: "",
    customAuthorizer: "",
    isCustomAuthorizer: false,
    isMultipleRooms: false,
    selectedRoomIds: [],
    isRecurring: false,
    recurrenceType: "none" as RecurrenceType,
    recurrenceInterval: 1,
    selectedDaysOfWeek: [],
    recurrenceEndDate: undefined,
    showRecurrenceEndDate: false,
  })

  // Form state
  const [state, setState] = useState<BookingFormState>({
    isSubmitting: false,
    error: null,
  })

  // Predefined authorizers
  const predefinedAuthorizers = ["Georgina", "Lesley", "Jocelyn", "Elizabeth", "Sasha"]

  // Days of week options
  const daysOfWeek = [
    { value: "monday" as DayOfWeek, label: "Monday" },
    { value: "tuesday" as DayOfWeek, label: "Tuesday" },
    { value: "wednesday" as DayOfWeek, label: "Wednesday" },
    { value: "thursday" as DayOfWeek, label: "Thursday" },
    { value: "friday" as DayOfWeek, label: "Friday" },
    { value: "saturday" as DayOfWeek, label: "Saturday" },
    { value: "sunday" as DayOfWeek, label: "Sunday" },
  ]

  // Time options
  const timeOptions = Array.from({ length: 48 }, (_, i) => {
    const hours = Math.floor(i / 2)
    const minutes = i % 2 === 0 ? "00" : "30"
    return `${hours.toString().padStart(2, "0")}:${minutes}`
  }).slice(14, 44) // 7:00 AM to 10:00 PM

  // Initialize form when dialog opens
  useEffect(() => {
    if (isOpen) {
      console.log(
        `[useBookingForm] Form opened with room: ${selectedRoom?.name || "none"} and date: ${selectedDate.toISOString()}`
      )

      const today = startOfDay(new Date())
      const validDate = isBefore(selectedDate, today) && !isToday(selectedDate) ? today : selectedDate

      setFormData(prev => ({
        ...prev,
        date: validDate,
        roomId: selectedRoom?.id || "",
        selectedRoomIds: selectedRoom?.id ? [selectedRoom.id] : [],
      }))

      setState({
        isSubmitting: false,
        error: null,
      })
    }
  }, [isOpen, selectedRoom, selectedDate])

  // Reset form when closed
  useEffect(() => {
    if (!isOpen) {
      setFormData({
        title: "",
        description: "",
        date: selectedDate,
        startTime: "09:00",
        endTime: "10:00",
        roomId: "",
        authorizer: "",
        customAuthorizer: "",
        isCustomAuthorizer: false,
        isMultipleRooms: false,
        selectedRoomIds: [],
        isRecurring: false,
        recurrenceType: "none" as RecurrenceType,
        recurrenceInterval: 1,
        selectedDaysOfWeek: [],
        recurrenceEndDate: undefined,
        showRecurrenceEndDate: false,
      })

      setState({
        isSubmitting: false,
        error: null,
      })
    }
  }, [isOpen, selectedDate])

  // Update selected rooms when roomId changes and not in multiple rooms mode
  useEffect(() => {
    if (!formData.isMultipleRooms && formData.roomId) {
      setFormData(prev => ({
        ...prev,
        selectedRoomIds: [formData.roomId],
      }))
    }
  }, [formData.roomId, formData.isMultipleRooms])

  // Form update functions
  const updateFormData = (updates: Partial<BookingFormData>) => {
    setFormData(prev => ({ ...prev, ...updates }))
  }

  const updateState = (updates: Partial<BookingFormState>) => {
    setState(prev => ({ ...prev, ...updates }))
  }

  // Room management functions
  const handleAddRoom = () => {
    if (formData.roomId && !formData.selectedRoomIds.includes(formData.roomId)) {
      setFormData(prev => ({
        ...prev,
        selectedRoomIds: [...prev.selectedRoomIds, formData.roomId],
      }))
    }
  }

  const handleRemoveRoom = (roomId: string) => {
    setFormData(prev => ({
      ...prev,
      selectedRoomIds: prev.selectedRoomIds.filter(id => id !== roomId),
    }))
  }

  // Recurring booking functions
  const handleRecurringToggle = (checked: boolean) => {
    setFormData(prev => ({
      ...prev,
      isRecurring: checked,
      recurrenceType: checked ? "weekly" : "none",
    }))
  }

  const handleDayOfWeekToggle = (day: DayOfWeek, checked: boolean) => {
    setFormData(prev => ({
      ...prev,
      selectedDaysOfWeek: checked
        ? [...prev.selectedDaysOfWeek, day]
        : prev.selectedDaysOfWeek.filter(d => d !== day),
    }))
  }

  // Authorizer management
  const handleAuthorizerChange = (value: string) => {
    if (value === "custom") {
      setFormData(prev => ({
        ...prev,
        isCustomAuthorizer: true,
        authorizer: "",
      }))
    } else {
      setFormData(prev => ({
        ...prev,
        authorizer: value,
        isCustomAuthorizer: false,
      }))
    }
  }

  // Validation
  const validateForm = (): string | null => {
    // Room validation
    if (formData.isMultipleRooms) {
      if (formData.selectedRoomIds.length === 0) {
        return "Please select at least one room"
      }
    } else {
      if (!formData.roomId) {
        return "Please select a room"
      }
    }

    // Authorizer validation
    if (!formData.isCustomAuthorizer && !formData.authorizer) {
      return "Please select who authorized this booking"
    }

    if (formData.isCustomAuthorizer && !formData.customAuthorizer.trim()) {
      return "Please enter the name of who authorized this booking"
    }

    // Date validation
    const today = startOfDay(new Date())
    if (isBefore(formData.date, today) && !isToday(formData.date)) {
      return "Cannot book dates in the past"
    }

    // Time validation
    if (formData.startTime >= formData.endTime) {
      return "End time must be after start time"
    }

    // Title validation
    if (!formData.title.trim()) {
      return "Please enter a title for the booking"
    }

    return null
  }

  return {
    formData,
    state,
    predefinedAuthorizers,
    daysOfWeek,
    timeOptions,
    updateFormData,
    updateState,
    handleAddRoom,
    handleRemoveRoom,
    handleRecurringToggle,
    handleDayOfWeekToggle,
    handleAuthorizerChange,
    validateForm,
  }
} 