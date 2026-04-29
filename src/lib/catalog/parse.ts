import ExcelJS from 'exceljs'
import type {
  Catalog,
  Model,
  Optionals,
  Peripheral,
  License,
  M10Item,
  KdsItem,
  StandItem,
  IoBoxItem,
  PaymentBracket,
  IotItem,
  BaseOption,
  Upgrade,
  PricingTier,
} from '@/types/catalog'

type CellRaw = ExcelJS.CellValue

function cellValue(c: CellRaw): string | number | boolean | null {
  if (c === null || c === undefined) return null
  if (typeof c === 'string') {
    const s = c.replace(/^\t/, '').trim()
    return s || null
  }
  if (typeof c === 'number' || typeof c === 'boolean') return c
  if (c instanceof Date) return null
  if (typeof c === 'object') {
    // formula result
    if ('result' in c && c.result !== undefined) return cellValue(c.result as CellRaw)
    // rich text
    if ('richText' in c && Array.isArray(c.richText)) {
      const joined = c.richText.map((r: { text: string }) => r.text).join('').replace(/^\t/, '').trim()
      return joined || null
    }
    // hyperlink
    if ('text' in c && typeof (c as { text: unknown }).text === 'string') {
      const t = ((c as { text: string }).text).replace(/^\t/, '').trim()
      return t || null
    }
  }
  return null
}

function cell(v: CellRaw): string | number | boolean | null {
  return cellValue(v)
}

function num(v: CellRaw): number | null {
  const val = cell(v)
  if (val === null) return null
  if (typeof val === 'number') return val
  if (typeof val === 'boolean') return null
  const s = val.replace(/,/g, '').replace(/\$/g, '').trim()
  const lower = s.toLowerCase()
  if (lower === 'na' || lower === 'n/a' || lower === 'tbd' || lower === '') return null
  const m = s.match(/-?\d+(?:\.\d+)?/)
  if (m) {
    const n = parseFloat(m[0])
    return isNaN(n) ? null : n
  }
  return null
}

function parseMoqString(s: CellRaw): PricingTier[] | null {
  if (s === null || s === undefined) return null
  const raw = cell(s)
  if (raw === null) return null
  if (typeof raw === 'number') return [{ min_qty: 1, price: raw }]
  if (typeof raw === 'boolean') return null
  const str = String(raw)
  const tiers: PricingTier[] = []
  for (const rawLine of str.split(/[\n;]/)) {
    const line = rawLine.trim()
    if (!line) continue
    let m = line.match(/(?:MOQ\s*)?(\d+)\s*(?:~\s*\d+)?\s*pcs?[\s:]*\$?\s*(-?\d+(?:\.\d+)?)/i)
    if (m) {
      tiers.push({ min_qty: parseInt(m[1], 10), price: parseFloat(m[2]) })
      continue
    }
    m = line.match(/>=\s*(\d+)\s*pcs?\s*[:$]\s*(-?\d+(?:\.\d+)?)/i)
    if (m) {
      tiers.push({ min_qty: parseInt(m[1], 10), price: parseFloat(m[2]) })
    }
  }
  if (tiers.length === 0) {
    const n = num(str)
    if (n !== null) return [{ min_qty: 1, price: n }]
    return null
  }
  tiers.sort((a, b) => a.min_qty - b.min_qty)
  return tiers
}

function looksPriced(v: CellRaw): boolean {
  if (v === null || v === undefined) return false
  const raw = cell(v)
  if (raw === null) return false
  if (typeof raw === 'number') return true
  const s = String(raw)
  return /\d/.test(s) && !s.includes('Peripherals')
}

function deriveSeries(terminal: string | null): string | null {
  if (!terminal) return null
  const t = terminal.toUpperCase()
  if (t.startsWith('A4') || t.startsWith('A5') || t.startsWith('A7') || t.startsWith('V5') || t.startsWith('E5')) return 'A_E'
  if (t.startsWith('G4') || t.startsWith('G5')) return 'G'
  if (t.startsWith('J14')) return 'J14'
  if (t.startsWith('C10') || t.startsWith('C14')) return 'C'
  if (t.startsWith('AUDREY') || t.startsWith('AD')) return 'AUDREY2'
  if (t.includes('ALFA') || t.startsWith('BW') || t.startsWith('BOX')) return 'BOX_ALFA'
  if (t.startsWith('M10')) return 'M10'
  return null
}

function getCell(sheet: ExcelJS.Worksheet, row: number, col: number): CellRaw {
  return sheet.getRow(row).getCell(col).value
}

