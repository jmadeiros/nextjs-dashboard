"use client"

import React, { useState, useEffect } from "react"
import { format, parseISO } from "date-fns"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { CalendarIcon, Clock, User, Building, Mail, Phone, FileText, Shield, Repeat } from "lucide-react"
import { getSupabaseClient } from "@/lib/supabase-client"
import type { Contractor, ContractorVisit, Room, VisitFormData } from "./types"

interface VisitFormProps {
  isOpen: boolean
  onClose: () => void
  onSubmit: (data: VisitFormData) => Promise<void>
  editingVisit?: ContractorVisit | null
  contractors: Contractor[]
  rooms?: Room[]
  selectedDate?: Date
  isSubmitting: boolean
  formError: string | null
}

export default function VisitForm({
  isOpen,
  onClose,
  onSubmit,
  editingVisit,
  contractors,
  rooms = [],
  selectedDate,
  isSubmitting,
  formError,
}: VisitFormProps) {
  const [formData, setFormData] = useState<VisitFormData>({
    contractorId: "",
    contractorName: "",
    company: "",
    email: "",
    phone: "",
    visitDate: selectedDate || new Date(),
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

  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({})

  const supabase = getSupabaseClient()

  // Populate form when editing
  useEffect(() => {
    if (editingVisit) {
      const contractor = contractors.find(c => c.id === editingVisit.contractor_id)
      setFormData({
        contractorId: editingVisit.contractor_id,
        contractorName: contractor?.name || "",
        company: contractor?.company || "",
        email: contractor?.email || "",
        phone: contractor?.phone || "",
        visitDate: parseISO(editingVisit.visit_date),
        startTime: editingVisit.start_time,
        endTime: editingVisit.end_time,
        purpose: editingVisit.purpose || "",
        type: contractor?.type || "contractor",
        isNewContractor: false,
        isRecurring: editingVisit.is_recurring || false,
        recurrenceType: "weekly",
        recurrenceEndDate: null,
        includeRoomBooking: false,
        selectedRoomId: "",
        roomBookingTitle: "",
        authorizer: editingVisit.authorizer || "",
        isCustomAuthorizer: false,
        customAuthorizerName: "",
      })
    } else {
      // Reset form for new visits
      setFormData(prev => ({
        ...prev,
        contractorId: "",
        contractorName: "",
        company: "",
        email: "",
        phone: "",
        visitDate: selectedDate || new Date(),
        startTime: "09:00",
        endTime: "17:00",
        purpose: "",
        isNewContractor: false,
        isRecurring: false,
        recurrenceEndDate: null,
        includeRoomBooking: false,
        selectedRoomId: "",
        roomBookingTitle: "",
        authorizer: "",
        isCustomAuthorizer: false,
        customAuthorizerName: "",
      }))
    }
  }, [editingVisit, contractors, selectedDate])

  const handleContractorSelect = (contractorId: string) => {
    if (contractorId === "new") {
      setFormData(prev => ({
        ...prev,
        contractorId: "",
        contractorName: "",
        company: "",
        email: "",
        phone: "",
        type: "contractor",
        isNewContractor: true,
      }))
    } else {
      const contractor = contractors.find(c => c.id === contractorId)
      if (contractor) {
        setFormData(prev => ({
          ...prev,
          contractorId: contractor.id,
          contractorName: contractor.name,
          company: contractor.company || "",
          email: contractor.email || "",
          phone: contractor.phone || "",
          type: contractor.type || "contractor",
          isNewContractor: false,
        }))
      }
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    // Basic validation
    const errors: Record<string, string> = {}
    
    if (!formData.contractorName.trim()) {
      errors.contractorName = "Contractor name is required"
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
    if (!formData.authorizer.trim()) {
      errors.authorizer = "Authorizer is required"
    }
    
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
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <User className="h-5 w-5" />
            {editingVisit ? "Edit Visit" : "Schedule New Visit"}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Contractor Selection */}
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <User className="h-4 w-4 text-muted-foreground" />
              <Label className="text-sm font-medium">Contractor</Label>
            </div>
            
            {!editingVisit && (
              <Select
                value={formData.isNewContractor ? "new" : formData.contractorId}
                onValueChange={handleContractorSelect}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select contractor or add new" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="new">+ Add New Contractor</SelectItem>
                  <hr className="my-1 border-border" />
                  {contractors.map((contractor) => (
                    <SelectItem key={contractor.id} value={contractor.id}>
                      <div className="flex items-center gap-2">
                        <span>{contractor.name}</span>
                        <span className={`text-xs px-2 py-1 rounded-full ${
                          contractor.type === "volunteer" 
                            ? "bg-green-100 text-green-800" 
                            : "bg-orange-100 text-orange-800"
                        }`}>
                          {contractor.type === "volunteer" ? "Volunteer" : "Contractor"}
                        </span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}

            {/* Contractor Details */}
            {(formData.isNewContractor || editingVisit) && (
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="contractorName">Name *</Label>
                  <Input
                    id="contractorName"
                    value={formData.contractorName}
                    onChange={(e) => setFormData(prev => ({ ...prev, contractorName: e.target.value }))}
                    className={validationErrors.contractorName ? "border-red-500" : ""}
                    disabled={!!editingVisit}
                  />
                  {validationErrors.contractorName && (
                    <p className="text-sm text-red-600 mt-1">{validationErrors.contractorName}</p>
                  )}
                </div>

                <div>
                  <Label htmlFor="type">Type</Label>
                  <Select
                    value={formData.type}
                    onValueChange={(value: "contractor" | "volunteer") => 
                      setFormData(prev => ({ ...prev, type: value }))
                    }
                    disabled={!!editingVisit}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="contractor">Contractor</SelectItem>
                      <SelectItem value="volunteer">Volunteer</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="company">Company</Label>
                  <div className="relative">
                    <Building className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="company"
                      value={formData.company}
                      onChange={(e) => setFormData(prev => ({ ...prev, company: e.target.value }))}
                      className="pl-10"
                      disabled={!!editingVisit}
                    />
                  </div>
                </div>

                <div>
                  <Label htmlFor="email">Email</Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="email"
                      type="email"
                      value={formData.email}
                      onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                      className="pl-10"
                      disabled={!!editingVisit}
                    />
                  </div>
                </div>

                <div className="col-span-2">
                  <Label htmlFor="phone">Phone</Label>
                  <div className="relative">
                    <Phone className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="phone"
                      value={formData.phone}
                      onChange={(e) => setFormData(prev => ({ ...prev, phone: e.target.value }))}
                      className="pl-10"
                      disabled={!!editingVisit}
                    />
                  </div>
                </div>
              </div>
            )}
          </div>

          <hr className="my-4 border-border" />

          {/* Visit Details */}
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <CalendarIcon className="h-4 w-4 text-muted-foreground" />
              <Label className="text-sm font-medium">Visit Details</Label>
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div>
                <Label htmlFor="visitDate">Date *</Label>
                <Input
                  id="visitDate"
                  type="date"
                  value={format(formData.visitDate, "yyyy-MM-dd")}
                  onChange={(e) => setFormData(prev => ({ ...prev, visitDate: new Date(e.target.value) }))}
                  className={validationErrors.visitDate ? "border-red-500" : ""}
                />
                {validationErrors.visitDate && (
                  <p className="text-sm text-red-600 mt-1">{validationErrors.visitDate}</p>
                )}
              </div>

              <div>
                <Label htmlFor="startTime">Start Time *</Label>
                <div className="relative">
                  <Clock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="startTime"
                    type="time"
                    value={formData.startTime}
                    onChange={(e) => setFormData(prev => ({ ...prev, startTime: e.target.value }))}
                    className={`pl-10 ${validationErrors.startTime ? "border-red-500" : ""}`}
                  />
                </div>
                {validationErrors.startTime && (
                  <p className="text-sm text-red-600 mt-1">{validationErrors.startTime}</p>
                )}
              </div>

              <div>
                <Label htmlFor="endTime">End Time *</Label>
                <div className="relative">
                  <Clock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="endTime"
                    type="time"
                    value={formData.endTime}
                    onChange={(e) => setFormData(prev => ({ ...prev, endTime: e.target.value }))}
                    className={`pl-10 ${validationErrors.endTime ? "border-red-500" : ""}`}
                  />
                </div>
                {validationErrors.endTime && (
                  <p className="text-sm text-red-600 mt-1">{validationErrors.endTime}</p>
                )}
              </div>
            </div>

            <div>
              <Label htmlFor="purpose">Purpose of Visit</Label>
              <div className="relative">
                <FileText className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Textarea
                  id="purpose"
                  value={formData.purpose}
                  onChange={(e) => setFormData(prev => ({ ...prev, purpose: e.target.value }))}
                  className="pl-10 min-h-[80px]"
                  placeholder="Describe the purpose of this visit..."
                />
              </div>
            </div>

            <div>
              <Label htmlFor="authorizer">Authorized By *</Label>
              <div className="relative">
                <Shield className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  id="authorizer"
                  value={formData.authorizer}
                  onChange={(e) => setFormData(prev => ({ ...prev, authorizer: e.target.value }))}
                  className={`pl-10 ${validationErrors.authorizer ? "border-red-500" : ""}`}
                  placeholder="Name of person authorizing this visit"
                />
              </div>
              {validationErrors.authorizer && (
                <p className="text-sm text-red-600 mt-1">{validationErrors.authorizer}</p>
              )}
            </div>
          </div>

          {/* Recurring Options */}
          {!editingVisit && (
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <Repeat className="h-4 w-4 text-muted-foreground" />
                <Label className="text-sm font-medium">Recurring Visit</Label>
                <input
                  type="checkbox"
                  checked={formData.isRecurring}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => 
                    setFormData(prev => ({ ...prev, isRecurring: e.target.checked }))
                  }
                  className="ml-2"
                />
              </div>

              {formData.isRecurring && (
                <div className="grid grid-cols-2 gap-4 pl-6">
                  <div>
                    <Label htmlFor="recurrenceType">Frequency</Label>
                    <Select
                      value={formData.recurrenceType}
                      onValueChange={(value: "weekly" | "bi-weekly" | "monthly") =>
                        setFormData(prev => ({ ...prev, recurrenceType: value }))
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="weekly">Weekly</SelectItem>
                        <SelectItem value="bi-weekly">Bi-weekly</SelectItem>
                        <SelectItem value="monthly">Monthly</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label htmlFor="recurrenceEndDate">End Date</Label>
                    <Input
                      id="recurrenceEndDate"
                      type="date"
                      value={formData.recurrenceEndDate ? format(formData.recurrenceEndDate, "yyyy-MM-dd") : ""}
                      onChange={(e) => setFormData(prev => ({ 
                        ...prev, 
                        recurrenceEndDate: e.target.value ? new Date(e.target.value) : null 
                      }))}
                    />
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Form Errors */}
          {formError && (
            <Alert className="border-red-200 bg-red-50">
              <AlertDescription className="text-red-800">
                {formError}
              </AlertDescription>
            </Alert>
          )}

          <DialogFooter className="flex gap-2">
            <Button type="button" variant="outline" onClick={handleClose} disabled={isSubmitting}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? "Saving..." : editingVisit ? "Update Visit" : "Schedule Visit"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
} 