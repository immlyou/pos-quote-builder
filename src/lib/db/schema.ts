import {
  pgTable,
  uuid,
  text,
  timestamp,
  date,
  integer,
  numeric,
  jsonb,
  index,
} from 'drizzle-orm/pg-core'

export const customers = pgTable('customers', {
  id: uuid('id').primaryKey().defaultRandom(),
  code: text('code').unique(),
  name: text('name').notNull(),
  contact: text('contact'),
  email: text('email'),
  phone: text('phone'),
  address: text('address'),
  notes: text('notes'),
  tags: text('tags').array().default([]).notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
})

export const quotes = pgTable(
  'quotes',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    quoteNumber: text('quote_number').unique().notNull(),
    customerId: uuid('customer_id').references(() => customers.id, { onDelete: 'set null' }),
    customerNameSnapshot: text('customer_name_snapshot'),
    status: text('status').default('draft').notNull(),
    date: date('date').notNull(),
    expiresAt: date('expires_at'),
    preparedBy: text('prepared_by'),
    notes: text('notes'),
    profileSnapshot: jsonb('profile_snapshot'),
    selections: jsonb('selections').notNull(),
    totals: jsonb('totals').notNull(),
    grandTotal: numeric('grand_total', { precision: 14, scale: 2 }).notNull(),
    parentQuoteId: uuid('parent_quote_id'),
    revision: integer('revision').default(1).notNull(),
    shareToken: uuid('share_token').unique(),
    sharedAt: timestamp('shared_at', { withTimezone: true }),
    customerRespondedAt: timestamp('customer_responded_at', { withTimezone: true }),
    emailedAt: timestamp('emailed_at', { withTimezone: true }),
    emailedTo: text('emailed_to'),
    sentAt: timestamp('sent_at', { withTimezone: true }),
    nextFollowupAt: date('next_followup_at'),
    viewCount: integer('view_count').default(0).notNull(),
    lastViewedAt: timestamp('last_viewed_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => ({
    customerIdx: index('quotes_customer_idx').on(t.customerId),
    dateIdx: index('quotes_date_idx').on(t.date),
    statusIdx: index('quotes_status_idx').on(t.status),
  })
)

export const appCatalog = pgTable('app_catalog', {
  id: integer('id').primaryKey(),
  data: jsonb('data').notNull(),
  sourceFile: text('source_file'),
  uploadedBy: text('uploaded_by'),
  counts: jsonb('counts'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
})

export type Customer = typeof customers.$inferSelect
export type NewCustomer = typeof customers.$inferInsert
export type Quote = typeof quotes.$inferSelect
export type NewQuote = typeof quotes.$inferInsert
export type AppCatalog = typeof appCatalog.$inferSelect
