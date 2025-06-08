import DateDebug from "@/components/date-debug"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import Link from "next/link"

export default function DebugPage() {
  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">Debug Tools</h1>
        <Link href="/consolidated">
          <Button variant="outline">Back to Calendar</Button>
        </Link>
      </div>

      <DateDebug />

      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Calendar Troubleshooting</CardTitle>
          <CardDescription>Common issues and solutions for the consolidated calendar</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <h3 className="text-lg font-medium mb-2">Missing Events</h3>
            <p className="mb-2">If events are not showing up in the consolidated calendar, try the following:</p>
            <ul className="list-disc pl-6 space-y-1">
              <li>Check that the event filters are enabled (Room Bookings, Contractor Visits, Partner Visits)</li>
              <li>Use the date debug tool above to fix any date issues in the database</li>
              <li>Verify that the events exist in their respective dashboards</li>
              <li>Clear your browser cache and reload the page</li>
            </ul>
          </div>

          <div>
            <h3 className="text-lg font-medium mb-2">Events Appearing on Wrong Days</h3>
            <p className="mb-2">If events are showing up on the wrong days, it's likely due to timezone issues:</p>
            <ul className="list-disc pl-6 space-y-1">
              <li>Use the "Fix All Dates" buttons in the date debug tool to correct all dates</li>
              <li>This will set all dates to noon UTC to avoid timezone shifts</li>
              <li>After fixing, refresh the calendar page to see the updated events</li>
            </ul>
          </div>

          <div>
            <h3 className="text-lg font-medium mb-2">Browser Information</h3>
            <p className="mb-2">
              Your current timezone:{" "}
              <span id="timezone" className="font-mono">
                Loading...
              </span>
            </p>
            <p className="mb-2">
              Current time:{" "}
              <span id="current-time" className="font-mono">
                Loading...
              </span>
            </p>
            <script
              dangerouslySetInnerHTML={{
                __html: `
                  document.getElementById('timezone').textContent = Intl.DateTimeFormat().resolvedOptions().timeZone;
                  document.getElementById('current-time').textContent = new Date().toString();
                `,
              }}
            />
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
