import { NextResponse } from 'next/server'
import { eq } from 'drizzle-orm'
import { db, schema } from '@/lib/db'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET() {
  const rows = await db
    .select({
      sourceFile: schema.appCatalog.sourceFile,
      counts: schema.appCatalog.counts,
      updatedAt: schema.appCatalog.updatedAt,
    })
    .from(schema.appCatalog)
    .where(eq(schema.appCatalog.id, 1))
    .limit(1)

  if (rows.length === 0) {
    return NextResponse.json({ uploaded: false })
  }
  return NextResponse.json({ uploaded: true, ...rows[0] })
}
