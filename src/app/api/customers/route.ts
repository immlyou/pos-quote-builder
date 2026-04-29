import { NextResponse } from 'next/server'
import { count, desc, eq, ilike, max, or, sql } from 'drizzle-orm'
import { db, schema } from '@/lib/db'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET(req: Request) {
  const url = new URL(req.url)
  const q = url.searchParams.get('q')?.trim() || ''

  const where = q
    ? or(
        ilike(schema.customers.code, `%${q}%`),
        ilike(schema.customers.name, `%${q}%`),
        ilike(schema.customers.contact, `%${q}%`),
        ilike(schema.customers.email, `%${q}%`)
      )
    : undefined

  const rows = await db
    .select({
      id: schema.customers.id,
      code: schema.customers.code,
      name: schema.customers.name,
      contact: schema.customers.contact,
      email: schema.customers.email,
      phone: schema.customers.phone,
      address: schema.customers.address,
      notes: schema.customers.notes,
      createdAt: schema.customers.createdAt,
      quoteCount: count(schema.quotes.id),
      latestQuoteDate: max(schema.quotes.date),
      totalValue: sql<string>`coalesce(sum(${schema.quotes.grandTotal}), 0)`,
    })
    .from(schema.customers)
    .leftJoin(schema.quotes, eq(schema.quotes.customerId, schema.customers.id))
    .where(where)
    .groupBy(schema.customers.id)
    .orderBy(desc(schema.customers.createdAt))

  return NextResponse.json({ customers: rows })
}

export async function POST(req: Request) {
  let body: Record<string, unknown>
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const name = typeof body.name === 'string' ? body.name.trim() : ''
  if (!name) {
    return NextResponse.json({ error: 'name is required' }, { status: 400 })
  }

  const code = typeof body.code === 'string' ? body.code.trim() || null : null
  if (code) {
    const exists = await db
      .select({ id: schema.customers.id })
      .from(schema.customers)
      .where(eq(schema.customers.code, code))
      .limit(1)
    if (exists.length > 0) {
      return NextResponse.json({ error: `code '${code}' already exists` }, { status: 409 })
    }
  }

  const [created] = await db
    .insert(schema.customers)
    .values({
      code,
      name,
      contact: typeof body.contact === 'string' ? body.contact || null : null,
      email: typeof body.email === 'string' ? body.email || null : null,
      phone: typeof body.phone === 'string' ? body.phone || null : null,
      address: typeof body.address === 'string' ? body.address || null : null,
      notes: typeof body.notes === 'string' ? body.notes || null : null,
    })
    .returning()

  return NextResponse.json({ ok: true, customer: created })
}
