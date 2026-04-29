import { NextResponse } from 'next/server'
import { and, asc, isNotNull, lte, ne, sql } from 'drizzle-orm'
import { db, schema } from '@/lib/db'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET(req: Request) {
  const url = new URL(req.url)
  const horizon = url.searchParams.get('horizon') ?? 'today'
  const today = new Date().toISOString().slice(0, 10)

  const filters = [
    isNotNull(schema.quotes.nextFollowupAt),
    ne(schema.quotes.status, 'accepted'),
    ne(schema.quotes.status, 'rejected'),
    ne(schema.quotes.status, 'cancelled'),
    ne(schema.quotes.status, 'expired'),
  ]

  if (horizon === 'today') {
    filters.push(lte(schema.quotes.nextFollowupAt, today))
  } else if (horizon === 'week') {
    filters.push(
      sql`${schema.quotes.nextFollowupAt} <= (current_date + interval '7 days')::date`
    )
  }

  const rows = await db
    .select({
      id: schema.quotes.id,
      quoteNumber: schema.quotes.quoteNumber,
      customerName: schema.quotes.customerNameSnapshot,
      customerId: schema.quotes.customerId,
      status: schema.quotes.status,
      date: schema.quotes.date,
      grandTotal: schema.quotes.grandTotal,
      nextFollowupAt: schema.quotes.nextFollowupAt,
      sentAt: schema.quotes.sentAt,
      lastViewedAt: schema.quotes.lastViewedAt,
      viewCount: schema.quotes.viewCount,
    })
    .from(schema.quotes)
    .where(and(...filters))
    .orderBy(asc(schema.quotes.nextFollowupAt))

  return NextResponse.json({
    today,
    quotes: rows.map((r) => ({
      ...r,
      overdue: r.nextFollowupAt ? r.nextFollowupAt < today : false,
    })),
  })
}
