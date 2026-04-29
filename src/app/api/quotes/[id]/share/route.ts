import { NextResponse } from 'next/server'
import { eq } from 'drizzle-orm'
import { db, schema } from '@/lib/db'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

// Generate or return existing share token
export async function POST(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params

  const existing = await db
    .select({ shareToken: schema.quotes.shareToken })
    .from(schema.quotes)
    .where(eq(schema.quotes.id, id))
    .limit(1)
  if (existing.length === 0) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  let token = existing[0].shareToken
  if (!token) {
    token = crypto.randomUUID()
    await db
      .update(schema.quotes)
      .set({ shareToken: token, sharedAt: new Date(), updatedAt: new Date() })
      .where(eq(schema.quotes.id, id))
  }
  return NextResponse.json({ ok: true, token })
}

// Revoke share token
export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  await db
    .update(schema.quotes)
    .set({ shareToken: null, sharedAt: null, updatedAt: new Date() })
    .where(eq(schema.quotes.id, id))
  return NextResponse.json({ ok: true })
}
