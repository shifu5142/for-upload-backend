import { pgTable, timestamp, uuid, varchar } from "drizzle-orm/pg-core";

export const createBaseColumns = () => ({
  id: uuid("id").defaultRandom().primaryKey(),
  createdAt: timestamp("created_at", { mode: "date", withTimezone: true })
    .defaultNow()
    .notNull(),
  updatedAt: timestamp("updated_at", { mode: "date", withTimezone: true })
    .defaultNow()
    .$onUpdateFn(() => new Date())
    .notNull(),
});
export const promptsData = pgTable("promptsData", {
  ...createBaseColumns(),
  category: varchar("category", { length: 255 }).notNull(),
  prompt: varchar("prompt", { length: 255 }).notNull(),
});
