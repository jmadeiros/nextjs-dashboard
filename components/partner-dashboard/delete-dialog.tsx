"use client"

import React from "react"
import { format, parseISO } from "date-fns"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Trash2, CalendarIcon, Clock, AlertTriangle } from "lucide-react"
import type { EnhancedGuestVisit } from "./types"

interface DeleteDialogProps {
  isOpen: boolean
  onClose: () => void
  onConfirm: () => Promise<void>
  visit: EnhancedGuestVisit | null
  isDeleting: boolean
  error: string | null
}

export default function DeleteDialog({
  isOpen,
  onClose,
  onConfirm,
  visit,
  isDeleting,
  error,
}: DeleteDialogProps) {
  if (!visit) {
    return null
  }

  const visitDate = parseISO(visit.visit_date)

  const handleConfirm = async () => {
    try {
      await onConfirm()
      onClose()
    } catch (error) {
      // Error handling is managed by parent component
      console.error("Error deleting visit:", error)
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-red-600">
            <AlertTriangle className="h-5 w-5" />
            Delete Guest Visit
          </DialogTitle>
          <DialogDescription>
            This action cannot be undone. The visit will be permanently removed from the system.
          </DialogDescription>
        </DialogHeader>

        <div className="py-4">
          {/* Visit Summary */}
          <div className="bg-muted/30 rounded-lg p-4 space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="font-medium text-lg">
                {visit.partners?.name || "Unknown Partner"}
              </h3>
              <div
                className={`text-xs px-2 py-1 rounded-full font-medium ${
                  visit.status === "scheduled"
                    ? "bg-purple-100 text-purple-700"
                    : visit.status === "checked-in"
                      ? "bg-green-100 text-green-700"
                      : visit.status === "completed"
                        ? "bg-gray-100 text-gray-700"
                        : "bg-red-100 text-red-700"
                }`}
              >
                {visit.status ? visit.status.charAt(0).toUpperCase() + visit.status.slice(1) : "Unknown"}
              </div>
            </div>

            <div className="grid grid-cols-1 gap-2 text-sm text-muted-foreground">
              <div className="flex items-center gap-2">
                <CalendarIcon className="h-4 w-4 text-primary/70" />
                <span className="font-medium">
                  {format(visitDate, "EEEE, MMMM d, yyyy")}
                </span>
              </div>

              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4 text-primary/70" />
                <span className="font-medium">
                  {visit.start_time === "08:00" && visit.end_time === "18:00"
                    ? "Full Day"
                    : `${visit.start_time} - ${visit.end_time}`}
                </span>
              </div>

              {visit.purpose && (
                <div className="mt-2">
                  <span className="font-medium">Purpose:</span> {visit.purpose}
                </div>
              )}

              {visit.guest_details && (
                <div className="mt-1">
                  <span className="font-medium">Guests:</span> {visit.guest_details}
                </div>
              )}

              {visit.authorizer && (
                <div className="mt-1">
                  <span className="font-medium">Authorized by:</span> {visit.authorizer}
                </div>
              )}
            </div>
          </div>

          {/* Warning Message */}
          <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-md">
            <div className="flex items-start gap-2">
              <AlertTriangle className="h-4 w-4 text-red-600 mt-0.5 flex-shrink-0" />
              <div className="text-sm text-red-800">
                <p className="font-medium mb-1">Are you sure you want to delete this visit?</p>
                <p>
                  This will permanently remove the guest visit from the system. If this visit has any
                  associated room bookings, those will also be cancelled.
                </p>
              </div>
            </div>
          </div>

          {/* Error Message */}
          {error && (
            <Alert className="border-red-200 bg-red-50 mt-4">
              <AlertTriangle className="h-4 w-4 text-red-600" />
              <AlertDescription className="text-red-800">
                {error}
              </AlertDescription>
            </Alert>
          )}
        </div>

        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={onClose}
            disabled={isDeleting}
          >
            Cancel
          </Button>
          <Button
            type="button"
            variant="destructive"
            onClick={handleConfirm}
            disabled={isDeleting}
            className="bg-red-600 hover:bg-red-700"
          >
            <Trash2 className="h-4 w-4 mr-2" />
            {isDeleting ? "Deleting..." : "Delete Visit"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
} 