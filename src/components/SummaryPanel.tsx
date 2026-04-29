'use client'

import { useEffect, useMemo, useState } from 'react'
import { useLocaleStore } from '@/store/locale'
import { useQuoteStore } from '@/store/quote'
import { formatUSD, nextRevisionNumber } from '@/lib/utils'
import { Button, Input, Select, QtyInput, Label } from './ui'
import type { Model } from '@/types/catalog'
import type { CompanyProfile, ExportPayload, LineItem, QuoteEntity, QuoteTotals } from '@/types/quote'

interface Props {
  models: Model[]
}

/** Apply markup to a cost price */
function applyMarkup(cost: number, type: 'percent' | 'fixed', value: number): number {
  if (!value || value <= 0) return cost
  if (type === 'percent') return cost * (1 + value / 100)
  return cost + value
}

/** Compute marginPercent safely (no divide-by-zero) */
function calcMarginPercent(customerPrice: number, costPrice: number): number {
  if (!costPrice || costPrice === 0) return 0
  return (customerPrice / costPrice - 1) * 100
}

/** Compact margin editor for each line item */
interface MarginEditorProps {
  marginType: 'percent' | 'fixed'
  marginValue: number
  onTypeChange: (t: 'percent' | 'fixed') => void
  onValueChange: (v: number) => void
}
function MarginEditor({ marginType, marginValue, onTypeChange, onValueChange }: MarginEditorProps) {
  const [draft, setDraft] = useState<string | null>(null)
  const displayVal = draft !== null ? draft : (marginValue === 0 ? '' : String(marginValue))

  const commitDraft = (raw: string) => {
    const n = parseFloat(raw)
    onValueChange(isNaN(n) || n < 0 ? 0 : n)
    setDraft(null)
  }

  return (
    <div className="flex items-center gap-0.5 mt-0.5">
      {/* Type toggle */}
      <div className="flex rounded overflow-hidden border border-gray-300 text-xs">
        <button
          className={`px-1.5 py-0.5 leading-none transition-colors ${marginType === 'percent' ? 'bg-brand-600 text-white' : 'bg-white text-gray-500 hover:bg-gray-50'}`}
          onClick={() => onTypeChange('percent')}
          title="Percent markup"
        >%</button>
        <button
          className={`px-1.5 py-0.5 leading-none border-l border-gray-300 transition-colors ${marginType === 'fixed' ? 'bg-brand-600 text-white' : 'bg-white text-gray-500 hover:bg-gray-50'}`}
          onClick={() => onTypeChange('fixed')}
          title="Fixed $ markup"
        >$</button>
      </div>
      <input
        type="text"
        inputMode="decimal"
        placeholder="0"
        value={displayVal}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={(e) => commitDraft(e.target.value)}
        onKeyDown={(e) => e.key === 'Enter' && (e.target as HTMLInputElement).blur()}
        className="w-14 text-xs border border-gray-300 rounded px-1.5 py-0.5 focus:outline-none focus:ring-1 focus:ring-brand-500 focus:border-brand-500"
      />
    </div>
  )
}

