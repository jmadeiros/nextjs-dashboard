import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface Database {
  public: {
    Tables: {
      bookings: any
      contractor_visits: any
      guest_visits: any
      rooms: any
      contractors: any
      partners: any
    }
  }
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Create Supabase client
    const supabase = createClient<Database>(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

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

    console.log(`Generating summary for week: ${weekStart.toDateString()} - ${weekEnd.toDateString()}`)

    // Fetch all data for the week
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
    if (roomBookings.error) throw roomBookings.error
    if (contractorVisits.error) throw contractorVisits.error
    if (partnerVisits.error) throw partnerVisits.error
    if (rooms.error) throw rooms.error
    if (contractors.error) throw contractors.error
    if (partners.error) throw partners.error

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

    // Send the email
    await sendWeeklySummaryEmail(summary)

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'Weekly summary sent successfully',
        summary: {
          totalBookings: summary.totalBookings,
          totalContractorVisits: summary.totalContractorVisits,
          totalPartnerVisits: summary.totalPartnerVisits,
          weekRange: summary.weekRange
        }
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    )

  } catch (error) {
    console.error('Error generating weekly summary:', error)
    return new Response(
      JSON.stringify({ 
        error: 'Failed to generate weekly summary',
        details: error instanceof Error ? error.message : String(error)
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      }
    )
  }
})

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

async function sendWeeklySummaryEmail(summary: any) {
  const emailContent = generateEmailHTML(summary)
  
  // Using Resend API (you can replace with any email service)
  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${Deno.env.get('RESEND_API_KEY')}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      from: 'onboarding@resend.dev',
      to: ['joshmadeiros8@gmail.com'],
      subject: `Weekly Facility Summary - ${summary.weekRange}`,
      html: emailContent
    })
  })
  
  if (!response.ok) {
    const errorText = await response.text()
    throw new Error(`Failed to send email: ${response.statusText} - ${errorText}`)
  }
  
  console.log('Weekly summary email sent successfully')
}

function generateEmailHTML(summary: any) {
  const { weekRange, dailySummary, totalBookings, totalContractorVisits, totalPartnerVisits } = summary
  
  let html = `
    <h2>Weekly Facility Summary</h2>
    <h3>${weekRange}</h3>
    
    <div style="background: #f5f5f5; padding: 15px; margin: 20px 0; border-radius: 5px;">
      <h4>Week Overview</h4>
      <ul>
        <li><strong>Room Bookings:</strong> ${totalBookings}</li>
        <li><strong>Contractor/Volunteer Visits:</strong> ${totalContractorVisits}</li>
        <li><strong>Partner Visits:</strong> ${totalPartnerVisits}</li>
      </ul>
    </div>
  `
  
  // Add daily breakdowns
  Object.entries(dailySummary).forEach(([date, events]: [string, any]) => {
    const hasEvents = events.roomBookings.length > 0 || events.contractorVisits.length > 0 || events.partnerVisits.length > 0
    
    if (hasEvents) {
      html += `<h4>${date}</h4>`
      
      if (events.roomBookings.length > 0) {
        html += `<h5>🏠 Room Bookings (${events.roomBookings.length})</h5><ul>`
        events.roomBookings.forEach((booking: any) => {
          html += `<li><strong>${booking.title}</strong> in ${booking.room} (${booking.time})${booking.authorizer ? ` - Booked by: ${booking.authorizer}` : ''}</li>`
        })
        html += `</ul>`
      }
      
      if (events.contractorVisits.length > 0) {
        html += `<h5>🔧 Contractor/Volunteer Visits (${events.contractorVisits.length})</h5><ul>`
        events.contractorVisits.forEach((visit: any) => {
          html += `<li><strong>${visit.name}</strong> (${visit.type}) - ${visit.time}${visit.purpose ? ` - ${visit.purpose}` : ''}</li>`
        })
        html += `</ul>`
      }
      
      if (events.partnerVisits.length > 0) {
        html += `<h5>👥 Partner Visits (${events.partnerVisits.length})</h5><ul>`
        events.partnerVisits.forEach((visit: any) => {
          html += `<li><strong>${visit.name}</strong> - ${visit.time}${visit.purpose ? ` - ${visit.purpose}` : ''}</li>`
        })
        html += `</ul>`
      }
      
      html += `<br>`
    }
  })
  
  html += `
    <hr>
    <p style="color: #666; font-size: 12px;">
      This summary was automatically generated from the Oasis Village Facility Management System.
    </p>
  `
  
  return html
} 