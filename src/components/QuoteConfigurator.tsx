'use client'

import { useQuoteStore } from '@/store/quote'
import { SectionA } from './SectionA'
import { SectionB } from './SectionB'
import { SectionC } from './SectionC'
import { SectionD } from './SectionD'
import { SectionE } from './SectionE'
import { SummaryPanel } from './SummaryPanel'
import type { Catalog } from '@/types/catalog'

interface Props {
  catalog: Catalog
}

export function QuoteConfigurator({ catalog }: Props) {
  const { selectedModel } = useQuoteStore()

  const currentModel = selectedModel
    ? catalog.models.find((m) => m.id === selectedModel.modelId) ?? null
    : null

  return (
    <div className="flex flex-col lg:flex-row gap-3 lg:gap-4 p-3 lg:p-4 lg:h-[calc(100vh-44px)]">
      {/* Left: sections */}
      <div className="flex-1 lg:overflow-y-auto space-y-3 lg:pr-1 order-2 lg:order-1">
        <SectionA models={catalog.models} />
        <SectionB optionals={catalog.optionals} />
        <SectionC
          peripherals={catalog.peripherals}
          modelSeries={currentModel?.series ?? null}
        />
        <SectionD
          licenses={catalog.licenses}
          modelPlatform={currentModel?.platform ?? null}
        />
        <SectionE
          m10={catalog.m10}
          kds={catalog.kds}
          stands={catalog.stands}
          ioBox={catalog.io_box}
          paymentBrackets={catalog.payment_brackets}
          iot={catalog.iot}
        />
      </div>

      {/* Right (desktop) / Top (mobile): summary */}
      <div className="w-full lg:w-64 lg:shrink-0 lg:overflow-y-auto order-1 lg:order-2">
        <SummaryPanel models={catalog.models} />
      </div>
    </div>
  )
}
