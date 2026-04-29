export interface Model {
  id: string
  terminal: string
  platform: string
  size: string | null
  pcb_version: string | null
  ddr4_ram: string | null
  ddr5_ram: string | null
  storage: string | null
  adaptor: string | null
  base: string | null
  cpu_itp: number | null
  ram_itp: number | null
  ssd_itp: number | null
  itp_no_ram_ssd: number | null
  itp: number | null
  remark: string | null
  series: string
}

export interface PricingTier {
  min_qty: number
  price: number
}

export interface BaseOption {
  type: string
  description: string
  size: string | null
  itp: number | null
  remark: string | null
}

export interface Upgrade {
  description: string
  itp_adder: number | null
  remark: string | null
}

export interface Optionals {
  base_options: BaseOption[]
  upgrades: Upgrade[]
}

export interface Peripheral {
  series: string
  group: string | null
  pn: string | null
  description: string | null
  pricing: PricingTier[] | null
  remark: string | null
}

export interface License {
  category: string
  description: string
  pn: string | null
  itp: number | null
  remark: string | null
}

export interface M10Item {
  model: string
  description: string | null
  pn: string | null
  pricing: PricingTier[] | null
  remark: string | null
}

export interface KdsItem {
  item: string
  pricing: PricingTier[] | null
  remark: string | null
}

export interface StandItem {
  description: string | null
  pricing: PricingTier[] | null
  remark: string | null
}

export interface IoBoxItem {
  category: string | null
  description: string | null
  pn: string | null
  itp: number | null
  remark: string | null
}

export interface PaymentBracket {
  pn: string | null
  description: string | null
  pricing: PricingTier[] | null
  remark: string | null
}

export interface IotItem {
  category: string | null
  model: string | null
  description: string | null
  pn: string | null
  itp: number | null
  remark: string | null
}

export interface CatalogMeta {
  source_file: string
  sheets: string[]
}

export interface Catalog {
  meta: CatalogMeta
  models: Model[]
  optionals: Optionals
  peripherals: Peripheral[]
  licenses: License[]
  m10: M10Item[]
  kds: KdsItem[]
  stands: StandItem[]
  io_box: IoBoxItem[]
  payment_brackets: PaymentBracket[]
  iot: IotItem[]
}
