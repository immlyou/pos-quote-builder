import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import ExcelJS from 'exceljs'
import fs from 'node:fs/promises'
import path from 'node:path'
import type { ExportPayload, LineItem, QuoteEntity } from '@/types/quote'

export const runtime = 'nodejs'

// ─── helpers ────────────────────────────────────────────────────────────────

/** Find the first row where any cell value starts with the given prefix string. */
function findRowByPrefix(ws: ExcelJS.Worksheet, prefix: string): number | null {
  for (let r = 1; r <= ws.rowCount; r++) {
    const row = ws.getRow(r)
    for (let c = 1; c <= 15; c++) {
      const v = row.getCell(c).value
      if (typeof v === 'string' && v.trimStart().startsWith(prefix)) return r
    }
  }
  return null
}

/** Find the first row where any cell value exactly equals the given string. */
function findRowByExact(ws: ExcelJS.Worksheet, text: string): number | null {
  for (let r = 1; r <= ws.rowCount; r++) {
    const row = ws.getRow(r)
    for (let c = 1; c <= 15; c++) {
      const v = row.getCell(c).value
      if (typeof v === 'string' && v.trim() === text.trim()) return r
    }
  }
  return null
}

/** Return the column index (1-based) where cell value starts with prefix on a given row. */
function findColByPrefix(ws: ExcelJS.Worksheet, rowNum: number, prefix: string): number | null {
  const row = ws.getRow(rowNum)
  for (let c = 1; c <= 15; c++) {
    const v = row.getCell(c).value
    if (typeof v === 'string' && v.trimStart().startsWith(prefix)) return c
  }
  return null
}

/** Set a "Label: value" cell — keeps the prefix, replaces everything after ": " */
function setLabelCell(ws: ExcelJS.Worksheet, rowNum: number, colNum: number, newValue: string) {
  const cell = ws.getRow(rowNum).getCell(colNum)
  const current = typeof cell.value === 'string' ? cell.value : ''
  const colonIdx = current.indexOf(':')
  const prefix = colonIdx >= 0 ? current.slice(0, colonIdx + 1) : current
  cell.value = `${prefix} ${newValue}`
}

/**
 * Copy the styling from a source row to a target row for columns 1-15.
 * We copy font, fill, alignment, border, numFmt.
 */
function copyRowStyle(ws: ExcelJS.Worksheet, srcRowNum: number, dstRowNum: number) {
  const srcRow = ws.getRow(srcRowNum)
  const dstRow = ws.getRow(dstRowNum)
  for (let c = 1; c <= 15; c++) {
    const src = srcRow.getCell(c)
    const dst = dstRow.getCell(c)
    if (src.font) dst.font = { ...src.font }
    if (src.fill) dst.fill = JSON.parse(JSON.stringify(src.fill))
    if (src.alignment) dst.alignment = { ...src.alignment }
    if (src.border) dst.border = JSON.parse(JSON.stringify(src.border))
    if (src.numFmt) dst.numFmt = src.numFmt
  }
  if (srcRow.height) dstRow.height = srcRow.height
}

// ─── Grouped item building ───────────────────────────────────────────────────

interface FlatRow {
  itemNum: string | number
  model: string
  spec: string
  unitPrice: number | string
  qty: number
  isSectionHeader?: boolean
  sectionLabel?: string
}

