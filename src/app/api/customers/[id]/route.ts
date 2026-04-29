import { NextResponse } from 'next/server'
import { and, eq, ne } from 'drizzle-orm'
import { db, schema } from '@/lib/db'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const rows = await db
    .select()
    .from(schema.customers)
    .where(eq(schema.customers.id, id))
    .limit(1)
  if (rows.length === 0) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  const customer = rows[0]

  const quotes = await db
    .select({
      id: schema.quotes.id,
      quoteNumber: schema.quotes.quoteNumber,
      status: schema.quotes.status,
      date: schema.quotes.date,
      grandTotal: schema.quotes.grandTotal,
      revision: schema.quotes.revision,
      parentQuoteId: schema.quotes.parentQuoteId,
      sentAt: schema.quotes.sentAt,
      customerRespondedAt: schema.quotes.customerRespondedAt,
      viewCount: schema.quotes.viewCount,
      lastViewedAt: schema.quotes.lastViewedAt,
      nextFollowupAt: schema.quotes.nextFollowupAt,
      createdAt: schema.quotes.createdAt,
    })
    .from(schema.quotes)
    .where(eq(schema.quotes.customerId, id))

  // Compute stats
  let acceptedCount = 0
  let acceptedTotal = 0
  let respondedCount = 0
  let totalRespondDays = 0
  let lastInteraction: Date | null = null
  let pendingCount = 0
  let pendingTotal = 0

  for (const q of quotes) {
    if (q.status === 'accepted') {
      acceptedCount++
      acceptedTotal += parseFloat(q.grandTotal)
    }
    if (q.status === 'sent' || q.status === 'draft') {
      pendingCount++
      pendingTotal += parseFloat(q.grandTotal)
    }
    if (q.customerRespondedAt && q.sentAt) {
      respondedCount++
      const days =
        (new Date(q.customerRespondedAt).getTime() - new Date(q.sentAt).getTime()) /
        (1000 * 60 * 60 * 24)
      if (days >= 0) totalRespondDays += days
    }
    const candidates = [q.lastViewedAt, q.customerRespondedAt, q.sentAt, q.createdAt]
      .map((d) => (d ? new Date(d).getTime() : 0))
      .filter((t) => t > 0)
    const latest = Math.max(...candidates, 0)
    if (latest > (lastInteraction?.getTime() ?? 0)) {
      lastInteraction = new Date(latest)
    }
  }

  const decided = quotes.filter((q) =>
    ['accepted', 'rejected', 'expired'].includes(q.status)
  ).length
  const winRate = decided > 0 ? acceptedCount / decided : 0
  const avgRespondDays = respondedCount > 0 ? totalRespondDays / respondedCount : null

  // Heat: hot if interaction within 7 days, warm 7-30, cold > 30
  let heat: 'hot' | 'warm' | 'cold' | 'new' = 'new'
  if (lastInteraction) {
    const daysSince =
      (Date.now() - lastInteraction.getTime()) / (1000 * 60 * 60 * 24)
    if (daysSince <= 7) heat = 'hot'
    else if (daysSince <= 30) heat = 'warm'
    else heat = 'cold'
  }

  return NextResponse.json({
    customer,
    quotes,
    stats: {
      quoteCount: quotes.length,
      acceptedCount,
      acceptedTotal,
      pendingCount,
      pendingTotal,
      winRate,
      avgRespondDays,
      lastInteraction: lastInteraction?.toISOString() ?? null,
      heat,
    },
  })
}

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const body = await req.json()

  const update: Record<string, unknown> = { updatedAt: new Date() }
  if (typeof body.name === 'string') {
    const name = body.name.trim()
    if (!name) return NextResponse.json({ error: 'name cannot be empty' }, { status: 400 })
    update.name = name
  }
  if ('code' in body) {
    const code = typeof body.code === 'string' ? body.code.trim() || null : null
    if (code) {
      const dupe = await db
        .select({ id: schema.customers.id })
        .from(schema.customers)
        .where(and(eq(schema.customers.code, code), ne(schema.customers.id, id)))
        .limit(1)
      if (dupe.length > 0) {
        return NextResponse.json({ error: `code '${code}' already exists` }, { status: 409 })
      }
    }
    update.code = code
  }
  for (const k of ['contact', 'email', 'phone', 'address', 'notes'] as const) {
    if (k in body) update[k] = typeof body[k] === 'string' ? body[k] || null : null
  }
  if ('tags' in body) {
    update.tags = Array.isArray(body.tags)
      ? body.tags.filter((t: unknown): t is string => typeof t === 'string').map((t: string) => t.trim()).filter(Boolean)
      : []
  }

  const [updated] = await db
    .update(schema.customers)
    .set(update)
    .where(eq(schema.customers.id, id))
    .returning()

  if (!updated) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  return NextResponse.json({ ok: true, customer: updated })
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const [deleted] = await db
    .delete(schema.customers)
    .where(eq(schema.customers.id, id))
    .returning({ id: schema.customers.id })
  if (!deleted) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  return NextResponse.json({ ok: true })
}
