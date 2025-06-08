"use client"

import React from "react"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { X } from "lucide-react"
import type { Room, BookingFormData } from "./types"

interface RoomSelectionProps {
  formData: BookingFormData
  rooms: Room[]
  onFormDataChange: (updates: Partial<BookingFormData>) => void
  onAddRoom: () => void
  onRemoveRoom: (roomId: string) => void
}

export default function RoomSelection({
  formData,
  rooms,
  onFormDataChange,
  onAddRoom,
  onRemoveRoom,
}: RoomSelectionProps) {
  return (
    <div className="grid gap-2">
      <div className="flex items-center justify-between">
        <Label htmlFor="room" className="font-medium">
          Room(s)
        </Label>
        <div className="flex items-center space-x-2">
          <Checkbox
            id="multipleRooms"
            checked={formData.isMultipleRooms}
            onCheckedChange={(checked) => onFormDataChange({ isMultipleRooms: !!checked })}
          />
          <Label htmlFor="multipleRooms" className="text-sm cursor-pointer">
            Multiple rooms
          </Label>
        </div>
      </div>

      {formData.isMultipleRooms ? (
        <div className="space-y-2">
          <div className="flex gap-2">
            <Select
              value={formData.roomId}
              onValueChange={(value) => onFormDataChange({ roomId: value })}
            >
              <SelectTrigger className="h-10 flex-1">
                <SelectValue placeholder="Select a room to add" />
              </SelectTrigger>
              <SelectContent>
                {rooms.map((room) => (
                  <SelectItem key={room.id} value={room.id}>
                    {room.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button
              type="button"
              onClick={onAddRoom}
              disabled={!formData.roomId || formData.selectedRoomIds.includes(formData.roomId)}
              className="h-10"
            >
              Add
            </Button>
          </div>

          {formData.selectedRoomIds.length > 0 && (
            <div className="flex flex-wrap gap-2 p-2 bg-muted/20 rounded-md">
              {formData.selectedRoomIds.map((id) => {
                const room = rooms.find((r) => r.id === id)
                return (
                  <Badge key={id} variant="secondary" className="flex items-center gap-1 py-1">
                    {room?.name || "Unknown Room"}
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="h-4 w-4 p-0 ml-1"
                      onClick={() => onRemoveRoom(id)}
                    >
                      <X className="h-3 w-3" />
                      <span className="sr-only">Remove</span>
                    </Button>
                  </Badge>
                )
              })}
            </div>
          )}
        </div>
      ) : (
        <Select
          value={formData.roomId}
          onValueChange={(value) => onFormDataChange({ roomId: value })}
        >
          <SelectTrigger className="h-10">
            <SelectValue placeholder="Select a room" />
          </SelectTrigger>
          <SelectContent>
            {rooms.map((room) => (
              <SelectItem key={room.id} value={room.id}>
                {room.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      )}
    </div>
  )
} 