import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import React from 'react'
import fs from 'node:fs/promises'
import path from 'node:path'
import { renderToBuffer } from '@react-pdf/renderer'
import { QuotePDF } from '@/lib/pdf/quote-template'
import type { ExportPayload } from '@/types/quote'

export const runtime = 'nodejs'

// Read once and cache between invocations
let leftLogoCache: string | null = null
let rightLogoCache: string | null = null

async function loadTemplateLogos() {
  if (leftLogoCache && rightLogoCache) return { left: leftLogoCache, right: rightLogoCache }
  const root = process.cwd()
  try {
    const [leftBuf, rightBuf] = await Promise.all([
      fs.readFile(path.join(root, 'public', 'template-assets', 'logo-partner.png')),
      fs.readFile(path.join(root, 'public', 'template-assets', 'logo-benq.png')),
    ])
    leftLogoCache = `data:image/png;base64,${leftBuf.toString('base64')}`
    rightLogoCache = `data:image/png;base64,${rightBuf.toString('base64')}`
  } catch {
    // logos optional — PDF will render without them
  }
  return { left: leftLogoCache, right: rightLogoCache }
}

export async function POST(request: NextRequest) {
  const payload: ExportPayload & { expiresAt?: string | null; terms?: string[] } =
    await request.json()

  const { left, right } = await loadTemplateLogos()
  const enriched = {
    ...payload,
    templateLeftLogo: left,
    templateRightLogo: right,
  }

  const element = React.createElement(QuotePDF, { payload: enriched })
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const buffer = await renderToBuffer(element as any)

  return new NextResponse(new Uint8Array(buffer), {
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="quote-${payload.quoteMeta.quoteNumber}.pdf"`,
    },
  })
}
