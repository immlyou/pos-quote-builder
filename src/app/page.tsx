import { eq } from 'drizzle-orm'
import bundledCatalog from '@/data/catalog.json'
import type { Catalog } from '@/types/catalog'
import { db, schema } from '@/lib/db'
import { QuoteConfigurator } from '@/components/QuoteConfigurator'

export const dynamic = 'force-dynamic'

async function loadCatalog(): Promise<Catalog> {
  try {
    const rows = await db
      .select({ data: schema.appCatalog.data })
      .from(schema.appCatalog)
      .where(eq(schema.appCatalog.id, 1))
      .limit(1)
    if (rows[0]?.data) return rows[0].data as Catalog
  } catch (e) {
    console.error('catalog db read failed, falling back to bundled', e)
  }
  return bundledCatalog as unknown as Catalog
}

export default async function HomePage() {
  const data = await loadCatalog()
  return <QuoteConfigurator catalog={data} />
}
