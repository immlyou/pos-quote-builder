'use client'

import { create } from 'zustand'
import type {
  SelectedModel,
  SelectedUpgrade,
  SelectedBaseOption,
  SelectedPeripheral,
  SelectedLicense,
  SelectedOther,
  QuoteMeta,
} from '@/types/quote'
import { generateQuoteNumber, todayISO } from '@/lib/utils'

interface QuoteState {
  // Section A
  selectedModel: SelectedModel | null
  // Section B
  selectedUpgrades: SelectedUpgrade[]
  selectedBaseOptions: SelectedBaseOption[]
  // Section C
  selectedPeripherals: SelectedPeripheral[]
  // Section D
  selectedLicenses: SelectedLicense[]
  // Section E
  selectedOthers: SelectedOther[]
  // Meta
  quoteMeta: QuoteMeta
  selectedProfileId: string | null
  // Edit-mode tracking
  editingId: string | null
  editingRevision: number
  // Actions
  setModel: (model: SelectedModel | null) => void
  toggleUpgrade: (upgrade: SelectedUpgrade) => void
  setBaseOptionQty: (index: number, qty: number, item: Omit<SelectedBaseOption, 'qty'>) => void
  setPeripheralQty: (key: string, qty: number, item: Omit<SelectedPeripheral, 'qty'>) => void
  removePeripheral: (key: string) => void
  setLicenseQty: (index: number, qty: number, item: Omit<SelectedLicense, 'qty'>) => void
  removeLicense: (index: number) => void
  setOtherQty: (key: string, qty: number, item: Omit<SelectedOther, 'qty'>) => void
  removeOther: (key: string) => void
  setQuoteMeta: (meta: Partial<QuoteMeta>) => void
  setProfileId: (id: string | null) => void
  setItemMargin: (
    category: 'baseModel' | 'upgrades' | 'baseOptions' | 'peripherals' | 'licenses' | 'others',
    key: string | number,
    marginType: 'percent' | 'fixed',
    marginValue: number
  ) => void
  reset: () => void
  toDraft: () => string
  fromDraft: (json: string) => void
  loadFromQuote: (q: {
    id: string
    revision: number
    quoteNumber: string
    customerNameSnapshot: string | null
    date: string
    preparedBy: string | null
    notes: string | null
    selections: Record<string, unknown>
  }) => void
  duplicateFromQuote: (q: {
    quoteNumber: string
    customerNameSnapshot: string | null
    preparedBy: string | null
    notes: string | null
    selections: Record<string, unknown>
  }) => void
  clearEditing: () => void
}

const defaultMeta = (): QuoteMeta => ({
  customer: '',
  quoteNumber: generateQuoteNumber(),
  date: todayISO(),
  preparedBy: '',
  notes: '',
})

