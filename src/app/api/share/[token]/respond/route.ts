import { NextResponse } from 'next/server'
import { eq } from 'drizzle-orm'
import { db, schema } from '@/lib/db'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const ALLOWED = new Set(['accepted', 'rejected'])

export async function POST(
  req: Request,
  { params }: { params: Promise<{ token: string }> }
) {
  const { token } = await params
  const body = await req.json().catch(() => ({}))
  const action = typeof body.action === 'string' ? body.action : ''

  if (!ALLOWED.has(action)) {
    return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
  }

  const rows = await db
    .select({
      id: schema.quotes.id,
      status: schema.quotes.status,
      respondedAt: schema.quotes.customerRespondedAt,
    })
    .from(schema.quotes)
    .where(eq(schema.quotes.shareToken, token))
    .limit(1)

  if (rows.length === 0) {
    return NextResponse.json({ error: 'Invalid or revoked link' }, { status: 404 })
  }
  if (rows[0].respondedAt) {
    return NextResponse.json(
      { error: 'Already responded', currentStatus: rows[0].status },
      { status: 409 }
    )
  }

  await db
    .update(schema.quotes)
    .set({
      status: action,
      customerRespondedAt: new Date(),
      updatedAt: new Date(),
    })
    .where(eq(schema.quotes.id, rows[0].id))

  return NextResponse.json({ ok: true, status: action })
}
