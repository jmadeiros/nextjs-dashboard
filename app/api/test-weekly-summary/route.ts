import { NextResponse } from 'next/server'
import { getSupabaseClient } from '@/lib/supabase-client'

export async function GET() {
  try {
    console.log('Starting weekly summary test...')
    const supabase = getSupabaseClient()

    // Get next week's date range (Monday to Sunday)
    const now = new Date()
    const nextWeek = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000)
    
    // Get Monday of next week
    const weekStart = new Date(nextWeek)
    weekStart.setDate(nextWeek.getDate() - nextWeek.getDay() + 1)
    weekStart.setHours(0, 0, 0, 0)
    
    // Get Sunday of next week
    const weekEnd = new Date(weekStart)
    weekEnd.setDate(weekStart.getDate() + 6)
    weekEnd.setHours(23, 59, 59, 999)

    console.log(`Testing summary for week: ${weekStart.toDateString()} - ${weekEnd.toDateString()}`)

    // Fetch all data for the week
    console.log('Fetching data from Supabase...')
    const [roomBookings, contractorVisits, partnerVisits, rooms, contractors, partners] = await Promise.all([
      // Room bookings
      supabase
        .from('bookings')
        .select('*')
        .gte('start_time', weekStart.toISOString())
        .lte('end_time', weekEnd.toISOString())
        .order('start_time'),
        
      // Contractor visits
      supabase
        .from('contractor_visits')
        .select('*, contractors(name, type)')
        .gte('visit_date', weekStart.toISOString().split('T')[0])
        .lte('visit_date', weekEnd.toISOString().split('T')[0])
        .order('visit_date'),
        
      // Partner visits
      supabase
        .from('guest_visits')
        .select('*, partners(name)')
        .gte('visit_date', weekStart.toISOString().split('T')[0])
        .lte('visit_date', weekEnd.toISOString().split('T')[0])
        .order('visit_date'),
        
      // Get reference data
      supabase.from('rooms').select('*'),
      supabase.from('contractors').select('*'),
      supabase.from('partners').select('*')
    ])

    // Check for errors
    if (roomBookings.error) {
      console.error('Room bookings error:', roomBookings.error)
      throw new Error(`Room bookings error: ${roomBookings.error.message}`)
    }
    if (contractorVisits.error) {
      console.error('Contractor visits error:', contractorVisits.error)
      throw new Error(`Contractor visits error: ${contractorVisits.error.message}`)
    }
    if (partnerVisits.error) {
      console.error('Partner visits error:', partnerVisits.error)
      throw new Error(`Partner visits error: ${partnerVisits.error.message}`)
    }
    if (rooms.error) {
      console.error('Rooms error:', rooms.error)
      throw new Error(`Rooms error: ${rooms.error.message}`)
    }
    if (contractors.error) {
      console.error('Contractors error:', contractors.error)
      throw new Error(`Contractors error: ${contractors.error.message}`)
    }
    if (partners.error) {
      console.error('Partners error:', partners.error)
      throw new Error(`Partners error: ${partners.error.message}`)
    }

    console.log('Data fetched successfully. Generating summary...')
    console.log(`Found: ${roomBookings.data?.length || 0} bookings, ${contractorVisits.data?.length || 0} contractor visits, ${partnerVisits.data?.length || 0} partner visits`)

    // Process and organize the data
    const summary = generateWeeklySummary({
      roomBookings: roomBookings.data || [],
      contractorVisits: contractorVisits.data || [],
      partnerVisits: partnerVisits.data || [],
      rooms: rooms.data || [],
      contractors: contractors.data || [],
      partners: partners.data || [],
      weekStart,
      weekEnd
    })

    console.log('Summary generated successfully')

    return NextResponse.json({
      success: true,
      message: 'Weekly summary test completed',
      summary: {
        weekRange: summary.weekRange,
        totalBookings: summary.totalBookings,
        totalContractorVisits: summary.totalContractorVisits,
        totalPartnerVisits: summary.totalPartnerVisits,
        dailySummary: summary.dailySummary,
        emailPreview: generateEmailHTML(summary)
      }
    })

  } catch (error) {
    console.error('Error testing weekly summary:', error)
    return NextResponse.json(
      { 
        error: 'Failed to test weekly summary',
        details: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined
      },
      { status: 500 }
    )
  }
}

