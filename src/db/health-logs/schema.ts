import { pgEnum, pgTable, timestamp, uuid, varchar } from "drizzle-orm/pg-core";
export const healthLogs = pgTable("health_logs", {
  id: uuid("id").defaultRandom().primaryKey(),
  endpoint: varchar("endpoint", { length: 128 }).notNull(),
  status: varchar("status", { enum: ["ok"], length: 16 }).notNull(),
  createdAt: timestamp("created_at", { mode: "date", withTimezone: true })
    .defaultNow()
    .notNull(),
});

export type HealthLog = typeof healthLogs.$inferSelect;
export type NewHealthLog = typeof healthLogs.$inferInsert;
// ====================
// ENUMS
// ====================
