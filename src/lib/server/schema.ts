import { pgTable, uuid, text, timestamp, index } from 'drizzle-orm/pg-core';

export const polls = pgTable(
	'polls',
	{
		id: uuid('id').primaryKey().defaultRandom(),
		encryptedData: text('encrypted_data').notNull(),
		adminTokenHash: text('admin_token_hash').notNull(),
		expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
		createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
		updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull()
	},
	(table) => [index('idx_polls_expires').on(table.expiresAt)]
);

export const responses = pgTable(
	'responses',
	{
		id: uuid('id').primaryKey().defaultRandom(),
		pollId: uuid('poll_id')
			.notNull()
			.references(() => polls.id, { onDelete: 'cascade' }),
		encryptedData: text('encrypted_data').notNull(),
		createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull()
	},
	(table) => [index('idx_responses_poll').on(table.pollId)]
);