function generateWeeklySummary({ roomBookings, contractorVisits, partnerVisits, rooms, contractors, partners, weekStart, weekEnd }: any) {
  const weekRange = `${weekStart.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })} - ${weekEnd.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}`
  
  // Group events by day
  const dailySummary: any = {}
  
  // Process room bookings
  roomBookings.forEach((booking: any) => {
    const date = new Date(booking.start_time).toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })
    if (!dailySummary[date]) dailySummary[date] = { roomBookings: [], contractorVisits: [], partnerVisits: [] }
    
    const room = rooms.find((r: any) => r.id === booking.room_id)
    const startTime = new Date(booking.start_time).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })
    const endTime = new Date(booking.end_time).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })
    
    dailySummary[date].roomBookings.push({
      title: booking.title,
      room: room?.name || 'Unknown Room',
      time: `${startTime} - ${endTime}`,
      authorizer: booking.authorizer
    })
  })
  
  // Process contractor visits
  contractorVisits.forEach((visit: any) => {
    const date = new Date(visit.visit_date).toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })
    if (!dailySummary[date]) dailySummary[date] = { roomBookings: [], contractorVisits: [], partnerVisits: [] }
    
    const contractor = contractors.find((c: any) => c.id === visit.contractor_id)
    dailySummary[date].contractorVisits.push({
      name: visit.contractors?.name || contractor?.name || 'Unknown Contractor',
      type: contractor?.type || 'contractor',
      time: `${visit.start_time} - ${visit.end_time}`,
      purpose: visit.purpose
    })
  })
  
  // Process partner visits
  partnerVisits.forEach((visit: any) => {
    const date = new Date(visit.visit_date).toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })
    if (!dailySummary[date]) dailySummary[date] = { roomBookings: [], contractorVisits: [], partnerVisits: [] }
    
    const partner = partners.find((p: any) => p.id === visit.partner_id)
    dailySummary[date].partnerVisits.push({
      name: visit.partners?.name || partner?.name || visit.partner_name || 'Unknown Partner',
      time: `${visit.start_time || '09:00'} - ${visit.end_time || '17:00'}`,
      purpose: visit.purpose || visit.guest_details
    })
  })

  return {
    weekRange,
    dailySummary,
    totalBookings: roomBookings.length,
    totalContractorVisits: contractorVisits.length,
    totalPartnerVisits: partnerVisits.length
  }
}