function buildRows(lineItems: LineItem[]): FlatRow[] {
  const rows: FlatRow[] = []

  // Group: base models + their peripherals
  const baseItems = lineItems.filter((i) => i.category === 'Base Model' || i.category === 'Add-on Module' || i.category === 'Upgrade')
  const peripheralItems = lineItems.filter((i) => i.category === 'Peripheral')
  const licenseItems = lineItems.filter((i) => i.category === 'License')
  const otherItems = lineItems.filter((i) => i.category !== 'Base Model' && i.category !== 'Add-on Module' && i.category !== 'Upgrade' && i.category !== 'Peripheral' && i.category !== 'License')

  let mainItemNum = 1

  // Base models (Base Model category only get integer numbers; upgrades/add-ons get sub-rows)
  const baseModelItems = lineItems.filter((i) => i.category === 'Base Model')
  const upgradeItems = lineItems.filter((i) => i.category === 'Add-on Module' || i.category === 'Upgrade')

  for (const bm of baseModelItems) {
    rows.push({
      itemNum: mainItemNum,
      model: bm.pn || bm.description,
      spec: bm.description,
      unitPrice: bm.unitPrice,
      qty: bm.qty,
    })

    // Upgrades attached to this base model
    if (upgradeItems.length > 0) {
      let subNum = 1
      for (const u of upgradeItems) {
        rows.push({
          itemNum: `${mainItemNum}.${subNum}`,
          model: u.pn || '',
          spec: u.description,
          unitPrice: u.unitPrice,
          qty: u.qty,
        })
        subNum++
      }
    }

    mainItemNum++
  }

  // Peripherals section
  if (peripheralItems.length > 0) {
    rows.push({
      itemNum: '',
      model: '',
      spec: '',
      unitPrice: '',
      qty: 1,
      isSectionHeader: true,
      sectionLabel: 'General Peripherals',
    })
    for (const p of peripheralItems) {
      rows.push({
        itemNum: mainItemNum,
        model: p.pn || p.description,
        spec: p.description,
        unitPrice: p.unitPrice,
        qty: p.qty,
      })
      mainItemNum++
    }
  }

  // Licenses section
  if (licenseItems.length > 0) {
    rows.push({
      itemNum: '',
      model: '',
      spec: '',
      unitPrice: '',
      qty: 1,
      isSectionHeader: true,
      sectionLabel: 'Licenses',
    })
    for (const l of licenseItems) {
      rows.push({
        itemNum: mainItemNum,
        model: l.pn || l.description,
        spec: l.description,
        unitPrice: l.unitPrice,
        qty: l.qty,
      })
      mainItemNum++
    }
  }

  // Others section
  if (otherItems.length > 0) {
    rows.push({
      itemNum: '',
      model: '',
      spec: '',
      unitPrice: '',
      qty: 1,
      isSectionHeader: true,
      sectionLabel: 'Others',
    })
    for (const o of otherItems) {
      rows.push({
        itemNum: mainItemNum,
        model: o.pn || o.description,
        spec: o.description,
        unitPrice: o.unitPrice,
        qty: o.qty,
      })
      mainItemNum++
    }
  }

  return rows
}

// ─── Main handler ────────────────────────────────────────────────────────────

