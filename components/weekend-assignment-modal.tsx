"use client"

import { useState, useEffect } from "react"
import { format, isSaturday, addDays } from "date-fns"
import { getSupabaseClient } from "@/lib/supabase-client"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { AlertCircle, Calendar, User, Clock, Plus, Trash2 } from "lucide-react"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

interface WeekendAssignmentModalProps {
  isOpen: boolean
  onClose: () => void
  selectedDate: Date
  onAssignmentChange: () => void
}

interface Assignment {
  id?: string
  caretaker_id: string
  start_time: string
  end_time: string
  notes: string
  caretaker_name?: string
  caretaker_color?: string
}

export default function WeekendAssignmentModal({
  isOpen,
  onClose,
  selectedDate,
  onAssignmentChange,
}: WeekendAssignmentModalProps) {
  const [caretakers, setCaretakers] = useState<any[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState<string>("saturday")
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false)
  const [showCloseConfirmation, setShowCloseConfirmation] = useState(false)

  // Separate state for Saturday and Sunday assignments (arrays now)
  const [saturdayAssignments, setSaturdayAssignments] = useState<Assignment[]>([])
  const [sundayAssignments, setSundayAssignments] = useState<Assignment[]>([])

  // Get Supabase client
  const supabase = getSupabaseClient()

  // Ensure we're working with the Saturday of the weekend
  const weekendSaturday = isSaturday(selectedDate) ? selectedDate : addDays(selectedDate, -1)
  const weekendSunday = addDays(weekendSaturday, 1)
  const weekendSundayStr = format(weekendSunday, "EEEE, MMMM d, yyyy")
  const weekendSaturdayStr = format(weekendSaturday, "yyyy-MM-dd")

  // Generate time options (30-minute intervals)
  const generateTimeOptions = () => {
    const times = []
    for (let hour = 0; hour < 24; hour++) {
      for (let minute = 0; minute < 60; minute += 30) {
        const timeStr = `${hour.toString().padStart(2, "0")}:${minute.toString().padStart(2, "0")}`
        const displayTime = format(new Date(2000, 0, 1, hour, minute), "h:mm a")
        times.push({ value: timeStr, label: displayTime })
      }
    }
    return times
  }

  const handleCloseAttempt = () => {
    if (hasUnsavedChanges) {
      setShowCloseConfirmation(true)
    } else {
      onClose()
    }
  }

  const handleConfirmClose = (shouldSave: boolean) => {
    setShowCloseConfirmation(false)
    if (shouldSave) {
      handleSave()
    } else {
      setHasUnsavedChanges(false)
      onClose()
    }
  }

  const timeOptions = generateTimeOptions()

  // Fetch caretakers and current assignments when modal opens
  useEffect(() => {
    if (isOpen) {
      const fetchData = async () => {
        setIsLoading(true)
        setError(null)

        try {
          // Fetch caretakers
          const { data: caretakersData, error: caretakersError } = await supabase
            .from("caretakers")
            .select("*")
            .order("name")

          if (caretakersError) {
            throw new Error(`Failed to load caretakers: ${caretakersError.message}`)
          }

          setCaretakers(caretakersData || [])

          // Fetch current assignments for this weekend
          const { data: assignmentsData, error: assignmentsError } = await supabase
            .from("weekend_assignments")
            .select("*, caretakers(id, name, color)")
            .eq("weekend_start_date", weekendSaturdayStr)
            .order("day_of_week, start_time")

          if (assignmentsError) {
            throw new Error(`Failed to load assignments: ${assignmentsError.message}`)
          }

          // Reset assignments to empty arrays
          setSaturdayAssignments([])
          setSundayAssignments([])

          // Process assignments data
          if (assignmentsData && assignmentsData.length > 0) {
            const satAssignments: Assignment[] = []
            const sunAssignments: Assignment[] = []

            assignmentsData.forEach((assignment) => {
              const assignmentData: Assignment = {
                id: assignment.id,
                caretaker_id: assignment.caretaker_id,
                start_time: assignment.start_time || "09:00",
                end_time: assignment.end_time || "17:00",
                notes: assignment.notes || "",
                caretaker_name: assignment.caretakers?.name,
                caretaker_color: assignment.caretakers?.color,
              }

              if (assignment.day_of_week === "saturday") {
                satAssignments.push(assignmentData)
              } else if (assignment.day_of_week === "sunday") {
                sunAssignments.push(assignmentData)
              }
            })

            setSaturdayAssignments(satAssignments)
            setSundayAssignments(sunAssignments)
          }
        } catch (error) {
          console.error("Error fetching data:", error)
          setError(`Error: ${error instanceof Error ? error.message : String(error)}`)
        } finally {
          setIsLoading(false)
        }
      }

      fetchData()
    }
  }, [isOpen, supabase, weekendSaturdayStr])

  // Add new assignment
  const addAssignment = (day: "saturday" | "sunday") => {
    const newAssignment: Assignment = {
      caretaker_id: "",
      start_time: "09:00",
      end_time: "17:00",
      notes: "",
    }

    if (day === "saturday") {
      setSaturdayAssignments((prev) => [...prev, newAssignment])
    } else {
      setSundayAssignments((prev) => [...prev, newAssignment])
    }

    setHasUnsavedChanges(true)
  }

  // Remove assignment
  const removeAssignment = (day: "saturday" | "sunday", index: number) => {
    if (day === "saturday") {
      setSaturdayAssignments((prev) => prev.filter((_, i) => i !== index))
    } else {
      setSundayAssignments((prev) => prev.filter((_, i) => i !== index))
    }

    setHasUnsavedChanges(true)
  }

  // Update assignment
  const updateAssignment = (day: "saturday" | "sunday", index: number, field: keyof Assignment, value: string) => {
    if (day === "saturday") {
      setSaturdayAssignments((prev) =>
        prev.map((assignment, i) => (i === index ? { ...assignment, [field]: value } : assignment)),
      )
    } else {
      setSundayAssignments((prev) =>
        prev.map((assignment, i) => (i === index ? { ...assignment, [field]: value } : assignment)),
      )
    }

    setHasUnsavedChanges(true)
  }

  // Validate time overlaps
  const validateTimeOverlaps = (assignments: Assignment[]): string | null => {
    const validAssignments = assignments.filter((a) => a.caretaker_id && a.start_time && a.end_time)

    for (let i = 0; i < validAssignments.length; i++) {
      for (let j = i + 1; j < validAssignments.length; j++) {
        const a1 = validAssignments[i]
        const a2 = validAssignments[j]

        const start1 = new Date(`2000-01-01T${a1.start_time}`)
        const end1 = new Date(`2000-01-01T${a1.end_time}`)
        const start2 = new Date(`2000-01-01T${a2.start_time}`)
        const end2 = new Date(`2000-01-01T${a2.end_time}`)

        // Check for overlap
        if (start1 < end2 && start2 < end1) {
          return `Time overlap detected between ${format(start1, "h:mm a")} - ${format(end1, "h:mm a")} and ${format(start2, "h:mm a")} - ${format(end2, "h:mm a")}`
        }
      }
    }

    return null
  }

  // Handle save
  const handleSave = async () => {
    setIsLoading(true)
    setError(null)

    try {
      // Validate time overlaps
      const saturdayOverlap = validateTimeOverlaps(saturdayAssignments)
      if (saturdayOverlap) {
        throw new Error(`Saturday: ${saturdayOverlap}`)
      }

      const sundayOverlap = validateTimeOverlaps(sundayAssignments)
      if (sundayOverlap) {
        throw new Error(`Sunday: ${sundayOverlap}`)
      }

      // Get current assignments from database to compare
      const { data: currentAssignments, error: fetchError } = await supabase
        .from("weekend_assignments")
        .select("*")
        .eq("weekend_start_date", weekendSaturdayStr)

      if (fetchError) {
        throw new Error(`Failed to fetch current assignments: ${fetchError.message}`)
      }

      const currentIds = new Set((currentAssignments || []).map((a) => a.id))
      const keepIds = new Set()

      // Process Saturday assignments
      for (const assignment of saturdayAssignments) {
        if (!assignment.caretaker_id || !assignment.start_time || !assignment.end_time) {
          continue // Skip incomplete assignments
        }

        if (assignment.id) {
          // Update existing assignment
          keepIds.add(assignment.id)
          const { error } = await supabase
            .from("weekend_assignments")
            .update({
              caretaker_id: assignment.caretaker_id,
              start_time: assignment.start_time,
              end_time: assignment.end_time,
              notes: assignment.notes,
              day_of_week: "saturday",
            })
            .eq("id", assignment.id)

          if (error) {
            throw new Error(`Failed to update Saturday assignment: ${error.message}`)
          }
        } else {
          // Insert new assignment
          const { error } = await supabase.from("weekend_assignments").insert({
            caretaker_id: assignment.caretaker_id,
            weekend_start_date: weekendSaturdayStr,
            start_time: assignment.start_time,
            end_time: assignment.end_time,
            notes: assignment.notes,
            day_of_week: "saturday",
          })

          if (error) {
            throw new Error(`Failed to create Saturday assignment: ${error.message}`)
          }
        }
      }

      // Process Sunday assignments
      for (const assignment of sundayAssignments) {
        if (!assignment.caretaker_id || !assignment.start_time || !assignment.end_time) {
          continue // Skip incomplete assignments
        }

        if (assignment.id) {
          // Update existing assignment
          keepIds.add(assignment.id)
          const { error } = await supabase
            .from("weekend_assignments")
            .update({
              caretaker_id: assignment.caretaker_id,
              start_time: assignment.start_time,
              end_time: assignment.end_time,
              notes: assignment.notes,
              day_of_week: "sunday",
            })
            .eq("id", assignment.id)

          if (error) {
            throw new Error(`Failed to update Sunday assignment: ${error.message}`)
          }
        } else {
          // Insert new assignment
          const { error } = await supabase.from("weekend_assignments").insert({
            caretaker_id: assignment.caretaker_id,
            weekend_start_date: weekendSaturdayStr,
            start_time: assignment.start_time,
            end_time: assignment.end_time,
            notes: assignment.notes,
            day_of_week: "sunday",
          })

          if (error) {
            throw new Error(`Failed to create Sunday assignment: ${error.message}`)
          }
        }
      }

      // Delete assignments that are no longer needed
      const idsToDelete = Array.from(currentIds).filter((id) => !keepIds.has(id))
      if (idsToDelete.length > 0) {
        const { error: deleteError } = await supabase.from("weekend_assignments").delete().in("id", idsToDelete)

        if (deleteError) {
          throw new Error(`Failed to delete removed assignments: ${deleteError.message}`)
        }
      }

      setHasUnsavedChanges(false)
      // Notify parent component to refresh data
      onAssignmentChange()
      onClose()
    } catch (error) {
      console.error("Error saving assignments:", error)
      setError(`Error: ${error instanceof Error ? error.message : String(error)}`)
    } finally {
      setIsLoading(false)
    }
  }

  // Clear all assignments for a day
  const clearDay = (day: "saturday" | "sunday") => {
    if (day === "saturday") {
      setSaturdayAssignments([])
    } else {
      setSundayAssignments([])
    }

    setHasUnsavedChanges(true)
  }

  // Get caretaker name by ID
  const getCaretakerName = (caretakerId: string) => {
    const caretaker = caretakers.find((c) => c.id === caretakerId)
    return caretaker?.name || "Unknown"
  }

  // Render assignments for a day
  const renderDayAssignments = (day: "saturday" | "sunday") => {
    const assignments = day === "saturday" ? saturdayAssignments : sundayAssignments
    const dayName = day === "saturday" ? "Saturday" : "Sunday"
    const dayDate = day === "saturday" ? weekendSaturday : weekendSunday

    return (
      <div className="space-y-4">
        <div className="flex justify-between items-center">
          <h3 className="text-lg font-medium">{dayName} Assignments</h3>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => addAssignment(day)} disabled={isLoading}>
              <Plus className="h-4 w-4 mr-1" />
              Add Shift
            </Button>
            {assignments.length > 0 && (
              <Button variant="outline" size="sm" onClick={() => clearDay(day)} disabled={isLoading}>
                <Trash2 className="h-4 w-4 mr-1" />
                Clear All
              </Button>
            )}
          </div>
        </div>

        <div className="bg-blue-50 p-3 rounded-md border border-blue-200 mb-4">
          <h4 className="text-sm font-medium text-blue-800 mb-1">{dayName} Coverage</h4>
          <p className="text-xs text-blue-700">{format(dayDate, "MMMM d, yyyy")}</p>
        </div>

        {assignments.length === 0 ? (
          <div className="text-center py-8 px-4 bg-muted/20 rounded-lg border border-dashed border-muted">
            <Calendar className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
            <p className="text-sm text-muted-foreground">No assignments for {dayName.toLowerCase()}</p>
            <p className="text-xs text-muted-foreground mt-1">Click "Add Shift" to create an assignment</p>
          </div>
        ) : (
          <div className="space-y-3">
            {assignments.map((assignment, index) => (
              <Card key={index} className="border border-border">
                <CardHeader className="pb-3">
                  <div className="flex justify-between items-center">
                    <CardTitle className="text-sm">Shift {index + 1}</CardTitle>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => removeAssignment(day, index)}
                      disabled={isLoading}
                      className="text-red-600 hover:text-red-700 hover:bg-red-50"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  {assignment.id ? (
                    // Read-only view for existing shifts
                    <div className="space-y-4">
                      <div className="bg-blue-50 p-4 rounded-md border border-blue-200">
                        <div className="flex items-center mb-2">
                          <User
                            className={`h-5 w-5 mr-2 text-${caretakers.find((c) => c.id === assignment.caretaker_id)?.color || "blue"}-500`}
                          />
                          <h3 className="font-medium">{getCaretakerName(assignment.caretaker_id)}</h3>
                        </div>
                        <div className="flex items-center text-sm text-blue-700 mb-1">
                          <Clock className="h-4 w-4 mr-2" />
                          <span>
                            {format(new Date(`2000-01-01T${assignment.start_time}`), "h:mm a")} -{" "}
                            {format(new Date(`2000-01-01T${assignment.end_time}`), "h:mm a")}
                          </span>
                        </div>
                        {assignment.notes && (
                          <div className="mt-2 text-sm text-gray-600 border-t border-blue-200 pt-2">
                            <p className="font-medium mb-1">Notes:</p>
                            <p>{assignment.notes}</p>
                          </div>
                        )}
                      </div>
                      <div className="text-sm text-gray-500 italic">
                        This shift has been saved. To modify it, delete and create a new one.
                      </div>
                    </div>
                  ) : (
                    // Editable view for new shifts
                    <>
                      <div className="grid grid-cols-4 items-center gap-4">
                        <Label className="text-right text-sm">Caretaker</Label>
                        <div className="col-span-3">
                          <Select
                            value={assignment.caretaker_id}
                            onValueChange={(value) => updateAssignment(day, index, "caretaker_id", value)}
                            disabled={isLoading}
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Select a caretaker" />
                            </SelectTrigger>
                            <SelectContent>
                              {caretakers.map((caretaker) => (
                                <SelectItem key={caretaker.id} value={caretaker.id}>
                                  <div className="flex items-center">
                                    <User className={`h-4 w-4 mr-2 text-${caretaker.color}-500`} />
                                    {caretaker.name}
                                  </div>
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      </div>

                      <div className="grid grid-cols-4 items-center gap-4">
                        <Label className="text-right text-sm">Start Time</Label>
                        <div className="col-span-3">
                          <Select
                            value={assignment.start_time}
                            onValueChange={(value) => updateAssignment(day, index, "start_time", value)}
                            disabled={isLoading}
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Select start time" />
                            </SelectTrigger>
                            <SelectContent className="max-h-[200px]">
                              {timeOptions.map((time) => (
                                <SelectItem key={`${day}-${index}-start-${time.value}`} value={time.value}>
                                  <div className="flex items-center">
                                    <Clock className="h-4 w-4 mr-2 text-muted-foreground" />
                                    {time.label}
                                  </div>
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      </div>

                      <div className="grid grid-cols-4 items-center gap-4">
                        <Label className="text-right text-sm">End Time</Label>
                        <div className="col-span-3">
                          <Select
                            value={assignment.end_time}
                            onValueChange={(value) => updateAssignment(day, index, "end_time", value)}
                            disabled={isLoading}
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Select end time" />
                            </SelectTrigger>
                            <SelectContent className="max-h-[200px]">
                              {timeOptions.map((time) => (
                                <SelectItem key={`${day}-${index}-end-${time.value}`} value={time.value}>
                                  <div className="flex items-center">
                                    <Clock className="h-4 w-4 mr-2 text-muted-foreground" />
                                    {time.label}
                                  </div>
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      </div>

                      <div className="grid grid-cols-4 items-center gap-4">
                        <Label className="text-right text-sm">Notes</Label>
                        <Textarea
                          placeholder="Special instructions or notes"
                          className="col-span-3"
                          value={assignment.notes}
                          onChange={(e) => updateAssignment(day, index, "notes", e.target.value)}
                          disabled={isLoading}
                        />
                      </div>

                      {assignment.caretaker_id && assignment.start_time && assignment.end_time && (
                        <div className="bg-green-50 p-2 rounded border border-green-200">
                          <p className="text-sm text-green-800">
                            <strong>{getCaretakerName(assignment.caretaker_id)}</strong> will work from{" "}
                            {format(new Date(`2000-01-01T${assignment.start_time}`), "h:mm a")} to{" "}
                            {format(new Date(`2000-01-01T${assignment.end_time}`), "h:mm a")}
                          </p>
                        </div>
                      )}
                    </>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    )
  }

  return (
    <Dialog open={isOpen} onOpenChange={handleCloseAttempt}>
      <DialogContent className="sm:max-w-[700px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5 text-primary" />
            Weekend Caretaker Assignment
          </DialogTitle>
          <DialogDescription>
            Assign caretakers for the weekend of {format(weekendSaturday, "MMMM d")} -{" "}
            {format(weekendSunday, "d, yyyy")}. You can assign multiple caretakers for different time slots on each day.
          </DialogDescription>
        </DialogHeader>

        {error && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="saturday">
              Saturday ({saturdayAssignments.length} shift{saturdayAssignments.length !== 1 ? "s" : ""})
            </TabsTrigger>
            <TabsTrigger value="sunday">
              Sunday ({sundayAssignments.length} shift{sundayAssignments.length !== 1 ? "s" : ""})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="saturday" className="mt-4">
            {renderDayAssignments("saturday")}
          </TabsContent>

          <TabsContent value="sunday" className="mt-4">
            {renderDayAssignments("sunday")}
          </TabsContent>
        </Tabs>

        <DialogFooter className="flex justify-between">
          <div className="flex gap-2">
            <Button variant="outline" onClick={handleCloseAttempt} disabled={isLoading}>
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={isLoading}>
              Save All Assignments
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
      {/* Close confirmation dialog */}
      <Dialog open={showCloseConfirmation} onOpenChange={() => setShowCloseConfirmation(false)}>
        <DialogContent className="sm:max-w-[450px]">
          <DialogHeader>
            <DialogTitle>Unsaved Changes</DialogTitle>
            <DialogDescription>
              You have unsaved changes to the weekend assignments. What would you like to do?
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="flex gap-2">
            <Button variant="outline" onClick={() => setShowCloseConfirmation(false)}>
              Cancel
            </Button>
            <Button variant="outline" onClick={() => handleConfirmClose(false)}>
              Discard Changes
            </Button>
            <Button onClick={() => handleConfirmClose(true)}>Save Changes</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Dialog>
  )
}
