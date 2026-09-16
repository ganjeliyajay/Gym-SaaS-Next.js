"use client"

import React, { useEffect, useMemo, useState } from "react"
import { supabase } from "@/lib/supabase"
import { useToast } from "@/components/ui/toast"
import {
  ArrowDownRight,
  ArrowUpRight,
  BarChart3,
  CalendarDays,
  ChevronDown,
  CircleDollarSign,
  Download,
  Dumbbell,
  Filter,
  LineChart,
  MoreHorizontal,
  TrendingUp,
  Users,
  UserCheck,
  UserPlus,
  X,
} from "lucide-react"

type Period = "7 Days" | "30 Days" | "90 Days" | "This Year"

type RevenueData = {
  month: string
  revenue: number
  members: number
}

type MembershipData = {
  name: string
  members: number
  percentage: number
  revenue: number
}

type AttendanceData = {
  day: string
  value: number
}

type TopClass = {
  name: string
  bookings: number
  attendance: number
  revenue: number
}

type ProductSale = {
  name: string
  units: number
  revenue: number
}

type MembershipPurchase = {
  id: string
  memberName: string
  membershipName: string
  amount: number
  paymentType: string
  paymentMethod: string
  status: string
  paidAt: string
}

export default function ReportsPage() {
  const toast = useToast()
  const [period, setPeriod] = useState<Period>("30 Days")
  const [showExport, setShowExport] = useState(false)
  const [showFilters, setShowFilters] = useState(false)
  const [membershipFilter, setMembershipFilter] = useState("all")
  const [loading, setLoading] = useState(true)

  const [revenueData, setRevenueData] = useState<
    RevenueData[]
  >([])

  const [membershipData, setMembershipData] = useState<
    MembershipData[]
  >([])

  const [attendanceData, setAttendanceData] = useState<
    AttendanceData[]
  >([])

  const [topClasses, setTopClasses] = useState<
    TopClass[]
  >([])

  const [productSales, setProductSales] = useState<
    ProductSale[]
  >([])

  const [membershipPurchases, setMembershipPurchases] = useState<MembershipPurchase[]>([])

  const [kpis, setKpis] = useState({
    revenue: 0,
    revenueChange: 0,
    activeMembers: 0,
    memberChange: 0,
    attendance: 0,
    attendanceChange: 0,
    newMembers: 0,
    newMemberChange: 0,
    retention: 0,
    renewal: 0,
    utilization: 0,
    visits: 0,
    conversion: 0,
    noShow: 0,
  })

  const getExportRows = () => [
    ["Metric", "Value"],
    ["Period", period],
    ["Membership Filter", membershipFilter === "all" ? "All memberships" : membershipData.find((item) => item.name === membershipFilter)?.name ?? membershipFilter],
    ["Total Revenue", kpis.revenue],
    ["Revenue Change (%)", kpis.revenueChange],
    ["Active Members", kpis.activeMembers],
    ["Member Change (%)", kpis.memberChange],
    ["Attendance (%)", kpis.attendance],
    ["Attendance Change (%)", kpis.attendanceChange],
    ["New Members", kpis.newMembers],
    ["New Member Change (%)", kpis.newMemberChange],
    ["Retention (%)", kpis.retention],
    ["Renewal (%)", kpis.renewal],
    ["Utilization (%)", kpis.utilization],
    ["Visits", kpis.visits],
    ["No Show (%)", kpis.noShow],
    [],
    ["Revenue by Period", "Revenue", "Members"],
    ...revenueData.map((item) => [item.month, item.revenue, item.members]),
    [],
    ["Membership", "Members", "Percentage (%)", "Revenue"],
    ...membershipData.map((item) => [item.name, item.members, item.percentage, item.revenue]),
    [],
    ["Top Class", "Bookings", "Attendance", "Revenue"],
    ...topClasses.map((item) => [item.name, item.bookings, item.attendance, item.revenue]),
    [],
    ["Product", "Units Sold", "Revenue"],
    ...productSales.map((item) => [item.name, item.units, item.revenue]),
    [],
    ["Membership Purchase", "Member", "Membership", "Amount", "Payment Type", "Payment Method", "Status", "Paid At"],
    ...membershipPurchases.map((item) => [
      item.id,
      item.memberName,
      item.membershipName,
      item.amount,
      item.paymentType,
      item.paymentMethod,
      item.status,
      item.paidAt,
    ]),
  ]

  const downloadBlob = (content: string, type: string, filename: string) => {
    const blob = new Blob([content], { type })
    const url = URL.createObjectURL(blob)
    const link = document.createElement("a")
    link.href = url
    link.download = filename
    document.body.appendChild(link)
    link.click()
    link.remove()
    URL.revokeObjectURL(url)
  }

  const exportCSV = () => {
    const csv = getExportRows()
      .map((row) =>
        row
          .map((cell) => {
            const value = cell == null ? "" : String(cell)
            return `"${value.replace(/"/g, '""')}"`
          })
          .join(",")
      )
      .join("\n")

    downloadBlob(
      csv,
      "text/csv;charset=utf-8;",
      `gym-report-${period.toLowerCase().replace(/\s+/g, "-")}.csv`
    )
    setShowExport(false)
    toast.success("CSV report downloaded")
  }

  const exportExcel = () => {
    const rows = getExportRows()
    const html = `
      <html>
        <head><meta charset="UTF-8" /></head>
        <body>
          <table border="1">
            ${rows
        .map(
          (row) =>
            `<tr>${row
              .map(
                (cell) =>
                  `<td>${String(cell ?? "")
                    .replace(/&/g, "&amp;")
                    .replace(/</g, "&lt;")
                    .replace(/>/g, "&gt;")}</td>`
              )
              .join("")}</tr>`
        )
        .join("")}
          </table>
        </body>
      </html>
    `
    downloadBlob(
      html,
      "application/vnd.ms-excel;charset=utf-8;",
      `gym-report-${period.toLowerCase().replace(/\s+/g, "-")}.xls`
    )
    setShowExport(false)
    toast.success("Excel report downloaded")
  }

  const exportPDF = () => {
    const rows = getExportRows()
    const table = rows
      .map(
        (row) =>
          `<tr>${row
            .map(
              (cell) =>
                `<td>${String(cell ?? "")
                  .replace(/&/g, "&amp;")
                  .replace(/</g, "&lt;")
                  .replace(/>/g, "&gt;")}</td>`
            )
            .join("")}</tr>`
      )
      .join("")

    const printWindow = window.open("", "_blank", "width=1000,height=800")
    if (!printWindow) {
      toast.warning("Please allow pop-ups to export PDF")
      return
    }

    printWindow.document.write(`
      <!doctype html>
      <html>
        <head>
          <title>Gym Report - ${period}</title>
          <style>
            body { font-family: Arial, sans-serif; padding: 32px; color: #111; }
            h1 { margin-bottom: 4px; }
            p { color: #666; margin-top: 0; }
            table { width: 100%; border-collapse: collapse; margin-top: 24px; }
            td { border: 1px solid #ddd; padding: 8px; font-size: 12px; }
            tr:first-child td { font-weight: bold; background: #f5f5f5; }
          </style>
        </head>
        <body>
          <h1>Gym Performance Report</h1>
          <p>Period: ${period}</p>
          <table>${table}</table>
        </body>
      </html>
    `)
    printWindow.document.close()
    printWindow.focus()
    setTimeout(() => {
      printWindow.print()
    }, 250)

    setShowExport(false)
    toast.info("PDF print dialog opened")
  }

  useEffect(() => {
    let cancelled = false

    const loadReports = async () => {
      setLoading(true)

      const {
        data: auth,
      } = await supabase.auth.getUser()

      if (!auth.user) {
        if (!cancelled) {
          toast.error("Please sign in to view reports.")
          setLoading(false)
        }

        return
      }

      const {
        data: profile,
        error: profileError,
      } = await supabase
        .from("profiles")
        .select("gym_id")
        .eq("id", auth.user.id)
        .single()

      if (profileError || !profile?.gym_id) {
        if (!cancelled) {
          toast.error(
            profileError?.message ||
            "Gym not found."
          )
          setLoading(false)
        }

        return
      }

      const gymId = profile.gym_id

      const now = new Date()

      const days =
        period === "7 Days"
          ? 7
          : period === "90 Days"
            ? 90
            : period === "This Year"
              ? Math.max(
                1,
                Math.ceil(
                  (now.getTime() -
                    new Date(
                      now.getFullYear(),
                      0,
                      1
                    ).getTime()) /
                  86400000
                ) + 1
              )
              : 30

      const start = new Date(
        now.getTime() -
        (days - 1) * 86400000
      )

      const previousStart = new Date(
        start.getTime() -
        days * 86400000
      )

      const [
        paymentsRes,
        membersRes,
        checkinsRes,
        bookingsRes,
        classesRes,
        productsRes,
        membershipsRes,
      ] = await Promise.all([
        supabase
          .from("payments")
          .select(
            `
              id,
              amount,
              currency,
              status,
              payment_type,
              payment_method,
              paid_at,
              created_at,
              member_id,
              product_id,
              products:product_id(name)
            `
          )
          .eq("gym_id", gymId),

        supabase
          .from("members")
          .select(
            "id, first_name, last_name, status, joined_at"
          )
          .eq("gym_id", gymId),

        supabase
          .from("checkins")
          .select(
            "id, member_id, checked_in_at"
          )
          .eq("gym_id", gymId)
          .gte(
            "checked_in_at",
            start.toISOString()
          )
          .lte(
            "checked_in_at",
            now.toISOString()
          ),

        supabase
          .from("class_bookings")
          .select(
            `
              id,
              class_id,
              member_id,
              status,
              booked_at,
              classes:class_id(title)
            `
          )
          .eq("gym_id", gymId)
          .gte(
            "booked_at",
            start.toISOString()
          )
          .lte(
            "booked_at",
            now.toISOString()
          ),

        supabase
          .from("classes")
          .select("id, title")
          .eq("gym_id", gymId),

        supabase
          .from("products")
          .select("id, name, active")
          .eq("gym_id", gymId)
          .order("name"),

        supabase
          .from("member_memberships")
          .select(`
            id,
            member_id,
            product_id,
            status,
            price_paid,
            start_date,
            end_date
          `)
          .eq("gym_id", gymId)
          .order("start_date", { ascending: false }),
      ])

      if (
        [
          paymentsRes,
          membersRes,
          checkinsRes,
          bookingsRes,
          classesRes,
          productsRes,
          membershipsRes,
        ].some((result) => result.error)
      ) {
        const message =
          [
            paymentsRes,
            membersRes,
            checkinsRes,
            bookingsRes,
            classesRes,
            productsRes,
            membershipsRes,
          ].find((result) => result.error)
            ?.error?.message ||
          "Failed to load reports."

        if (!cancelled) {
          toast.error(message)
          setLoading(false)
        }

        return
      }

      const payments =
        (paymentsRes.data || []) as any[]

      const members =
        (membersRes.data || []) as any[]

      const checkins =
        (checkinsRes.data || []) as any[]

      const bookings =
        (bookingsRes.data || []) as any[]

      const products =
        (productsRes.data || []) as any[]

      const memberMemberships =
        (membershipsRes.data || []) as any[]

      const selectedMemberIds =
        membershipFilter === "all"
          ? null
          : new Set(
            payments
              .filter(
                (payment) =>
                  payment.product_id ===
                  membershipFilter
              )
              .map(
                (payment) =>
                  payment.member_id
              )
              .filter(Boolean)
          )

      const matchesMembership = (
        memberId: string | null | undefined
      ) =>
        !selectedMemberIds ||
        (!!memberId &&
          selectedMemberIds.has(memberId))

      const memberMap = new Map(
        members.map((member) => [
          member.id,
          `${member.first_name || ""} ${member.last_name || ""}`.trim() || "Unknown Member",
        ])
      )

      const membershipPurchaseRows: MembershipPurchase[] = memberMemberships
        .filter((membership) => {
          const dateValue = membership.start_date
          if (!dateValue) return false

          const date = new Date(dateValue)
          if (Number.isNaN(date.getTime())) return false

          return (
            membership.status === "active" &&
            date >= start &&
            date <= now &&
            matchesMembership(membership.member_id)
          )
        })
        .map((membership) => {
          const matchingPayment = payments
            .filter(
              (payment) =>
                payment.member_id === membership.member_id &&
                payment.product_id === membership.product_id
            )
            .sort(
              (a, b) =>
                new Date(b.paid_at || b.created_at).getTime() -
                new Date(a.paid_at || a.created_at).getTime()
            )[0] || null

          return {
            id: membership.id,
            memberName:
              memberMap.get(membership.member_id) || "Unknown Member",
            membershipName:
              products.find((product) => product.id === membership.product_id)?.name ||
              matchingPayment?.products?.name ||
              "Unknown Membership",
            amount: Number(
              membership.price_paid ?? matchingPayment?.amount ?? 0
            ),
            paymentType:
              matchingPayment?.payment_type === "recurring"
                ? "Recurring"
                : "One-time",
            paymentMethod:
              matchingPayment?.payment_method || "Card",
            status:
              matchingPayment?.status || membership.status || "active",
            paidAt:
              matchingPayment?.paid_at ||
              matchingPayment?.created_at ||
              membership.start_date,
          }
        })
        .sort(
          (a, b) =>
            new Date(b.paidAt).getTime() -
            new Date(a.paidAt).getTime()
        )
        .slice(0, 100)

      if (!cancelled) {
        setMembershipPurchases(membershipPurchaseRows)
      }

      /* -----------------------------
         Revenue calculations
      ----------------------------- */

      const paid = payments.filter(
        (payment) =>
          payment.status === "paid" &&
          matchesMembership(payment.member_id) &&
          new Date(
            payment.paid_at ||
            payment.created_at
          ) >= start &&
          new Date(
            payment.paid_at ||
            payment.created_at
          ) <= now
      )

      const prevPaid = payments.filter(
        (payment) =>
          payment.status === "paid" &&
          matchesMembership(payment.member_id) &&
          new Date(
            payment.paid_at ||
            payment.created_at
          ) >= previousStart &&
          new Date(
            payment.paid_at ||
            payment.created_at
          ) < start
      )

      const sum = (rows: any[]) =>
        rows.reduce(
          (total, payment) =>
            total +
            Number(payment.amount || 0),
          0
        )

      const revenue = sum(paid)
      const prevRevenue = sum(prevPaid)

      const pct = (
        current: number,
        previous: number
      ) =>
        previous === 0
          ? current > 0
            ? 100
            : 0
          : ((current - previous) /
            previous) *
          100

      /* -----------------------------
         Member calculations
      ----------------------------- */

      const activeMembers =
        members.filter(
          (member) =>
            member.status === "active" &&
            matchesMembership(member.id)
        ).length

      const newMembers =
        members.filter(
          (member) =>
            matchesMembership(member.id) &&
            new Date(member.joined_at) >=
            start &&
            new Date(member.joined_at) <=
            now
        ).length

      const prevNew =
        members.filter(
          (member) =>
            matchesMembership(member.id) &&
            new Date(member.joined_at) >=
            previousStart &&
            new Date(member.joined_at) <
            start
        ).length

      /* -----------------------------
         Attendance calculations
      ----------------------------- */

      const filteredCheckins =
        checkins.filter((checkin) =>
          matchesMembership(checkin.member_id)
        )

      const uniqueCheckins = new Set(
        filteredCheckins.map(
          (checkin) =>
            checkin.member_id
        )
      ).size

      const attendance = activeMembers
        ? (uniqueCheckins /
          activeMembers) *
        100
        : 0

      const prevCheckinsRes =
        await supabase
          .from("checkins")
          .select("member_id")
          .eq("gym_id", gymId)
          .gte(
            "checked_in_at",
            previousStart.toISOString()
          )
          .lt(
            "checked_in_at",
            start.toISOString()
          )

      const prevUnique = new Set(
        (prevCheckinsRes.data || [])
          .filter((checkin: any) =>
            matchesMembership(checkin.member_id)
          )
          .map(
            (checkin: any) =>
              checkin.member_id
          )
      ).size

      const prevAttendance =
        activeMembers
          ? (prevUnique /
            activeMembers) *
          100
          : 0

      /* -----------------------------
         Revenue chart
      ----------------------------- */

      const revMap = new Map<
        string,
        {
          revenue: number
          members: Set<string>
        }
      >()

      for (let i = 0; i < 9; i++) {
        const d = new Date(
          now.getFullYear(),
          now.getMonth() -
          (8 - i),
          1
        )

        revMap.set(
          d.toISOString().slice(0, 7),
          {
            revenue: 0,
            members: new Set(),
          }
        )
      }

      for (
        const payment of payments.filter(
          (p) =>
            p.status === "paid" &&
            matchesMembership(p.member_id)
        )
      ) {
        const d = new Date(
          payment.paid_at ||
          payment.created_at
        )

        const key = d
          .toISOString()
          .slice(0, 7)

        if (revMap.has(key)) {
          const item = revMap.get(key)!

          item.revenue += Number(
            payment.amount || 0
          )

          if (payment.member_id) {
            item.members.add(
              payment.member_id
            )
          }
        }
      }

      setRevenueData(
        Array.from(
          revMap.entries()
        ).map(([key, item]) => ({
          month: new Date(
            key + "-01"
          ).toLocaleString(
            "en-US",
            {
              month: "short",
            }
          ),
          revenue: item.revenue,
          members:
            item.members.size,
        }))
      )

      /* -----------------------------
         Membership performance
      ----------------------------- */

      const productMap = new Map<
        string,
        {
          members: Set<string>
          revenue: number
        }
      >()

      for (const payment of paid) {
        const name =
          payment.products?.name ||
          "Unknown Product"

        const item =
          productMap.get(name) || {
            members: new Set(),
            revenue: 0,
          }

        if (payment.member_id) {
          item.members.add(
            payment.member_id
          )
        }

        item.revenue += Number(
          payment.amount || 0
        )

        productMap.set(name, item)
      }

      const totalProductMembers =
        Array.from(
          productMap.values()
        ).reduce(
          (total, item) =>
            total +
            item.members.size,
          0
        )

      setMembershipData(
        Array.from(
          productMap.entries()
        )
          .sort(
            (a, b) =>
              b[1].members.size -
              a[1].members.size
          )
          .slice(0, 3)
          .map(([name, item]) => ({
            name,
            members:
              item.members.size,
            percentage:
              totalProductMembers
                ? Math.round(
                  (item.members.size /
                    totalProductMembers) *
                  100
                )
                : 0,
            revenue:
              item.revenue,
          }))
      )

      /* -----------------------------
         Attendance by day
      ----------------------------- */

      const dayNames = [
        "Sun",
        "Mon",
        "Tue",
        "Wed",
        "Thu",
        "Fri",
        "Sat",
      ]

      const daySets = new Map<
        string,
        Set<string>
      >()

      for (const day of dayNames) {
        daySets.set(
          day,
          new Set()
        )
      }

      for (const checkin of filteredCheckins) {
        const day =
          dayNames[
          new Date(
            checkin.checked_in_at
          ).getDay()
          ]

        daySets
          .get(day)
          ?.add(checkin.member_id)
      }

      setAttendanceData(
        [
          "Mon",
          "Tue",
          "Wed",
          "Thu",
          "Fri",
          "Sat",
          "Sun",
        ].map((day) => ({
          day,
          value: activeMembers
            ? Math.round(
              ((daySets.get(day)
                ?.size || 0) /
                activeMembers) *
              100
            )
            : 0,
        }))
      )

      /* -----------------------------
         Top classes
      ----------------------------- */

      const classMap = new Map<
        string,
        {
          bookings: number
          attended: number
          revenue: number
        }
      >()

      for (
        const booking of bookings.filter((booking) =>
          matchesMembership(booking.member_id)
        )
      ) {
        const name =
          booking.classes?.title ||
          "Unknown Class"

        const item =
          classMap.get(name) || {
            bookings: 0,
            attended: 0,
            revenue: 0,
          }

        item.bookings++

        if (
          booking.status ===
          "attended"
        ) {
          item.attended++
        }

        classMap.set(name, item)
      }

      const classRows =
        Array.from(
          classMap.entries()
        ).map(([name, item]) => ({
          name,
          bookings:
            item.bookings,
          attendance:
            item.bookings
              ? Math.round(
                (item.attended /
                  item.bookings) *
                100
              )
              : 0,
          revenue: 0,
        }))

      setTopClasses(
        classRows
          .sort(
            (a, b) =>
              b.bookings -
              a.bookings
          )
          .slice(0, 5)
      )

      /* -----------------------------
         Product sales
      ----------------------------- */

      const salesMap = new Map<
        string,
        {
          units: number
          revenue: number
        }
      >()

      for (const payment of paid) {
        const name =
          payment.products?.name ||
          "Unknown Product"

        const item =
          salesMap.get(name) || {
            units: 0,
            revenue: 0,
          }

        item.units++
        item.revenue += Number(
          payment.amount || 0
        )

        salesMap.set(
          name,
          item
        )
      }

      setProductSales(
        Array.from(
          salesMap.entries()
        )
          .map(([name, item]) => ({
            name,
            units: item.units,
            revenue:
              item.revenue,
          }))
          .sort(
            (a, b) =>
              b.revenue -
              a.revenue
          )
          .slice(0, 4)
      )


      /* -----------------------------
         KPI calculations
      ----------------------------- */

      const filteredBookings =
        bookings.filter((booking) =>
          matchesMembership(booking.member_id)
        )

      const attended =
        filteredBookings.filter(
          (booking) =>
            booking.status ===
            "attended"
        ).length

      const noShows =
        filteredBookings.filter(
          (booking) =>
            booking.status ===
            "no_show"
        ).length

      const booked =
        filteredBookings.filter(
          (booking) =>
            booking.status !==
            "cancelled"
        ).length

      if (!cancelled) {
        setKpis({
          revenue,

          revenueChange:
            pct(
              revenue,
              prevRevenue
            ),

          activeMembers,

          memberChange: pct(
            newMembers,
            prevNew,
          ),

          attendance,

          attendanceChange:
            pct(
              attendance,
              prevAttendance
            ),

          newMembers,

          newMemberChange:
            pct(
              newMembers,
              prevNew
            ),

          retention: members.length
            ? (members.filter(
              (member) =>
                member.status ===
                "active"
            ).length /
              members.length) *
            100
            : 0,

          renewal: paid.length
            ? (paid.filter(
              (payment) =>
                payment.payment_type ===
                "recurring"
            ).length /
              paid.length) *
            100
            : 0,

          utilization: booked
            ? (attended /
              booked) *
            100
            : 0,

          visits: activeMembers
            ? filteredCheckins.length /
            activeMembers
            : 0,

          conversion: members.length
            ? (newMembers /
              members.length) *
            100
            : 0,

          noShow: booked
            ? (noShows /
              booked) *
            100
            : 0,
        })

        setLoading(false)
      }
    }

    loadReports()

    return () => {
      cancelled = true
    }
  }, [period, toast])

  return (
    <div className="min-h-screen bg-[#f7f8fa]">
      <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">

        {loading && (
          <div className="mb-5 rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm text-gray-500">
            Loading live analytics...
          </div>
        )}

        {/* Header */}
        <div className="mb-8">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">

            <div>
              <p className="mb-1 text-sm font-medium text-gray-500">
                Business Intelligence
              </p>

              <h1 className="text-2xl font-bold tracking-tight text-gray-900 sm:text-3xl">
                Reports & Analytics
              </h1>

              <p className="mt-1 max-w-2xl text-sm text-gray-500">
                Track your gym performance,
                revenue, members and
                attendance.
              </p>
            </div>

            <div className="flex flex-col gap-3 sm:flex-row">

              {/* Period */}
              <div className="relative">
                <select
                  value={period}
                  onChange={(e) =>
                    setPeriod(
                      e.target.value as Period
                    )
                  }
                  className="input h-11 min-w-[145px] appearance-none pr-10"
                >
                  <option>7 Days</option>
                  <option>30 Days</option>
                  <option>90 Days</option>
                  <option>This Year</option>
                </select>

                <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
              </div>

              {/* Filters */}
              <button
                type="button"
                onClick={() =>
                  setShowFilters(true)
                }
                className="inline-flex h-11 items-center justify-center gap-2 rounded-xl border border-gray-200 bg-white px-4 text-sm font-semibold text-gray-700 transition hover:bg-gray-50"
              >
                <Filter className="h-4 w-4" />
                Filters
              </button>

              {/* Export */}
              <div className="relative">
                <button
                  type="button"
                  onClick={() =>
                    setShowExport(
                      (prev) => !prev
                    )
                  }
                  className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-gray-900 px-4 text-sm font-semibold text-white transition hover:bg-gray-800 sm:w-auto"
                >
                  <Download className="h-4 w-4" />
                  Export
                  <ChevronDown className="h-4 w-4" />
                </button>

                {showExport && (
                  <div className="absolute right-0 top-12 z-20 w-44 rounded-xl border border-gray-200 bg-white p-1.5 shadow-lg">

                    <button
                      type="button"
                      onClick={() => {
                        exportCSV()
                      }}
                      className="w-full rounded-lg px-3 py-2 text-left text-sm text-gray-700 hover:bg-gray-50"
                    >
                      Export CSV
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        exportPDF()
                      }}
                      className="w-full rounded-lg px-3 py-2 text-left text-sm text-gray-700 hover:bg-gray-50"
                    >
                      Export PDF
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        exportExcel()
                      }}
                      className="w-full rounded-lg px-3 py-2 text-left text-sm text-gray-700 hover:bg-gray-50"
                    >
                      Export Excel
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="mt-4 inline-flex items-center gap-2 rounded-lg bg-white px-3 py-2 text-xs text-gray-500 shadow-sm ring-1 ring-gray-200">
            <CalendarDays className="h-3.5 w-3.5" />

            Showing analytics for{" "}
            <span className="font-semibold text-gray-900">
              {period}
            </span>
          </div>
        </div>

        {/* KPI Cards */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <MetricCard
            title="Total Revenue"
            value={`₹${kpis.revenue.toLocaleString(
              "en-IN",
              {
                maximumFractionDigits: 0,
              }
            )}`}
            change={`${kpis.revenueChange >= 0
                ? "+"
                : ""
              }${kpis.revenueChange.toFixed(
                1
              )}%`}
            description="vs previous period"
            icon={CircleDollarSign}
            positive={kpis.revenueChange >= 0}
          />

          <MetricCard
            title="Active Members"
            value={kpis.activeMembers.toLocaleString(
              "en-IN"
            )}
            change={`${kpis.memberChange >= 0
                ? "+"
                : ""
              }${kpis.memberChange.toFixed(
                1
              )}%`}
            description="vs previous period"
            icon={Users}
            positive={kpis.memberChange >= 0}
          />

          <MetricCard
            title="Attendance Rate"
            value={`${kpis.attendance.toFixed(
              1
            )}%`}
            change={`${kpis.attendanceChange >= 0
                ? "+"
                : ""
              }${kpis.attendanceChange.toFixed(
                1
              )}%`}
            description="vs previous period"
            icon={UserCheck}
            positive={kpis.attendanceChange >= 0}
          />

          <MetricCard
            title="New Members"
            value={kpis.newMembers.toLocaleString(
              "en-IN"
            )}
            change={`${kpis.newMemberChange >= 0
                ? "+"
                : ""
              }${kpis.newMemberChange.toFixed(
                1
              )}%`}
            description="this period"
            icon={UserPlus}
            positive={kpis.newMemberChange >= 0}
          />
        </div>

        {/* Revenue + Membership */}
        <section className="mt-5 grid grid-cols-1 gap-5 xl:grid-cols-[1.65fr_1fr]">

          {/* Revenue Chart */}
          <div className="rounded-2xl border border-gray-200 bg-white p-5 sm:p-6">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <h2 className="text-base font-bold text-gray-900">
                  Revenue & Member Growth
                </h2>

                <p className="mt-1 text-sm text-gray-500">
                  Monthly business performance
                  overview.
                </p>
              </div>

              <button
                type="button"
                className="flex h-8 w-8 items-center justify-center rounded-lg text-gray-400 hover:bg-gray-100 hover:text-gray-700"
              >
                <MoreHorizontal className="h-4 w-4" />
              </button>
            </div>

            <div className="mt-7">
              <div className="flex h-64 items-end gap-2 sm:gap-4">
                {revenueData.map(
                  (item) => {
                    const maxRevenue = Math.max(1, ...revenueData.map((data) => data.revenue))

                    const height =
                      item.revenue > 0
                        ? Math.max(
                          4,
                          (item.revenue / maxRevenue) * 100
                        )
                        : 0

                    return (
                      <div
                        key={item.month}
                        className="group flex h-full flex-1 flex-col justify-end"
                      >
                        <div className="relative flex flex-1 items-end justify-center">
                          <div
                            className="w-full max-w-[38px] rounded-t-lg bg-gray-900 transition-all duration-300 group-hover:bg-gray-700"
                            style={{
                              height: `${height}%`,
                            }}
                          >
                            <div className="absolute bottom-0 left-1/2 hidden -translate-x-1/2 -translate-y-2 rounded-lg bg-gray-900 px-2 py-1 text-[10px] font-semibold text-white group-hover:block">
                              ₹
                              {(
                                item.revenue /
                                1000
                              ).toFixed(1)}
                              k
                            </div>
                          </div>
                        </div>

                        <div className="mt-3 text-center text-[11px] font-medium text-gray-400">
                          {item.month}
                        </div>
                      </div>
                    )
                  }
                )}
              </div>
            </div>

            <div className="mt-6 grid grid-cols-2 gap-4 border-t border-gray-100 pt-5">
              <div>
                <p className="text-xs text-gray-400">
                  Revenue growth
                </p>

                <div className="mt-1 flex items-center gap-1.5">
                  <TrendingUp className="h-4 w-4 text-emerald-500" />

                  <span className="text-sm font-bold text-gray-900">
                    +12.8%
                  </span>
                </div>
              </div>

              <div>
                <p className="text-xs text-gray-400">
                  Member growth
                </p>

                <div className="mt-1 flex items-center gap-1.5">
                  <Users className="h-4 w-4 text-gray-500" />

                  <span className="text-sm font-bold text-gray-900">
                    {kpis.memberChange >=
                      0
                      ? "+"
                      : ""}
                    {kpis.memberChange.toFixed(
                      1
                    )}
                    %
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Membership */}
          <div className="rounded-2xl border border-gray-200 bg-white p-5 sm:p-6">
            <div>
              <h2 className="text-base font-bold text-gray-900">
                Membership Performance
              </h2>

              <p className="mt-1 text-sm text-gray-500">
                Active members by membership
                plan.
              </p>
            </div>

            <div className="mt-7 flex items-center justify-center">
              <div
                className="relative flex h-44 w-44 items-center justify-center rounded-full"
                style={{
                  background:
                    "conic-gradient(#111827 0deg 165.6deg, #6b7280 165.6deg 295.2deg, #d1d5db 295.2deg 360deg)",
                }}
              >
                <div className="flex h-32 w-32 flex-col items-center justify-center rounded-full bg-white">
                  <span className="text-2xl font-bold text-gray-900">
                    {kpis.activeMembers}
                  </span>

                  <span className="text-xs text-gray-400">
                    Members
                  </span>
                </div>
              </div>
            </div>

            <div className="mt-7 space-y-4">
              {membershipData.map(
                (item, index) => (
                  <div
                    key={item.name}
                    className="flex items-center justify-between"
                  >
                    <div className="flex items-center gap-3">
                      <span
                        className={`h-2.5 w-2.5 rounded-full ${index === 0
                            ? "bg-gray-900"
                            : index === 1
                              ? "bg-gray-500"
                              : "bg-gray-300"
                          }`}
                      />

                      <span className="text-sm font-medium text-gray-700">
                        {item.name}
                      </span>
                    </div>

                    <div className="text-right">
                      <span className="text-sm font-bold text-gray-900">
                        {item.members}
                      </span>

                      <span className="ml-2 text-xs text-gray-400">
                        {item.percentage}%
                      </span>
                    </div>
                  </div>
                )
              )}
            </div>
          </div>
        </section>

        {/* Attendance + Quick Stats */}
        <section className="mt-5 grid grid-cols-1 gap-5 lg:grid-cols-[1.4fr_1fr]">

          {/* Attendance */}
          <div className="rounded-2xl border border-gray-200 bg-white p-5 sm:p-6">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <h2 className="text-base font-bold text-gray-900">
                  Attendance Analytics
                </h2>

                <p className="mt-1 text-sm text-gray-500">
                  Average attendance by day.
                </p>
              </div>

              <div className="flex items-center gap-2 rounded-lg bg-gray-50 px-3 py-2 text-xs text-gray-500">
                <LineChart className="h-3.5 w-3.5" />

                Avg.{" "}
                {kpis.attendance.toFixed(
                  1
                )}
                %
              </div>
            </div>

            <div className="mt-8 flex h-56 items-end gap-3 sm:gap-6">
              {attendanceData.map(
                (item) => (
                  <div
                    key={item.day}
                    className="group flex h-full flex-1 flex-col justify-end"
                  >
                    <div className="relative flex flex-1 items-end justify-center">
                      <div
                        className="w-full max-w-[42px] rounded-t-lg bg-gray-300 transition-all duration-300 group-hover:bg-gray-900"
                        style={{
                          height: `${item.value}%`,
                        }}
                      />

                      <span
                        className="absolute left-1/2 -translate-x-1/2 text-[10px] font-bold text-gray-500 opacity-0 transition group-hover:opacity-100"
                        style={{
                          bottom: `calc(${Math.min(
                            100,
                            Math.max(0, item.value)
                          )}% + 8px)`,
                        }}
                      >
                        {item.value}%
                      </span>
                    </div>

                    <p className="mt-3 text-center text-xs font-medium text-gray-400">
                      {item.day}
                    </p>
                  </div>
                )
              )}
            </div>
          </div>

          {/* Quick Stats */}
          <div className="rounded-2xl border border-gray-200 bg-white p-5 sm:p-6">
            <div>
              <h2 className="text-base font-bold text-gray-900">
                Key Performance
              </h2>

              <p className="mt-1 text-sm text-gray-500">
                Important business metrics.
              </p>
            </div>

            <div className="mt-6 space-y-3">
              <PerformanceRow
                label="Member retention"
                value={`${kpis.retention.toFixed(
                  1
                )}%`}
                change="Live"
              />

              <PerformanceRow
                label="Membership renewal"
                value={`${kpis.renewal.toFixed(
                  1
                )}%`}
                change="Live"
              />

              <PerformanceRow
                label="Class utilization"
                value={`${kpis.utilization.toFixed(
                  1
                )}%`}
                change="Live"
              />

              <PerformanceRow
                label="Average visits / member"
                value={kpis.visits.toFixed(
                  1
                )}
                change="Live"
              />

              <PerformanceRow
                label="New member conversion"
                value={`${kpis.conversion.toFixed(
                  1
                )}%`}
                change="Live"
              />

              <PerformanceRow
                label="No-show rate"
                value={`${kpis.noShow.toFixed(
                  1
                )}%`}
                change="Live"
                positive={false}
              />
            </div>
          </div>
        </section>

        {/* Top Classes */}
        <section className="mt-5 rounded-2xl border border-gray-200 bg-white">
          <div className="flex flex-col gap-3 border-b border-gray-100 px-5 py-5 sm:flex-row sm:items-center sm:justify-between sm:px-6">
            <div>
              <h2 className="text-base font-bold text-gray-900">
                Top Performing Classes
              </h2>

              <p className="mt-1 text-sm text-gray-500">
                Classes with the highest
                bookings and revenue.
              </p>
            </div>

            <button
              type="button"
              onClick={() =>
                toast.info(
                  "All class reports opened"
                )
              }
              className="text-sm font-semibold text-gray-700 hover:text-gray-900"
            >
              View all →
            </button>
          </div>

          {/* Desktop Table */}
          <div className="hidden overflow-x-auto md:block">
            <table className="w-full min-w-[800px]">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50">
                  <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-400">
                    Class
                  </th>

                  <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-400">
                    Bookings
                  </th>

                  <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-400">
                    Attendance
                  </th>

                  <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-400">
                    Revenue
                  </th>

                  <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-400">
                    Performance
                  </th>
                </tr>
              </thead>

              <tbody>
                {topClasses.map(
                  (item) => (
                    <tr
                      key={item.name}
                      className="border-b border-gray-100 last:border-0 hover:bg-gray-50/70"
                    >
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-gray-100 text-gray-700">
                            <Dumbbell className="h-4 w-4" />
                          </div>

                          <span className="text-sm font-semibold text-gray-900">
                            {item.name}
                          </span>
                        </div>
                      </td>

                      <td className="px-6 py-4 text-sm font-medium text-gray-700">
                        {item.bookings}
                      </td>

                      <td className="px-6 py-4">
                        <span className="text-sm font-semibold text-gray-900">
                          {item.attendance}%
                        </span>
                      </td>

                      <td className="px-6 py-4 text-sm font-bold text-gray-900">
                        ₹
                        {item.revenue.toLocaleString(
                          "en-IN"
                        )}
                      </td>

                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          <div className="h-1.5 w-20 overflow-hidden rounded-full bg-gray-100">
                            <div
                              className="h-full rounded-full bg-gray-900"
                              style={{
                                width: `${item.attendance}%`,
                              }}
                            />
                          </div>

                          <span className="text-xs font-medium text-gray-500">
                            {item.attendance >=
                              90
                              ? "Excellent"
                              : item.attendance >=
                                85
                                ? "Good"
                                : "Average"}
                          </span>
                        </div>
                      </td>
                    </tr>
                  )
                )}
              </tbody>
            </table>
          </div>

          {/* Mobile Cards */}
          <div className="divide-y divide-gray-100 md:hidden">
            {topClasses.map(
              (item) => (
                <div
                  key={item.name}
                  className="p-5"
                >
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-gray-100 text-gray-700">
                        <Dumbbell className="h-4 w-4" />
                      </div>

                      <div>
                        <p className="text-sm font-semibold text-gray-900">
                          {item.name}
                        </p>

                        <p className="mt-1 text-xs text-gray-400">
                          {item.bookings}{" "}
                          bookings
                        </p>
                      </div>
                    </div>

                    <span className="text-sm font-bold text-gray-900">
                      ₹
                      {item.revenue.toLocaleString(
                        "en-IN"
                      )}
                    </span>
                  </div>

                  <div className="mt-4">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-gray-400">
                        Attendance
                      </span>

                      <span className="font-semibold text-gray-700">
                        {item.attendance}%
                      </span>
                    </div>

                    <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-gray-100">
                      <div
                        className="h-full rounded-full bg-gray-900"
                        style={{
                          width: `${item.attendance}%`,
                        }}
                      />
                    </div>
                  </div>
                </div>
              )
            )}
          </div>
        </section>

        {/* Product Sales */}
        <section className="mt-5 rounded-2xl border border-gray-200 bg-white">
          <div className="flex flex-col gap-3 border-b border-gray-100 px-5 py-5 sm:flex-row sm:items-center sm:justify-between sm:px-6">
            <div>
              <h2 className="text-base font-bold text-gray-900">
                Product Sales
              </h2>

              <p className="mt-1 text-sm text-gray-500">
                Best-selling products and
                generated revenue.
              </p>
            </div>

            <button
              type="button"
              onClick={() =>
                toast.info(
                  "Product reports opened"
                )
              }
              className="text-sm font-semibold text-gray-700 hover:text-gray-900"
            >
              View products →
            </button>
          </div>

          <div className="grid grid-cols-1 divide-y divide-gray-100 sm:grid-cols-2 sm:divide-x sm:divide-y-0">
            {productSales.map(
              (product) => (
                <div
                  key={product.name}
                  className="flex items-center justify-between gap-4 p-5 sm:p-6"
                >
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gray-100 text-gray-700">
                      <BarChart3 className="h-4 w-4" />
                    </div>

                    <div>
                      <p className="text-sm font-semibold text-gray-900">
                        {product.name}
                      </p>

                      <p className="mt-1 text-xs text-gray-400">
                        {product.units}{" "}
                        units sold
                      </p>
                    </div>
                  </div>

                  <p className="text-sm font-bold text-gray-900">
                    ₹
                    {product.revenue.toLocaleString(
                      "en-IN"
                    )}
                  </p>
                </div>
              )
            )}
          </div>
        </section>

        <section className="mt-5 rounded-2xl border border-gray-200 bg-white">
          <div className="flex flex-col gap-3 border-b border-gray-100 px-5 py-5 sm:flex-row sm:items-center sm:justify-between sm:px-6">
            <div>
              <h2 className="text-base font-bold text-gray-900">
                Membership Purchases
              </h2>
              <p className="mt-1 text-sm text-gray-500">
                Membership purchases recorded from member payments.
              </p>
            </div>
            <span className="inline-flex items-center rounded-lg bg-gray-50 px-3 py-2 text-xs font-semibold text-gray-600">
              {membershipPurchases.length} purchases
            </span>
          </div>

          <div className="hidden overflow-x-auto md:block">
            <table className="w-full min-w-[980px]">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50">
                  <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-400">Member</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-400">Membership</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-400">Amount</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-400">Payment</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-400">Method</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-400">Status</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-400">Date</th>
                </tr>
              </thead>
              <tbody>
                {membershipPurchases.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-6 py-10 text-center text-sm text-gray-400">
                      No membership purchases found for this period.
                    </td>
                  </tr>
                ) : (
                  membershipPurchases.map((purchase) => (
                    <tr key={purchase.id} className="border-b border-gray-100 last:border-0 hover:bg-gray-50/70">
                      <td className="px-6 py-4">
                        <span className="text-sm font-semibold text-gray-900">{purchase.memberName}</span>
                      </td>
                      <td className="px-6 py-4">
                        <span className="text-sm font-medium text-gray-700">{purchase.membershipName}</span>
                      </td>
                      <td className="px-6 py-4 text-sm font-bold text-gray-900">
                        ₹{purchase.amount.toLocaleString("en-IN")}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-700">{purchase.paymentType}</td>
                      <td className="px-6 py-4 text-sm text-gray-700">{purchase.paymentMethod}</td>
                      <td className="px-6 py-4">
                        <span className="inline-flex rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-semibold capitalize text-emerald-700">
                          {purchase.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-500">
                        {new Date(purchase.paidAt).toLocaleDateString("en-IN", {
                          day: "2-digit",
                          month: "short",
                          year: "numeric",
                        })}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          <div className="divide-y divide-gray-100 md:hidden">
            {membershipPurchases.length === 0 ? (
              <div className="p-5 text-center text-sm text-gray-400">
                No membership purchases found for this period.
              </div>
            ) : (
              membershipPurchases.map((purchase) => (
                <div key={purchase.id} className="space-y-3 p-5">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <p className="text-sm font-semibold text-gray-900">{purchase.memberName}</p>
                      <p className="mt-1 text-xs text-gray-400">{purchase.membershipName}</p>
                    </div>
                    <p className="text-sm font-bold text-gray-900">₹{purchase.amount.toLocaleString("en-IN")}</p>
                  </div>
                  <div className="grid grid-cols-2 gap-3 text-xs">
                    <div>
                      <p className="text-gray-400">Payment</p>
                      <p className="mt-1 font-semibold text-gray-700">{purchase.paymentType}</p>
                    </div>
                    <div>
                      <p className="text-gray-400">Method</p>
                      <p className="mt-1 font-semibold text-gray-700">{purchase.paymentMethod}</p>
                    </div>
                    <div>
                      <p className="text-gray-400">Status</p>
                      <p className="mt-1 font-semibold capitalize text-emerald-700">{purchase.status}</p>
                    </div>
                    <div>
                      <p className="text-gray-400">Date</p>
                      <p className="mt-1 font-semibold text-gray-700">
                        {new Date(purchase.paidAt).toLocaleDateString("en-IN", {
                          day: "2-digit",
                          month: "short",
                          year: "numeric",
                        })}
                      </p>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </section>

        {/* Performance Insight */}
        <section className="mt-5 rounded-2xl border border-gray-200 bg-white p-5 sm:p-6">
          <div className="flex items-start gap-4">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gray-100 text-gray-700">
              <TrendingUp className="h-5 w-5" />
            </div>

            <div>
              <h3 className="text-sm font-bold text-gray-900">
                Performance insight
              </h3>

              <p className="mt-1 max-w-3xl text-sm leading-6 text-gray-500">
                {(() => {
                  const topAttendanceDay = attendanceData.reduce(
                    (best, item) =>
                      item.value > best.value ? item : best,
                    attendanceData[0] ?? {
                      day: "No data",
                      value: 0,
                    }
                  )

                  const topMembership = membershipData.reduce(
                    (best, item) =>
                      item.members > best.members ? item : best,
                    membershipData[0] ?? {
                      name: "No membership data",
                      members: 0,
                    }
                  )

                  if (
                    topAttendanceDay.value === 0 &&
                    topMembership.members === 0
                  ) {
                    return "Not enough report data is available to generate a performance insight yet."
                  }

                  return `The highest attendance was recorded on ${topAttendanceDay.day
                    } with ${topAttendanceDay.value.toLocaleString(
                      "en-IN"
                    )}% attendance. ${topMembership.members > 0
                      ? `${topMembership.name} is currently the most represented membership with ${topMembership.members.toLocaleString(
                        "en-IN"
                      )} members.`
                      : "Membership distribution data is currently limited."
                    }`
                })()}
              </p>
            </div>
          </div>
        </section>
      </div>

      {/* Filter Modal */}
      {showFilters && (
        <FilterModal
          onClose={() =>
            setShowFilters(false)
          }
          membershipFilter={membershipFilter}
          membershipOptions={membershipData.map((m) => ({ id: m.name, name: m.name }))}
          onMembershipChange={setMembershipFilter}
          onApply={() => {
            setShowFilters(false)
            toast.info(
              membershipFilter === "all"
                ? "All membership filters applied"
                : "Membership filter applied"
            )
          }}
        />
      )}
    </div>
  )
}

/* --------------------------------
   Metric Card
--------------------------------- */

function MetricCard({
  title,
  value,
  change,
  description,
  icon: Icon,
  positive,
}: {
  title: string
  value: string
  change: string
  description: string
  icon: React.ElementType
  positive: boolean
}) {
  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-5">
      <div className="flex items-start justify-between">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gray-100 text-gray-700">
          <Icon className="h-5 w-5" />
        </div>

        <span
          className={`inline-flex items-center gap-1 text-xs font-semibold ${positive
              ? "text-emerald-600"
              : "text-red-600"
            }`}
        >
          {positive ? (
            <ArrowUpRight className="h-3.5 w-3.5" />
          ) : (
            <ArrowDownRight className="h-3.5 w-3.5" />
          )}

          {change}
        </span>
      </div>

      <p className="mt-5 text-sm text-gray-500">
        {title}
      </p>

      <p className="mt-1 text-2xl font-bold tracking-tight text-gray-900">
        {value}
      </p>

      <p className="mt-1 text-xs text-gray-400">
        {description}
      </p>
    </div>
  )
}

/* --------------------------------
   Performance Row
--------------------------------- */

function PerformanceRow({
  label,
  value,
  change,
  positive = true,
}: {
  label: string
  value: string
  change: string
  positive?: boolean
}) {
  return (
    <div className="flex items-center justify-between rounded-xl bg-gray-50 px-4 py-3">
      <div>
        <p className="text-sm font-medium text-gray-700">
          {label}
        </p>

        <p className="mt-1 text-xs text-gray-400">
          Compared with previous period
        </p>
      </div>

      <div className="text-right">
        <p className="text-sm font-bold text-gray-900">
          {value}
        </p>

        <p
          className={`mt-1 text-xs font-semibold ${positive
              ? "text-emerald-600"
              : "text-red-600"
            }`}
        >
          {positive ? "+" : ""}
          {change}
        </p>
      </div>
    </div>
  )
}

/* --------------------------------
   Filter Modal
--------------------------------- */

function FilterModal({
  onClose,
  onApply,
  membershipFilter,
  membershipOptions,
  onMembershipChange,
}: {
  onClose: () => void
  onApply: () => void
  membershipFilter: string
  membershipOptions: Array<{
    id: string
    name: string
    active?: boolean
  }>
  onMembershipChange: (value: string) => void
}) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
      onMouseDown={onClose}
    >
      <div
        className="w-full max-w-md rounded-2xl bg-white shadow-2xl"
        onMouseDown={(e) =>
          e.stopPropagation()
        }
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-gray-200 px-5 py-5 sm:px-6">
          <div>
            <h2 className="text-lg font-bold text-gray-900">
              Report Filters
            </h2>

            <p className="mt-1 text-sm text-gray-500">
              Customize the analytics you
              want to see.
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="flex h-9 w-9 items-center justify-center rounded-lg text-gray-400 hover:bg-gray-100 hover:text-gray-700"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Form */}
        <div className="space-y-5 p-5 sm:p-6">
          <div>
            <label className="mb-2 block text-sm font-semibold text-gray-700">
              Report type
            </label>

            <select className="input">
              <option>All reports</option>
              <option>Revenue</option>
              <option>Members</option>
              <option>Attendance</option>
              <option>Classes</option>
              <option>Products</option>
            </select>
          </div>

          <div>
            <label className="mb-2 block text-sm font-semibold text-gray-700">
              Membership
            </label>

            <select
              value={membershipFilter}
              onChange={(e) =>
                onMembershipChange(e.target.value)
              }
              className="input"
            >
              <option value="all">
                All memberships
              </option>

              {membershipOptions.map((product) => (
                <option
                  key={product.id}
                  value={product.id}
                >
                  {product.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="mb-2 block text-sm font-semibold text-gray-700">
              Location
            </label>

            <div className="rounded-xl border border-gray-200 bg-gray-50 px-3 py-2.5 text-sm text-gray-700">
              Current gym
            </div>
          </div>

          <div className="flex items-center gap-3 rounded-xl border border-gray-200 bg-gray-50 p-4">
            <CalendarDays className="h-5 w-5 text-gray-500" />

            <div>
              <p className="text-sm font-semibold text-gray-900">
                Date range
              </p>

              <p className="mt-1 text-xs text-gray-500">
                Use the period selector to
                change the date range.
              </p>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex flex-col gap-3 border-t border-gray-100 bg-gray-50 p-5 sm:flex-row sm:justify-end sm:p-6">
          <button
            type="button"
            onClick={onClose}
            className="h-10 rounded-xl border border-gray-200 bg-white px-4 text-sm font-semibold text-gray-700 hover:bg-gray-50"
          >
            Cancel
          </button>

          <button
            type="button"
            onClick={onApply}
            className="h-10 rounded-xl bg-gray-900 px-5 text-sm font-semibold text-white hover:bg-gray-800"
          >
            Apply filters
          </button>
        </div>
      </div>
    </div>
  )
}
