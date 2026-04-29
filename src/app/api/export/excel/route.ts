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
  costPrice?: number
  marginAmount?: number
  marginPercent?: number
  isSectionHeader?: boolean
  sectionLabel?: string
}

function buildRows(lineItems: LineItem[]): FlatRow[] {
  const rows: FlatRow[] = []

  const baseModelItems = lineItems.filter((i) => i.category === 'Base Model')
  const upgradeItems = lineItems.filter((i) => i.category === 'Add-on Module' || i.category === 'Upgrade')
  const peripheralItems = lineItems.filter((i) => i.category === 'Peripheral')
  const licenseItems = lineItems.filter((i) => i.category === 'License')
  const otherItems = lineItems.filter(
    (i) => i.category !== 'Base Model' && i.category !== 'Add-on Module' && i.category !== 'Upgrade' && i.category !== 'Peripheral' && i.category !== 'License'
  )

  let mainItemNum = 1

  for (const bm of baseModelItems) {
    rows.push({
      itemNum: mainItemNum,
      model: bm.pn || bm.description,
      spec: bm.description,
      unitPrice: bm.unitPrice,
      qty: bm.qty,
      costPrice: bm.costPrice,
      marginAmount: bm.marginAmount,
      marginPercent: bm.marginPercent,
    })

    if (upgradeItems.length > 0) {
      let subNum = 1
      for (const u of upgradeItems) {
        rows.push({
          itemNum: `${mainItemNum}.${subNum}`,
          model: u.pn || '',
          spec: u.description,
          unitPrice: u.unitPrice,
          qty: u.qty,
          costPrice: u.costPrice,
          marginAmount: u.marginAmount,
          marginPercent: u.marginPercent,
        })
        subNum++
      }
    }

    mainItemNum++
  }

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
        costPrice: p.costPrice,
        marginAmount: p.marginAmount,
        marginPercent: p.marginPercent,
      })
      mainItemNum++
    }
  }

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
        costPrice: l.costPrice,
        marginAmount: l.marginAmount,
        marginPercent: l.marginPercent,
      })
      mainItemNum++
    }
  }

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
        costPrice: o.costPrice,
        marginAmount: o.marginAmount,
        marginPercent: o.marginPercent,
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

  // Derive cost/margin totals with backwards-compat fallback
  const customerTotal = totals.customerTotal ?? totals.grandTotal ?? 0
  const costTotal = totals.costTotal ?? customerTotal
  const marginTotal = totals.marginTotal ?? (customerTotal - costTotal)
  const marginPercentAvg = totals.marginPercentAvg ?? (costTotal > 0 ? (customerTotal / costTotal - 1) * 100 : 0)

  // Load template
  const templatePath = path.join(process.cwd(), 'data', 'quote-template.xlsx')
  const templateBuffer = await fs.readFile(templatePath)
  const wb = new ExcelJS.Workbook()
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

  const companyNameRow = findRowByPrefix(ws, 'Company Name:')
  if (companyNameRow) {
    setLabelCell(ws, companyNameRow, findColByPrefix(ws, companyNameRow, 'Company Name:')!, quoteMeta.customer)

    const dateCol = findColByPrefix(ws, companyNameRow, 'Date:')
    if (dateCol) {
      const iCell = ws.getRow(companyNameRow).getCell(dateCol + 1)
      iCell.value = quoteMeta.date
    }
  }

  const customerNameRow = findRowByPrefix(ws, 'Customer Name:')
  if (customerNameRow) {
    const custCol = findColByPrefix(ws, customerNameRow, 'Customer Name:')
    if (custCol) setLabelCell(ws, customerNameRow, custCol, quoteMeta.customer)

    const salesCol = findColByPrefix(ws, customerNameRow, 'Sales:')
    if (salesCol) setLabelCell(ws, customerNameRow, salesCol, quoteMeta.preparedBy)
  }

  const phoneRow = findRowByPrefix(ws, 'Phone:')
  if (phoneRow) {
    const phoneCol = findColByPrefix(ws, phoneRow, 'Phone:')
    if (phoneCol) {
      const customerPhone = profile?.phone ?? ''
      setLabelCell(ws, phoneRow, phoneCol, customerPhone)
    }
  }

  const emailRow = findRowByPrefix(ws, 'Email:')
  if (emailRow) {
    const emailCol = findColByPrefix(ws, emailRow, 'Email:')
    if (emailCol) {
      const customerEmail = profile?.email ?? ''
      setLabelCell(ws, emailRow, emailCol, customerEmail)
    }
  }

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
  } else {
    ws.getColumn('K').hidden = false
    ws.getColumn('L').hidden = false
    ws.getColumn('M').hidden = false
  }

  // ── Logo handling ────────────────────────────────────────────────────────
  try {
    type MediaEntry = {
      type?: string
      range?: { tl?: { nativeCol?: number; nativeRow?: number } }
    }
    const wsAny = ws as unknown as { _media?: MediaEntry[] }
    if (Array.isArray(wsAny._media)) {
      const headerOnly = wsAny._media.filter(
        (m) => (m.range?.tl?.nativeRow ?? 0) < 6,
      )

      if (profile?.logoDataUrl) {
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

  // ── Write internal cost headers if needed ───────────────────────────────
  if (includeInternalCosts) {
    const headerRow = ws.getRow(itemHeaderRow)
    headerRow.getCell(11).value = 'Cost'
    headerRow.getCell(11).font = { bold: true, name: 'Arial', size: 10 }
    headerRow.getCell(11).alignment = { horizontal: 'right', vertical: 'middle' }
    headerRow.getCell(12).value = 'Margin $'
    headerRow.getCell(12).font = { bold: true, name: 'Arial', size: 10 }
    headerRow.getCell(12).alignment = { horizontal: 'right', vertical: 'middle' }
    headerRow.getCell(13).value = 'Margin %'
    headerRow.getCell(13).font = { bold: true, name: 'Arial', size: 10 }
    headerRow.getCell(13).alignment = { horizontal: 'right', vertical: 'middle' }
    headerRow.commit()
  }

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
  // ExcelJS stores live merges in ws._merges: Record<string, {model:{top,left,bottom,right}}>.
  // The key is the top-left cell address (e.g. "A21"). We need to unmerge by full range string.
  {
    type MergeEntry = { model: { top: number; left: number; bottom: number; right: number } }
    const wsInternal = ws as unknown as { _merges?: Record<string, MergeEntry> }
    const mergesMap = wsInternal._merges
    const toUnmerge: string[] = []
    if (mergesMap) {
      for (const [, entry] of Object.entries(mergesMap)) {
        const m = entry?.model
        if (m && m.top >= firstItemRow) {
          // Build the full range string: e.g. "A21:J21"
          const numToCol = (n: number) => {
            let s = ''
            while (n > 0) { s = String.fromCharCode(64 + (n % 26 || 26)) + s; n = Math.floor((n - 1) / 26) }
            return s
          }
          toUnmerge.push(`${numToCol(m.left)}${m.top}:${numToCol(m.right)}${m.bottom}`)
        }
      }
    }
    for (const range of toUnmerge) {
      try { ws.unMergeCells(range) } catch { /* ignore */ }
    }
  }
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

      // Internal cost columns
      if (includeInternalCosts) {
        const costVal = fr.costPrice ?? 0
        row.getCell(11).value = costVal
        row.getCell(11).numFmt = '"USD"#,##0.00'
        row.getCell(11).font = { name: 'Arial', size: 10 }
        row.getCell(11).alignment = { vertical: 'top', horizontal: 'right' }

        const marginAmt = fr.marginAmount ?? 0
        row.getCell(12).value = marginAmt
        row.getCell(12).numFmt = '"USD"#,##0.00'
        row.getCell(12).font = { name: 'Arial', size: 10 }
        row.getCell(12).alignment = { vertical: 'top', horizontal: 'right' }

        const marginPct = fr.marginPercent ?? 0
        row.getCell(13).value = marginPct / 100
        row.getCell(13).numFmt = '0.0%'
        row.getCell(13).font = { name: 'Arial', size: 10 }
        row.getCell(13).alignment = { vertical: 'top', horizontal: 'right' }
      }

      const lineCount = (fr.spec.match(/\n/g) || []).length + 1
      row.height = Math.max(18, lineCount * 14)
    }
    row.commit()
    cursor++
  }

  // ── Total row (right after items) ────────────────────────────────────────
  {
    const row = ws.getRow(cursor)
    row.getCell(4).value = 'TOTAL'
    row.getCell(4).font = { bold: true, name: 'Arial', size: 11 }
    row.getCell(4).alignment = { horizontal: 'right', vertical: 'middle' }
    try { ws.mergeCells(cursor, 4, cursor, 9) } catch { /* ignore */ }
    row.getCell(10).value = customerTotal
    row.getCell(10).numFmt = '"USD"#,##0.00'
    row.getCell(10).font = { bold: true, name: 'Arial', size: 11 }
    row.getCell(10).alignment = { horizontal: 'right', vertical: 'middle' }
    row.height = 22
    row.commit()
    cursor++
  }

  // ── Margin Summary block (internal mode only) ─────────────────────────────
  if (includeInternalCosts) {
    // Header row
    {
      const row = ws.getRow(cursor)
      row.getCell(1).value = '📊 Margin Summary'
      row.getCell(1).font = { bold: true, name: 'Arial', size: 10 }
      row.getCell(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE8F0FE' } }
      row.getCell(1).alignment = { horizontal: 'left', vertical: 'middle' }
      try { ws.mergeCells(cursor, 1, cursor, 10) } catch { /* ignore */ }
      row.height = 20
      row.commit()
      cursor++
    }

    // 4 summary rows: label in D-I, value in J
    const summaryRows: Array<{ label: string; value: number; isPercent?: boolean }> = [
      { label: '客戶總價 / Customer Total', value: customerTotal },
      { label: 'ITP 成本 / ITP Cost', value: costTotal },
      { label: '毛利金額 / Margin $', value: marginTotal },
      { label: '平均毛利率 / Avg Margin %', value: marginPercentAvg / 100, isPercent: true },
    ]

    for (const sr of summaryRows) {
      const row = ws.getRow(cursor)
      // Write label to col D without merging (avoids conflicts with template merges)
      row.getCell(4).value = sr.label
      row.getCell(4).font = { name: 'Arial', size: 10 }
      row.getCell(4).alignment = { horizontal: 'right', vertical: 'middle' }

      row.getCell(10).value = sr.value
      row.getCell(10).numFmt = sr.isPercent ? '0.0%' : '"USD"#,##0.00'
      row.getCell(10).font = { name: 'Arial', size: 10 }
      row.getCell(10).alignment = { horizontal: 'right', vertical: 'middle' }
      row.height = 18
      row.commit()
      cursor++
    }
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