function generateEmailHTML(summary: any) {
  const { weekRange, dailySummary, totalBookings, totalContractorVisits, totalPartnerVisits } = summary
  
  let dailyContent = ''
  
  // Sort days chronologically
  const sortedDays = Object.keys(dailySummary).sort((a, b) => {
    return new Date(a).getTime() - new Date(b).getTime()
  })
  
  sortedDays.forEach(day => {
    const dayData = dailySummary[day]
    const hasEvents = dayData.roomBookings.length > 0 || dayData.contractorVisits.length > 0 || dayData.partnerVisits.length > 0
    
    if (!hasEvents) return
    
    dailyContent += `
      <div style="margin-bottom: 30px; padding: 20px; background-color: #f8f9fa; border-radius: 8px;">
        <h3 style="color: #2563eb; margin-top: 0; margin-bottom: 15px; font-size: 18px; border-bottom: 2px solid #e5e7eb; padding-bottom: 8px;">${day}</h3>
        
        ${dayData.roomBookings.length > 0 ? `
          <div style="margin-bottom: 20px;">
            <h4 style="color: #059669; margin-bottom: 10px; font-size: 16px;">🏢 Room Bookings</h4>
            ${dayData.roomBookings.map((booking: any) => `
              <div style="margin-left: 15px; margin-bottom: 8px; padding: 8px; background-color: white; border-radius: 4px;">
                <strong>${booking.title}</strong><br>
                <span style="color: #6b7280;">📍 ${booking.room} • ⏰ ${booking.time}</span><br>
                <span style="color: #9ca3af; font-size: 14px;">Authorized by: ${booking.authorizer}</span>
              </div>
            `).join('')}
          </div>
        ` : ''}
        
        ${dayData.contractorVisits.length > 0 ? `
          <div style="margin-bottom: 20px;">
            <h4 style="color: #dc2626; margin-bottom: 10px; font-size: 16px;">🔧 Contractor/Volunteer Visits</h4>
            ${dayData.contractorVisits.map((visit: any) => `
              <div style="margin-left: 15px; margin-bottom: 8px; padding: 8px; background-color: white; border-radius: 4px;">
                <strong>${visit.name}</strong> <span style="color: #6b7280;">(${visit.type})</span><br>
                <span style="color: #6b7280;">⏰ ${visit.time}</span><br>
                <span style="color: #9ca3af; font-size: 14px;">Purpose: ${visit.purpose}</span>
              </div>
            `).join('')}
          </div>
        ` : ''}
        
        ${dayData.partnerVisits.length > 0 ? `
          <div>
            <h4 style="color: #7c3aed; margin-bottom: 10px; font-size: 16px;">🤝 Partner Visits</h4>
            ${dayData.partnerVisits.map((visit: any) => `
              <div style="margin-left: 15px; margin-bottom: 8px; padding: 8px; background-color: white; border-radius: 4px;">
                <strong>${visit.name}</strong><br>
                <span style="color: #6b7280;">⏰ ${visit.time}</span><br>
                <span style="color: #9ca3af; font-size: 14px;">Purpose: ${visit.purpose}</span>
              </div>
            `).join('')}
          </div>
        ` : ''}
      </div>
    `
  })

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Weekly Facility Summary</title>
    </head>
    <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #374151; margin: 0; padding: 0; background-color: #ffffff;">
      <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
        
        <div style="text-align: center; margin-bottom: 30px; padding: 20px; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); border-radius: 10px; color: white;">
          <h1 style="margin: 0; font-size: 28px; font-weight: 700;">📅 Weekly Facility Summary</h1>
          <p style="margin: 10px 0 0 0; font-size: 18px; opacity: 0.9;">${weekRange}</p>
        </div>
        
        <div style="background-color: #f3f4f6; padding: 20px; border-radius: 8px; margin-bottom: 30px;">
          <h2 style="color: #1f2937; margin-top: 0; margin-bottom: 15px;">📊 Week Overview</h2>
          <div style="display: flex; justify-content: space-between; flex-wrap: wrap;">
            <div style="text-align: center; margin: 10px; flex: 1; min-width: 120px;">
              <div style="font-size: 32px; font-weight: bold; color: #059669;">${totalBookings}</div>
              <div style="color: #6b7280; font-size: 14px;">Room Bookings</div>
            </div>
            <div style="text-align: center; margin: 10px; flex: 1; min-width: 120px;">
              <div style="font-size: 32px; font-weight: bold; color: #dc2626;">${totalContractorVisits}</div>
              <div style="color: #6b7280; font-size: 14px;">Contractor Visits</div>
            </div>
            <div style="text-align: center; margin: 10px; flex: 1; min-width: 120px;">
              <div style="font-size: 32px; font-weight: bold; color: #7c3aed;">${totalPartnerVisits}</div>
              <div style="color: #6b7280; font-size: 14px;">Partner Visits</div>
            </div>
          </div>
        </div>
        
        ${dailyContent || '<p style="text-align: center; color: #9ca3af; font-style: italic; padding: 40px 0;">No events scheduled for this week.</p>'}
        
        <div style="margin-top: 40px; padding: 20px; background-color: #f9fafb; border-radius: 8px; border-left: 4px solid #3b82f6;">
          <p style="margin: 0; color: #6b7280; font-size: 14px;">
            This summary was automatically generated for the week of ${weekRange}. 
            For questions or updates, please contact the facility management team.
          </p>
        </div>
        
      </div>
    </body>
    </html>
  `
} 