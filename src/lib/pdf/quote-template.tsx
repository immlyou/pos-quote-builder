import {
  Document,
  Page,
  Text,
  View,
  StyleSheet,
  Image,
} from '@react-pdf/renderer'
import type { ExportPayload, QuoteEntity } from '@/types/quote'
import { getTerms } from './quote-terms'

const DARK = '#1A1A1A'
const SUBTLE = '#6B7280'
const BORDER = '#E5E7EB'
const HEADER_BG = '#F2F2F2'
const SECTION_BG = '#D9D9D9'
const TEXT = '#111827'

const styles = StyleSheet.create({
  page: {
    fontFamily: 'Helvetica',
    fontSize: 9,
    paddingTop: 28,
    paddingBottom: 48,
    paddingHorizontal: 32,
    color: TEXT,
  },
  // Top logo + title band
  topBand: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  logo: { width: 120, height: 50, objectFit: 'contain' },
  logoRight: { width: 50, height: 70, objectFit: 'contain' },
  topCenter: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  bigTitle: {
    fontSize: 26,
    fontFamily: 'Helvetica-Bold',
    color: DARK,
    letterSpacing: 2,
  },
  // Info grid (two-column header)
  infoGrid: {
    flexDirection: 'row',
    borderTopWidth: 1,
    borderTopColor: BORDER,
    borderBottomWidth: 1,
    borderBottomColor: BORDER,
    paddingVertical: 6,
    marginBottom: 8,
    gap: 16,
  },
  infoLeft: { flex: 1 },
  infoRight: { flex: 1 },
  infoRow: {
    flexDirection: 'row',
    marginBottom: 2,
  },
  infoLabel: {
    width: 90,
    fontSize: 8,
    color: SUBTLE,
    fontFamily: 'Helvetica-Bold',
  },
  infoValue: {
    flex: 1,
    fontSize: 8,
    color: TEXT,
  },
  // Items table
  tableWrap: { marginBottom: 8 },
  tableHeaderRow: {
    flexDirection: 'row',
    backgroundColor: HEADER_BG,
    paddingVertical: 4,
    paddingHorizontal: 3,
    borderTopWidth: 0.5,
    borderTopColor: '#999',
    borderBottomWidth: 0.5,
    borderBottomColor: '#999',
  },
  tableHeaderCell: {
    fontSize: 8,
    fontFamily: 'Helvetica-Bold',
    color: DARK,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    backgroundColor: SECTION_BG,
    paddingVertical: 3,
    paddingHorizontal: 3,
  },
  sectionHeaderText: {
    fontSize: 8,
    fontFamily: 'Helvetica-Bold',
    color: DARK,
  },
  tableRow: {
    flexDirection: 'row',
    paddingVertical: 3,
    paddingHorizontal: 3,
    borderBottomWidth: 0.3,
    borderBottomColor: BORDER,
  },
  cell: { fontSize: 8, color: TEXT },
  cellRight: { fontSize: 8, color: TEXT, textAlign: 'right' },
  // Column widths
  colItem: { width: '5%' },
  colModel: { width: '12%' },
  colSpec: { width: '55%' },
  colPrice: { width: '13%', textAlign: 'right' },
  colCost: { width: '8%', textAlign: 'right' },
  colMargin: { width: '7%', textAlign: 'right' },
  // Total row
  totalBlock: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginTop: 4,
    marginBottom: 10,
    paddingTop: 4,
    borderTopWidth: 0.5,
    borderTopColor: DARK,
  },
  totalLabel: {
    fontSize: 10,
    fontFamily: 'Helvetica-Bold',
    color: DARK,
    marginRight: 10,
  },
  totalValue: {
    fontSize: 10,
    fontFamily: 'Helvetica-Bold',
    color: DARK,
    width: 80,
    textAlign: 'right',
  },
  // Remarks
  remarkTitle: {
    fontSize: 9,
    fontFamily: 'Helvetica-Bold',
    color: DARK,
    marginBottom: 4,
  },
  termItem: {
    fontSize: 7.5,
    color: SUBTLE,
    marginBottom: 2,
    lineHeight: 1.4,
  },
  // Signature / confirmation
  confirmRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 20,
    gap: 32,
  },
  confirmBlock: { flex: 1 },
  confirmLabel: {
    fontSize: 8,
    fontFamily: 'Helvetica-Bold',
    color: DARK,
    marginBottom: 16,
  },
  confirmLine: {
    borderTopWidth: 0.5,
    borderTopColor: TEXT,
    paddingTop: 3,
    fontSize: 7,
    color: SUBTLE,
  },
  // Footer
  footer: {
    position: 'absolute',
    bottom: 20,
    left: 32,
    right: 32,
    flexDirection: 'row',
    justifyContent: 'space-between',
    borderTopWidth: 0.3,
    borderTopColor: BORDER,
    paddingTop: 4,
  },
  footerText: { fontSize: 6.5, color: '#9CA3AF' },
})