export const useQuoteStore = create<QuoteState>((set, get) => ({
  selectedModel: null,
  selectedUpgrades: [],
  selectedBaseOptions: [],
  selectedPeripherals: [],
  selectedLicenses: [],
  selectedOthers: [],
  quoteMeta: defaultMeta(),
  selectedProfileId: null,
  editingId: null,
  editingRevision: 1,

  setModel: (model) => set({ selectedModel: model }),

  toggleUpgrade: (upgrade) =>
    set((s) => {
      const exists = s.selectedUpgrades.find((u) => u.index === upgrade.index)
      return {
        selectedUpgrades: exists
          ? s.selectedUpgrades.filter((u) => u.index !== upgrade.index)
          : [...s.selectedUpgrades, upgrade],
      }
    }),

  setBaseOptionQty: (index, qty, item) =>
    set((s) => {
      const existing = s.selectedBaseOptions.find((b) => b.index === index)
      if (qty <= 0) {
        return { selectedBaseOptions: s.selectedBaseOptions.filter((b) => b.index !== index) }
      }
      if (existing) {
        return {
          selectedBaseOptions: s.selectedBaseOptions.map((b) =>
            b.index === index ? { ...b, qty } : b
          ),
        }
      }
      return { selectedBaseOptions: [...s.selectedBaseOptions, { ...item, index, qty }] }
    }),

  setPeripheralQty: (key, qty, item) =>
    set((s) => {
      if (qty <= 0) {
        return { selectedPeripherals: s.selectedPeripherals.filter((p) => p.key !== key) }
      }
      const existing = s.selectedPeripherals.find((p) => p.key === key)
      if (existing) {
        return {
          selectedPeripherals: s.selectedPeripherals.map((p) =>
            p.key === key ? { ...p, qty, unitPrice: item.unitPrice } : p
          ),
        }
      }
      return { selectedPeripherals: [...s.selectedPeripherals, { ...item, key, qty }] }
    }),

  removePeripheral: (key) =>
    set((s) => ({ selectedPeripherals: s.selectedPeripherals.filter((p) => p.key !== key) })),

  setLicenseQty: (index, qty, item) =>
    set((s) => {
      if (qty <= 0) {
        return { selectedLicenses: s.selectedLicenses.filter((l) => l.index !== index) }
      }
      const existing = s.selectedLicenses.find((l) => l.index === index)
      if (existing) {
        return {
          selectedLicenses: s.selectedLicenses.map((l) =>
            l.index === index ? { ...l, qty } : l
          ),
        }
      }
      return { selectedLicenses: [...s.selectedLicenses, { ...item, index, qty }] }
    }),

  removeLicense: (index) =>
    set((s) => ({ selectedLicenses: s.selectedLicenses.filter((l) => l.index !== index) })),

  setOtherQty: (key, qty, item) =>
    set((s) => {
      if (qty <= 0) {
        return { selectedOthers: s.selectedOthers.filter((o) => o.key !== key) }
      }
      const existing = s.selectedOthers.find((o) => o.key === key)
      if (existing) {
        return {
          selectedOthers: s.selectedOthers.map((o) =>
            o.key === key ? { ...o, qty, unitPrice: item.unitPrice } : o
          ),
        }
      }
      return { selectedOthers: [...s.selectedOthers, { ...item, key, qty }] }
    }),

  removeOther: (key) =>
    set((s) => ({ selectedOthers: s.selectedOthers.filter((o) => o.key !== key) })),

  setQuoteMeta: (meta) =>
    set((s) => ({ quoteMeta: { ...s.quoteMeta, ...meta } })),

  setProfileId: (id) => set({ selectedProfileId: id }),

  setItemMargin: (category, key, marginType, marginValue) =>
    set((s) => {
      switch (category) {
        case 'baseModel':
          if (!s.selectedModel) return {}
          return { selectedModel: { ...s.selectedModel, marginType, marginValue } }
        case 'upgrades':
          return {
            selectedUpgrades: s.selectedUpgrades.map((u) =>
              u.index === key ? { ...u, marginType, marginValue } : u
            ),
          }
        case 'baseOptions':
          return {
            selectedBaseOptions: s.selectedBaseOptions.map((b) =>
              b.index === key ? { ...b, marginType, marginValue } : b
            ),
          }
        case 'peripherals':
          return {
            selectedPeripherals: s.selectedPeripherals.map((p) =>
              p.key === key ? { ...p, marginType, marginValue } : p
            ),
          }
        case 'licenses':
          return {
            selectedLicenses: s.selectedLicenses.map((l) =>
              l.index === key ? { ...l, marginType, marginValue } : l
            ),
          }
        case 'others':
          return {
            selectedOthers: s.selectedOthers.map((o) =>
              o.key === key ? { ...o, marginType, marginValue } : o
            ),
          }
        default:
          return {}
      }
    }),

  reset: () =>
    set({
      selectedModel: null,
      selectedUpgrades: [],
      selectedBaseOptions: [],
      selectedPeripherals: [],
      selectedLicenses: [],
      selectedOthers: [],
      quoteMeta: defaultMeta(),
      editingId: null,
      editingRevision: 1,
    }),

  loadFromQuote: (q) => {
    const s = (q.selections ?? {}) as Record<string, unknown>
    set({
      selectedModel: (s.selectedModel as SelectedModel | null) ?? null,
      selectedUpgrades: (s.selectedUpgrades as SelectedUpgrade[]) ?? [],
      selectedBaseOptions: (s.selectedBaseOptions as SelectedBaseOption[]) ?? [],
      selectedPeripherals: (s.selectedPeripherals as SelectedPeripheral[]) ?? [],
      selectedLicenses: (s.selectedLicenses as SelectedLicense[]) ?? [],
      selectedOthers: (s.selectedOthers as SelectedOther[]) ?? [],
      selectedProfileId: (s.selectedProfileId as string | null) ?? null,
      quoteMeta: {
        customer: q.customerNameSnapshot ?? '',
        quoteNumber: q.quoteNumber,
        date: q.date,
        preparedBy: q.preparedBy ?? '',
        notes: q.notes ?? '',
      },
      editingId: q.id,
      editingRevision: q.revision,
    })
  },

  duplicateFromQuote: (q) => {
    const s = (q.selections ?? {}) as Record<string, unknown>
    set({
      selectedModel: (s.selectedModel as SelectedModel | null) ?? null,
      selectedUpgrades: (s.selectedUpgrades as SelectedUpgrade[]) ?? [],
      selectedBaseOptions: (s.selectedBaseOptions as SelectedBaseOption[]) ?? [],
      selectedPeripherals: (s.selectedPeripherals as SelectedPeripheral[]) ?? [],
      selectedLicenses: (s.selectedLicenses as SelectedLicense[]) ?? [],
      selectedOthers: (s.selectedOthers as SelectedOther[]) ?? [],
      selectedProfileId: (s.selectedProfileId as string | null) ?? null,
      quoteMeta: {
        customer: q.customerNameSnapshot ?? '',
        quoteNumber: generateQuoteNumber(),
        date: todayISO(),
        preparedBy: q.preparedBy ?? '',
        notes: q.notes ?? '',
      },
      editingId: null,
      editingRevision: 1,
    })
  },

  clearEditing: () => set({ editingId: null, editingRevision: 1 }),

  toDraft: () => {
    const s = get()
    return JSON.stringify({
      selectedModel: s.selectedModel,
      selectedUpgrades: s.selectedUpgrades,
      selectedBaseOptions: s.selectedBaseOptions,
      selectedPeripherals: s.selectedPeripherals,
      selectedLicenses: s.selectedLicenses,
      selectedOthers: s.selectedOthers,
      quoteMeta: s.quoteMeta,
      selectedProfileId: s.selectedProfileId,
    })
  },

  fromDraft: (json: string) => {
    const d = JSON.parse(json)
    set({
      selectedModel: d.selectedModel ?? null,
      selectedUpgrades: d.selectedUpgrades ?? [],
      selectedBaseOptions: d.selectedBaseOptions ?? [],
      selectedPeripherals: d.selectedPeripherals ?? [],
      selectedLicenses: d.selectedLicenses ?? [],
      selectedOthers: d.selectedOthers ?? [],
      quoteMeta: d.quoteMeta ?? defaultMeta(),
      selectedProfileId: d.selectedProfileId ?? null,
    })
  },
}))
