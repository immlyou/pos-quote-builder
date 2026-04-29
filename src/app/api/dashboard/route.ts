import { NextResponse } from 'next/server'
import { sql } from 'drizzle-orm'
import { db, schema } from '@/lib/db'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

interface StatusRow {
  status: string
  count: number
  total: number
}

interface CustomerRow {
  name: string | null
  count: number
  total: number
}

interface SalespersonRow {
  preparedBy: string
  quoteCount: number
  acceptedCount: number
  acceptedTotal: number
}

interface TrendRow {
  month: string
  count: number
  acceptedCount: number
  total: number
  acceptedTotal: number
}

export async function GET() {
  const [statusAll, statusMonth, topCustomers, salespersonPerf, trend, followups, closeMetrics] = await Promise.all([
    db.execute(sql`
      SELECT status, COUNT(*)::int AS count,
             COALESCE(SUM(grand_total), 0)::float AS total
      FROM quotes
      GROUP BY status
    `),
    db.execute(sql`
      SELECT status, COUNT(*)::int AS count,
             COALESCE(SUM(grand_total), 0)::float AS total
      FROM quotes
      WHERE date >= date_trunc('month', current_date)
      GROUP BY status
    `),
    db.execute(sql`
      SELECT customer_name_snapshot AS name,
             COUNT(*)::int AS count,
             COALESCE(SUM(grand_total), 0)::float AS total
      FROM quotes
      WHERE status = 'accepted' AND customer_name_snapshot IS NOT NULL
      GROUP BY customer_name_snapshot
      ORDER BY total DESC
      LIMIT 5
    `),
    db.execute(sql`
      SELECT prepared_by AS "preparedBy",
             COUNT(*)::int AS "quoteCount",
             COUNT(*) FILTER (WHERE status = 'accepted')::int AS "acceptedCount",
             COALESCE(SUM(grand_total) FILTER (WHERE status = 'accepted'), 0)::float AS "acceptedTotal"
      FROM quotes
      WHERE prepared_by IS NOT NULL AND prepared_by <> ''
      GROUP BY prepared_by
      ORDER BY "acceptedTotal" DESC
    `),
    db.execute(sql`
      SELECT to_char(date_trunc('month', date), 'YYYY-MM') AS month,
             COUNT(*)::int AS count,
             COUNT(*) FILTER (WHERE status = 'accepted')::int AS "acceptedCount",
             COALESCE(SUM(grand_total), 0)::float AS total,
             COALESCE(SUM(grand_total) FILTER (WHERE status = 'accepted'), 0)::float AS "acceptedTotal"
      FROM quotes
      WHERE date >= (current_date - interval '5 months')::date
      GROUP BY 1
      ORDER BY 1
    `),
    db.execute(sql`
      SELECT id, quote_number AS "quoteNumber",
             customer_name_snapshot AS "customerName",
             status, date, grand_total AS "grandTotal",
             next_followup_at AS "nextFollowupAt",
             (next_followup_at < current_date) AS overdue
      FROM quotes
      WHERE next_followup_at IS NOT NULL
        AND status NOT IN ('accepted', 'rejected', 'cancelled', 'expired')
        AND next_followup_at <= (current_date + interval '7 days')::date
      ORDER BY next_followup_at ASC
      LIMIT 20
    `),
    db.execute(sql`
      SELECT
        AVG(EXTRACT(EPOCH FROM (customer_responded_at - sent_at)) / 86400.0)::float AS "avgDaysToClose",
        COUNT(*) FILTER (WHERE customer_responded_at IS NOT NULL AND sent_at IS NOT NULL)::int AS "respondedCount"
      FROM quotes
      WHERE status = 'accepted' AND sent_at IS NOT NULL AND customer_responded_at IS NOT NULL
    `),
  ])

  // Build status totals
  const statusAllRows = (statusAll as unknown as { rows: StatusRow[] }).rows ?? (statusAll as unknown as StatusRow[])
  const statusMonthRows = (statusMonth as unknown as { rows: StatusRow[] }).rows ?? (statusMonth as unknown as StatusRow[])
  const topCustomersRows = (topCustomers as unknown as { rows: CustomerRow[] }).rows ?? (topCustomers as unknown as CustomerRow[])
  const salespersonRows = (salespersonPerf as unknown as { rows: SalespersonRow[] }).rows ?? (salespersonPerf as unknown as SalespersonRow[])
  const trendRows = (trend as unknown as { rows: TrendRow[] }).rows ?? (trend as unknown as TrendRow[])

  interface FollowupRow {
    id: string
    quoteNumber: string
    customerName: string | null
    status: string
    date: string
    grandTotal: string
    nextFollowupAt: string
    overdue: boolean
  }
  interface CloseMetricsRow {
    avgDaysToClose: number | null
    respondedCount: number
  }
  const followupRows = (followups as unknown as { rows: FollowupRow[] }).rows ?? (followups as unknown as FollowupRow[])
  const closeMetricsRows = (closeMetrics as unknown as { rows: CloseMetricsRow[] }).rows ?? (closeMetrics as unknown as CloseMetricsRow[])
  const closeMetric = closeMetricsRows[0] ?? { avgDaysToClose: null, respondedCount: 0 }

  const lookup = (rows: StatusRow[], status: string) =>
    rows.find((r) => r.status === status) ?? { status, count: 0, total: 0 }

  const accepted = lookup(statusAllRows, 'accepted')
  const rejected = lookup(statusAllRows, 'rejected')
  const expired = lookup(statusAllRows, 'expired')

  const closedDeals = accepted.count + rejected.count + expired.count
  const winRate = closedDeals > 0 ? accepted.count / closedDeals : 0

  const monthAccepted = lookup(statusMonthRows, 'accepted')
  const monthSent = lookup(statusMonthRows, 'sent')
  const monthDraft = lookup(statusMonthRows, 'draft')
  const monthTotal =
    monthAccepted.total +
    monthSent.total +
    monthDraft.total +
    lookup(statusMonthRows, 'rejected').total +
    lookup(statusMonthRows, 'expired').total

  return NextResponse.json({
    kpi: {
      monthAcceptedTotal: monthAccepted.total,
      monthAcceptedCount: monthAccepted.count,
      monthPipelineTotal: monthSent.total + monthDraft.total,
      monthQuoteCount: statusMonthRows.reduce((s, r) => s + r.count, 0),
      monthTotal,
      winRate,
      acceptedAllTimeTotal: accepted.total,
      acceptedAllTimeCount: accepted.count,
    },
    statusBreakdown: statusAllRows,
    topCustomers: topCustomersRows,
    salespersonPerf: salespersonRows,
    trend: trendRows,
    followups: followupRows,
    closeMetrics: {
      avgDaysToClose: closeMetric.avgDaysToClose,
      respondedCount: closeMetric.respondedCount,
    },
  })
}
