"use client"

import { useState } from "react"
import { getRoomColor } from "@/lib/colors"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { ChevronDown, ChevronUp } from "lucide-react"
import type { Database } from "@/types/supabase"

type Room = Database["public"]["Tables"]["rooms"]["Row"]

interface RoomLegendProps {
  rooms: Room[]
}

export default function RoomLegend({ rooms }: RoomLegendProps) {
  const [isExpanded, setIsExpanded] = useState(false)

  return (
    <Card className="shadow-sm border-muted">
      <CardHeader className="py-3 px-4 flex flex-row items-center justify-between space-y-0">
        <CardTitle className="text-base font-medium">Room Legend</CardTitle>
        <Button variant="ghost" size="sm" className="h-8 w-8 p-0" onClick={() => setIsExpanded(!isExpanded)}>
          {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
        </Button>
      </CardHeader>
      <CardContent className={`px-4 pb-3 ${isExpanded ? "" : "hidden sm:block"}`}>
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">
          {rooms.map((room) => {
            const color = getRoomColor(room.id, rooms)
            return (
              <div key={room.id} className="flex items-center gap-2">
                <div className={`w-4 h-4 rounded-full ${color.bg} ${color.border}`}></div>
                <span className="text-sm truncate">{room.name}</span>
              </div>
            )
          })}
        </div>
      </CardContent>
    </Card>
  )
}
