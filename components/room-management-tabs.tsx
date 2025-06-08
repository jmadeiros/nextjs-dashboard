"use client"

import { useRouter, usePathname } from "next/navigation"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { CalendarDays, LayoutDashboard } from "lucide-react"

export default function RoomManagementTabs() {
  const router = useRouter()
  const pathname = usePathname()

  // Check which view is active
  const isDashboardActive = pathname === "/dashboard"
  const isCalendarActive = pathname === "/dashboard/calendar" || pathname === "/dashboard"

  const handleTabChange = (value: string) => {
    router.push(value)
  }

  return (
    <div className="mb-6">
      <Tabs
        defaultValue={isCalendarActive ? "/dashboard" : "/dashboard/stats"}
        onValueChange={handleTabChange}
        className="w-full"
      >
        <TabsList className="grid w-full max-w-md grid-cols-2 mx-auto">
          <TabsTrigger value="/dashboard" className="flex items-center gap-2">
            <CalendarDays className="h-4 w-4" />
            <span>Calendar View</span>
          </TabsTrigger>
          <TabsTrigger value="/dashboard/stats" className="flex items-center gap-2">
            <LayoutDashboard className="h-4 w-4" />
            <span>Dashboard View</span>
          </TabsTrigger>
        </TabsList>
      </Tabs>
    </div>
  )
}
