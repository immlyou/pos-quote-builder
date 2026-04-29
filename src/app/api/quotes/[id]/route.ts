import { NextResponse } from 'next/server'
import { eq } from 'drizzle-orm'
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
    .from(schema.quotes)
    .where(eq(schema.quotes.id, id))
    .limit(1)
  if (rows.length === 0) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }
  return NextResponse.json({ quote: rows[0] })
}

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const body = await req.json()

  const update: Record<string, unknown> = { updatedAt: new Date() }
  if (typeof body.status === 'string') {
    update.status = body.status
    // Auto-mark sent_at when transitioning to 'sent'
    if (body.status === 'sent') {
      update.sentAt = new Date()
    }
  }
  if (typeof body.notes === 'string') update.notes = body.notes
  if (typeof body.preparedBy === 'string') update.preparedBy = body.preparedBy
  if (typeof body.date === 'string') update.date = body.date
  if (typeof body.expiresAt === 'string' || body.expiresAt === null) {
    update.expiresAt = body.expiresAt
  }
  if ('nextFollowupAt' in body) {
    update.nextFollowupAt =
      typeof body.nextFollowupAt === 'string' && body.nextFollowupAt
        ? body.nextFollowupAt
        : null
  }
  if (body.selections && typeof body.selections === 'object') {
    update.selections = body.selections
  }
  if (body.totals && typeof body.totals === 'object') {
    update.totals = body.totals
    if (typeof body.totals.grandTotal === 'number') {
      update.grandTotal = body.totals.grandTotal.toFixed(2)
    }
  }
  if (body.profileSnapshot !== undefined) {
    update.profileSnapshot = body.profileSnapshot
  }
  if (typeof body.customerName === 'string') {
    update.customerNameSnapshot = body.customerName.trim() || null
  }

  const [updated] = await db
    .update(schema.quotes)
    .set(update)
    .where(eq(schema.quotes.id, id))
    .returning({ id: schema.quotes.id })

  if (!updated) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }
  return NextResponse.json({ ok: true, id: updated.id })
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const [deleted] = await db
    .delete(schema.quotes)
    .where(eq(schema.quotes.id, id))
    .returning({ id: schema.quotes.id })
  if (!deleted) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }
  return NextResponse.json({ ok: true })
}
