'use client'

import { useState, useEffect, useRef } from 'react'
import { useLocaleStore } from '@/store/locale'
import { Button, Input, Textarea, Dialog, Badge } from '@/components/ui'
import type { CompanyProfile, QuoteEntity } from '@/types/quote'
import { APP_VERSION, CHANGELOG } from '@/lib/version'

function newProfile(): Omit<CompanyProfile, 'id'> {
  return { name: '', address: '', phone: '', email: '', taxId: '', logoDataUrl: null, isDefault: false, defaultEntity: 'PTT' }
}

export default function SettingsPage() {
  const { t } = useLocaleStore()
  const [profiles, setProfiles] = useState<CompanyProfile[]>([])
  const [editTarget, setEditTarget] = useState<CompanyProfile | null>(null)
  const [form, setForm] = useState<Omit<CompanyProfile, 'id'>>(newProfile())
  const [dialogOpen, setDialogOpen] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    try {
      const saved: CompanyProfile[] = JSON.parse(localStorage.getItem('company_profiles') ?? '[]')
      if (saved.length === 0) {
        // Pre-seed two default Partner Tech profiles on first load
        const seedProfiles = async () => {
          let logoDataUrl: string | null = null
          try {
            const resp = await fetch('/template-assets/image1.jpeg')
            const blob = await resp.blob()
            logoDataUrl = await new Promise<string>((resolve, reject) => {
              const reader = new FileReader()
              reader.onload = () => resolve(reader.result as string)
              reader.onerror = reject
              reader.readAsDataURL(blob)
            })
          } catch {
            // logo fetch failed — seed without logo
          }
          const defaults: CompanyProfile[] = [
            {
              id: 'profile_ptt_default',
              name: 'Partner Tech Asia Pacific Corp.',
              address: '',
              phone: '(02)2918-8500',
              email: 'sales@partner.com.tw',
              taxId: '',
              logoDataUrl,
              isDefault: true,
              defaultEntity: 'PTT',
            },
            {
              id: 'profile_ptc_default',
              name: 'Partner Tech Corp. (Shanghai)',
              address: '',
              phone: '(02)2918-8500',
              email: 'sales@partner.com.tw',
              taxId: '',
              logoDataUrl,
              isDefault: false,
              defaultEntity: 'PTC',
            },
          ]
          setProfiles(defaults)
          localStorage.setItem('company_profiles', JSON.stringify(defaults))
        }
        seedProfiles()
      } else {
        setProfiles(saved)
      }
    } catch {}
  }, [])

  const save = (updated: CompanyProfile[]) => {
    setProfiles(updated)
    localStorage.setItem('company_profiles', JSON.stringify(updated))
  }

  const openAdd = () => {
    setEditTarget(null)
    setForm(newProfile())
    setDialogOpen(true)
  }

  const openEdit = (p: CompanyProfile) => {
    setEditTarget(p)
    setForm({ name: p.name, address: p.address, phone: p.phone, email: p.email, taxId: p.taxId, logoDataUrl: p.logoDataUrl, isDefault: p.isDefault, defaultEntity: p.defaultEntity ?? 'PTT' })
    setDialogOpen(true)
  }

  const handleSave = () => {
    if (!form.name.trim()) return
    if (editTarget) {
      save(profiles.map((p) => (p.id === editTarget.id ? { ...form, id: editTarget.id } : p)))
    } else {
      const id = `profile_${Date.now()}`
      const isFirst = profiles.length === 0
      save([...profiles, { ...form, id, isDefault: isFirst || form.isDefault }])
    }
    setDialogOpen(false)
  }

  const handleDelete = (id: string) => {
    if (!confirm(t.confirmDelete)) return
    save(profiles.filter((p) => p.id !== id))
  }

  const handleSetDefault = (id: string) => {
    save(profiles.map((p) => ({ ...p, isDefault: p.id === id })))
  }

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    if (file.size > 500 * 1024) { alert('Logo must be < 500KB'); return }
    const reader = new FileReader()
    reader.onload = () => setForm((f) => ({ ...f, logoDataUrl: reader.result as string }))
    reader.readAsDataURL(file)
  }

  const locale = useLocaleStore((s) => s.locale)
  const latest = CHANGELOG[0]

  // Catalog upload state
  const [catalogStatus, setCatalogStatus] = useState<{
    uploaded: boolean
    sourceFile?: string | null
    counts?: Record<string, number> | null
    updatedAt?: string | null
  } | null>(null)
  const [uploading, setUploading] = useState(false)
  const [uploadResult, setUploadResult] = useState<
    { ok: true; counts: Record<string, number>; sourceFile: string } | { ok: false; error: string } | null
  >(null)
  const catalogFileRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    fetch('/api/catalog/status')
      .then((r) => r.json())
      .then(setCatalogStatus)
      .catch(() => setCatalogStatus({ uploaded: false }))
  }, [])

  const handleCatalogUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setUploading(true)
    setUploadResult(null)
    try {
      const fd = new FormData()
      fd.append('file', file)
      const res = await fetch('/api/catalog/upload', { method: 'POST', body: fd })
      const json = await res.json()
      if (res.ok && json.ok) {
        setUploadResult({ ok: true, counts: json.counts, sourceFile: json.sourceFile })
        setCatalogStatus({
          uploaded: true,
          sourceFile: json.sourceFile,
          counts: json.counts,
          updatedAt: new Date().toISOString(),
        })
      } else {
        setUploadResult({ ok: false, error: json.error ?? 'Unknown error' })
      }
    } catch (err) {
      setUploadResult({ ok: false, error: (err as Error).message })
    } finally {
      setUploading(false)
      if (catalogFileRef.current) catalogFileRef.current.value = ''
    }
  }

  return (
    <div className="p-4 sm:p-6 max-w-3xl">
      {/* Version Info */}
      <section className="mb-6 bg-white border border-gray-200 rounded-lg p-4">
        <div className="flex items-center justify-between flex-wrap gap-2 mb-3">
          <h2 className="text-base font-semibold text-gray-800">{t.versionTitle}</h2>
          <div className="flex items-center gap-2 text-xs text-gray-500">
            <span>{t.currentVersion}</span>
            <Badge variant="green">v{APP_VERSION}</Badge>
            {latest && (
              <span className="text-gray-400">
                · {t.released} {latest.date}
              </span>
            )}
          </div>
        </div>
        <div className="text-xs font-medium text-gray-500 mb-2">{t.changelogTitle}</div>
        <ol className="space-y-3">
          {CHANGELOG.map((entry) => (
            <li key={entry.version} className="border-l-2 border-brand-500 pl-3">
              <div className="flex items-baseline gap-2 flex-wrap">
                <span className="font-mono text-sm font-semibold text-gray-800">
                  v{entry.version}
                </span>
                <span className="text-xs text-gray-400">{entry.date}</span>
              </div>
              <ul className="mt-1 space-y-0.5 text-xs text-gray-600 list-disc list-inside">
                {entry.highlights.map((h, i) => (
                  <li key={i}>{locale === 'zh' ? h.zh : h.en}</li>
                ))}
              </ul>
            </li>
          ))}
        </ol>
      </section>

      {/* Catalog Upload */}
      <section className="mb-6 bg-white border border-gray-200 rounded-lg p-4">
        <div className="flex items-center justify-between flex-wrap gap-2 mb-2">
          <h2 className="text-base font-semibold text-gray-800">{t.catalogTitle}</h2>
          <Button
            size="sm"
            onClick={() => catalogFileRef.current?.click()}
            disabled={uploading}
          >
            {uploading ? t.uploading : t.chooseFile}
          </Button>
          <input
            ref={catalogFileRef}
            type="file"
            accept=".xlsx"
            className="hidden"
            onChange={handleCatalogUpload}
          />
        </div>
        <p className="text-xs text-gray-500 mb-3">{t.catalogDescription}</p>

        {catalogStatus && (
          <div className="text-xs text-gray-600 space-y-1">
            {catalogStatus.uploaded ? (
              <>
                <div className="flex items-baseline gap-2 flex-wrap">
                  <span className="font-medium">{t.lastUpdated}:</span>
                  <span className="font-mono text-gray-500">
                    {catalogStatus.updatedAt
                      ? new Date(catalogStatus.updatedAt).toLocaleString()
                      : '—'}
                  </span>
                  {catalogStatus.sourceFile && (
                    <span className="text-gray-400">· {catalogStatus.sourceFile}</span>
                  )}
                </div>
                {catalogStatus.counts && (
                  <div className="flex flex-wrap gap-x-3 gap-y-1 text-gray-500 mt-1">
                    {Object.entries(catalogStatus.counts).map(([k, v]) => (
                      <span key={k}>
                        <span className="text-gray-400">{k}:</span>{' '}
                        <span className="font-mono">{v}</span>
                      </span>
                    ))}
                  </div>
                )}
              </>
            ) : (
              <span className="text-gray-400">{t.bundledCatalog}</span>
            )}
          </div>
        )}

        {uploadResult && (
          <div
            className={
              'mt-3 text-xs rounded p-2 ' +
              (uploadResult.ok
                ? 'bg-green-50 text-green-700 border border-green-200'
                : 'bg-red-50 text-red-700 border border-red-200')
            }
          >
            {uploadResult.ok ? (
              <>
                <span className="font-medium">{t.uploadSuccess}:</span>{' '}
                {uploadResult.sourceFile}
              </>
            ) : (
              <>
                <span className="font-medium">{t.uploadFailed}:</span>{' '}
                {uploadResult.error}
              </>
            )}
          </div>
        )}
      </section>

      <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
        <h1 className="text-lg font-semibold text-gray-800">{t.settingsTitle}</h1>
        <Button onClick={openAdd} size="sm">{t.addProfile}</Button>
      </div>

      {profiles.length === 0 && (
        <div className="text-gray-400 text-sm py-8 text-center border border-dashed border-gray-200 rounded-lg">
          No profiles yet. Click Add to create one.
        </div>
      )}

      <div className="space-y-3">
        {profiles.map((p) => (
          <div key={p.id} className="bg-white border border-gray-200 rounded-lg p-4 flex flex-col sm:flex-row sm:items-start gap-3 sm:gap-4">
            {p.logoDataUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={p.logoDataUrl} alt="logo" className="w-14 h-14 object-contain rounded border border-gray-100 shrink-0" />
            ) : (
              <div className="w-14 h-14 bg-gray-50 rounded border border-gray-100 flex items-center justify-center text-gray-300 text-xs shrink-0">Logo</div>
            )}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <span className="font-semibold text-gray-800">{p.name}</span>
                {p.isDefault && <Badge variant="green">{t.default}</Badge>}
              </div>
              <div className="text-xs text-gray-500 mt-0.5 space-y-0.5">
                {p.address && <div>{p.address}</div>}
                <div className="flex gap-3">
                  {p.phone && <span>{p.phone}</span>}
                  {p.email && <span>{p.email}</span>}
                  {p.taxId && <span>Tax: {p.taxId}</span>}
                </div>
              </div>
            </div>
            <div className="flex flex-wrap gap-2 sm:shrink-0">
              {!p.isDefault && (
                <Button size="sm" variant="ghost" onClick={() => handleSetDefault(p.id)}>{t.setDefault}</Button>
              )}
              <Button size="sm" variant="secondary" onClick={() => openEdit(p)}>{t.editProfile}</Button>
              <Button size="sm" variant="danger" onClick={() => handleDelete(p.id)}>{t.deleteProfile}</Button>
            </div>
          </div>
        ))}
      </div>

      <Dialog
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
        title={editTarget ? t.editProfile : t.addProfile}
      >
        <div className="space-y-3">
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">{t.companyName} *</label>
            <Input
              value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              placeholder="Partner Tech Corp."
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">{t.address}</label>
            <Textarea
              value={form.address}
              onChange={(e) => setForm((f) => ({ ...f, address: e.target.value }))}
              rows={2}
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">{t.phone}</label>
              <Input value={form.phone} onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))} />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">{t.email}</label>
              <Input value={form.email} onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))} />
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">{t.taxId}</label>
            <Input value={form.taxId} onChange={(e) => setForm((f) => ({ ...f, taxId: e.target.value }))} />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">{t.logo}</label>
            <div className="flex items-center gap-3">
              {form.logoDataUrl && (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={form.logoDataUrl} alt="logo preview" className="w-12 h-12 object-contain border border-gray-100 rounded" />
              )}
              <Button size="sm" variant="secondary" onClick={() => fileRef.current?.click()}>
                {t.uploadLogo}
              </Button>
              {form.logoDataUrl && (
                <Button size="sm" variant="ghost" onClick={() => setForm((f) => ({ ...f, logoDataUrl: null }))}>
                  Remove
                </Button>
              )}
              <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleLogoUpload} />
            </div>
            <p className="text-xs text-gray-400 mt-1">Max 500KB. Will be embedded in exports.</p>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">{t.quoteEntity}</label>
            <select
              value={form.defaultEntity ?? 'PTT'}
              onChange={(e) => setForm((f) => ({ ...f, defaultEntity: e.target.value as QuoteEntity }))}
              className="w-full border border-gray-300 rounded px-2 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-brand-500"
            >
              <option value="PTT">{t.entityPTT}</option>
              <option value="PTC">{t.entityPTC}</option>
            </select>
          </div>
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="isDefault"
              checked={form.isDefault}
              onChange={(e) => setForm((f) => ({ ...f, isDefault: e.target.checked }))}
              className="accent-brand-600"
            />
            <label htmlFor="isDefault" className="text-xs text-gray-600">{t.setDefault}</label>
          </div>
          <div className="flex gap-2 justify-end pt-2">
            <Button variant="secondary" onClick={() => setDialogOpen(false)}>{t.cancel}</Button>
            <Button onClick={handleSave}>{t.save}</Button>
          </div>
        </div>
      </Dialog>
    </div>
  )
}
