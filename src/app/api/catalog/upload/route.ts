import { NextResponse } from 'next/server'
import { db, schema } from '@/lib/db'
import { parseCatalog } from '@/lib/catalog/parse'

export const runtime = 'nodejs'
export const maxDuration = 60

export async function POST(req: Request) {
  const form = await req.formData()
  const file = form.get('file')

  if (!(file instanceof File)) {
    return NextResponse.json({ error: 'No file uploaded' }, { status: 400 })
  }
  if (!/\.xlsx$/i.test(file.name)) {
    return NextResponse.json({ error: 'Only .xlsx files are accepted' }, { status: 400 })
  }
  if (file.size > 10 * 1024 * 1024) {
    return NextResponse.json({ error: 'File too large (max 10 MB)' }, { status: 400 })
  }

  let catalog
  try {
    const buf = await file.arrayBuffer()
    catalog = await parseCatalog(buf, file.name)
  } catch (e) {
    return NextResponse.json(
      { error: `Parse failed: ${(e as Error).message}` },
      { status: 400 }
    )
  }

  const counts = {
    models: catalog.models.length,
    base_options: catalog.optionals.base_options.length,
    upgrades: catalog.optionals.upgrades.length,
    peripherals: catalog.peripherals.length,
    licenses: catalog.licenses.length,
    m10: catalog.m10.length,
    kds: catalog.kds.length,
    stands: catalog.stands.length,
    io_box: catalog.io_box.length,
    payment_brackets: catalog.payment_brackets.length,
    iot: catalog.iot.length,
  }

  await db
    .insert(schema.appCatalog)
    .values({
      id: 1,
      data: catalog,
      sourceFile: file.name,
      counts,
    })
    .onConflictDoUpdate({
      target: schema.appCatalog.id,
      set: {
        data: catalog,
        sourceFile: file.name,
        counts,
        updatedAt: new Date(),
      },
    })

  return NextResponse.json({ ok: true, sourceFile: file.name, counts })
}
