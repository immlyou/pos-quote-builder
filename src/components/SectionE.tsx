'use client'

import { useState } from 'react'
import { useLocaleStore } from '@/store/locale'
import { useQuoteStore } from '@/store/quote'
import { getTierPrice, formatUSD } from '@/lib/utils'
import { Section, QtyInput, Badge } from './ui'
import type { M10Item, KdsItem, StandItem, IoBoxItem, PaymentBracket, IotItem } from '@/types/catalog'
import { cn } from '@/lib/utils'

interface Props {
  m10: M10Item[]
  kds: KdsItem[]
  stands: StandItem[]
  ioBox: IoBoxItem[]
  paymentBrackets: PaymentBracket[]
  iot: IotItem[]
}

type TabKey = 'm10' | 'kds' | 'stands' | 'ioBox' | 'paymentBrackets' | 'iot'

interface OtherRowProps {
  itemKey: string
  category: string
  description: string
  pn: string
  pricing: Array<{ min_qty: number; price: number }> | null
  itp?: number | null
  remark?: string | null
}

function OtherRow({ itemKey, category, description, pn, pricing, itp, remark }: OtherRowProps) {
  const { t } = useLocaleStore()
  const { selectedOthers, setOtherQty } = useQuoteStore()
  const selected = selectedOthers.find((o) => o.key === itemKey)
  const qty = selected?.qty ?? 0

  const getUnitPrice = (q: number): number => {
    if (pricing && pricing.length > 0) return getTierPrice(pricing, Math.max(q, 1))
    if (itp != null) return itp
    return 0
  }

  const unitPrice = getUnitPrice(Math.max(qty, 1))

  return (
    <div className="flex items-center gap-3 px-3 py-2 rounded hover:bg-gray-50 text-xs">
      <QtyInput
        value={qty}
        onChange={(v) => {
          const up = getUnitPrice(Math.max(v, 1))
          setOtherQty(itemKey, v, {
            key: itemKey,
            category,
            description,
            pn,
            unitPrice: up,
          })
        }}
      />
      <div className="flex-1 min-w-0">
        <div className="font-medium truncate">{description || t.noDescription}</div>
        {pn && <div className="text-gray-400">{t.pn}: {pn}</div>}
      </div>
      {remark && <span className="text-gray-400 text-xs truncate max-w-[120px]">{remark}</span>}
      <div className="shrink-0 text-right w-28">
        {(pricing || itp != null) ? (
          <>
            <div className="font-mono font-semibold">{formatUSD(unitPrice)}</div>
            {qty > 0 && <div className="text-gray-400">×{qty} = {formatUSD(unitPrice * qty)}</div>}
            {pricing && pricing.length > 1 && (
              <div className="text-gray-300 text-[10px]">
                {pricing.map((tier) => `${tier.min_qty}+: $${tier.price}`).join(' | ')}
              </div>
            )}
          </>
        ) : <Badge variant="gray">{t.noPricing}</Badge>}
      </div>
    </div>
  )
}

export function SectionE({ m10, kds, stands, ioBox, paymentBrackets, iot }: Props) {
  const { t } = useLocaleStore()
  const { selectedOthers } = useQuoteStore()
  const [activeTab, setActiveTab] = useState<TabKey>('m10')

  const tabs: { key: TabKey; label: string; count: number }[] = [
    { key: 'm10', label: t.m10, count: m10.length },
    { key: 'kds', label: t.kds, count: kds.length },
    { key: 'stands', label: t.stands, count: stands.length },
    { key: 'ioBox', label: t.ioBox, count: ioBox.length },
    { key: 'paymentBrackets', label: t.paymentBrackets, count: paymentBrackets.length },
    { key: 'iot', label: t.iot, count: iot.length },
  ]

  return (
    <Section title={t.others} badge={selectedOthers.length} defaultOpen={false}>
      {/* Tab bar */}
      <div className="flex border-b border-gray-100 overflow-x-auto">
        {tabs.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={cn(
              'px-3 py-2 text-xs font-medium whitespace-nowrap border-b-2 transition-colors',
              activeTab === tab.key
                ? 'border-brand-600 text-brand-700'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            )}
          >
            {tab.label}
            {tab.count > 0 && <span className="ml-1 text-gray-400">({tab.count})</span>}
          </button>
        ))}
      </div>

      <div className="p-4 space-y-1">
        {activeTab === 'm10' && m10.map((item, i) => {
          const key = `m10__${i}__${item.pn ?? i}`
          return (
            <OtherRow
              key={key}
              itemKey={key}
              category="M10"
              description={item.description ?? item.model}
              pn={item.pn ?? ''}
              pricing={item.pricing}
              remark={item.remark}
            />
          )
        })}

        {activeTab === 'kds' && kds.map((item, i) => {
          const key = `kds__${i}`
          return (
            <OtherRow
              key={key}
              itemKey={key}
              category="KDS"
              description={item.item}
              pn=""
              pricing={item.pricing}
              remark={item.remark}
            />
          )
        })}

        {activeTab === 'stands' && stands.map((item, i) => {
          const key = `stand__${i}`
          return (
            <OtherRow
              key={key}
              itemKey={key}
              category="Stand"
              description={item.description ?? t.noDescription}
              pn=""
              pricing={item.pricing}
              remark={item.remark}
            />
          )
        })}

        {activeTab === 'ioBox' && ioBox.map((item, i) => {
          const key = `iobox__${item.pn ?? i}`
          return (
            <OtherRow
              key={key}
              itemKey={key}
              category="IO Box"
              description={item.description ?? t.noDescription}
              pn={item.pn ?? ''}
              pricing={null}
              itp={item.itp}
              remark={item.remark}
            />
          )
        })}

        {activeTab === 'paymentBrackets' && paymentBrackets.map((item, i) => {
          const key = `bracket__${item.pn ?? i}`
          return (
            <OtherRow
              key={key}
              itemKey={key}
              category="Payment Bracket"
              description={item.description ?? t.noDescription}
              pn={item.pn ?? ''}
              pricing={item.pricing}
              remark={null}
            />
          )
        })}

        {activeTab === 'iot' && iot.map((item, i) => {
          const key = `iot__${i}__${item.pn ?? ''}`
          return (
            <OtherRow
              key={key}
              itemKey={key}
              category={item.category ?? 'IoT'}
              description={`[${item.category ?? ''}] ${item.model ?? ''} ${item.description ?? ''}`.trim()}
              pn={item.pn ?? ''}
              pricing={null}
              itp={item.itp}
              remark={item.remark}
            />
          )
        })}
      </div>
    </Section>
  )
}
