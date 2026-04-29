'use client'

import { useLocaleStore } from '@/store/locale'
import { useQuoteStore } from '@/store/quote'
import { formatUSD } from '@/lib/utils'
import { Section, Badge, QtyInput } from './ui'
import type { License } from '@/types/catalog'

interface Props {
  licenses: License[]
  modelPlatform: string | null
}

function getPlatformHint(platform: string | null): { label: string; variant: 'blue' | 'yellow' | 'gray' } | null {
  if (!platform) return null
  const p = platform.toLowerCase()
  if (p.includes('i7') || p.includes('i9') || p.includes('i5')) return { label: 'High End', variant: 'blue' }
  if (p.includes('j6412') || p.includes('atom') || p.includes('n200') || p.includes('j') || p.includes('n')) return { label: 'Entry', variant: 'gray' }
  return { label: 'Value', variant: 'yellow' }
}

// Extract first line of description for display
function shortDesc(desc: string): string {
  return desc.split('\n')[0].trim()
}

export function SectionD({ licenses, modelPlatform }: Props) {
  const { t } = useLocaleStore()
  const { selectedLicenses, setLicenseQty } = useQuoteStore()
  const hint = getPlatformHint(modelPlatform)

  return (
    <Section title={t.licenses} badge={selectedLicenses.length}>
      <div className="p-4 space-y-2">
        {hint && (
          <div className="flex items-center gap-2 text-xs text-gray-500 mb-2">
            <span>{t.platformHint}:</span>
            <Badge variant={hint.variant}>{hint.label}</Badge>
            <span className="text-gray-400">(based on {modelPlatform})</span>
          </div>
        )}

        {licenses.map((lic, i) => {
          const selected = selectedLicenses.find((s) => s.index === i)
          const qty = selected?.qty ?? 0
          return (
            <div key={i} className="flex items-start gap-3 px-3 py-2 rounded hover:bg-gray-50 text-xs">
              <QtyInput
                value={qty}
                min={0}
                onChange={(v) => setLicenseQty(i, v, {
                  index: i,
                  description: shortDesc(lic.description),
                  pn: lic.pn ?? '',
                  itp: lic.itp ?? 0,
                })}
                className="mt-0.5"
              />
              <div className="flex-1 min-w-0">
                <div className="font-medium leading-snug">{shortDesc(lic.description)}</div>
                {lic.description.includes('\n') && (
                  <div className="text-gray-400 text-xs mt-0.5 line-clamp-2">
                    {lic.description.split('\n').slice(1).join(' ').trim()}
                  </div>
                )}
                {lic.pn && <div className="text-gray-400 mt-0.5">{t.pn}: {lic.pn}</div>}
                <div className="text-gray-400">{lic.category}</div>
              </div>
              {lic.remark && <span className="text-gray-400 shrink-0 max-w-[140px]">{lic.remark}</span>}
              <div className="shrink-0 text-right w-24">
                {lic.itp != null ? (
                  <>
                    <div className="font-mono font-semibold">{formatUSD(lic.itp)}</div>
                    {qty > 0 && <div className="text-gray-400">×{qty} = {formatUSD(lic.itp * qty)}</div>}
                  </>
                ) : <span className="text-gray-400">—</span>}
              </div>
            </div>
          )
        })}
      </div>
    </Section>
  )
}
