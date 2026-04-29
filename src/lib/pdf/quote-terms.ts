import type { QuoteEntity } from '@/types/quote'

export const QUOTE_TERMS: Record<QuoteEntity, string[]> = {
  PTT: [
    '1. Payment: T/T 45 days after shipment',
    '2. Term: FOB Taiwan in USD.',
    '3. Warranty for key components: 12 months based on invoice date',
    "4. All Order placed are subject to confirmation and acceptance by Partner Tech Corp. Prices and availability will be confirmed upon receipt of the customer's order and issuance of a proforma invoice.",
    '5. You hereby commits not to sell or transfer the Products supplied by us, directly or indirectly, to "countries/regions subject to sanction or embargo effect" and/or "entities who are otherwise blacklisted or prohibited" under the export control regulations of European Union, the United States, and/or any other applicable countries/regions.',
  ],
  PTC: [
    '1. Payment: T/T PAYMENT IN ADVANCE',
    '2. Term: FOB Shanghai, China in USD.',
    '3. Warranty for key components: 12 months based on invoice date',
    "4. All Order placed are subject to confirmation and acceptance by Partner Tech Corp. Prices and availability will be confirmed upon receipt of the customer's order and issuance of a proforma invoice.",
  ],
}

export function getTerms(entity: QuoteEntity = 'PTT'): string[] {
  return QUOTE_TERMS[entity]
}