function fmt(n: number): string {
  return `USD ${n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

interface Props {
  payload: ExportPayload & {
    expiresAt?: string | null
    terms?: string[]
    templateLeftLogo?: string | null
    templateRightLogo?: string | null
  }
}

export function QuotePDF({ payload }: Props) {
  const { profile, quoteMeta, lineItems, totals } = payload
  const entity: QuoteEntity = payload.entity ?? 'PTT'
  const includeInternalCosts = payload.includeInternalCosts ?? false
  const terms = payload.terms?.length ? payload.terms : getTerms(entity)

  // Build flat display rows
  type DisplayRow =
    | { kind: 'header' }
    | { kind: 'section'; label: string }
    | { kind: 'item'; itemNum: string | number; model: string; spec: string; unitPrice: number }

  const displayRows: DisplayRow[] = []

  const baseItems = lineItems.filter((i) => i.category === 'Base Model')
  const upgradeItems = lineItems.filter((i) => i.category === 'Add-on Module' || i.category === 'Upgrade')
  const peripheralItems = lineItems.filter((i) => i.category === 'Peripheral')
  const licenseItems = lineItems.filter((i) => i.category === 'License')
  const otherItems = lineItems.filter((i) =>
    !['Base Model', 'Add-on Module', 'Upgrade', 'Peripheral', 'License'].includes(i.category)
  )

  let itemNum = 1

  for (const bm of baseItems) {
    displayRows.push({ kind: 'item', itemNum, model: bm.pn || bm.description, spec: bm.description, unitPrice: bm.unitPrice })
    if (upgradeItems.length > 0) {
      let sub = 1
      for (const u of upgradeItems) {
        displayRows.push({ kind: 'item', itemNum: `${itemNum}.${sub}`, model: u.pn || '', spec: u.description, unitPrice: u.unitPrice })
        sub++
      }
    }
    itemNum++
  }

  if (peripheralItems.length > 0) {
    displayRows.push({ kind: 'section', label: 'General Peripherals' })
    for (const p of peripheralItems) {
      displayRows.push({ kind: 'item', itemNum, model: p.pn || p.description, spec: p.description, unitPrice: p.unitPrice })
      itemNum++
    }
  }

  if (licenseItems.length > 0) {
    displayRows.push({ kind: 'section', label: 'Licenses' })
    for (const l of licenseItems) {
      displayRows.push({ kind: 'item', itemNum, model: l.pn || l.description, spec: l.description, unitPrice: l.unitPrice })
      itemNum++
    }
  }

  if (otherItems.length > 0) {
    displayRows.push({ kind: 'section', label: 'Others' })
    for (const o of otherItems) {
      displayRows.push({ kind: 'item', itemNum, model: o.pn || o.description, spec: o.description, unitPrice: o.unitPrice })
      itemNum++
    }
  }

  const sellerName = entity === 'PTT' ? 'Partner Tech Asia Pacific Corp.' : 'Partner Tech Corp. (BenQ Group)'

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        {/* Top band: left logo (Partner Tech / custom), QUOTATION centered, right logo (BenQ Group) */}
        <View style={styles.topBand}>
          <View>
            {profile?.logoDataUrl ? (
              <Image src={profile.logoDataUrl} style={styles.logo} />
            ) : payload.templateLeftLogo ? (
              <Image src={payload.templateLeftLogo} style={styles.logo} />
            ) : (
              <Text style={{ fontSize: 14, fontFamily: 'Helvetica-Bold', color: DARK }}>{sellerName}</Text>
            )}
          </View>
          <View style={styles.topCenter}>
            <Text style={styles.bigTitle}>QUOTATION</Text>
          </View>
          <View>
            {payload.templateRightLogo ? (
              <Image src={payload.templateRightLogo} style={styles.logoRight} />
            ) : null}
          </View>
        </View>

        {/* Info grid */}
        <View style={styles.infoGrid}>
          {/* Left: customer info */}
          <View style={styles.infoLeft}>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Company Name:</Text>
              <Text style={styles.infoValue}>{quoteMeta.customer}</Text>
            </View>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Customer Name:</Text>
              <Text style={styles.infoValue}>{quoteMeta.customer}</Text>
            </View>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Phone:</Text>
              <Text style={styles.infoValue}>{profile?.phone ?? ''}</Text>
            </View>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Email:</Text>
              <Text style={styles.infoValue}>{profile?.email ?? ''}</Text>
            </View>
          </View>
          {/* Right: seller info */}
          <View style={styles.infoRight}>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Date:</Text>
              <Text style={styles.infoValue}>{quoteMeta.date}</Text>
            </View>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Sales:</Text>
              <Text style={styles.infoValue}>{quoteMeta.preparedBy}</Text>
            </View>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Phone:</Text>
              <Text style={styles.infoValue}>(02)2918-8500 Ext.</Text>
            </View>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Fax:</Text>
              <Text style={styles.infoValue}>(02)2915-3405</Text>
            </View>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Email Address:</Text>
              <Text style={styles.infoValue}>{profile?.email ?? ''}</Text>
            </View>
          </View>
        </View>

        {/* Items table */}
        <View style={styles.tableWrap}>
          {/* Header row */}
          <View style={styles.tableHeaderRow}>
            <Text style={[styles.tableHeaderCell, styles.colItem]}>Item</Text>
            <Text style={[styles.tableHeaderCell, styles.colModel]}>Model</Text>
            <Text style={[styles.tableHeaderCell, styles.colSpec]}>Specification</Text>
            <Text style={[styles.tableHeaderCell, styles.colPrice]}>Unit Price</Text>
            {includeInternalCosts && (
              <>
                <Text style={[styles.tableHeaderCell, styles.colCost]}>Cost</Text>
                <Text style={[styles.tableHeaderCell, styles.colMargin]}>Margin%</Text>
              </>
            )}
          </View>

          {displayRows.map((row, i) => {
            if (row.kind === 'section') {
              return (
                <View key={i} style={styles.sectionHeaderRow}>
                  <Text style={styles.sectionHeaderText}>{row.label}</Text>
                </View>
              )
            }
            if (row.kind === 'item') {
              return (
                <View key={i} style={styles.tableRow} wrap={false}>
                  <Text style={[styles.cell, styles.colItem]}>{String(row.itemNum)}</Text>
                  <Text style={[styles.cell, styles.colModel]}>{row.model}</Text>
                  <Text style={[styles.cell, styles.colSpec]}>{row.spec}</Text>
                  <Text style={[styles.cellRight, styles.colPrice]}>{fmt(row.unitPrice)}</Text>
                  {includeInternalCosts && (
                    <>
                      <Text style={[styles.cellRight, styles.colCost]}></Text>
                      <Text style={[styles.cellRight, styles.colMargin]}></Text>
                    </>
                  )}
                </View>
              )
            }
            return null
          })}
        </View>

        {/* Grand total */}
        <View style={styles.totalBlock}>
          <Text style={styles.totalLabel}>TOTAL</Text>
          <Text style={styles.totalValue}>{fmt(totals.grandTotal)}</Text>
        </View>

        {/* Remark / Terms */}
        <Text style={styles.remarkTitle}>Remark：</Text>
        {terms.map((line, i) => (
          <Text key={i} style={styles.termItem}>{line}</Text>
        ))}

        {/* Partner Tech signature block */}
        <View style={styles.confirmRow}>
          <View style={styles.confirmBlock}>
            <Text style={styles.confirmLabel}>{sellerName}{'\n'}(BenQ Group)</Text>
            <Text style={styles.confirmLine}>{'__________________________________\n'}Date: ____________________</Text>
          </View>
          <View style={styles.confirmBlock}>
            <Text style={styles.confirmLabel}>Customer Confirmation:</Text>
            <Text style={styles.confirmLine}>{'__________________________________\n'}Date: ____________________</Text>
          </View>
        </View>

        {/* Footer */}
        <View style={styles.footer} fixed>
          <Text style={styles.footerText}>
            {quoteMeta.quoteNumber} · {quoteMeta.date} · {sellerName}
          </Text>
          <Text
            style={styles.footerText}
            render={({ pageNumber, totalPages }) => `Page ${pageNumber} / ${totalPages}`}
          />
        </View>
      </Page>
    </Document>
  )
}
