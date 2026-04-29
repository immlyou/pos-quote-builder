import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import React from 'react'
import { renderToBuffer } from '@react-pdf/renderer'
import { QuotePDF } from '@/lib/pdf/quote-template'
import type { ExportPayload } from '@/types/quote'

export const runtime = 'nodejs'

export async function POST(request: NextRequest) {
  const payload: ExportPayload & { expiresAt?: string | null; terms?: string[] } =
    await request.json()

  const element = React.createElement(QuotePDF, { payload })
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const buffer = await renderToBuffer(element as any)

  return new NextResponse(new Uint8Array(buffer), {
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="quote-${payload.quoteMeta.quoteNumber}.pdf"`,
    },
  })
}
