import { NextResponse } from 'next/server'
import { and, desc, eq, gte, ilike, lte, or, sql } from 'drizzle-orm'
import { db, schema } from '@/lib/db'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

interface SavePayload {
  quoteMeta: {
    customer: string
    quoteNumber: string
    date: string
    preparedBy: string
    notes: string
  }
  selections: unknown
  totals: {
    baseModel: number
    upgrades: number
    peripherals: number
    licenses: number
    others: number
    grandTotal: number
  }
  profile?: unknown
  status?: string
  expiresAt?: string | null
  parentQuoteId?: string | null
}

export async function POST(req: Request) {
  let body: SavePayload
  try {
    body = (await req.json()) as SavePayload
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const { quoteMeta, selections, totals, profile } = body
  if (!quoteMeta?.quoteNumber || !quoteMeta?.date) {
    return NextResponse.json({ error: 'quoteNumber and date are required' }, { status: 400 })
  }
  if (!selections || !totals) {
    return NextResponse.json({ error: 'selections and totals are required' }, { status: 400 })
  }

  // Find-or-create customer by name (case-insensitive)
  let customerId: string | null = null
  const customerName = quoteMeta.customer?.trim()
  if (customerName) {
    const found = await db
      .select({ id: schema.customers.id })
      .from(schema.customers)
      .where(sql`lower(${schema.customers.name}) = lower(${customerName})`)
      .limit(1)
    if (found.length > 0) {
      customerId = found[0].id
    } else {
      const [created] = await db
        .insert(schema.customers)
        .values({ name: customerName })
        .returning({ id: schema.customers.id })
      customerId = created.id
    }
  }

  const [inserted] = await db
    .insert(schema.quotes)
    .values({
      quoteNumber: quoteMeta.quoteNumber,
      customerId,
      customerNameSnapshot: customerName || null,
      status: body.status ?? 'draft',
      date: quoteMeta.date,
      expiresAt: body.expiresAt ?? null,
      preparedBy: quoteMeta.preparedBy || null,
      notes: quoteMeta.notes || null,
      profileSnapshot: profile ?? null,
      selections: selections as object,
      totals,
      grandTotal: totals.grandTotal.toFixed(2),
      parentQuoteId: body.parentQuoteId ?? null,
    })
    .returning({ id: schema.quotes.id, quoteNumber: schema.quotes.quoteNumber })

  return NextResponse.json({ ok: true, ...inserted })
}

export async function GET(req: Request) {
  const url = new URL(req.url)
  const q = url.searchParams.get('q')?.trim() || ''
  const status = url.searchParams.get('status')?.trim() || ''
  const from = url.searchParams.get('from')?.trim() || ''
  const to = url.searchParams.get('to')?.trim() || ''
  const limit = Math.min(parseInt(url.searchParams.get('limit') || '100', 10) || 100, 500)

  const filters = []
  if (q) {
    filters.push(
      or(
        ilike(schema.quotes.quoteNumber, `%${q}%`),
        ilike(schema.quotes.customerNameSnapshot, `%${q}%`)
      )
    )
  }
  if (status) filters.push(eq(schema.quotes.status, status))
  if (from) filters.push(gte(schema.quotes.date, from))
  if (to) filters.push(lte(schema.quotes.date, to))

  const rows = await db
    .select({
      id: schema.quotes.id,
      quoteNumber: schema.quotes.quoteNumber,
      customerName: schema.quotes.customerNameSnapshot,
      status: schema.quotes.status,
      date: schema.quotes.date,
      grandTotal: schema.quotes.grandTotal,
      revision: schema.quotes.revision,
      updatedAt: schema.quotes.updatedAt,
    })
    .from(schema.quotes)
    .where(filters.length > 0 ? and(...filters) : undefined)
    .orderBy(desc(schema.quotes.date), desc(schema.quotes.createdAt))
    .limit(limit)

  return NextResponse.json({ quotes: rows })
}