export async function POST(request: NextRequest) {
  const payload: ExportPayload = await request.json()
  const { profile, quoteMeta, lineItems, totals } = payload
  const entity: QuoteEntity = payload.entity ?? 'PTT'
  const includeInternalCosts = payload.includeInternalCosts ?? false

  // Load template
  const templatePath = path.join(process.cwd(), 'data', 'quote-template.xlsx')
  const templateBuffer = await fs.readFile(templatePath)
  const wb = new ExcelJS.Workbook()
  // ExcelJS expects an ArrayBuffer-like input; convert Node Buffer
  await wb.xlsx.load(
    templateBuffer.buffer.slice(
      templateBuffer.byteOffset,
      templateBuffer.byteOffset + templateBuffer.byteLength,
    ),
  )

  // Keep only the chosen entity sheet; remove others
  const sheetsToRemove = wb.worksheets
    .filter((s) => s.name !== entity)
    .map((s) => s.name)
  for (const name of sheetsToRemove) {
    wb.removeWorksheet(wb.getWorksheet(name)!.id)
  }

  const ws = wb.getWorksheet(entity)!

  // ── Fill header zone ────────────────────────────────────────────────────

  // Company Name row (A col)
  const companyNameRow = findRowByPrefix(ws, 'Company Name:')
  if (companyNameRow) {
    setLabelCell(ws, companyNameRow, findColByPrefix(ws, companyNameRow, 'Company Name:')!, quoteMeta.customer)

    // Date on same row (H col)
    const dateCol = findColByPrefix(ws, companyNameRow, 'Date:')
    if (dateCol) {
      // Date is actually split across two cells: H="Date: " I=formula
      // We'll set the I cell to the actual date string
      const iCell = ws.getRow(companyNameRow).getCell(dateCol + 1)
      iCell.value = quoteMeta.date
    }
  }

  // Customer Name row
  const customerNameRow = findRowByPrefix(ws, 'Customer Name:')
  if (customerNameRow) {
    const custCol = findColByPrefix(ws, customerNameRow, 'Customer Name:')
    if (custCol) setLabelCell(ws, customerNameRow, custCol, quoteMeta.customer)

    // Sales on same row
    const salesCol = findColByPrefix(ws, customerNameRow, 'Sales:')
    if (salesCol) setLabelCell(ws, customerNameRow, salesCol, quoteMeta.preparedBy)
  }

  // Phone row — left side is customer phone (we leave static label pattern, fill from profile)
  const phoneRow = findRowByPrefix(ws, 'Phone:')
  if (phoneRow) {
    const phoneCol = findColByPrefix(ws, phoneRow, 'Phone:')
    if (phoneCol) {
      const customerPhone = profile?.phone ?? ''
      setLabelCell(ws, phoneRow, phoneCol, customerPhone)
    }
    // H col "Phone: (02)2918-8500 Ext." is static — leave it
  }

  // Email row — left is customer email
  const emailRow = findRowByPrefix(ws, 'Email:')
  if (emailRow) {
    const emailCol = findColByPrefix(ws, emailRow, 'Email:')
    if (emailCol) {
      const customerEmail = profile?.email ?? ''
      setLabelCell(ws, emailRow, emailCol, customerEmail)
    }
    // H col "Fax:" is static — leave it
  }

  // Email Address (sales rep email) — H col
  const emailAddrRow = findRowByPrefix(ws, 'Email Address:')
  if (emailAddrRow) {
    const eaCol = findColByPrefix(ws, emailAddrRow, 'Email Address:')
    if (eaCol) setLabelCell(ws, emailAddrRow, eaCol, profile?.email ?? quoteMeta.preparedBy)
  }

  // ── Handle internal cost columns ─────────────────────────────────────────
  // K=cost, L=margin$, M=margin% — hide if not internal
  if (!includeInternalCosts) {
    ws.getColumn('K').hidden = true
    ws.getColumn('L').hidden = true
    ws.getColumn('M').hidden = true
  }

  // ── Logo handling ────────────────────────────────────────────────────────
  // Template ships with two header logos:
  //   - top-LEFT  (anchored ~A1)  : Partner Tech main logo
  //   - top-RIGHT (anchored ~H2)  : BenQ Group sub-logo
  // PTC sheet also has product images embedded mid-page (rows 16, 19).
  // We always strip mid-page product images, always keep both header logos,
  // and only replace the LEFT logo when the user supplied a custom one.
  try {
    type MediaEntry = {
      type?: string
      range?: { tl?: { nativeCol?: number; nativeRow?: number } }
    }
    const wsAny = ws as unknown as { _media?: MediaEntry[] }
    if (Array.isArray(wsAny._media)) {
      // Drop everything anchored at row >= 6 (product / mid-page images)
      const headerOnly = wsAny._media.filter(
        (m) => (m.range?.tl?.nativeRow ?? 0) < 6,
      )

      if (profile?.logoDataUrl) {
        // Remove the LEFT logo (smallest col) so user logo replaces it,
        // but keep the right BenQ logo
        let leftIdx = -1
        let minCol = Number.POSITIVE_INFINITY
        headerOnly.forEach((m, i) => {
          const c = m.range?.tl?.nativeCol ?? 99
          if (c < minCol) {
            minCol = c
            leftIdx = i
          }
        })
        if (leftIdx >= 0) headerOnly.splice(leftIdx, 1)
      }

      wsAny._media.length = 0
      wsAny._media.push(...headerOnly)
    }

    if (profile?.logoDataUrl) {
      const base64 = profile.logoDataUrl.split(',')[1]
      const ext = profile.logoDataUrl.startsWith('data:image/png') ? 'png' : 'jpeg'
      const imgId = wb.addImage({ base64, extension: ext })
      ws.addImage(imgId, {
        tl: { col: 0, row: 0 },
        ext: { width: 200, height: 70 },
      })
    }
  } catch {
    // ignore logo errors — template logos remain
  }

  // ── Find items header row + Remark anchor ────────────────────────────────
  const itemHeaderRow = findRowByExact(ws, 'Specification')
  if (!itemHeaderRow) {
    return new NextResponse('Template error: could not find Specification header', { status: 500 })
  }
  const remarkRow = findRowByPrefix(ws, 'Remark')
  if (!remarkRow) {
    return new NextResponse('Template error: could not find Remark row', { status: 500 })
  }
  const firstItemRow = itemHeaderRow + 1

  // ── Snapshot footer (Remark onwards): values + merges + heights ──────────
  type CellSnap = { col: number; value: ExcelJS.CellValue; font?: Partial<ExcelJS.Font>; alignment?: Partial<ExcelJS.Alignment>; numFmt?: string }
  type RowSnap = { offset: number; height?: number; cells: CellSnap[] }
  type MergeSnap = { offset: number; left: number; bottom: number; right: number }

  const colToNum = (s: string) => s.split('').reduce((a, c) => a * 26 + (c.charCodeAt(0) - 64), 0)
  const allMergeStrings = (ws.model.merges ?? []) as string[]
  const allMerges = allMergeStrings
    .map((m) => /^([A-Z]+)(\d+):([A-Z]+)(\d+)$/.exec(m))
    .filter((m): m is RegExpExecArray => !!m)
    .map((m) => ({
      left: colToNum(m[1]),
      top: parseInt(m[2], 10),
      right: colToNum(m[3]),
      bottom: parseInt(m[4], 10),
    }))

  const footerRowSnaps: RowSnap[] = []
  for (let r = remarkRow; r <= ws.rowCount; r++) {
    const row = ws.getRow(r)
    const snap: RowSnap = { offset: r - remarkRow, height: row.height, cells: [] }
    for (let c = 1; c <= 12; c++) {
      const cell = row.getCell(c)
      if (cell.value !== null && cell.value !== undefined && cell.value !== '') {
        snap.cells.push({
          col: c,
          value: cell.value,
          font: cell.font ? { ...cell.font } : undefined,
          alignment: cell.alignment ? { ...cell.alignment } : undefined,
          numFmt: cell.numFmt,
        })
      }
    }
    footerRowSnaps.push(snap)
  }
  const footerMergeSnaps: MergeSnap[] = allMerges
    .filter((m) => m.top >= remarkRow)
    .map((m) => ({ offset: m.top - remarkRow, left: m.left, bottom: m.bottom - remarkRow, right: m.right }))

  // ── Wipe everything from firstItemRow downwards (values + merges) ────────
  // Drop merges in/below items zone (keep header-area merges)
  const wsAny = ws as unknown as { _merges?: Record<string, { top: number }> }
  if (wsAny._merges) {
    for (const key of Object.keys(wsAny._merges)) {
      const m = wsAny._merges[key]
      if (m.top >= firstItemRow) delete wsAny._merges[key]
    }
  }
  // Clear cell values from items zone + footer
  for (let r = firstItemRow; r <= ws.rowCount; r++) {
    const row = ws.getRow(r)
    for (let c = 1; c <= 13; c++) {
      row.getCell(c).value = null
    }
  }

  // ── Write item rows ───────────────────────────────────────────────────────
  const flatRows = buildRows(lineItems)
  let cursor = firstItemRow

  for (const fr of flatRows) {
    const row = ws.getRow(cursor)

    if (fr.isSectionHeader) {
      row.getCell(1).value = fr.sectionLabel ?? ''
      row.getCell(1).font = { bold: true, name: 'Arial', size: 10 }
      row.getCell(1).fill = {
        type: 'pattern', pattern: 'solid',
        fgColor: { argb: 'FFD9D9D9' },
      }
      row.getCell(1).alignment = { vertical: 'middle', horizontal: 'left' }
      try { ws.mergeCells(cursor, 1, cursor, 10) } catch { /* ignore */ }
      row.height = 18
    } else {
      row.getCell(1).value = fr.itemNum
      row.getCell(1).font = { name: 'Arial', size: 10 }
      row.getCell(1).alignment = { vertical: 'top', horizontal: 'center' }

      row.getCell(2).value = fr.model
      row.getCell(2).font = { name: 'Arial', size: 10 }
      row.getCell(2).alignment = { vertical: 'top', horizontal: 'center', wrapText: true }

      row.getCell(4).value = fr.spec
      row.getCell(4).font = { name: 'Arial', size: 10 }
      row.getCell(4).alignment = { wrapText: true, vertical: 'top' }
      try { ws.mergeCells(cursor, 4, cursor, 9) } catch { /* ignore */ }

      const priceVal = typeof fr.unitPrice === 'number' ? fr.unitPrice : 0
      row.getCell(10).value = priceVal
      row.getCell(10).numFmt = '"USD"#,##0.00'
      row.getCell(10).font = { name: 'Arial', size: 10 }
      row.getCell(10).alignment = { vertical: 'top', horizontal: 'right' }

      const lineCount = (fr.spec.match(/\n/g) || []).length + 1
      row.height = Math.max(18, lineCount * 14)
    }
    row.commit()
    cursor++
  }

  // ── Total row (right after items) ────────────────────────────────────────
  {
    const row = ws.getRow(cursor)
    // Label spans D-I (where Specification is) so it sits next to the price
    row.getCell(4).value = 'TOTAL'
    row.getCell(4).font = { bold: true, name: 'Arial', size: 11 }
    row.getCell(4).alignment = { horizontal: 'right', vertical: 'middle' }
    try { ws.mergeCells(cursor, 4, cursor, 9) } catch { /* ignore */ }
    row.getCell(10).value = totals.grandTotal
    row.getCell(10).numFmt = '"USD"#,##0.00'
    row.getCell(10).font = { bold: true, name: 'Arial', size: 11 }
    row.getCell(10).alignment = { horizontal: 'right', vertical: 'middle' }
    row.height = 22
    row.commit()
    cursor++
  }

  // ── Replay footer (Remark + terms + signature block) ─────────────────────
  const footerStart = cursor
  for (const snap of footerRowSnaps) {
    const targetRow = footerStart + snap.offset
    const row = ws.getRow(targetRow)
    if (snap.height) row.height = snap.height
    for (const cs of snap.cells) {
      const cell = row.getCell(cs.col)
      cell.value = cs.value
      if (cs.font) cell.font = cs.font
      if (cs.alignment) cell.alignment = cs.alignment
      if (cs.numFmt) cell.numFmt = cs.numFmt
    }
    row.commit()
  }
  for (const m of footerMergeSnaps) {
    const top = footerStart + m.offset
    const bottom = footerStart + m.bottom
    try { ws.mergeCells(top, m.left, bottom, m.right) } catch { /* ignore */ }
  }

  // ── Write buffer ──────────────────────────────────────────────────────────
  const buf = await wb.xlsx.writeBuffer()
  return new NextResponse(buf, {
    headers: {
      'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition': `attachment; filename="quote-${quoteMeta.quoteNumber}.xlsx"`,
    },
  })
}
