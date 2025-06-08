"use client"

import dynamic from 'next/dynamic'
import type { Database } from "@/types/supabase"
import { CalendarSkeleton } from './calendar-skeleton'

type Room = Database["public"]["Tables"]["rooms"]["Row"]

interface ClientFacilityCalendarProps {
  rooms: Room[]
  userId: string
}

const FacilityCalendar = dynamic(() => import('@/components/facility-calendar'), {
  ssr: false,
  loading: () => <CalendarSkeleton />,
})

export default function ClientFacilityCalendar({ rooms, userId }: ClientFacilityCalendarProps) {
  return <FacilityCalendar rooms={rooms} userId={userId} />
} 