function rowLength(sheet: ExcelJS.Worksheet, row: number): number {
  return sheet.getRow(row).cellCount
}

function parseModels(sheet: ExcelJS.Worksheet): Model[] {
  const out: Model[] = []
  // Python range(3, len(df)) => excel rows 4..rowCount
  for (let i = 4; i <= sheet.rowCount; i++) {
    const terminal = cell(getCell(sheet, i, 1))  // col 0 => excel col 1
    if (!terminal || typeof terminal !== 'string') continue
    const platform = cell(getCell(sheet, i, 2))   // col 1 => excel col 2
    if (!platform) continue
    out.push({
      id: `${terminal}__${platform}__${i - 1}`.replace(/ /g, '_'),  // i-1 = python index
      terminal,
      platform: String(platform),
      size: cell(getCell(sheet, i, 3)) as string | null,             // col 2
      pcb_version: cell(getCell(sheet, i, 4)) as string | null,      // col 3
      ddr4_ram: cell(getCell(sheet, i, 5)) as string | null,         // col 4
      ddr5_ram: cell(getCell(sheet, i, 6)) as string | null,         // col 5
      storage: cell(getCell(sheet, i, 7)) as string | null,          // col 6
      adaptor: cell(getCell(sheet, i, 8)) as string | null,          // col 7
      base: cell(getCell(sheet, i, 9)) as string | null,             // col 8
      cpu_itp: num(getCell(sheet, i, 10)),                           // col 9
      ram_itp: num(getCell(sheet, i, 11)),                           // col 10
      ssd_itp: num(getCell(sheet, i, 12)),                           // col 11
      itp_no_ram_ssd: num(getCell(sheet, i, 13)),                    // col 12
      itp: num(getCell(sheet, i, 14)),                               // col 13
      remark: rowLength(sheet, i) > 14 ? cell(getCell(sheet, i, 15)) as string | null : null,  // col 14
      series: deriveSeries(terminal) ?? '',
    })
  }
  return out
}

function parseOptionals(sheet: ExcelJS.Worksheet): Optionals {
  const base_options: BaseOption[] = []
  const upgrades: Upgrade[] = []
  // Python range(2, len(df)) => excel rows 3..rowCount
  for (let i = 3; i <= sheet.rowCount; i++) {
    // left block: python cols 1-5 => excel cols 2-6
    const opt = cell(getCell(sheet, i, 2))    // col 1
    const desc = cell(getCell(sheet, i, 3))   // col 2
    const size = cell(getCell(sheet, i, 4))   // col 3
    const itp = num(getCell(sheet, i, 5))     // col 4
    if (opt && (desc || size)) {
      base_options.push({
        type: String(opt),
        description: desc !== null ? String(desc) : '',
        size: size as string | null,
        itp,
        remark: rowLength(sheet, i) > 5 ? cell(getCell(sheet, i, 6)) as string | null : null,  // col 5
      })
    }
    // right block: python cols 7-9 => excel cols 8-10
    if (rowLength(sheet, i) > 7) {
      const up_desc = cell(getCell(sheet, i, 8))   // col 7
      const up_itp = num(getCell(sheet, i, 9))     // col 8
      if (up_desc && up_itp !== null) {
        upgrades.push({
          description: String(up_desc),
          itp_adder: up_itp,
          remark: rowLength(sheet, i) > 9 ? cell(getCell(sheet, i, 10)) as string | null : null,  // col 9
        })
      }
    }
  }
  return { base_options, upgrades }
}

function parsePeripherals(
  sheet: ExcelJS.Worksheet,
  series: string,
  pnCol = 1,    // python 0-indexed
  descCol = 2,
  priceCol = 3,
  remarkCol = 4
): Peripheral[] {
  const out: Peripheral[] = []
  let current_group: string | null = null
  // Python range(len(df)) => excel rows 1..rowCount
  for (let i = 1; i <= sheet.rowCount; i++) {
    const pn = cell(getCell(sheet, i, pnCol + 1))
    const desc = cell(getCell(sheet, i, descCol + 1))
    const price_raw = getCell(sheet, i, priceCol + 1)
    const priceCell = cell(price_raw)
    const remark = cell(getCell(sheet, i, remarkCol + 1))

    if (!pn && !desc && !priceCell) continue

    const pnStr = pn !== null ? String(pn).toLowerCase() : ''
    const is_header =
      (!pn || pnStr === 'date:' || pnStr === 'p/n' || pnStr === 'model') &&
      !looksPriced(price_raw)

    if (is_header && desc) {
      const txt = String(desc)
      if (
        txt.includes('Peripherals') ||
        txt.includes('Stand') ||
        txt.includes('Adapter') ||
        txt.includes('Scanner') ||
        txt.includes('Connection') ||
        txt.includes('By MOQ') ||
        txt.includes('RAID')
      ) {
        current_group = txt.trim()
      } else if (!priceCell) {
        current_group = txt.trim()
      }
      continue
    }

    const pricing = priceCell !== null ? parseMoqString(price_raw) : null
    if (!pn && !desc) continue
    out.push({
      series,
      group: current_group,
      pn: pn !== null ? String(pn) : null,
      description: desc as string | null,
      pricing,
      remark: remark as string | null,
    })
  }
  return out
}

