"use client"

import React, { useEffect } from "react"
import { format, isBefore, isToday, startOfDay } from "date-fns"
import { Button } from "@/components/ui/button"
import { Calendar } from "@/components/ui/calendar"
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { CalendarIcon, AlertCircle } from "lucide-react"
import { toast } from "sonner"
import { useBookingForm } from "@/hooks/use-booking-form"
import { bookingService } from "@/lib/services/booking-service"
import RoomSelection from "./room-selection"
import RecurringOptions from "./recurring-options"
import type { BookingFormProps, CreateBookingParams, Booking } from "./types"

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

  const {
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
  } = useBookingForm({ isOpen, selectedRoom, selectedDate })

  const today = startOfDay(new Date())

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    // Validate form
    const validationError = validateForm()
    if (validationError) {
      updateState({ error: validationError })
      return
    }

    console.log(
      `[BookingForm] Submitting booking for ${formData.isMultipleRooms ? "multiple rooms" : `room: ${formData.roomId}`}, date: ${format(formData.date, "yyyy-MM-dd")}`
    )

    updateState({ isSubmitting: true, error: null })

    try {
      // Parse times with explicit timezone handling
      const [startHour, startMinute] = formData.startTime.split(":").map(Number)
      const [endHour, endMinute] = formData.endTime.split(":").map(Number)

      // Create date objects with the correct time
      const startDateTime = new Date(formData.date)
      startDateTime.setHours(startHour, startMinute, 0, 0)

      const endDateTime = new Date(formData.date)
      endDateTime.setHours(endHour, endMinute, 0, 0)

      // Ensure user ID is valid
      const validUserId = userId || "00000000-0000-0000-0000-000000000000"

      // Get final authorizer
      const finalAuthorizer = formData.isCustomAuthorizer ? formData.customAuthorizer : formData.authorizer

      const bookingParams: CreateBookingParams = {
        roomId: formData.roomId,
        startDateTime,
        endDateTime,
        userId: validUserId,
        title: formData.title,
        description: formData.description,
        authorizer: finalAuthorizer,
        isRecurring: formData.isRecurring,
      }

      let createdBookings: Booking[] = []

      if (formData.isMultipleRooms) {
        // Handle multiple rooms
        if (formData.isRecurring) {
          createdBookings = await bookingService.createMultipleRoomRecurringBookings(
            bookingParams,
            formData.selectedRoomIds,
            formData.recurrenceType,
            formData.recurrenceInterval,
            formData.selectedDaysOfWeek,
            formData.recurrenceEndDate,
            rooms
          )
        } else {
          createdBookings = await bookingService.createMultipleRoomBookings(
            bookingParams,
            formData.selectedRoomIds,
            rooms
          )
        }
      } else {
        // Handle single room
        if (formData.isRecurring) {
          createdBookings = await bookingService.createRecurringBookings(
            bookingParams,
            formData.recurrenceType,
            formData.recurrenceInterval,
            formData.selectedDaysOfWeek,
            formData.recurrenceEndDate,
            rooms
          )
        } else {
          const booking = await bookingService.createSingleBooking(bookingParams, rooms)
          createdBookings = [booking]
        }
      }

      // Notify parent component about the booking(s)
      if (createdBookings.length > 0) {
        onBookingCreated(createdBookings[0]) // Pass the first booking for compatibility
      }

      onClose()

      // Show success toast
      const bookingCount = createdBookings.length
      const roomCount = formData.isMultipleRooms ? formData.selectedRoomIds.length : 1
      
      toast.success(`${bookingCount} booking${bookingCount > 1 ? 's' : ''} created successfully!`, {
        description: `${formData.title} scheduled for ${format(formData.date, "PPP")} from ${formData.startTime} to ${formData.endTime}${roomCount > 1 ? ` in ${roomCount} rooms` : ''}.`,
      })

    } catch (error) {
      console.error("[BookingForm] Exception creating booking:", error)
      updateState({ error: `Error: ${error instanceof Error ? error.message : String(error)}` })
      toast.error("Error creating booking.", {
        description: error instanceof Error ? error.message : String(error),
      })
    } finally {
      updateState({ isSubmitting: false })
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>Create Booking</DialogTitle>
            <DialogDescription>
              Schedule a meeting or event in one or more rooms.
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-4">
            {/* Room Selection */}
            <RoomSelection
              formData={formData}
              rooms={rooms}
              onFormDataChange={updateFormData}
              onAddRoom={handleAddRoom}
              onRemoveRoom={handleRemoveRoom}
            />

            {/* Title */}
            <div className="grid gap-2">
              <Label htmlFor="title" className="font-medium">
                Title
              </Label>
              <Input
                id="title"
                value={formData.title}
                onChange={(e) => updateFormData({ title: e.target.value })}
                placeholder="Meeting title"
                className="h-10"
                required
              />
            </div>

            {/* Description */}
            <div className="grid gap-2">
              <Label htmlFor="description" className="font-medium">
                Description (Optional)
              </Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) => updateFormData({ description: e.target.value })}
                placeholder="Meeting details"
                rows={3}
              />
            </div>

            {/* Date */}
            <div className="grid gap-2">
              <Label className="font-medium">Date</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className="justify-start text-left font-normal h-10">
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {format(formData.date, "PPP")}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={formData.date}
                    onSelect={(newDate) => newDate && updateFormData({ date: newDate })}
                    disabled={(date) => isBefore(date, today) && !isToday(date)}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>

            {/* Time Selection */}
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="startTime" className="font-medium">
                  Start Time
                </Label>
                <Select value={formData.startTime} onValueChange={(value) => updateFormData({ startTime: value })}>
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
                <Select value={formData.endTime} onValueChange={(value) => updateFormData({ endTime: value })}>
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

            {/* Recurring Options */}
            <RecurringOptions
              formData={formData}
              daysOfWeek={daysOfWeek}
              onFormDataChange={updateFormData}
              onRecurringToggle={handleRecurringToggle}
              onDayOfWeekToggle={handleDayOfWeekToggle}
            />

            {/* Authorizer */}
            <div className="grid gap-2">
              <Label htmlFor="authorizer" className="font-medium">
                Authorized By
              </Label>
              {!formData.isCustomAuthorizer ? (
                <div className="flex gap-2">
                  <Select value={formData.authorizer} onValueChange={handleAuthorizerChange} required>
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
                    value={formData.customAuthorizer}
                    onChange={(e) => updateFormData({ customAuthorizer: e.target.value })}
                    placeholder="Enter name"
                    className="h-10 flex-1"
                    required
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => updateFormData({ isCustomAuthorizer: false })}
                    className="h-10"
                  >
                    Cancel
                  </Button>
                </div>
              )}
            </div>

            {/* Error Display */}
            {state.error && (
              <div className="text-sm font-medium text-red-500 bg-red-50 p-3 rounded-md border border-red-100 flex items-start">
                <AlertCircle className="h-5 w-5 mr-2 shrink-0 mt-0.5" />
                {state.error}
              </div>
            )}
          </div>

          <DialogFooter className="sticky bottom-0 pt-2 pb-1 bg-background border-t mt-2">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={state.isSubmitting} className="gap-2">
              {state.isSubmitting ? "Creating..." : formData.isRecurring ? "Create Recurring Bookings" : "Create Booking"}
              {!state.isSubmitting && <CalendarIcon className="h-4 w-4" />}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
} 