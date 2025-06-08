"use client"

import React, { useState } from "react"
import { addMonths, subMonths } from "date-fns"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { CalendarIcon, List, Plus, Search, AlertCircle } from "lucide-react"
import { toast } from "sonner"
import { getSupabaseClient } from "@/lib/supabase-client"
import { useContractorData } from "@/hooks/use-contractor-data"
import CalendarView from "./calendar-view"
import VisitList from "./visit-list"
import VisitForm from "./visit-form"
import DeleteDialog from "./delete-dialog"
import type { ContractorDashboardProps, ContractorVisit, VisitFormData } from "./types"

export default function ContractorDashboard({ userId, rooms = [] }: ContractorDashboardProps) {
  // Date and view state
  const [currentDate, setCurrentDate] = useState(new Date())
  const [selectedDate, setSelectedDate] = useState(new Date())
  const [view, setView] = useState<"month" | "list">("month")
  
  // Form state
  const [isFormOpen, setIsFormOpen] = useState(false)
  const [editingVisit, setEditingVisit] = useState<ContractorVisit | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)
  
  // Delete state
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [visitToDelete, setVisitToDelete] = useState<ContractorVisit | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)
  const [deleteError, setDeleteError] = useState<string | null>(null)
  
  // Search state
  const [searchQuery, setSearchQuery] = useState("")

  const supabase = getSupabaseClient()
  
  // Data fetching
  const { 
    contractors, 
    visits, 
    isLoading, 
    error, 
    refetch, 
    getContractorName 
  } = useContractorData({ currentDate })

  // Calendar navigation
  const handlePreviousMonth = () => {
    setCurrentDate(prev => subMonths(prev, 1))
  }

  const handleNextMonth = () => {
    setCurrentDate(prev => addMonths(prev, 1))
  }

  const handleDateSelect = (date: Date) => {
    setSelectedDate(date)
  }

  // Form handlers
  const handleNewVisit = (date?: Date) => {
    setEditingVisit(null)
    setSelectedDate(date || new Date())
    setFormError(null)
    setIsFormOpen(true)
  }

  const handleEditVisit = (visit: ContractorVisit) => {
    setEditingVisit(visit)
    setFormError(null)
    setIsFormOpen(true)
  }

  const handleCloseForm = () => {
    setIsFormOpen(false)
    setEditingVisit(null)
    setFormError(null)
  }

  const handleSubmitVisit = async (formData: VisitFormData) => {
    setIsSubmitting(true)
    setFormError(null)

    try {
      if (editingVisit) {
        // Update existing visit
        const { error } = await supabase
          .from("contractor_visits")
          .update({
            visit_date: formData.visitDate.toISOString(),
            start_time: formData.startTime,
            end_time: formData.endTime,
            purpose: formData.purpose,
            authorizer: formData.authorizer,
          })
          .eq("id", editingVisit.id)

        if (error) throw error

        toast.success("Visit updated successfully")
      } else {
        // Create new contractor if needed
        let contractorId = formData.contractorId

        if (formData.isNewContractor) {
          const { data: newContractor, error: contractorError } = await supabase
            .from("contractors")
            .insert({
              name: formData.contractorName,
              company: formData.company,
              email: formData.email,
              phone: formData.phone,
              type: formData.type,
            })
            .select()
            .single()

          if (contractorError) throw contractorError
          contractorId = newContractor.id
        }

        // Create visit
        const visitData = {
          contractor_id: contractorId,
          visit_date: formData.visitDate.toISOString(),
          start_time: formData.startTime,
          end_time: formData.endTime,
          purpose: formData.purpose,
          authorizer: formData.authorizer,
          is_recurring: formData.isRecurring,
          status: "scheduled",
        }

        if (formData.isRecurring && formData.recurrenceEndDate) {
          // Handle recurring visits
          const visits = []
          let currentDate = new Date(formData.visitDate)
          const endDate = new Date(formData.recurrenceEndDate)

          while (currentDate <= endDate) {
            visits.push({
              ...visitData,
              visit_date: currentDate.toISOString(),
            })

            // Calculate next occurrence
            switch (formData.recurrenceType) {
              case "weekly":
                currentDate.setDate(currentDate.getDate() + 7)
                break
              case "bi-weekly":
                currentDate.setDate(currentDate.getDate() + 14)
                break
              case "monthly":
                currentDate.setMonth(currentDate.getMonth() + 1)
                break
            }
          }

          const { error } = await supabase
            .from("contractor_visits")
            .insert(visits)

          if (error) throw error

          toast.success(`${visits.length} recurring visits scheduled successfully`)
        } else {
          // Single visit
          const { error } = await supabase
            .from("contractor_visits")
            .insert(visitData)

          if (error) throw error

          toast.success("Visit scheduled successfully")
        }
      }

      // Refresh data and close form
      refetch()
      handleCloseForm()
    } catch (error) {
      console.error("Error submitting visit:", error)
      setFormError(`Failed to ${editingVisit ? "update" : "create"} visit: ${error instanceof Error ? error.message : String(error)}`)
    } finally {
      setIsSubmitting(false)
    }
  }

  // Delete handlers
  const handleDeleteVisit = (visit: ContractorVisit) => {
    setVisitToDelete(visit)
    setDeleteError(null)
    setDeleteDialogOpen(true)
  }

  const handleCloseDeleteDialog = () => {
    setDeleteDialogOpen(false)
    setVisitToDelete(null)
    setDeleteError(null)
  }

  const handleConfirmDelete = async () => {
    if (!visitToDelete) return

    setIsDeleting(true)
    setDeleteError(null)

    try {
      const { error } = await supabase
        .from("contractor_visits")
        .delete()
        .eq("id", visitToDelete.id)

      if (error) throw error

      toast.success("Visit deleted successfully")
      refetch()
      handleCloseDeleteDialog()
    } catch (error) {
      console.error("Error deleting visit:", error)
      setDeleteError(`Failed to delete visit: ${error instanceof Error ? error.message : String(error)}`)
    } finally {
      setIsDeleting(false)
    }
  }

  if (error) {
    return (
      <Card>
        <CardContent className="pt-6">
          <Alert className="border-red-200 bg-red-50">
            <AlertCircle className="h-4 w-4 text-red-600" />
            <AlertDescription className="text-red-800">
              {error}
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex justify-between items-start">
          <div>
            <CardTitle className="flex items-center gap-2">
              <CalendarIcon className="h-5 w-5" />
              Contractor & Volunteer Dashboard
            </CardTitle>
            <CardDescription>
              Manage contractor visits and volunteer schedules
            </CardDescription>
          </div>
          <Button onClick={() => handleNewVisit()} className="shrink-0">
            <Plus className="h-4 w-4 mr-2" />
            New Visit
          </Button>
        </div>
      </CardHeader>

      <CardContent className="space-y-6">
        {/* Search and View Toggle */}
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-2 flex-1 max-w-sm">
            <Search className="h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search contractors..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="flex-1"
            />
          </div>

          <Tabs value={view} onValueChange={(value) => setView(value as "month" | "list")}>
            <TabsList>
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

        {/* Main Content */}
        <Tabs value={view} className="space-y-4">
          <TabsContent value="month" className="space-y-0">
            <CalendarView
              currentDate={currentDate}
              selectedDate={selectedDate}
              onDateSelect={handleDateSelect}
              onPreviousMonth={handlePreviousMonth}
              onNextMonth={handleNextMonth}
              visits={visits}
              contractors={contractors}
              isLoading={isLoading}
              onEditVisit={handleEditVisit}
              onDeleteVisit={handleDeleteVisit}
              onNewVisit={handleNewVisit}
            />
          </TabsContent>

          <TabsContent value="list" className="space-y-0">
            <VisitList
              visits={visits}
              contractors={contractors}
              isLoading={isLoading}
              searchQuery={searchQuery}
              onEditVisit={handleEditVisit}
              onDeleteVisit={handleDeleteVisit}
            />
          </TabsContent>
        </Tabs>

        {/* Visit Form Modal */}
        <VisitForm
          isOpen={isFormOpen}
          onClose={handleCloseForm}
          onSubmit={handleSubmitVisit}
          editingVisit={editingVisit}
          contractors={contractors}
          rooms={rooms}
          selectedDate={selectedDate}
          isSubmitting={isSubmitting}
          formError={formError}
        />

        {/* Delete Confirmation Dialog */}
        <DeleteDialog
          isOpen={deleteDialogOpen}
          onClose={handleCloseDeleteDialog}
          onConfirm={handleConfirmDelete}
          visit={visitToDelete}
          contractor={visitToDelete ? contractors.find(c => c.id === visitToDelete.contractor_id) || null : null}
          isDeleting={isDeleting}
          error={deleteError}
        />
      </CardContent>
    </Card>
  )
} 