function parseLicense(sheet: ExcelJS.Worksheet): License[] {
  const out: License[] = []
  // Python range(3, len(df)) => excel rows 4..rowCount
  for (let i = 4; i <= sheet.rowCount; i++) {
    const desc = cell(getCell(sheet, i, 2))   // col 1
    const pn = cell(getCell(sheet, i, 3))     // col 2
    const itp = num(getCell(sheet, i, 4))     // col 3
    if (!desc || itp === null) continue
    out.push({
      category: (cell(getCell(sheet, i, 1)) as string | null) ?? 'OS',  // col 0
      description: String(desc),
      pn: pn !== null ? String(pn) : null,
      itp,
      remark: rowLength(sheet, i) > 4 ? cell(getCell(sheet, i, 5)) as string | null : null,  // col 4
    })
  }
  return out
}

function parseM10(sheet: ExcelJS.Worksheet): M10Item[] {
  const out: M10Item[] = []
  // Python range(5, len(df)) => excel rows 6..rowCount
  for (let i = 6; i <= sheet.rowCount; i++) {
    const model = cell(getCell(sheet, i, 1))   // col 0
    const desc = cell(getCell(sheet, i, 2))    // col 1
    const pn = cell(getCell(sheet, i, 3))      // col 2
    const price_raw = getCell(sheet, i, 4)     // col 3
    const remark = rowLength(sheet, i) > 4 ? cell(getCell(sheet, i, 5)) as string | null : null  // col 4
    if (!desc) continue
    const pricing = parseMoqString(price_raw)
    if (!pricing && !pn) continue
    out.push({
      model: model !== null ? String(model) : '',
      description: desc as string | null,
      pn: pn !== null ? String(pn) : null,
      pricing,
      remark,
    })
  }
  return out
}

function parseKds(sheet: ExcelJS.Worksheet): KdsItem[] {
  const out: KdsItem[] = []
  // Python range(4, 6) => excel rows 5 and 6
  for (let i = 5; i <= 6; i++) {
    const item = cell(getCell(sheet, i, 1))   // col 0
    if (!item) continue
    out.push({
      item: String(item),
      pricing: [
        { min_qty: 1,  price: num(getCell(sheet, i, 2)) ?? 0 },   // col 1
        { min_qty: 5,  price: num(getCell(sheet, i, 3)) ?? 0 },   // col 2
        { min_qty: 10, price: num(getCell(sheet, i, 4)) ?? 0 },   // col 3
        { min_qty: 25, price: num(getCell(sheet, i, 5)) ?? 0 },   // col 4
      ],
      remark: null,
    })
  }
  return out
}

function parseStands(sheet: ExcelJS.Worksheet): StandItem[] {
  const out: StandItem[] = []
  // Python range(6, len(df)) => excel rows 7..rowCount
  for (let i = 7; i <= sheet.rowCount; i++) {
    // python: desc = cell(row[2]) or cell(row[1]) => excel col 3 or col 2
    const desc = cell(getCell(sheet, i, 3)) ?? cell(getCell(sheet, i, 2))
    if (!desc) continue
    const prices: PricingTier[] = []
    // python cols 3-7 => excel cols 4-8, qtys 1,5,10,30,50
    const colQty: [number, number][] = [[4, 1], [5, 5], [6, 10], [7, 30], [8, 50]]
    for (const [col, qty] of colQty) {
      const p = num(getCell(sheet, i, col))
      if (p !== null) prices.push({ min_qty: qty, price: p })
    }
    if (prices.length === 0) continue
    out.push({ description: desc as string | null, pricing: prices, remark: null })
  }
  return out
}