export function SummaryPanel({ models }: Props) {
  const { t } = useLocaleStore()
  const store = useQuoteStore()
  const [profiles, setProfiles] = useState<CompanyProfile[]>(() => {
    if (typeof window === 'undefined') return []
    try { return JSON.parse(localStorage.getItem('company_profiles') ?? '[]') } catch { return [] }
  })
  const [toast, setToast] = useState('')
  const [customerSuggestions, setCustomerSuggestions] = useState<string[]>([])
  const [quoteEntity, setQuoteEntity] = useState<QuoteEntity>('PTT')
  const [includeInternalCosts, setIncludeInternalCosts] = useState(false)

  useEffect(() => {
    fetch('/api/customers')
      .then((r) => r.json())
      .then((j) => setCustomerSuggestions((j.customers ?? []).map((c: { name: string }) => c.name)))
      .catch(() => {})
  }, [])

  const showToast = (msg: string) => {
    setToast(msg)
    setTimeout(() => setToast(''), 2000)
  }

  const model = store.selectedModel
    ? models.find((m) => m.id === store.selectedModel!.modelId)
    : null

  const qty = store.selectedModel?.qty ?? 1

  // ── Compute line items and totals with markup ──────────────────────────────
  const { lineItems, totals } = useMemo(() => {
    const items: LineItem[] = []

    // Base model
    if (model) {
      const costPrice = (model.itp ?? 0) * qty
      const mType = store.selectedModel?.marginType ?? 'percent'
      const mVal = store.selectedModel?.marginValue ?? 0
      const unitCost = model.itp ?? 0
      const unitCustomer = applyMarkup(unitCost, mType, mVal)
      const customerTotal = unitCustomer * qty
      items.push({
        category: 'Base Model',
        description: `${model.terminal} / ${model.platform}`,
        pn: model.id,
        qty,
        costPrice,
        unitPrice: unitCustomer,
        subtotal: customerTotal,
        marginAmount: customerTotal - costPrice,
        marginPercent: calcMarginPercent(unitCustomer, unitCost),
        marginType: mType,
        marginValue: mVal,
      })
    }

    // Upgrades
    store.selectedUpgrades.forEach((u) => {
      const unitCost = u.itpAdder
      const mType = u.marginType ?? 'percent'
      const mVal = u.marginValue ?? 0
      const unitCustomer = applyMarkup(unitCost, mType, mVal)
      const costTotal = unitCost * qty
      const customerTotal = unitCustomer * qty
      items.push({
        category: 'Upgrade',
        description: u.description,
        pn: '',
        qty,
        costPrice: costTotal,
        unitPrice: unitCustomer,
        subtotal: customerTotal,
        marginAmount: customerTotal - costTotal,
        marginPercent: calcMarginPercent(unitCustomer, unitCost),
        marginType: mType,
        marginValue: mVal,
      })
    })

    // Base options (add-on modules)
    store.selectedBaseOptions.forEach((b) => {
      const unitCost = b.itp
      const mType = b.marginType ?? 'percent'
      const mVal = b.marginValue ?? 0
      const unitCustomer = applyMarkup(unitCost, mType, mVal)
      const costTotal = unitCost * b.qty
      const customerTotal = unitCustomer * b.qty
      items.push({
        category: 'Add-on Module',
        description: b.description,
        pn: '',
        qty: b.qty,
        costPrice: costTotal,
        unitPrice: unitCustomer,
        subtotal: customerTotal,
        marginAmount: customerTotal - costTotal,
        marginPercent: calcMarginPercent(unitCustomer, unitCost),
        marginType: mType,
        marginValue: mVal,
      })
    })

    // Peripherals
    store.selectedPeripherals.forEach((p) => {
      const unitCost = p.unitPrice
      const mType = p.marginType ?? 'percent'
      const mVal = p.marginValue ?? 0
      const unitCustomer = applyMarkup(unitCost, mType, mVal)
      const costTotal = unitCost * p.qty
      const customerTotal = unitCustomer * p.qty
      items.push({
        category: 'Peripheral',
        description: p.description,
        pn: p.pn,
        qty: p.qty,
        costPrice: costTotal,
        unitPrice: unitCustomer,
        subtotal: customerTotal,
        marginAmount: customerTotal - costTotal,
        marginPercent: calcMarginPercent(unitCustomer, unitCost),
        marginType: mType,
        marginValue: mVal,
      })
    })

    // Licenses
    store.selectedLicenses.forEach((l) => {
      const unitCost = l.itp
      const mType = l.marginType ?? 'percent'
      const mVal = l.marginValue ?? 0
      const unitCustomer = applyMarkup(unitCost, mType, mVal)
      const costTotal = unitCost * l.qty
      const customerTotal = unitCustomer * l.qty
      items.push({
        category: 'License',
        description: l.description,
        pn: l.pn,
        qty: l.qty,
        costPrice: costTotal,
        unitPrice: unitCustomer,
        subtotal: customerTotal,
        marginAmount: customerTotal - costTotal,
        marginPercent: calcMarginPercent(unitCustomer, unitCost),
        marginType: mType,
        marginValue: mVal,
      })
    })

    // Others
    store.selectedOthers.forEach((o) => {
      const unitCost = o.unitPrice
      const mType = o.marginType ?? 'percent'
      const mVal = o.marginValue ?? 0
      const unitCustomer = applyMarkup(unitCost, mType, mVal)
      const costTotal = unitCost * o.qty
      const customerTotal = unitCustomer * o.qty
      items.push({
        category: o.category,
        description: o.description,
        pn: o.pn,
        qty: o.qty,
        costPrice: costTotal,
        unitPrice: unitCustomer,
        subtotal: customerTotal,
        marginAmount: customerTotal - costTotal,
        marginPercent: calcMarginPercent(unitCustomer, unitCost),
        marginType: mType,
        marginValue: mVal,
      })
    })

    // Derive subtotals by category
    const baseModelItems = items.filter((i) => i.category === 'Base Model')
    const upgradeItems = items.filter((i) => i.category === 'Upgrade' || i.category === 'Add-on Module')
    const peripheralItems = items.filter((i) => i.category === 'Peripheral')
    const licenseItems = items.filter((i) => i.category === 'License')
    const otherItems = items.filter(
      (i) => !['Base Model', 'Upgrade', 'Add-on Module', 'Peripheral', 'License'].includes(i.category)
    )

    const sum = (arr: LineItem[], field: 'subtotal' | 'costPrice') =>
      arr.reduce((s, i) => s + i[field], 0)

    const custBase = sum(baseModelItems, 'subtotal')
    const custUpgrades = sum(upgradeItems, 'subtotal')
    const custPeripherals = sum(peripheralItems, 'subtotal')
    const custLicenses = sum(licenseItems, 'subtotal')
    const custOthers = sum(otherItems, 'subtotal')
    const customerTotal = custBase + custUpgrades + custPeripherals + custLicenses + custOthers

    const costBase = sum(baseModelItems, 'costPrice')
    const costUpgrades = sum(upgradeItems, 'costPrice')
    const costPeripherals = sum(peripheralItems, 'costPrice')
    const costLicenses = sum(licenseItems, 'costPrice')
    const costOthers = sum(otherItems, 'costPrice')
    const costTotal = costBase + costUpgrades + costPeripherals + costLicenses + costOthers

    const marginTotal = customerTotal - costTotal
    const marginPercentAvg = costTotal > 0 ? (customerTotal / costTotal - 1) * 100 : 0

    const derivedTotals: QuoteTotals = {
      baseModel: custBase,
      upgrades: custUpgrades,
      peripherals: custPeripherals,
      licenses: custLicenses,
      others: custOthers,
      grandTotal: customerTotal,
      customerTotal,
      costTotal,
      marginTotal,
      marginPercentAvg,
      costSubtotals: {
        baseModel: costBase,
        upgrades: costUpgrades,
        peripherals: costPeripherals,
        licenses: costLicenses,
        others: costOthers,
        total: costTotal,
      },
    }

    return { lineItems: items, totals: derivedTotals }
  }, [
    model,
    qty,
    store.selectedModel,
    store.selectedUpgrades,
    store.selectedBaseOptions,
    store.selectedPeripherals,
    store.selectedLicenses,
    store.selectedOthers,
  ])

  const selectedProfile = profiles.find((p) => p.id === store.selectedProfileId) ?? null

  // Sync entity when profile changes
  useEffect(() => {
    if (selectedProfile?.defaultEntity) {
      setQuoteEntity(selectedProfile.defaultEntity)
    }
  }, [selectedProfile?.id, selectedProfile?.defaultEntity])

  const buildPayload = (): ExportPayload => {
    return {
      profile: selectedProfile,
      quoteMeta: store.quoteMeta,
      lineItems,
      totals,
      entity: quoteEntity,
      includeInternalCosts,
    }
  }

  const handleExport = async (format: 'excel' | 'pdf') => {
    const payload = buildPayload()
    const res = await fetch(`/api/export/${format}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })
    if (!res.ok) { alert('Export failed'); return }
    const blob = await res.blob()
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `quote-${store.quoteMeta.quoteNumber}.${format === 'excel' ? 'xlsx' : 'pdf'}`
    a.click()
    URL.revokeObjectURL(url)
  }

  const handleSaveDraft = () => {
    localStorage.setItem('quote_draft', store.toDraft())
    showToast(t.draftSaved)
  }

  const handleLoadDraft = () => {
    const d = localStorage.getItem('quote_draft')
    if (d) { store.fromDraft(d); showToast(t.draftLoaded) }
  }

  const [saving, setSaving] = useState(false)

  const buildSavePayload = () => {
    const payload = buildPayload()
    const draft = JSON.parse(store.toDraft())
    return {
      quoteMeta: payload.quoteMeta,
      totals: payload.totals,
      profile: payload.profile,
      selections: { ...draft, lineItems: payload.lineItems },
    }
  }

  const postNewQuote = async (overrideQuoteNumber?: string, parentId?: string) => {
    const body = buildSavePayload()
    if (overrideQuoteNumber) body.quoteMeta = { ...body.quoteMeta, quoteNumber: overrideQuoteNumber }
    const res = await fetch('/api/quotes', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...body, parentQuoteId: parentId ?? null }),
    })
    return { res, json: await res.json() }
  }

  const patchQuote = async (id: string) => {
    const body = buildSavePayload()
    const res = await fetch(`/api/quotes/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        date: body.quoteMeta.date,
        preparedBy: body.quoteMeta.preparedBy,
        notes: body.quoteMeta.notes,
        customerName: body.quoteMeta.customer,
        selections: body.selections,
        totals: body.totals,
        profileSnapshot: body.profile,
      }),
    })
    return { res, json: await res.json() }
  }

  const wrapSave = async (action: () => Promise<{ res: Response; json: { ok?: true; error?: string } }>) => {
    if (!store.selectedModel) {
      showToast(t.selectModelFirst)
      return
    }
    setSaving(true)
    try {
      const { res, json } = await action()
      if (!res.ok || !json.ok) {
        showToast(`${t.saveFailed}: ${json.error ?? res.status}`)
        return
      }
      showToast(t.quoteSaved)
    } catch (e) {
      showToast(`${t.saveFailed}: ${(e as Error).message}`)
    } finally {
      setSaving(false)
    }
  }

  const handleSaveQuote = () => wrapSave(() => postNewQuote())
  const handleUpdate = () => {
    if (!store.editingId) return
    return wrapSave(() => patchQuote(store.editingId!))
  }
  const handleSaveAsRevision = async () => {
    if (!store.editingId) return
    const newQuoteNumber = nextRevisionNumber(store.quoteMeta.quoteNumber)
    await wrapSave(() => postNewQuote(newQuoteNumber, store.editingId!))
    store.clearEditing()
    store.setQuoteMeta({ quoteNumber: newQuoteNumber })
  }

  return (
    <div className="flex flex-col gap-3 h-full">
      {/* Quote meta */}
      <div className="bg-white border border-gray-200 rounded-lg p-3 space-y-2">
        <div className="font-semibold text-gray-700 text-xs uppercase tracking-wide mb-1">Quote Info</div>

        <div>
          <Label>{t.companyProfile}</Label>
          <Select
            value={store.selectedProfileId ?? ''}
            onChange={(e) => store.setProfileId(e.target.value || null)}
            className="mt-0.5"
          >
            <option value="">{t.noProfile}</option>
            {profiles.map((p) => (
              <option key={p.id} value={p.id}>{p.name}</option>
            ))}
          </Select>
        </div>

        <div>
          <Label>{t.customer}</Label>
          <Input
            value={store.quoteMeta.customer}
            onChange={(e) => store.setQuoteMeta({ customer: e.target.value })}
            className="mt-0.5"
            list="customer-suggestions"
            autoComplete="off"
          />
          <datalist id="customer-suggestions">
            {customerSuggestions.map((name) => (
              <option key={name} value={name} />
            ))}
          </datalist>
        </div>

        <div>
          <Label>{t.preparedBy}</Label>
          <Input
            value={store.quoteMeta.preparedBy}
            onChange={(e) => store.setQuoteMeta({ preparedBy: e.target.value })}
            className="mt-0.5"
          />
        </div>

        <div>
          <Label>{t.notes}</Label>
          <Input
            value={store.quoteMeta.notes}
            onChange={(e) => store.setQuoteMeta({ notes: e.target.value })}
            className="mt-0.5"
          />
        </div>

        <div>
          <Label>{t.quoteEntity}</Label>
          <Select
            value={quoteEntity}
            onChange={(e) => setQuoteEntity(e.target.value as QuoteEntity)}
            className="mt-0.5"
          >
            <option value="PTT">{t.entityPTT}</option>
            <option value="PTC">{t.entityPTC}</option>
          </Select>
        </div>

        <div className="flex items-center gap-2 pt-1">
          <input
            type="checkbox"
            id="includeInternalCosts"
            checked={includeInternalCosts}
            onChange={(e) => setIncludeInternalCosts(e.target.checked)}
            className="accent-brand-600"
          />
          <label htmlFor="includeInternalCosts" className="text-xs text-gray-600 cursor-pointer">
            {t.includeInternalCosts}
          </label>
          {includeInternalCosts && (
            <span className="text-xs text-amber-600 font-medium" title={t.internalCostsWarning}>
              ⚠ {t.internalCostsWarning}
            </span>
          )}
        </div>
      </div>

      {/* Model qty */}
      <div className="bg-white border border-gray-200 rounded-lg p-3">
        <div className="flex items-center justify-between">
          <Label>{t.quoteQty}</Label>
          <QtyInput
            value={qty}
            min={1}
            onChange={(v) => store.setModel(store.selectedModel ? { ...store.selectedModel, qty: v } : null)}
          />
        </div>
      </div>

      {/* Line items with markup editors */}
      {lineItems.length > 0 && (
        <div className="bg-white border border-gray-200 rounded-lg p-3">
          <div className="font-semibold text-gray-700 text-xs uppercase tracking-wide mb-2">
            {t.summaryTitle}
          </div>
          <div className="space-y-2">
            {lineItems.map((item, idx) => {
              const marginType = item.marginType ?? 'percent'
              const marginValue = item.marginValue ?? 0

              const onMarginChange = (mType: 'percent' | 'fixed', mVal: number) => {
                if (item.category === 'Base Model') {
                  store.setItemMargin('baseModel', 'baseModel', mType, mVal)
                } else if (item.category === 'Upgrade') {
                  const u = store.selectedUpgrades.find((u) => u.description === item.description)
                  if (u) store.setItemMargin('upgrades', u.index, mType, mVal)
                } else if (item.category === 'Add-on Module') {
                  const b = store.selectedBaseOptions.find((b) => b.description === item.description)
                  if (b) store.setItemMargin('baseOptions', b.index, mType, mVal)
                } else if (item.category === 'Peripheral') {
                  const p = store.selectedPeripherals.find((p) => p.pn === item.pn || p.description === item.description)
                  if (p) store.setItemMargin('peripherals', p.key, mType, mVal)
                } else if (item.category === 'License') {
                  const l = store.selectedLicenses.find((l) => l.description === item.description)
                  if (l) store.setItemMargin('licenses', l.index, mType, mVal)
                } else {
                  const o = store.selectedOthers.find((o) => o.description === item.description && o.pn === item.pn)
                  if (o) store.setItemMargin('others', o.key, mType, mVal)
                }
              }

              return (
                <div key={idx} className="border border-gray-100 rounded p-2 text-xs">
                  <div className="flex items-start justify-between gap-1">
                    <div className="flex-1 min-w-0">
                      <span className="font-medium text-gray-700 truncate block">{item.description}</span>
                      <span className="text-gray-400">{item.category}</span>
                    </div>
                    <MarginEditor
                      marginType={marginType}
                      marginValue={marginValue}
                      onTypeChange={(t) => onMarginChange(t, marginValue)}
                      onValueChange={(v) => onMarginChange(marginType, v)}
                    />
                  </div>
                  <div className="flex flex-wrap gap-1 mt-1.5">
                    <span className="bg-gray-100 text-gray-500 px-1.5 py-0.5 rounded text-[10px]">
                      {t.costPrice}: {formatUSD(item.costPrice)}
                    </span>
                    {marginValue > 0 && (
                      <span className="bg-amber-50 text-amber-700 px-1.5 py-0.5 rounded text-[10px]" title={marginType === 'percent' ? `${marginValue}% per unit` : `+${formatUSD(marginValue)} per unit`}>
                        {marginType === 'percent' ? `+${marginValue}%` : `+${formatUSD(item.marginAmount)}`}
                      </span>
                    )}
                    <span className="bg-blue-50 text-blue-700 px-1.5 py-0.5 rounded text-[10px]">
                      {t.customerPrice}: {formatUSD(item.subtotal)}
                    </span>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Totals */}
      <div className="bg-white border border-gray-200 rounded-lg p-3 flex-1">
        <div className="font-semibold text-gray-700 text-xs uppercase tracking-wide mb-3">{t.grandTotal}</div>
        <div className="space-y-1.5 text-xs">
          <div className="flex justify-between">
            <span className="text-gray-500">{t.baseModelTotal}</span>
            <span className="font-mono">{formatUSD(totals.baseModel)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-500">{t.upgradesTotal}</span>
            <span className="font-mono">{formatUSD(totals.upgrades)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-500">{t.peripheralsTotal}</span>
            <span className="font-mono">{formatUSD(totals.peripherals)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-500">{t.licensesTotal}</span>
            <span className="font-mono">{formatUSD(totals.licenses)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-500">{t.othersTotal}</span>
            <span className="font-mono">{formatUSD(totals.others)}</span>
          </div>
          <div className="flex justify-between border-t border-gray-200 pt-2 font-bold text-sm">
            <span>{t.customerGrandTotal}</span>
            <span className="font-mono text-brand-700">{formatUSD(totals.customerTotal)}</span>
          </div>
        </div>

        {/* Internal margin summary block — always visible (internal users only) */}
        <div className="mt-3 rounded-lg bg-slate-50 border border-slate-200 p-2.5 text-xs space-y-1">
          <div className="font-semibold text-slate-500 uppercase tracking-wide text-[10px] mb-1.5">
            Internal / 毛利分析
          </div>
          <div className="flex justify-between text-slate-600">
            <span>{t.itpCost}</span>
            <span className="font-mono">{formatUSD(totals.costTotal)}</span>
          </div>
          <div className="flex justify-between text-slate-600">
            <span>{t.marginAmount}</span>
            <span className="font-mono text-emerald-700">{formatUSD(totals.marginTotal)}</span>
          </div>
          <div className="flex justify-between text-slate-600">
            <span>{t.marginPercentAvg}</span>
            <span className="font-mono text-emerald-700">
              {totals.marginPercentAvg.toFixed(1)}%
            </span>
          </div>
        </div>
      </div>

      {/* Editing banner */}
      {store.editingId && (
        <div className="bg-amber-50 border border-amber-200 text-amber-800 rounded-lg px-3 py-2 text-xs">
          <div className="font-semibold">{t.editingMode}</div>
          <div className="font-mono text-amber-700 mt-0.5">
            {store.quoteMeta.quoteNumber}
            {store.editingRevision > 1 && (
              <span className="ml-2">v{store.editingRevision}</span>
            )}
          </div>
        </div>
      )}

      {/* Actions */}
      <div className="grid grid-cols-2 gap-2">
        {store.editingId ? (
          <>
            <Button onClick={handleUpdate} size="sm" variant="primary" className="col-span-2" disabled={saving}>
              {saving ? t.saving : t.updateQuote}
            </Button>
            <Button onClick={handleSaveAsRevision} size="sm" variant="secondary" className="col-span-2" disabled={saving}>
              {t.saveAsRevision}
            </Button>
          </>
        ) : (
          <Button onClick={handleSaveQuote} size="sm" variant="primary" className="col-span-2" disabled={saving}>
            {saving ? t.saving : t.saveQuote}
          </Button>
        )}
        <Button onClick={() => handleExport('pdf')} size="sm" variant="secondary">
          {t.exportPDF}
        </Button>
        <Button onClick={() => handleExport('excel')} size="sm" variant="secondary">
          {t.exportExcel}
        </Button>
        <Button onClick={store.reset} size="sm" variant="secondary" className="col-span-2">
          {t.reset}
        </Button>
        <Button onClick={handleSaveDraft} size="sm" variant="ghost">
          {t.saveDraft}
        </Button>
        <Button onClick={handleLoadDraft} size="sm" variant="ghost">
          {t.loadDraft}
        </Button>
      </div>

      {toast && (
        <div className="text-center text-xs text-green-600 bg-green-50 rounded px-2 py-1">{toast}</div>
      )}
    </div>
  )
}
