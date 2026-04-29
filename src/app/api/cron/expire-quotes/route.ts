import { NextResponse } from 'next/server'
import { and, eq, lt, sql } from 'drizzle-orm'
import { db, schema } from '@/lib/db'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET(req: Request) {
  // Verify cron secret if configured (Vercel sends Authorization header automatically)
  const expected = process.env.CRON_SECRET
  if (expected) {
    const auth = req.headers.get('authorization')
    if (auth !== `Bearer ${expected}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
  }

  const today = new Date().toISOString().slice(0, 10)

  const updated = await db
    .update(schema.quotes)
    .set({ status: 'expired', updatedAt: new Date() })
    .where(
      and(
        eq(schema.quotes.status, 'sent'),
        sql`${schema.quotes.expiresAt} IS NOT NULL`,
        lt(schema.quotes.expiresAt, today)
      )
    )
    .returning({ id: schema.quotes.id })

  return NextResponse.json({
    ok: true,
    expiredCount: updated.length,
    today,
  })
}