function parseIoBox(sheet: ExcelJS.Worksheet): IoBoxItem[] {
  const out: IoBoxItem[] = []
  // Python range(4, len(df)) => excel rows 5..rowCount
  for (let i = 5; i <= sheet.rowCount; i++) {
    const desc = cell(getCell(sheet, i, 3))   // col 2
    const pn = cell(getCell(sheet, i, 4))     // col 3
    const itp = num(getCell(sheet, i, 5))     // col 4
    if (!desc || itp === null) continue
    out.push({
      category: cell(getCell(sheet, i, 2)) as string | null,   // col 1
      description: desc as string | null,
      pn: pn !== null ? String(pn) : null,
      itp,
      remark: rowLength(sheet, i) > 5 ? cell(getCell(sheet, i, 6)) as string | null : null,  // col 5
    })
  }
  return out
}

function parsePtu(sheet: ExcelJS.Worksheet): PaymentBracket[] {
  const out: PaymentBracket[] = []
  // Python range(len(df)) => excel rows 1..rowCount
  for (let i = 1; i <= sheet.rowCount; i++) {
    const pn = cell(getCell(sheet, i, 1))    // col 0
    const desc = cell(getCell(sheet, i, 2))  // col 1
    if (!pn || !desc || String(pn).includes('P/N')) continue
    const prices: PricingTier[] = []
    // python cols 2-6 => excel cols 3-7, qtys 1,10,30,50,100
    const colQty: [number, number][] = [[3, 1], [4, 10], [5, 30], [6, 50], [7, 100]]
    for (const [col, qty] of colQty) {
      const p = num(getCell(sheet, i, col))
      if (p !== null) prices.push({ min_qty: qty, price: p })
    }
    if (prices.length === 0) continue
    out.push({ pn: String(pn), description: desc as string | null, pricing: prices, remark: null })
  }
  return out
}

function parseIot(sheet: ExcelJS.Worksheet): IotItem[] {
  const out: IotItem[] = []
  let current_cat: string | null = null
  // Python range(8, len(df)) => excel rows 9..rowCount
  for (let i = 9; i <= sheet.rowCount; i++) {
    const cat = cell(getCell(sheet, i, 1))   // col 0
    if (cat) current_cat = String(cat)
    const model = cell(getCell(sheet, i, 2)) // col 1
    const desc = cell(getCell(sheet, i, 3))  // col 2
    const pn = cell(getCell(sheet, i, 4))    // col 3
    const itp = num(getCell(sheet, i, 5))    // col 4
    const remark = rowLength(sheet, i) > 5 ? cell(getCell(sheet, i, 6)) as string | null : null  // col 5
    if (!desc && !model) continue
    if (itp === null) continue
    out.push({
      category: current_cat,
      model: model as string | null,
      description: desc as string | null,
      pn: pn !== null ? String(pn) : null,
      itp,
      remark,
    })
  }
  return out
}

export async function parseCatalog(
  buffer: ArrayBuffer | Uint8Array,
  sourceFile?: string
): Promise<Catalog> {
  const wb = new ExcelJS.Workbook()
  const bytes = buffer instanceof ArrayBuffer ? new Uint8Array(buffer) : buffer
  // exceljs types expect legacy Buffer; cast needed with @types/node >=22
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  await wb.xlsx.load(Buffer.from(bytes) as any)

  const sheetNames = wb.worksheets.map(w => w.name)

  function getSheet(name: string): ExcelJS.Worksheet {
    const s = wb.getWorksheet(name)
    if (!s) throw new Error(`Sheet not found: ${name}`)
    return s
  }

  const peripheralSheets: [string, string][] = [
    ['A E Series Peripherals', 'A_E'],
    ['G Series Peripherals', 'G'],
    ['Audrey-2 Peripherals', 'AUDREY2'],
    ['J14 Peripherals', 'J14'],
    ['C Series Peripherals', 'C'],
    ['BOX PC Alfa Peripherals', 'BOX_ALFA'],
  ]

  const peripherals: Peripheral[] = []
  for (const [name, series] of peripheralSheets) {
    const s = wb.getWorksheet(name)
    if (s) peripherals.push(...parsePeripherals(s, series))
  }

  return {
    meta: {
      source_file: sourceFile ?? '',
      sheets: sheetNames,
    },
    models: parseModels(getSheet('Windows POS & Box PC ITP')),
    optionals: parseOptionals(getSheet('Optionals')),
    peripherals,
    licenses: parseLicense(getSheet('License')),
    m10: parseM10(getSheet('M10')),
    kds: parseKds(getSheet('KDS A5 & A7 Steam Proof')),
    stands: parseStands(getSheet('PS-103.107 Stand')),
    io_box: parseIoBox(getSheet('External IO BOX')),
    payment_brackets: parsePtu(getSheet('Payment Brackets (PTU)')),
    iot: parseIot(getSheet('IoT (Partner brand)')),
  }
}
