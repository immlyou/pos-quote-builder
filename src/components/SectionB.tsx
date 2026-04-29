'use client'

import { useLocaleStore } from '@/store/locale'
import { useQuoteStore } from '@/store/quote'
import { formatUSD } from '@/lib/utils'
import { Section, Badge, QtyInput } from './ui'
import type { Optionals } from '@/types/catalog'

interface Props {
  optionals: Optionals
}

export function SectionB({ optionals }: Props) {
  const { t } = useLocaleStore()
  const {
    selectedUpgrades,
    selectedBaseOptions,
    toggleUpgrade,
    setBaseOptionQty,
  } = useQuoteStore()

  const totalCount = selectedUpgrades.length + selectedBaseOptions.length

  return (
    <Section title={t.upgrades} badge={totalCount}>
      <div className="p-4 space-y-4">
        {/* Upgrades */}
        <div>
          <div className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">{t.upgradesTitle}</div>
          <div className="space-y-1">
            {optionals.upgrades.map((u, i) => {
              const isSelected = selectedUpgrades.some((s) => s.index === i)
              return (
                <label
                  key={i}
                  className="flex items-center gap-3 px-3 py-2 rounded cursor-pointer hover:bg-gray-50 transition-colors"
                >
                  <input
                    type="checkbox"
                    checked={isSelected}
                    onChange={() => toggleUpgrade({
                      index: i,
                      description: u.description,
                      itpAdder: u.itp_adder ?? 0,
                    })}
                    className="accent-brand-600 shrink-0"
                  />
                  <span className="flex-1 text-sm">{u.description}</span>
                  {u.remark && <span className="text-xs text-gray-400">{u.remark}</span>}
                  <span className="font-mono text-xs shrink-0">
                    {u.itp_adder != null ? (
                      <Badge variant={u.itp_adder > 0 ? 'blue' : 'green'}>
                        {u.itp_adder > 0 ? '+' : ''}{formatUSD(u.itp_adder)}
                      </Badge>
                    ) : '—'}
                  </span>
                </label>
              )
            })}
          </div>
        </div>

        {/* Base options */}
        <div>
          <div className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">{t.baseOptionsTitle}</div>
          <div className="space-y-1">
            {optionals.base_options.map((b, i) => {
              const selected = selectedBaseOptions.find((s) => s.index === i)
              const qty = selected?.qty ?? 0
              return (
                <div key={i} className="flex items-center gap-3 px-3 py-2 rounded hover:bg-gray-50">
                  <QtyInput
                    value={qty}
                    onChange={(v) => setBaseOptionQty(i, v, {
                      index: i,
                      description: `${b.type} ${b.description}${b.size ? ' ' + b.size : ''}`,
                      itp: b.itp ?? 0,
                    })}
                  />
                  <span className="flex-1 text-sm">
                    <span className="text-gray-400 text-xs mr-1">[{b.type}]</span>
                    {b.description}{b.size ? ` ${b.size}` : ''}
                  </span>
                  {b.remark && <span className="text-xs text-gray-400">{b.remark}</span>}
                  <span className="font-mono text-xs shrink-0">
                    {b.itp != null ? formatUSD(b.itp) : '—'} ea.
                  </span>
                </div>
              )
            })}
          </div>
        </div>
      </div>
    </Section>
  )
}
