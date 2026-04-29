'use client'

import { useState, useMemo } from 'react'
import { useLocaleStore } from '@/store/locale'
import { useQuoteStore } from '@/store/quote'
import { cn, seriesLabel, formatUSD } from '@/lib/utils'
import { Select, Section, Badge } from './ui'
import type { Model } from '@/types/catalog'

interface Props {
  models: Model[]
}

const SERIES_ORDER = ['A_E', 'G', 'J14', 'C', 'BOX_ALFA']

export function SectionA({ models }: Props) {
  const { t } = useLocaleStore()
  const { selectedModel, setModel } = useQuoteStore()
  const [filterSeries, setFilterSeries] = useState('')
  const [filterTerminal, setFilterTerminal] = useState('')
  const [filterPlatform, setFilterPlatform] = useState('')

  const seriesList = useMemo(() =>
    SERIES_ORDER.filter((s) => models.some((m) => m.series === s)),
    [models]
  )

  const terminalList = useMemo(() => {
    const base = filterSeries ? models.filter((m) => m.series === filterSeries) : models
    return [...new Set(base.map((m) => m.terminal))].sort()
  }, [models, filterSeries])

  const platformList = useMemo(() => {
    let base = filterSeries ? models.filter((m) => m.series === filterSeries) : models
    if (filterTerminal) base = base.filter((m) => m.terminal === filterTerminal)
    return [...new Set(base.map((m) => m.platform))].filter(Boolean).sort() as string[]
  }, [models, filterSeries, filterTerminal])

  const filtered = useMemo(() => {
    return models.filter((m) => {
      if (filterSeries && m.series !== filterSeries) return false
      if (filterTerminal && m.terminal !== filterTerminal) return false
      if (filterPlatform && m.platform !== filterPlatform) return false
      return true
    })
  }, [models, filterSeries, filterTerminal, filterPlatform])

  const currentModel = selectedModel
    ? models.find((m) => m.id === selectedModel.modelId)
    : null

  const handleSeriesChange = (s: string) => {
    setFilterSeries(s)
    setFilterTerminal('')
    setFilterPlatform('')
  }

  const handleTerminalChange = (t: string) => {
    setFilterTerminal(t)
    setFilterPlatform('')
  }

  return (
    <Section title={t.modelSelection} badge={currentModel ? 1 : 0}>
      <div className="p-4 space-y-4">
        {/* Filters */}
        <div className="flex flex-wrap gap-3">
          <div className="flex flex-col gap-1 min-w-[130px]">
            <label className="text-xs text-gray-500">{t.series}</label>
            <Select value={filterSeries} onChange={(e) => handleSeriesChange(e.target.value)}>
              <option value="">{t.allSeries}</option>
              {seriesList.map((s) => (
                <option key={s} value={s}>{seriesLabel(s)}</option>
              ))}
            </Select>
          </div>
          <div className="flex flex-col gap-1 min-w-[130px]">
            <label className="text-xs text-gray-500">{t.terminal}</label>
            <Select value={filterTerminal} onChange={(e) => handleTerminalChange(e.target.value)}>
              <option value="">{t.allTerminals}</option>
              {terminalList.map((t) => (
                <option key={t} value={t}>{t}</option>
              ))}
            </Select>
          </div>
          <div className="flex flex-col gap-1 min-w-[160px]">
            <label className="text-xs text-gray-500">{t.platform}</label>
            <Select value={filterPlatform} onChange={(e) => setFilterPlatform(e.target.value)}>
              <option value="">{t.allPlatforms}</option>
              {platformList.map((p) => (
                <option key={p} value={p}>{p}</option>
              ))}
            </Select>
          </div>
          {(filterSeries || filterTerminal || filterPlatform) && (
            <button
              onClick={() => { setFilterSeries(''); setFilterTerminal(''); setFilterPlatform('') }}
              className="mt-5 text-xs text-gray-400 hover:text-gray-600 underline self-end"
            >
              Clear
            </button>
          )}
        </div>

        <div className="flex gap-4">
          {/* Model table */}
          <div className="flex-1 overflow-x-auto">
            <table className="w-full text-xs border-collapse">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-200">
                  <th className="text-left px-2 py-2 font-medium text-gray-600 w-4"></th>
                  <th className="text-left px-2 py-2 font-medium text-gray-600">{t.terminalCol}</th>
                  <th className="text-left px-2 py-2 font-medium text-gray-600">{t.platformCol}</th>
                  <th className="text-left px-2 py-2 font-medium text-gray-600">{t.sizeCol}</th>
                  <th className="text-left px-2 py-2 font-medium text-gray-600">{t.ramCol}</th>
                  <th className="text-left px-2 py-2 font-medium text-gray-600">{t.storageCol}</th>
                  <th className="text-left px-2 py-2 font-medium text-gray-600">{t.adaptorCol}</th>
                  <th className="text-left px-2 py-2 font-medium text-gray-600">{t.baseCol}</th>
                  <th className="text-right px-2 py-2 font-medium text-gray-600">{t.itpCol}</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((m) => {
                  const isSelected = selectedModel?.modelId === m.id
                  return (
                    <tr
                      key={m.id}
                      onClick={() => setModel(isSelected ? null : { modelId: m.id, qty: selectedModel?.qty ?? 1 })}
                      className={cn(
                        'border-b border-gray-100 cursor-pointer transition-colors',
                        isSelected
                          ? 'bg-brand-50 hover:bg-brand-100'
                          : 'hover:bg-gray-50'
                      )}
                    >
                      <td className="px-2 py-1.5">
                        <input type="radio" readOnly checked={isSelected} className="accent-brand-600" />
                      </td>
                      <td className="px-2 py-1.5 font-medium">{m.terminal}</td>
                      <td className="px-2 py-1.5 text-gray-600">{m.platform}</td>
                      <td className="px-2 py-1.5">{m.size ?? '—'}</td>
                      <td className="px-2 py-1.5">{m.ddr4_ram || m.ddr5_ram || '—'}</td>
                      <td className="px-2 py-1.5">{m.storage ?? '—'}</td>
                      <td className="px-2 py-1.5">{m.adaptor ?? '—'}</td>
                      <td className="px-2 py-1.5">{m.base ?? '—'}</td>
                      <td className="px-2 py-1.5 text-right font-mono">
                        {m.itp != null ? formatUSD(m.itp) : '—'}
                      </td>
                    </tr>
                  )
                })}
                {filtered.length === 0 && (
                  <tr>
                    <td colSpan={9} className="text-center py-6 text-gray-400">No results</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Model detail panel */}
          {currentModel && (
            <div className="w-52 shrink-0 bg-gray-50 rounded-lg border border-gray-200 p-3 space-y-2">
              <div className="font-semibold text-gray-800 text-sm">{currentModel.terminal}</div>
              <div className="text-xs text-gray-500">{currentModel.platform}</div>
              <Badge variant="blue">{seriesLabel(currentModel.series)}</Badge>
              <div className="mt-2 space-y-1 text-xs">
                {currentModel.cpu_itp != null && (
                  <div className="flex justify-between">
                    <span className="text-gray-500">{t.cpuItp}</span>
                    <span className="font-mono">{formatUSD(currentModel.cpu_itp)}</span>
                  </div>
                )}
                {currentModel.ram_itp != null && (
                  <div className="flex justify-between">
                    <span className="text-gray-500">{t.ramItp}</span>
                    <span className="font-mono">{formatUSD(currentModel.ram_itp)}</span>
                  </div>
                )}
                {currentModel.ssd_itp != null && (
                  <div className="flex justify-between">
                    <span className="text-gray-500">{t.ssdItp}</span>
                    <span className="font-mono">{formatUSD(currentModel.ssd_itp)}</span>
                  </div>
                )}
                {currentModel.itp_no_ram_ssd != null && (
                  <div className="flex justify-between">
                    <span className="text-gray-500">{t.baseItp}</span>
                    <span className="font-mono">{formatUSD(currentModel.itp_no_ram_ssd)}</span>
                  </div>
                )}
                <div className="flex justify-between border-t border-gray-200 pt-1 font-semibold">
                  <span>{t.totalItp}</span>
                  <span className="font-mono text-brand-700">
                    {currentModel.itp != null ? formatUSD(currentModel.itp) : '—'}
                  </span>
                </div>
              </div>
              {currentModel.remark && (
                <div className="text-xs text-gray-400 italic mt-1">{currentModel.remark}</div>
              )}
            </div>
          )}
        </div>
      </div>
    </Section>
  )
}
