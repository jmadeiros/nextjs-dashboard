"use client"

import { useState, useEffect } from "react"
import { format, parseISO } from "date-fns"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { getSupabaseClient } from "@/lib/supabase-client"
import { Button } from "@/components/ui/button"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"

export default function DateDebug() {
  const [visits, setVisits] = useState<any[]>([])
  const [partnerVisits, setPartnerVisits] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [userTimezone, setUserTimezone] = useState("")
  const [activeTab, setActiveTab] = useState<"contractors" | "partners">("contractors")

  useEffect(() => {
    // Get user's timezone
    setUserTimezone(Intl.DateTimeFormat().resolvedOptions().timeZone)

    // Fetch data based on active tab
    fetchData(activeTab)
  }, [activeTab])

  const fetchData = async (tab: "contractors" | "partners") => {
    setLoading(true)
    const supabase = getSupabaseClient()

    if (tab === "contractors") {
      const { data, error } = await supabase
        .from("contractor_visits")
        .select("*")
        .order("visit_date", { ascending: false })
        .limit(10)

      if (error) {
        console.error("Error fetching contractor visits:", error)
      } else {
        setVisits(data || [])
      }
    } else {
      const { data, error } = await supabase
        .from("guest_visits")
        .select("*, partners(name)")
        .order("visit_date", { ascending: false })
        .limit(10)

      if (error) {
        console.error("Error fetching partner visits:", error)
      } else {
        setPartnerVisits(data || [])
      }
    }

    setLoading(false)
  }

  // Function to fix a contractor date in the database
  const fixContractorDate = async (visitId: string, originalDate: string) => {
    const supabase = getSupabaseClient()

    // Parse the date and ensure it's set to noon UTC to avoid timezone issues
    const parsedDate = parseISO(originalDate)
    const year = parsedDate.getUTCFullYear()
    const month = parsedDate.getUTCMonth() + 1 // getUTCMonth() is 0-indexed
    const day = parsedDate.getUTCDate()

    // Create a new date string in ISO format with time set to 12:00:00 UTC
    const fixedDate = `${year}-${month.toString().padStart(2, "0")}-${day.toString().padStart(2, "0")}T12:00:00.000Z`

    console.log(`Fixing date for contractor visit ${visitId}:`)
    console.log(`Original: ${originalDate}`)
    console.log(`Fixed: ${fixedDate}`)

    const { error } = await supabase.from("contractor_visits").update({ visit_date: fixedDate }).eq("id", visitId)

    if (error) {
      console.error("Error fixing date:", error)
      alert(`Error fixing date: ${error.message}`)
    } else {
      alert("Date fixed successfully!")
      // Refresh the data
      fetchData("contractors")
    }
  }

  // Function to fix a partner date in the database
  const fixPartnerDate = async (visitId: string, originalDate: string) => {
    const supabase = getSupabaseClient()

    // Parse the date and ensure it's set to noon UTC to avoid timezone issues
    const parsedDate = parseISO(originalDate)
    const year = parsedDate.getUTCFullYear()
    const month = parsedDate.getUTCMonth() + 1 // getUTCMonth() is 0-indexed
    const day = parsedDate.getUTCDate()

    // Create a new date string in ISO format with time set to 12:00:00 UTC
    const fixedDate = `${year}-${month.toString().padStart(2, "0")}-${day.toString().padStart(2, "0")}T12:00:00.000Z`

    console.log(`Fixing date for partner visit ${visitId}:`)
    console.log(`Original: ${originalDate}`)
    console.log(`Fixed: ${fixedDate}`)

    const { error } = await supabase.from("guest_visits").update({ visit_date: fixedDate }).eq("id", visitId)

    if (error) {
      console.error("Error fixing date:", error)
      alert(`Error fixing date: ${error.message}`)
    } else {
      alert("Date fixed successfully!")
      // Refresh the data
      fetchData("partners")
    }
  }

  // Function to fix all contractor dates
  const fixAllContractorDates = async () => {
    if (!confirm("Are you sure you want to fix all contractor dates? This will update all contractor visits.")) {
      return
    }

    const supabase = getSupabaseClient()
    let fixedCount = 0
    let errorCount = 0

    for (const visit of visits) {
      // Parse the date and ensure it's set to noon UTC to avoid timezone issues
      const parsedDate = parseISO(visit.visit_date)
      const year = parsedDate.getUTCFullYear()
      const month = parsedDate.getUTCMonth() + 1 // getUTCMonth() is 0-indexed
      const day = parsedDate.getUTCDate()

      // Create a new date string in ISO format with time set to 12:00:00 UTC
      const fixedDate = `${year}-${month.toString().padStart(2, "0")}-${day.toString().padStart(2, "0")}T12:00:00.000Z`

      const { error } = await supabase.from("contractor_visits").update({ visit_date: fixedDate }).eq("id", visit.id)

      if (error) {
        console.error(`Error fixing date for visit ${visit.id}:`, error)
        errorCount++
      } else {
        fixedCount++
      }
    }

    alert(`Fixed ${fixedCount} contractor dates. Errors: ${errorCount}`)
    // Refresh the data
    fetchData("contractors")
  }

  // Function to fix all partner dates
  const fixAllPartnerDates = async () => {
    if (!confirm("Are you sure you want to fix all partner dates? This will update all partner visits.")) {
      return
    }

    const supabase = getSupabaseClient()
    let fixedCount = 0
    let errorCount = 0

    for (const visit of partnerVisits) {
      // Parse the date and ensure it's set to noon UTC to avoid timezone issues
      const parsedDate = parseISO(visit.visit_date)
      const year = parsedDate.getUTCFullYear()
      const month = parsedDate.getUTCMonth() + 1 // getUTCMonth() is 0-indexed
      const day = parsedDate.getUTCDate()

      // Create a new date string in ISO format with time set to 12:00:00 UTC
      const fixedDate = `${year}-${month.toString().padStart(2, "0")}-${day.toString().padStart(2, "0")}T12:00:00.000Z`

      const { error } = await supabase.from("guest_visits").update({ visit_date: fixedDate }).eq("id", visit.id)

      if (error) {
        console.error(`Error fixing date for visit ${visit.id}:`, error)
        errorCount++
      } else {
        fixedCount++
      }
    }

    alert(`Fixed ${fixedCount} partner dates. Errors: ${errorCount}`)
    // Refresh the data
    fetchData("partners")
  }

  return (
    <Card className="mb-6">
      <CardHeader>
        <CardTitle className="flex justify-between items-center">
          <span>Date Debug Tool</span>
          <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as "contractors" | "partners")}>
            <TabsList>
              <TabsTrigger value="contractors">Contractor Visits</TabsTrigger>
              <TabsTrigger value="partners">Partner Visits</TabsTrigger>
            </TabsList>
          </Tabs>
          {activeTab === "contractors" ? (
            <Button onClick={fixAllContractorDates} variant="destructive" size="sm">
              Fix All Contractor Dates
            </Button>
          ) : (
            <Button onClick={fixAllPartnerDates} variant="destructive" size="sm">
              Fix All Partner Dates
            </Button>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="text-sm mb-4">
          <p>
            <strong>Your timezone:</strong> {userTimezone}
          </p>
          <p>
            <strong>Current time:</strong> {new Date().toString()}
          </p>
          <p className="text-red-500 font-medium mt-2">
            If dates appear one day off, use the "Fix" button to correct them in the database.
          </p>
        </div>

        {loading ? (
          <p>Loading visits...</p>
        ) : activeTab === "contractors" ? (
          <div className="border rounded-md overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-muted">
                <tr>
                  <th className="p-2 text-left">Visit Date (Raw)</th>
                  <th className="p-2 text-left">Parsed as Local</th>
                  <th className="p-2 text-left">Parsed as UTC</th>
                  <th className="p-2 text-left">Actions</th>
                </tr>
              </thead>
              <tbody>
                {visits.map((visit) => {
                  const parsedDate = parseISO(visit.visit_date)
                  return (
                    <tr key={visit.id} className="border-t">
                      <td className="p-2">{visit.visit_date}</td>
                      <td className="p-2">{format(parsedDate, "yyyy-MM-dd")} (Local)</td>
                      <td className="p-2">
                        {format(parsedDate, "yyyy-MM-dd")} (UTC)
                        <div className="text-xs text-muted-foreground">
                          Year: {parsedDate.getUTCFullYear()}, Month: {parsedDate.getUTCMonth() + 1}, Day:{" "}
                          {parsedDate.getUTCDate()}
                        </div>
                      </td>
                      <td className="p-2">
                        <Button
                          onClick={() => fixContractorDate(visit.id, visit.visit_date)}
                          variant="outline"
                          size="sm"
                        >
                          Fix
                        </Button>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="border rounded-md overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-muted">
                <tr>
                  <th className="p-2 text-left">Partner</th>
                  <th className="p-2 text-left">Visit Date (Raw)</th>
                  <th className="p-2 text-left">Parsed as Local</th>
                  <th className="p-2 text-left">Parsed as UTC</th>
                  <th className="p-2 text-left">Actions</th>
                </tr>
              </thead>
              <tbody>
                {partnerVisits.map((visit) => {
                  const parsedDate = parseISO(visit.visit_date)
                  return (
                    <tr key={visit.id} className="border-t">
                      <td className="p-2">{visit.partners?.name || visit.partner_name || "Unknown"}</td>
                      <td className="p-2">{visit.visit_date}</td>
                      <td className="p-2">{format(parsedDate, "yyyy-MM-dd")} (Local)</td>
                      <td className="p-2">
                        {format(parsedDate, "yyyy-MM-dd")} (UTC)
                        <div className="text-xs text-muted-foreground">
                          Year: {parsedDate.getUTCFullYear()}, Month: {parsedDate.getUTCMonth() + 1}, Day:{" "}
                          {parsedDate.getUTCDate()}
                        </div>
                      </td>
                      <td className="p-2">
                        <Button onClick={() => fixPartnerDate(visit.id, visit.visit_date)} variant="outline" size="sm">
                          Fix
                        </Button>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
