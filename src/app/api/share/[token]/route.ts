import { NextResponse } from 'next/server'
import { eq, sql } from 'drizzle-orm'
import { db, schema } from '@/lib/db'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ token: string }> }
) {
  const { token } = await params

  const rows = await db
    .select({
      id: schema.quotes.id,
      quoteNumber: schema.quotes.quoteNumber,
      customerNameSnapshot: schema.quotes.customerNameSnapshot,
      status: schema.quotes.status,
      date: schema.quotes.date,
      expiresAt: schema.quotes.expiresAt,
      preparedBy: schema.quotes.preparedBy,
      notes: schema.quotes.notes,
      profileSnapshot: schema.quotes.profileSnapshot,
      selections: schema.quotes.selections,
      totals: schema.quotes.totals,
      grandTotal: schema.quotes.grandTotal,
      revision: schema.quotes.revision,
      customerRespondedAt: schema.quotes.customerRespondedAt,
    })
    .from(schema.quotes)
    .where(eq(schema.quotes.shareToken, token))
    .limit(1)

  if (rows.length === 0) {
    return NextResponse.json({ error: 'Invalid or revoked link' }, { status: 404 })
  }

  // Track view (fire-and-forget; don't fail GET if it errors)
  db
    .update(schema.quotes)
    .set({
      viewCount: sql`${schema.quotes.viewCount} + 1`,
      lastViewedAt: new Date(),
    })
    .where(eq(schema.quotes.id, rows[0].id))
    .catch(() => {})

  return NextResponse.json({ quote: rows[0] })
}
