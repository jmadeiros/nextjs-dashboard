"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { Button } from "@/components/ui/button"
import { CalendarDays, Users, HardHat } from "lucide-react"

export default function NavBar() {
  const pathname = usePathname()

  return (
    <div className="bg-background border-b sticky top-0 z-10">
      <div className="container mx-auto px-4 py-3">
        <div className="flex justify-between items-center">
          <div className="font-semibold text-lg">Oasis Village Facility Management System</div>
          <div className="flex items-center space-x-2">
            <Link href="/">
              <Button variant={pathname === "/" ? "default" : "ghost"} size="sm" className="gap-1">
                <CalendarDays className="h-4 w-4" />
                <span className="hidden sm:inline">Master Calendar</span>
              </Button>
            </Link>
            <Link href="/dashboard">
              <Button variant={pathname === "/dashboard" ? "default" : "ghost"} size="sm" className="gap-1">
                <CalendarDays className="h-4 w-4" />
                <span className="hidden sm:inline">Room Bookings</span>
              </Button>
            </Link>
            <Link href="/contractors">
              <Button variant={pathname === "/contractors" ? "default" : "ghost"} size="sm" className="gap-1">
                <HardHat className="h-4 w-4" />
                <span className="hidden sm:inline">Contractors & Volunteers</span>
              </Button>
            </Link>
            <Link href="/partners">
              <Button variant={pathname === "/partners" ? "default" : "ghost"} size="sm" className="gap-1">
                <Users className="h-4 w-4" />
                <span className="hidden sm:inline">Partner Visitors</span>
              </Button>
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}
