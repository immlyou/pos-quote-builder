import { NextResponse } from 'next/server'
import React from 'react'
import { eq } from 'drizzle-orm'
import { renderToBuffer } from '@react-pdf/renderer'
import { Resend } from 'resend'
import { db, schema } from '@/lib/db'
import { QuotePDF } from '@/lib/pdf/quote-template'
import type { ExportPayload, LineItem, CompanyProfile, QuoteTotals } from '@/types/quote'

export const runtime = 'nodejs'
export const maxDuration = 60

interface EmailBody {
  to: string
  subject?: string
  message?: string
  fromName?: string
  fromEmail?: string
  includeShareLink?: boolean
}

const FALLBACK_FROM = 'Quote Builder <onboarding@resend.dev>'

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!process.env.RESEND_API_KEY) {
    return NextResponse.json(
      {
        error:
          'RESEND_API_KEY is not set. Sign up at resend.com (free), then run: vercel env add RESEND_API_KEY production',
      },
      { status: 503 }
    )
  }

  const { id } = await params
  const body: EmailBody = await req.json().catch(() => ({}) as EmailBody)
  if (!body.to || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(body.to)) {
    return NextResponse.json({ error: 'Valid "to" email is required' }, { status: 400 })
  }

  const rows = await db
    .select()
    .from(schema.quotes)
    .where(eq(schema.quotes.id, id))
    .limit(1)
  if (rows.length === 0) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }
  const q = rows[0]

  // Reconstruct ExportPayload from saved selections
  const selections = q.selections as { lineItems?: LineItem[] } & Record<string, unknown>
  const payload: ExportPayload & { expiresAt?: string | null } = {
    profile: q.profileSnapshot as CompanyProfile | null,
    quoteMeta: {
      customer: q.customerNameSnapshot ?? '',
      quoteNumber: q.quoteNumber,
      date: q.date,
      preparedBy: q.preparedBy ?? '',
      notes: q.notes ?? '',
    },
    lineItems: selections.lineItems ?? [],
    totals: q.totals as QuoteTotals,
    expiresAt: q.expiresAt,
  }

  const pdfElement = React.createElement(QuotePDF, { payload })
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const pdfBuffer = await renderToBuffer(pdfElement as any)

  // Optionally include share link
  let shareUrl: string | null = null
  if (body.includeShareLink) {
    let token = q.shareToken
    if (!token) {
      token = crypto.randomUUID()
      await db
        .update(schema.quotes)
        .set({ shareToken: token, sharedAt: new Date() })
        .where(eq(schema.quotes.id, id))
    }
    const origin = req.headers.get('origin') || `https://${req.headers.get('host')}`
    shareUrl = `${origin}/share/${token}`
  }

  const fromAddress =
    body.fromEmail && body.fromName
      ? `${body.fromName} <${body.fromEmail}>`
      : body.fromEmail
        ? body.fromEmail
        : FALLBACK_FROM

  const subject = body.subject || `Quotation ${q.quoteNumber}`
  const customerName = q.customerNameSnapshot || 'Customer'
  const messageBody = body.message || `Please find attached quotation ${q.quoteNumber}.`
  const html = `
    <div style="font-family:-apple-system,BlinkMacSystemFont,sans-serif;color:#111827;max-width:560px">
      <p>Dear ${customerName},</p>
      <p>${messageBody.replace(/\n/g, '<br/>')}</p>
      <p style="margin:16px 0;background:#f3f4f6;padding:12px;border-radius:6px">
        <strong>Quote #</strong> ${q.quoteNumber}<br/>
        <strong>Date</strong> ${q.date}<br/>
        ${q.expiresAt ? `<strong>Valid Until</strong> ${q.expiresAt}<br/>` : ''}
      </p>
      ${
        shareUrl
          ? `<p>You can view and respond to this quote online:<br/>
             <a href="${shareUrl}" style="display:inline-block;margin-top:8px;padding:10px 16px;background:#1d4ed8;color:white;text-decoration:none;border-radius:6px">View Quote Online</a></p>`
          : ''
      }
      <p>The full PDF is attached for your reference.</p>
      <p>Best regards,<br/>${q.preparedBy || (q.profileSnapshot as CompanyProfile | null)?.name || 'Sales Team'}</p>
    </div>
  `

  const resend = new Resend(process.env.RESEND_API_KEY)
  const { data, error } = await resend.emails.send({
    from: fromAddress,
    to: body.to,
    subject,
    html,
    attachments: [
      {
        filename: `quote-${q.quoteNumber}.pdf`,
        content: Buffer.from(pdfBuffer).toString('base64'),
      },
    ],
  })

  if (error) {
    return NextResponse.json({ error: error.message ?? 'Email failed' }, { status: 502 })
  }

  await db
    .update(schema.quotes)
    .set({ emailedAt: new Date(), emailedTo: body.to, updatedAt: new Date() })
    .where(eq(schema.quotes.id, id))

  return NextResponse.json({ ok: true, emailId: data?.id, shareUrl })
}
