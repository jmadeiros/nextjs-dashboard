"use client"

import React from "react"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Trash2, AlertTriangle, User, Calendar, Clock } from "lucide-react"
import { format, parseISO } from "date-fns"
import type { ContractorVisit, Contractor } from "./types"

interface DeleteDialogProps {
  isOpen: boolean
  onClose: () => void
  onConfirm: () => Promise<void>
  visit: ContractorVisit | null
  contractor: Contractor | null
  isDeleting: boolean
  error: string | null
}

export default function DeleteDialog({
  isOpen,
  onClose,
  onConfirm,
  visit,
  contractor,
  isDeleting,
  error,
}: DeleteDialogProps) {
  if (!visit || !contractor) {
    return null
  }

  const handleConfirm = async () => {
    try {
      await onConfirm()
      onClose()
    } catch (error) {
      // Error is handled by parent component
      console.error("Error deleting visit:", error)
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-red-600">
            <Trash2 className="h-5 w-5" />
            Delete Visit
          </DialogTitle>
          <DialogDescription>
            This action cannot be undone. This will permanently delete the visit from the system.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Visit Details */}
          <div className="bg-muted/20 rounded-lg p-4 space-y-3">
            <div className="flex items-center gap-2">
              <User className="h-4 w-4 text-muted-foreground" />
              <div>
                <span className="font-medium">{contractor.name}</span>
                {contractor.company && (
                  <span className="text-sm text-muted-foreground ml-2">• {contractor.company}</span>
                )}
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm">
                {format(parseISO(visit.visit_date), "EEEE, MMMM d, yyyy")}
              </span>
            </div>

            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm">
                {visit.start_time} - {visit.end_time}
              </span>
            </div>

            {visit.purpose && (
              <div className="text-sm text-muted-foreground">
                <span className="font-medium">Purpose:</span> {visit.purpose}
              </div>
            )}

            {visit.is_recurring && (
              <div className="flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 text-amber-500" />
                <span className="text-sm text-amber-700 font-medium">
                  This is a recurring visit
                </span>
              </div>
            )}
          </div>

          {/* Warning */}
          <Alert className="border-red-200 bg-red-50">
            <AlertTriangle className="h-4 w-4 text-red-600" />
            <AlertDescription className="text-red-800">
              <strong>Warning:</strong> This will permanently delete this visit. 
              {visit.is_recurring && " Other instances of this recurring visit will not be affected."}
            </AlertDescription>
          </Alert>

          {/* Error Display */}
          {error && (
            <Alert className="border-red-200 bg-red-50">
              <AlertDescription className="text-red-800">
                {error}
              </AlertDescription>
            </Alert>
          )}
        </div>

        <DialogFooter className="flex gap-2">
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
            {isDeleting ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
                Deleting...
              </>
            ) : (
              <>
                <Trash2 className="h-4 w-4 mr-2" />
                Delete Visit
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
} 