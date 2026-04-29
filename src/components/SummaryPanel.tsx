'use client'

import { useEffect, useMemo, useState } from 'react'
import { useLocaleStore } from '@/store/locale'
import { useQuoteStore } from '@/store/quote'
import { formatUSD, nextRevisionNumber } from '@/lib/utils'
import { Button, Input, Select, QtyInput, Label } from './ui'
import type { Model } from '@/types/catalog'
import type { CompanyProfile, ExportPayload, LineItem, QuoteEntity } from '@/types/quote'

interface Props {
  models: Model[]
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

  const totals = useMemo(() => {
    const baseModel = (model?.itp ?? 0) * qty
    const upgrades =
      store.selectedUpgrades.reduce((s, u) => s + (u.itpAdder ?? 0), 0) * qty +
      store.selectedBaseOptions.reduce((s, b) => s + (b.itp ?? 0) * b.qty, 0)
    const peripherals = store.selectedPeripherals.reduce(
      (s, p) => s + p.unitPrice * p.qty,
      0
    )
    const licenses = store.selectedLicenses.reduce(
      (s, l) => s + (l.itp ?? 0) * l.qty,
      0
    )
    const others = store.selectedOthers.reduce(
      (s, o) => s + o.unitPrice * o.qty,
      0
    )
    return {
      baseModel,
      upgrades,
      peripherals,
      licenses,
      others,
      grandTotal: baseModel + upgrades + peripherals + licenses + others,
    }
  }, [model, qty, store.selectedUpgrades, store.selectedBaseOptions, store.selectedPeripherals, store.selectedLicenses, store.selectedOthers])

  const selectedProfile = profiles.find((p) => p.id === store.selectedProfileId) ?? null

  // Sync entity when profile changes
  useEffect(() => {
    if (selectedProfile?.defaultEntity) {
      setQuoteEntity(selectedProfile.defaultEntity)
    }
  }, [selectedProfile?.id, selectedProfile?.defaultEntity])

  const buildPayload = (): ExportPayload => {
    const lineItems: LineItem[] = []

    if (model) {
      lineItems.push({
        category: 'Base Model',
        description: `${model.terminal} / ${model.platform}`,
        pn: model.id,
        qty,
        unitPrice: model.itp ?? 0,
        subtotal: (model.itp ?? 0) * qty,
      })
    }

    store.selectedUpgrades.forEach((u) => {
      lineItems.push({
        category: 'Upgrade',
        description: u.description,
        pn: '',
        qty,
        unitPrice: u.itpAdder,
        subtotal: u.itpAdder * qty,
      })
    })

    store.selectedBaseOptions.forEach((b) => {
      lineItems.push({
        category: 'Add-on Module',
        description: b.description,
        pn: '',
        qty: b.qty,
        unitPrice: b.itp,
        subtotal: b.itp * b.qty,
      })
    })

    store.selectedPeripherals.forEach((p) => {
      lineItems.push({
        category: 'Peripheral',
        description: p.description,
        pn: p.pn,
        qty: p.qty,
        unitPrice: p.unitPrice,
        subtotal: p.unitPrice * p.qty,
      })
    })

    store.selectedLicenses.forEach((l) => {
      lineItems.push({
        category: 'License',
        description: l.description,
        pn: l.pn,
        qty: l.qty,
        unitPrice: l.itp,
        subtotal: l.itp * l.qty,
      })
    })

    store.selectedOthers.forEach((o) => {
      lineItems.push({
        category: o.category,
        description: o.description,
        pn: o.pn,
        qty: o.qty,
        unitPrice: o.unitPrice,
        subtotal: o.unitPrice * o.qty,
      })
    })

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

      {/* Totals */}
      <div className="bg-white border border-gray-200 rounded-lg p-3 flex-1">
        <div className="font-semibold text-gray-700 text-xs uppercase tracking-wide mb-3">{t.summaryTitle}</div>
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
            <span>{t.grandTotal}</span>
            <span className="font-mono text-brand-700">{formatUSD(totals.grandTotal)}</span>
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
