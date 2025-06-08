"use client"

import Link from "next/link"
import { usePathname, useSearchParams } from "next/navigation"
import { cn } from "@/lib/utils"
import { Calendar, Home, Settings, Users } from "lucide-react"

const navigation = [
  { name: "Dashboard", href: "/", icon: Home },
  { name: "Calendar", href: "/calendar", icon: Calendar },
  { name: "Rooms", href: "/rooms", icon: Users },
  { name: "Settings", href: "/settings", icon: Settings },
]

export function Navigation() {
  const pathname = usePathname()
  const searchParams = useSearchParams()

  return (
    <nav className="flex space-x-4">
      {navigation.map((item) => {
        const isActive = pathname === item.href
        const Icon = item.icon

        // For calendar, preserve room parameter if it exists
        let href = item.href
        if (item.href === "/calendar" && searchParams.get("room")) {
          href = `/calendar?room=${searchParams.get("room")}`
        }

        return (
          <Link
            key={item.name}
            href={href}
            className={cn(
              "flex items-center gap-2 px-3 py-2 rounded-md text-sm font-medium transition-colors",
              isActive
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground hover:text-foreground hover:bg-muted",
            )}
          >
            <Icon className="h-4 w-4" />
            {item.name}
          </Link>
        )
      })}
    </nav>
  )
}
