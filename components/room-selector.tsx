"use client"

import { Button } from "@/components/ui/button"
import { ScrollArea } from "@/components/ui/scroll-area"
import { DoorOpen } from "lucide-react"
import { getRoomColor } from "@/lib/colors"
import type { Database } from "@/types/supabase"

type Room = Database["public"]["Tables"]["rooms"]["Row"]

interface RoomSelectorProps {
  rooms: Room[]
  selectedRoom: Room | null
  onRoomChange: (room: Room) => void
  showColors?: boolean
}

export default function RoomSelector({ rooms, selectedRoom, onRoomChange, showColors = false }: RoomSelectorProps) {
  return (
    <ScrollArea className="h-[calc(100vh-300px)]">
      <div className="p-3 space-y-1">
        {rooms.map((room) => {
          const color = showColors ? getRoomColor(room.id, rooms) : null

          return (
            <Button
              key={room.id}
              variant={selectedRoom?.id === room.id ? "default" : "ghost"}
              className={`w-full justify-start text-left transition-all ${
                selectedRoom?.id === room.id
                  ? "bg-primary text-primary-foreground font-medium shadow-sm relative pl-6 before:absolute before:left-0 before:top-1/2 before:-translate-y-1/2 before:h-4/5 before:w-1 before:bg-primary-foreground before:rounded-r"
                  : color
                    ? color.light
                    : "hover:bg-muted"
              }`}
              onClick={() => onRoomChange(room)}
            >
              {showColors ? (
                <div className={`w-3 h-3 rounded-full mr-2 ${color?.bg} ${color?.border}`}></div>
              ) : (
                <DoorOpen
                  className={`mr-2 h-4 w-4 ${selectedRoom?.id === room.id ? "text-primary-foreground" : "text-primary/70"}`}
                />
              )}
              <span>{room.name}</span>
            </Button>
          )
        })}
      </div>
    </ScrollArea>
  )
}
