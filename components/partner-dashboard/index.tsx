"use client"

import React, { useState } from "react"
import { addMonths, subMonths } from "date-fns"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Search, Plus, Users, Calendar as CalendarIcon, List } from "lucide-react"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { getSupabaseClient } from "@/lib/supabase-client"
import { usePartnerData } from "@/hooks/use-partner-data"
import CalendarView from "./calendar-view"
import VisitList from "./visit-list"
import VisitForm from "./visit-form"
import DeleteDialog from "./delete-dialog"
import type {
  EnhancedGuestVisit,
  VisitFormData,
  PartnerDashboardProps,
} from "./types"

export default function PartnerDashboard({ userId }: PartnerDashboardProps) {
  // State management
  const [currentDate, setCurrentDate] = useState(new Date())
  const [selectedDate, setSelectedDate] = useState(new Date())
  const [view, setView] = useState<"month" | "list">("month")
  const [searchQuery, setSearchQuery] = useState("")
  
  // Form and dialog states
  const [isFormOpen, setIsFormOpen] = useState(false)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [visitToDelete, setVisitToDelete] = useState<EnhancedGuestVisit | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)

  // Data fetching
  const {
    partners,
    visits,
    rooms,
    isLoading,
    error,
    debugInfo,
    refetch,
    getPartnerName,
    setPartners,
  } = usePartnerData({ currentDate })

  const supabase = getSupabaseClient()

  // Calendar navigation
  const handlePreviousMonth = () => {
    setCurrentDate(subMonths(currentDate, 1))
  }

  const handleNextMonth = () => {
    setCurrentDate(addMonths(currentDate, 1))
  }

  const handleDateSelect = (date: Date) => {
    setSelectedDate(date)
  }

  // Form handlers
  const handleNewVisit = (date?: Date) => {
    if (date) {
      setSelectedDate(date)
    }
    setFormError(null)
    setIsFormOpen(true)
  }

  const handleFormSubmit = async (data: VisitFormData) => {
    setIsSubmitting(true)
    setFormError(null)

    try {
      let finalPartnerId = data.partnerId

      // Handle new partner creation
      if (data.isNewPartner && data.partnerName.trim()) {
        const { data: newPartner, error: partnerError } = await supabase
          .from("partners")
          .insert({
            name: data.partnerName.trim(),
            created_at: new Date().toISOString(),
          })
          .select()
          .single()

        if (partnerError) {
          throw new Error(`Failed to create partner: ${partnerError.message}`)
        }

        finalPartnerId = newPartner.id
        // Update local partners list
        setPartners(prev => [...prev, newPartner])
      }

      // Create guest visit
      const visitData = {
        partner_id: finalPartnerId,
        visit_date: data.visitDate.toISOString().split("T")[0],
        start_time: data.startTime,
        end_time: data.endTime,
        guest_details: data.guestDetails || null,
        purpose: data.purpose || null,
        authorizer: data.authorizer || null,
        status: "scheduled" as const,
        created_at: new Date().toISOString(),
      }

      const { error: visitError } = await supabase
        .from("guest_visits")
        .insert(visitData)

      if (visitError) {
        throw new Error(`Failed to create visit: ${visitError.message}`)
      }

      // Handle room booking if requested
      if (data.includeRoomBooking && data.selectedRoomId) {
        const bookingData = {
          room_id: data.selectedRoomId,
          date: data.visitDate.toISOString().split("T")[0],
          start_time: data.startTime,
          end_time: data.endTime,
          title: data.roomBookingTitle || `${getPartnerName(finalPartnerId)} Meeting`,
          description: data.purpose || "Partner guest visit",
          user_id: userId || null,
          status: "confirmed" as const,
          created_at: new Date().toISOString(),
        }

        const { error: bookingError } = await supabase
          .from("bookings")
          .insert(bookingData)

        if (bookingError) {
          console.error("Room booking failed:", bookingError)
          // Don't fail the entire operation for room booking errors
        }
      }

      // Refresh data
      await refetch()
      setIsFormOpen(false)
    } catch (error) {
      console.error("Error submitting form:", error)
      setFormError(error instanceof Error ? error.message : "An unexpected error occurred")
    } finally {
      setIsSubmitting(false)
    }
  }

  // Delete handlers
  const handleDeleteVisit = (visit: EnhancedGuestVisit) => {
    setVisitToDelete(visit)
    setDeleteDialogOpen(true)
  }

  const handleConfirmDelete = async () => {
    if (!visitToDelete) return

    setIsDeleting(true)

    try {
      const { error } = await supabase
        .from("guest_visits")
        .delete()
        .eq("id", visitToDelete.id)

      if (error) {
        throw new Error(`Failed to delete visit: ${error.message}`)
      }

      // Refresh data
      await refetch()
      setDeleteDialogOpen(false)
      setVisitToDelete(null)
    } catch (error) {
      console.error("Error deleting visit:", error)
      setFormError(error instanceof Error ? error.message : "Failed to delete visit")
    } finally {
      setIsDeleting(false)
    }
  }

  const handleCloseDeleteDialog = () => {
    setDeleteDialogOpen(false)
    setVisitToDelete(null)
    setFormError(null)
  }

  const handleCloseForm = () => {
    setIsFormOpen(false)
    setFormError(null)
  }

  if (error) {
    return (
      <div className="p-6 max-w-4xl mx-auto">
        <Alert className="border-red-200 bg-red-50">
          <AlertDescription className="text-red-800">
            Error loading partner dashboard: {error}
          </AlertDescription>
        </Alert>
        <Button 
          onClick={refetch} 
          className="mt-4"
          variant="outline"
        >
          Try Again
        </Button>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header Section with Gradient */}
      <div className="bg-gradient-to-r from-primary/10 to-primary/5 rounded-lg p-6 shadow-sm">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
              <Users className="h-8 w-8 text-primary" />
              Partner Guest Dashboard
            </h1>
            <p className="text-muted-foreground mt-1">
              Manage and track partner guest visits
            </p>
            {debugInfo && <p className="text-xs text-muted-foreground mt-1">{debugInfo}</p>}
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" onClick={() => setCurrentDate(new Date())} className="shadow-sm">
              <CalendarIcon className="mr-2 h-4 w-4" />
              Today
            </Button>
            <Button onClick={() => handleNewVisit()} className="shadow-sm">
              <Plus className="mr-2 h-4 w-4" />
              New Guest Visit
            </Button>
          </div>
        </div>
      </div>

      {/* Main Content Card */}
      <div className="bg-card rounded-lg shadow-md border border-primary/10">
        {/* Card Header */}
        <div className="bg-muted/50 border-b px-6 py-4">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div>
              <h2 className="text-xl font-semibold">Partner Visits</h2>
              <p className="text-muted-foreground text-sm">View and manage partner guest visits</p>
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
              <Tabs value={view} onValueChange={(value) => setView(value as "month" | "list")}>
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger value="month" className="flex items-center gap-2">
                    <CalendarIcon className="h-4 w-4" />
                    Calendar
                  </TabsTrigger>
                  <TabsTrigger value="list" className="flex items-center gap-2">
                    <List className="h-4 w-4" />
                    List
                  </TabsTrigger>
                </TabsList>
              </Tabs>
            </div>
          </div>
        </div>

        {/* Card Content */}
        <div className="p-4">
          {/* Main Content */}
          <Tabs value={view} className="space-y-4">
            <TabsContent value="month" className="space-y-4">
              <CalendarView
                currentDate={currentDate}
                selectedDate={selectedDate}
                onDateSelect={handleDateSelect}
                onPreviousMonth={handlePreviousMonth}
                onNextMonth={handleNextMonth}
                visits={visits}
                isLoading={isLoading}
                onDeleteVisit={handleDeleteVisit}
                onNewVisit={handleNewVisit}
              />
            </TabsContent>

            <TabsContent value="list" className="space-y-4">
              <VisitList
                visits={visits}
                isLoading={isLoading}
                searchQuery={searchQuery}
                onDeleteVisit={handleDeleteVisit}
              />
            </TabsContent>
          </Tabs>
        </div>
      </div>

      {/* Form Dialog */}
      <VisitForm
        isOpen={isFormOpen}
        onClose={handleCloseForm}
        onSubmit={handleFormSubmit}
        partners={partners}
        rooms={rooms}
        selectedDate={selectedDate}
        isSubmitting={isSubmitting}
        formError={formError}
      />

      {/* Delete Dialog */}
      <DeleteDialog
        isOpen={deleteDialogOpen}
        onClose={handleCloseDeleteDialog}
        onConfirm={handleConfirmDelete}
        visit={visitToDelete}
        isDeleting={isDeleting}
        error={formError}
      />
    </div>
  )
} 