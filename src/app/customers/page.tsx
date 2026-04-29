'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useLocaleStore } from '@/store/locale'
import { Button, Input, Textarea, Dialog } from '@/components/ui'
import { formatUSD } from '@/lib/utils'

interface CustomerRow {
  id: string
  code: string | null
  name: string
  contact: string | null
  email: string | null
  phone: string | null
  address: string | null
  notes: string | null
  tags: string[]
  createdAt: string
  quoteCount: number
  latestQuoteDate: string | null
  totalValue: string
}

interface CustomerForm {
  code: string
  name: string
  contact: string
  email: string
  phone: string
  address: string
  notes: string
  tags: string
}

const emptyForm: CustomerForm = {
  code: '',
  name: '',
  contact: '',
  email: '',
  phone: '',
  address: '',
  notes: '',
  tags: '',
}

export default function CustomersPage() {
  const { t } = useLocaleStore()
  const [rows, setRows] = useState<CustomerRow[]>([])
  const [loading, setLoading] = useState(true)
  const [q, setQ] = useState('')
  const [tagFilter, setTagFilter] = useState<string>('')
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editTarget, setEditTarget] = useState<CustomerRow | null>(null)
  const [form, setForm] = useState<CustomerForm>(emptyForm)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const load = async () => {
    setLoading(true)
    const params = new URLSearchParams()
    if (q) params.set('q', q)
    const res = await fetch(`/api/customers?${params.toString()}`)
    const json = await res.json()
    setRows(json.customers ?? [])
    setLoading(false)
  }

  useEffect(() => {
    load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const openAdd = () => {
    setEditTarget(null)
    setForm(emptyForm)
    setError('')
    setDialogOpen(true)
  }

  const openEdit = (c: CustomerRow) => {
    setEditTarget(c)
    setForm({
      code: c.code ?? '',
      name: c.name,
      contact: c.contact ?? '',
      email: c.email ?? '',
      phone: c.phone ?? '',
      address: c.address ?? '',
      notes: c.notes ?? '',
      tags: (c.tags ?? []).join(', '),
    })
    setError('')
    setDialogOpen(true)
  }

  const allTags = Array.from(
    new Set(rows.flatMap((r) => r.tags ?? []))
  ).sort()
  const filteredRows = tagFilter
    ? rows.filter((r) => (r.tags ?? []).includes(tagFilter))
    : rows

  const handleSave = async () => {
    if (!form.name.trim()) {
      setError(t.customerNameRequired)
      return
    }
    setSaving(true)
    setError('')
    try {
      const url = editTarget ? `/api/customers/${editTarget.id}` : '/api/customers'
      const method = editTarget ? 'PATCH' : 'POST'
      const tagsArr = form.tags
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean)
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...form, tags: tagsArr }),
      })
      const json = await res.json()
      if (!res.ok || !json.ok) {
        setError(json.error ?? 'Save failed')
        return
      }
      setDialogOpen(false)
      await load()
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm(t.confirmDeleteCustomer)) return
    await fetch(`/api/customers/${id}`, { method: 'DELETE' })
    await load()
  }

  return (
    <div className="p-4 sm:p-6 max-w-6xl">
      <div className="flex items-center justify-between flex-wrap gap-2 mb-4">
        <h1 className="text-lg font-semibold text-gray-800">{t.customersTitle}</h1>
        <Button size="sm" onClick={openAdd}>
          {t.addCustomer}
        </Button>
      </div>

      {/* Search + tag filter */}
      <div className="bg-white border border-gray-200 rounded-lg p-3 mb-4 flex flex-wrap gap-2">
        <Input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && load()}
          placeholder={t.searchCustomers}
          className="flex-1 min-w-[200px]"
        />
        <Button size="sm" variant="secondary" onClick={load}>
          ↻
        </Button>
        {allTags.length > 0 && (
          <div className="flex flex-wrap gap-1 w-full mt-1 items-center">
            <span className="text-xs text-gray-500 mr-1">{t.tagsLabel}:</span>
            <button
              onClick={() => setTagFilter('')}
              className={
                'px-2 py-0.5 rounded-full text-xs border ' +
                (tagFilter === ''
                  ? 'bg-brand-700 text-white border-brand-700'
                  : 'bg-white text-gray-600 border-gray-300 hover:bg-gray-50')
              }
            >
              {t.allTags}
            </button>
            {allTags.map((tag) => (
              <button
                key={tag}
                onClick={() => setTagFilter(tag)}
                className={
                  'px-2 py-0.5 rounded-full text-xs border ' +
                  (tagFilter === tag
                    ? 'bg-brand-700 text-white border-brand-700'
                    : 'bg-brand-50 text-brand-700 border-brand-200 hover:bg-brand-100')
                }
              >
                {tag}
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
        {loading ? (
          <div className="text-sm text-gray-400 text-center py-8">...</div>
        ) : filteredRows.length === 0 ? (
          <div className="text-sm text-gray-400 text-center py-8">{t.noCustomersYet}</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 text-xs text-gray-500 uppercase">
                <tr>
                  <th className="px-3 py-2 text-left font-medium">{t.codeCol}</th>
                  <th className="px-3 py-2 text-left font-medium">{t.nameCol}</th>
                  <th className="px-3 py-2 text-left font-medium">{t.tagsLabel}</th>
                  <th className="px-3 py-2 text-left font-medium">{t.email}</th>
                  <th className="px-3 py-2 text-right font-medium">{t.quoteCountCol}</th>
                  <th className="px-3 py-2 text-right font-medium">{t.totalValueCol}</th>
                  <th className="px-3 py-2 text-left font-medium">{t.lastQuoteCol}</th>
                  <th className="px-3 py-2 text-right font-medium">{t.actionsCol}</th>
                </tr>
              </thead>
              <tbody>
                {filteredRows.map((c) => (
                  <tr key={c.id} className="border-t border-gray-100 hover:bg-gray-50">
                    <td className="px-3 py-2 font-mono text-xs text-gray-500">
                      {c.code ?? '—'}
                    </td>
                    <td className="px-3 py-2">
                      <Link
                        href={`/customers/${c.id}`}
                        className="font-medium text-gray-800 hover:text-brand-700"
                      >
                        {c.name}
                      </Link>
                      {c.contact && (
                        <div className="text-xs text-gray-500">{c.contact}</div>
                      )}
                    </td>
                    <td className="px-3 py-2">
                      {c.tags?.length ? (
                        <div className="flex flex-wrap gap-1">
                          {c.tags.map((tag) => (
                            <span
                              key={tag}
                              className="px-1.5 py-0.5 rounded-full bg-brand-50 text-brand-700 text-[10px] border border-brand-200"
                            >
                              {tag}
                            </span>
                          ))}
                        </div>
                      ) : (
                        <span className="text-gray-300 text-xs">—</span>
                      )}
                    </td>
                    <td className="px-3 py-2 text-gray-600 text-xs">{c.email ?? '—'}</td>
                    <td className="px-3 py-2 text-right font-mono">{c.quoteCount}</td>
                    <td className="px-3 py-2 text-right font-mono text-xs">
                      {formatUSD(parseFloat(c.totalValue))}
                    </td>
                    <td className="px-3 py-2 text-gray-500 font-mono text-xs">
                      {c.latestQuoteDate ?? '—'}
                    </td>
                    <td className="px-3 py-2 text-right whitespace-nowrap">
                      <Link
                        href={`/customers/${c.id}`}
                        className="text-brand-700 hover:underline text-xs font-medium mr-3"
                      >
                        {t.view}
                      </Link>
                      <button
                        onClick={() => openEdit(c)}
                        className="text-gray-600 hover:text-gray-800 text-xs font-medium mr-3"
                      >
                        {t.edit}
                      </button>
                      <button
                        onClick={() => handleDelete(c.id)}
                        className="text-red-600 hover:text-red-800 text-xs font-medium"
                      >
                        {t.deleteProfile}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <Dialog
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
        title={editTarget ? t.editCustomer : t.addCustomer}
      >
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">
                {t.codeCol}
              </label>
              <Input
                value={form.code}
                onChange={(e) => setForm((f) => ({ ...f, code: e.target.value }))}
                placeholder="C001"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">
                {t.nameCol} *
              </label>
              <Input
                value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">
                {t.contactCol}
              </label>
              <Input
                value={form.contact}
                onChange={(e) => setForm((f) => ({ ...f, contact: e.target.value }))}
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">
                {t.phone}
              </label>
              <Input
                value={form.phone}
                onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
              />
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">
              {t.email}
            </label>
            <Input
              value={form.email}
              onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">
              {t.address}
            </label>
            <Textarea
              value={form.address}
              onChange={(e) => setForm((f) => ({ ...f, address: e.target.value }))}
              rows={2}
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">
              {t.tagsLabel} <span className="text-gray-400">({t.tagsHint})</span>
            </label>
            <Input
              value={form.tags}
              onChange={(e) => setForm((f) => ({ ...f, tags: e.target.value }))}
              placeholder="VIP, 熱客, 餐飲業"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">
              {t.notes}
            </label>
            <Textarea
              value={form.notes}
              onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
              rows={2}
            />
          </div>
          {error && (
            <div className="text-xs text-red-600 bg-red-50 border border-red-200 rounded px-2 py-1">
              {error}
            </div>
          )}
          <div className="flex gap-2 justify-end pt-2">
            <Button variant="secondary" onClick={() => setDialogOpen(false)}>
              {t.cancel}
            </Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving ? t.saving : t.save}
            </Button>
          </div>
        </div>
      </Dialog>
    </div>
  )
}
