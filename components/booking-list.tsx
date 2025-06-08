"use client"

import { DialogFooter } from "@/components/ui/dialog"
import { formatTime } from "@/lib/time-utils"

import { useState, useEffect } from "react"
import { format, parseISO } from "date-fns"
import { getSupabaseClient } from "@/lib/supabase-client"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Skeleton } from "@/components/ui/skeleton"
import { AlertCircle, Calendar, Clock, Info, Trash2, RefreshCw } from "lucide-react"
import { getRoomColor } from "@/lib/colors"
import type { Database } from "@/types/supabase"

type Room = Database["public"]["Tables"]["rooms"]["Row"]
type Booking = Database["public"]["Tables"]["bookings"]["Row"]

interface BookingListProps {
  bookings: Booking[]
  isLoading: boolean
  userId: string
  onBookingDeleted: (bookingId: string) => void
  rooms: Room[]
}

export default function BookingList({ bookings, isLoading, userId, onBookingDeleted, rooms }: BookingListProps) {
  // Add diagnostic logging
  useEffect(() => {
    console.log("[BookingList] Component mounted")
    return () => console.log("[BookingList] Component unmounted")
  }, [])

  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [bookingToDelete, setBookingToDelete] = useState<Booking | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)
  const [deleteError, setDeleteError] = useState<string | null>(null)

  // Get Supabase client once during component initialization
  const supabase = getSupabaseClient()

  const handleDeleteClick = (booking: Booking) => {
    console.log(`[BookingList] Delete clicked for booking: ${booking.id}`)
    setBookingToDelete(booking)
    setDeleteDialogOpen(true)
    setDeleteError(null)
  }

  const handleConfirmDelete = async () => {
    if (!bookingToDelete) return

    console.log(`[BookingList] Confirming delete for booking: ${bookingToDelete.id}`)
    setIsDeleting(true)
    setDeleteError(null)

    try {
      const { error } = await supabase.from("bookings").delete().eq("id", bookingToDelete.id)

      if (error) {
        console.error("[BookingList] Error deleting booking:", error)
        setDeleteError(`Failed to delete booking: ${error.message}`)
        return
      }

      console.log(`[BookingList] Successfully deleted booking: ${bookingToDelete.id}`)
      onBookingDeleted(bookingToDelete.id)
      setDeleteDialogOpen(false)
      setBookingToDelete(null)
    } catch (error) {
      console.error("[BookingList] Exception deleting booking:", error)
      setDeleteError(`Error: ${error instanceof Error ? error.message : String(error)}`)
    } finally {
      setIsDeleting(false)
    }
  }

  if (isLoading) {
    return (
      <div className="space-y-4">
        {[1, 2, 3].map((i) => (
          <Card key={i} className="overflow-hidden border-primary/5 shadow-sm">
            <CardContent className="p-0">
              <div className="border-l-4 border-transparent p-4">
                <div className="flex justify-between">
                  <div className="space-y-2">
                    <Skeleton className="h-5 w-[250px]" />
                    <Skeleton className="h-4 w-[200px]" />
                  </div>
                  <Skeleton className="h-8 w-8 rounded-full" />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    )
  }

  if (bookings.length === 0) {
    return (
      <div className="text-center py-12 px-4 bg-muted/20 rounded-lg border border-dashed border-muted">
        <Calendar className="h-12 w-12 mx-auto text-muted-foreground mb-3" />
        <h3 className="text-lg font-medium mb-1">No bookings for this day</h3>
        <p className="text-muted-foreground mb-4">Click "New Booking" to create one.</p>
      </div>
    )
  }

  return (
    <div className="space-y-3">
      {bookings.map((booking) => {
        const startTime = parseISO(booking.start_time)
        const endTime = parseISO(booking.end_time)

        // Get color based on room
        const color = getRoomColor(booking.room_id, rooms)

        return (
          <Card key={booking.id} className={`overflow-hidden ${color.border} shadow-sm hover:shadow transition-shadow`}>
            <CardContent className="p-0">
              <div className={`border-l-4 ${color.border} p-4 ${color.light}`}>
                <div className="flex justify-between items-start">
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="font-medium text-lg">{booking.title}</h3>
                      {booking.is_recurring && (
                        <div className={`flex items-center text-xs ${color.bg} ${color.text} px-2 py-0.5 rounded-full`}>
                          <RefreshCw className="h-3 w-3 mr-1 animate-pulse" />
                          Recurring
                        </div>
                      )}
                    </div>
                    <div className="flex items-center text-sm text-muted-foreground mt-2">
                      <Clock className="h-4 w-4 mr-1.5 text-primary/70" />
                      <span className="font-medium">{formatTime(startTime)}</span>
                      <span className="mx-1">-</span>
                      <span className="font-medium">{formatTime(endTime)}</span>
                    </div>
                    {booking.description && (
                      <div className="flex mt-3 text-sm text-muted-foreground">
                        <Info className="h-4 w-4 mr-1.5 mt-0.5 shrink-0 text-primary/70" />
                        <p>{booking.description}</p>
                      </div>
                    )}
                  </div>

                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => handleDeleteClick(booking)}
                    className="text-muted-foreground hover:text-red-500 hover:bg-red-50"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        )
      })}

      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center text-red-600">
              <AlertCircle className="h-5 w-5 mr-2" />
              Delete Booking
            </DialogTitle>
            <DialogDescription>
              Are you sure you want to delete this booking? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          {bookingToDelete && (
            <div className="bg-muted/30 p-3 rounded-md my-2">
              <p className="font-medium">{bookingToDelete.title}</p>
              <p className="text-sm text-muted-foreground mt-1">
                {format(parseISO(bookingToDelete.start_time), "MMMM d, yyyy")} at{" "}
                {formatTime(parseISO(bookingToDelete.start_time))}
              </p>
              {bookingToDelete.is_recurring && (
                <div className="flex items-center text-xs bg-muted/30 px-2 py-0.5 rounded-full mt-2 w-fit">
                  <RefreshCw className="h-3 w-3 mr-1" />
                  Recurring Booking
                </div>
              )}
            </div>
          )}
          {deleteError && (
            <div className="text-sm font-medium text-red-500 bg-red-50 p-3 rounded-md border border-red-100 flex items-start">
              <AlertCircle className="h-5 w-5 mr-2 shrink-0 mt-0.5" />
              {deleteError}
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteDialogOpen(false)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleConfirmDelete} disabled={isDeleting}>
              {isDeleting ? "Deleting..." : "Delete"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
