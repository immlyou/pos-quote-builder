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
  unitPrice: number
  subtotal: number
}

export interface QuoteTotals {
  baseModel: number
  upgrades: number
  peripherals: number
  licenses: number
  others: number
  grandTotal: number
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
}

export interface SelectedUpgrade {
  index: number
  description: string
  itpAdder: number
}

export interface SelectedBaseOption {
  index: number
  description: string
  itp: number
  qty: number
}

export interface SelectedPeripheral {
  key: string // pn or composite key
  description: string
  pn: string
  series: string
  qty: number
  unitPrice: number
}

export interface SelectedLicense {
  index: number
  description: string
  pn: string
  itp: number
  qty: number
}

export interface SelectedOther {
  key: string
  category: string
  description: string
  pn: string
  qty: number
  unitPrice: number
}
