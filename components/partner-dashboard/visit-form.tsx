"use client"

import React, { useState, useEffect } from "react"
import { format, isBefore, isToday } from "date-fns"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Calendar as CalendarComponent } from "@/components/ui/calendar"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { CalendarIcon, Users, FileText, Shield } from "lucide-react"
import type { Partner, Room, VisitFormData } from "./types"

interface VisitFormProps {
  isOpen: boolean
  onClose: () => void
  onSubmit: (data: VisitFormData) => Promise<void>
  partners: Partner[]
  rooms: Room[]
  selectedDate?: Date
  isSubmitting: boolean
  formError: string | null
}

// Time options for form
const timeOptions = [
  "08:00", "08:30", "09:00", "09:30", "10:00", "10:30", "11:00", "11:30",
  "12:00", "12:30", "13:00", "13:30", "14:00", "14:30", "15:00", "15:30",
  "16:00", "16:30", "17:00", "17:30", "18:00", "18:30", "19:00", "19:30", "20:00"
]

export default function VisitForm({
  isOpen,
  onClose,
  onSubmit,
  partners,
  rooms,
  selectedDate,
  isSubmitting,
  formError,
}: VisitFormProps) {
  const [formData, setFormData] = useState<VisitFormData>({
    partnerId: "",
    partnerName: "",
    visitDate: selectedDate || new Date(),
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

  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({})

  const today = new Date()

  // Reset form when dialog opens/closes
  useEffect(() => {
    if (isOpen) {
      setFormData({
        partnerId: "",
        partnerName: "",
        visitDate: selectedDate || new Date(),
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
      setValidationErrors({})
    }
  }, [isOpen, selectedDate])

  const handlePartnerSelect = (value: string) => {
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
  }

  const handleFullDayToggle = (checked: boolean) => {
    setFormData({
      ...formData,
      isFullDay: checked,
      startTime: checked ? "08:00" : formData.startTime,
      endTime: checked ? "18:00" : formData.endTime,
    })
  }

  const validateForm = () => {
    const errors: Record<string, string> = {}

    if (formData.isNewPartner) {
      if (!formData.partnerName.trim()) {
        errors.partnerName = "Partner name is required"
      }
    } else {
      if (!formData.partnerId) {
        errors.partnerId = "Please select a partner"
      }
    }

    if (!formData.visitDate) {
      errors.visitDate = "Visit date is required"
    }

    if (!formData.startTime) {
      errors.startTime = "Start time is required"
    }

    if (!formData.endTime) {
      errors.endTime = "End time is required"
    }

    if (formData.startTime && formData.endTime && formData.startTime >= formData.endTime) {
      errors.endTime = "End time must be after start time"
    }

    if (!formData.authorizer.trim() && !formData.isCustomAuthorizer) {
      errors.authorizer = "Authorizer is required"
    }

    if (formData.isCustomAuthorizer && !formData.customAuthorizerName.trim()) {
      errors.customAuthorizerName = "Custom authorizer name is required"
    }

    if (formData.includeRoomBooking && !formData.selectedRoomId) {
      errors.selectedRoomId = "Please select a room for booking"
    }

    return errors
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    const errors = validateForm()
    setValidationErrors(errors)

    if (Object.keys(errors).length > 0) {
      return
    }

    try {
      await onSubmit(formData)
      onClose()
    } catch (error) {
      console.error("Error submitting form:", error)
    }
  }

  const handleClose = () => {
    setValidationErrors({})
    onClose()
  }

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Users className="h-5 w-5 text-primary" />
              Schedule Guest Visit
            </DialogTitle>
            <DialogDescription>
              Let us know which partner you are and tell us about the guests you're bringing along.
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-4">
            {/* Partner Selection */}
            <div className="space-y-2">
              <Label htmlFor="partner" className="font-medium">
                Select Partner *
              </Label>
              <Select
                value={formData.partnerId}
                onValueChange={handlePartnerSelect}
                disabled={isSubmitting}
              >
                <SelectTrigger className={`h-10 ${validationErrors.partnerId ? "border-red-500" : ""}`}>
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
              {validationErrors.partnerId && (
                <p className="text-sm text-red-600">{validationErrors.partnerId}</p>
              )}
              {partners.length === 0 && !isSubmitting && (
                <p className="text-xs text-amber-600">No partners loaded. You may need to create a new partner.</p>
              )}
            </div>

            {/* New Partner Name */}
            {formData.isNewPartner && (
              <div className="space-y-2">
                <Label htmlFor="partnerName" className="font-medium">
                  New Partner Name *
                </Label>
                <Input
                  id="partnerName"
                  value={formData.partnerName}
                  onChange={(e) => setFormData({ ...formData, partnerName: e.target.value })}
                  placeholder="Enter partner name"
                  className={`h-10 ${validationErrors.partnerName ? "border-red-500" : ""}`}
                  disabled={isSubmitting}
                />
                {validationErrors.partnerName && (
                  <p className="text-sm text-red-600">{validationErrors.partnerName}</p>
                )}
              </div>
            )}

            {/* Visit Date */}
            <div className="space-y-2">
              <Label htmlFor="visitDate" className="font-medium">
                Visit Date *
              </Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={`justify-start text-left font-normal h-10 w-full ${validationErrors.visitDate ? "border-red-500" : ""}`}
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
              {validationErrors.visitDate && (
                <p className="text-sm text-red-600">{validationErrors.visitDate}</p>
              )}
            </div>

            {/* Full Day Toggle */}
            <div className="flex items-center space-x-2 mb-2">
              <input
                type="checkbox"
                id="isFullDay"
                checked={formData.isFullDay}
                onChange={(e) => handleFullDayToggle(e.target.checked)}
                disabled={isSubmitting}
                className="rounded"
              />
              <Label htmlFor="isFullDay" className="font-medium cursor-pointer">
                Full Day Visit (8:00 AM - 6:00 PM)
              </Label>
            </div>

            {/* Time Selection */}
            {!formData.isFullDay && (
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="startTime" className="font-medium">
                    Start Time *
                  </Label>
                  <Select
                    value={formData.startTime}
                    onValueChange={(value) => setFormData({ ...formData, startTime: value })}
                    disabled={isSubmitting || formData.isFullDay}
                  >
                    <SelectTrigger className={`h-10 ${validationErrors.startTime ? "border-red-500" : ""}`}>
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
                  {validationErrors.startTime && (
                    <p className="text-sm text-red-600">{validationErrors.startTime}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="endTime" className="font-medium">
                    End Time *
                  </Label>
                  <Select
                    value={formData.endTime}
                    onValueChange={(value) => setFormData({ ...formData, endTime: value })}
                    disabled={isSubmitting || formData.isFullDay}
                  >
                    <SelectTrigger className={`h-10 ${validationErrors.endTime ? "border-red-500" : ""}`}>
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
                  {validationErrors.endTime && (
                    <p className="text-sm text-red-600">{validationErrors.endTime}</p>
                  )}
                </div>
              </div>
            )}

            {/* Purpose */}
            <div className="space-y-2">
              <Label htmlFor="purpose" className="font-medium">
                Purpose of Visit
              </Label>
              <div className="relative">
                <FileText className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Textarea
                  id="purpose"
                  value={formData.purpose}
                  onChange={(e) => setFormData({ ...formData, purpose: e.target.value })}
                  placeholder="Describe the purpose of this visit..."
                  className="pl-10 min-h-[80px]"
                  disabled={isSubmitting}
                />
              </div>
            </div>

            {/* Guest Details */}
            <div className="space-y-2">
              <Label htmlFor="guestDetails" className="font-medium">
                Guest Details
              </Label>
              <div className="relative">
                <Users className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Textarea
                  id="guestDetails"
                  value={formData.guestDetails}
                  onChange={(e) => setFormData({ ...formData, guestDetails: e.target.value })}
                  placeholder="List the guests attending (names, roles, etc.)"
                  className="pl-10 min-h-[80px]"
                  disabled={isSubmitting}
                />
              </div>
            </div>

            {/* Authorizer */}
            <div className="space-y-2">
              <Label htmlFor="authorizer" className="font-medium">
                Authorized By *
              </Label>
              <div className="relative">
                <Shield className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  id="authorizer"
                  value={formData.authorizer}
                  onChange={(e) => setFormData({ ...formData, authorizer: e.target.value })}
                  placeholder="Name of person authorizing this visit"
                  className={`pl-10 h-10 ${validationErrors.authorizer ? "border-red-500" : ""}`}
                  disabled={isSubmitting}
                />
              </div>
              {validationErrors.authorizer && (
                <p className="text-sm text-red-600">{validationErrors.authorizer}</p>
              )}
            </div>

            {/* Room Booking */}
            <div className="space-y-2">
              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  id="includeRoomBooking"
                  checked={formData.includeRoomBooking}
                  onChange={(e) => setFormData({ ...formData, includeRoomBooking: e.target.checked })}
                  disabled={isSubmitting}
                  className="rounded"
                />
                <Label htmlFor="includeRoomBooking" className="font-medium cursor-pointer">
                  Include Room Booking
                </Label>
              </div>

              {formData.includeRoomBooking && (
                <div className="ml-6 space-y-3">
                  <div className="space-y-2">
                    <Label htmlFor="selectedRoomId" className="font-medium">
                      Select Room *
                    </Label>
                    <Select
                      value={formData.selectedRoomId}
                      onValueChange={(value) => setFormData({ ...formData, selectedRoomId: value })}
                      disabled={isSubmitting}
                    >
                      <SelectTrigger className={`h-10 ${validationErrors.selectedRoomId ? "border-red-500" : ""}`}>
                        <SelectValue placeholder="Choose a room" />
                      </SelectTrigger>
                      <SelectContent>
                        {rooms.map((room) => (
                          <SelectItem key={room.id} value={room.id}>
                            {room.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {validationErrors.selectedRoomId && (
                      <p className="text-sm text-red-600">{validationErrors.selectedRoomId}</p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="roomBookingTitle" className="font-medium">
                      Booking Title
                    </Label>
                    <Input
                      id="roomBookingTitle"
                      value={formData.roomBookingTitle}
                      onChange={(e) => setFormData({ ...formData, roomBookingTitle: e.target.value })}
                      placeholder="Custom title for room booking (optional)"
                      className="h-10"
                      disabled={isSubmitting}
                    />
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Form Errors */}
          {formError && (
            <Alert className="border-red-200 bg-red-50 mb-4">
              <AlertDescription className="text-red-800">
                {formError}
              </AlertDescription>
            </Alert>
          )}

          <DialogFooter>
            <Button type="button" variant="outline" onClick={handleClose} disabled={isSubmitting}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? "Scheduling..." : "Schedule Visit"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
} 