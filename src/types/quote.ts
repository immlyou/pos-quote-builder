export type QuoteEntity = 'PTT' | 'PTC'

export interface CompanyProfile {
  id: string
  name: string
  address: string
  phone: string
  email: string
  taxId: string
  logoDataUrl: string | null
  isDefault: boolean
  defaultEntity?: QuoteEntity
}

export interface QuoteMeta {
  customer: string
  quoteNumber: string
  date: string
  preparedBy: string
  notes: string
}

export interface LineItem {
  category: string
  description: string
  pn: string
  qty: number
  costPrice: number        // the ITP cost
  unitPrice: number        // customer-facing price after markup
  subtotal: number         // unitPrice * qty (customer-facing)
  marginAmount: number     // unitPrice - costPrice
  marginPercent: number    // (unitPrice / costPrice - 1) * 100, capped to 0 when costPrice=0
  marginType?: 'percent' | 'fixed'
  marginValue?: number
}

export interface QuoteTotals {
  baseModel: number
  upgrades: number
  peripherals: number
  licenses: number
  others: number
  grandTotal: number       // alias for customerTotal (backwards compat)
  customerTotal: number
  costTotal: number
  marginTotal: number
  marginPercentAvg: number
  costSubtotals: {
    baseModel: number
    upgrades: number
    peripherals: number
    licenses: number
    others: number
    total: number
  }
}

export interface GroupedItem {
  modelCode: string
  modelSpec: string
  modelPrice: number
  modelQty: number
  peripherals: Array<{ model: string; spec: string; price: number; qty: number }>
}

export interface ExportPayload {
  profile: CompanyProfile | null
  quoteMeta: QuoteMeta
  lineItems: LineItem[]
  totals: QuoteTotals
  entity?: QuoteEntity
  includeInternalCosts?: boolean
  groupedItems?: GroupedItem[]
}

// Quote configurator state
export interface SelectedModel {
  modelId: string
  qty: number
  marginType?: 'percent' | 'fixed'
  marginValue?: number
}

export interface SelectedUpgrade {
  index: number
  description: string
  itpAdder: number
  marginType?: 'percent' | 'fixed'
  marginValue?: number
}

export interface SelectedBaseOption {
  index: number
  description: string
  itp: number
  qty: number
  marginType?: 'percent' | 'fixed'
  marginValue?: number
}

export interface SelectedPeripheral {
  key: string // pn or composite key
  description: string
  pn: string
  series: string
  qty: number
  unitPrice: number
  marginType?: 'percent' | 'fixed'
  marginValue?: number
}

export interface SelectedLicense {
  index: number
  description: string
  pn: string
  itp: number
  qty: number
  marginType?: 'percent' | 'fixed'
  marginValue?: number
}

export interface SelectedOther {
  key: string
  category: string
  description: string
  pn: string
  qty: number
  unitPrice: number
  marginType?: 'percent' | 'fixed'
  marginValue?: number
}
