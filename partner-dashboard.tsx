"use client"

import { createClientComponentClient } from "@supabase/auth-helpers-nextjs"
import { useState, useEffect } from "react"

const supabase = createClientComponentClient()

const PartnerDashboard = () => {
  const [partners, setPartners] = useState([])
  const [formData, setFormData] = useState({})
  const [submissionResult, setSubmissionResult] = useState(null)

  useEffect(() => {
    const fetchPartners = async () => {
      const { data: partners, error: partnersError } = await supabase.from("partners").select("id, name").order("name")

      if (partnersError) {
        console.error("Error fetching partners:", partnersError)
        // Add a default partner if none exist
        setPartners([{ id: "00000000-0000-0000-0000-000000000000", name: "Default Partner" }])
      } else {
        setPartners(partners)
      }
    }

    fetchPartners()
  }, [])

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    })
  }

  const handleSubmit = async (e) => {
    e.preventDefault()

    const form = e.target
    const formData = new FormData(form)

    const partnerId = formData.get("partner") as string
    const selectedPartner = partners.find((p) => p.id === partnerId)
    const partnerName = selectedPartner ? selectedPartner.name : ""

    const { data, error } = await supabase.from("guest_visits").insert({
      partner_id: partnerId,
      partner_name: partnerName,
      visit_date: formData.get("visit_date"),
      guest_name: formData.get("guest_name"),
      guest_email: formData.get("guest_email"),
    })

    if (error) {
      console.error("Error submitting form:", error)
      setSubmissionResult({ success: false, message: "Failed to submit form." })
    } else {
      console.log("Form submitted successfully:", data)
      setSubmissionResult({ success: true, message: "Form submitted successfully!" })
      form.reset() // Clear the form
    }
  }

  return (
    <div className="container mx-auto p-4">
      <h1 className="text-2xl font-bold mb-4">Partner Dashboard</h1>

      <form onSubmit={handleSubmit} className="max-w-lg">
        <div className="mb-4">
          <label htmlFor="partner" className="block text-gray-700 text-sm font-bold mb-2">
            Partner:
          </label>
          <select name="partner" className="w-full p-2 border rounded" required onChange={handleChange}>
            <option value="">Select a partner</option>
            {partners &&
              partners.map((partner) => (
                <option key={partner.id} value={partner.id}>
                  {partner.name}
                </option>
              ))}
          </select>
        </div>

        <div className="mb-4">
          <label htmlFor="visit_date" className="block text-gray-700 text-sm font-bold mb-2">
            Visit Date:
          </label>
          <input type="date" name="visit_date" className="w-full p-2 border rounded" required onChange={handleChange} />
        </div>

        <div className="mb-4">
          <label htmlFor="guest_name" className="block text-gray-700 text-sm font-bold mb-2">
            Guest Name:
          </label>
          <input type="text" name="guest_name" className="w-full p-2 border rounded" required onChange={handleChange} />
        </div>

        <div className="mb-4">
          <label htmlFor="guest_email" className="block text-gray-700 text-sm font-bold mb-2">
            Guest Email:
          </label>
          <input
            type="email"
            name="guest_email"
            className="w-full p-2 border rounded"
            required
            onChange={handleChange}
          />
        </div>

        <button type="submit" className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded">
          Submit
        </button>
      </form>

      {submissionResult && (
        <div
          className={`mt-4 p-3 rounded ${submissionResult.success ? "bg-green-200 text-green-800" : "bg-red-200 text-red-800"}`}
        >
          {submissionResult.message}
        </div>
      )}
    </div>
  )
}

export default PartnerDashboard
