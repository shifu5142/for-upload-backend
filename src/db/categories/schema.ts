import {
  boolean,
  integer,
  pgTable,
  timestamp,
  uuid,
  varchar,
} from "drizzle-orm/pg-core";

import { workspaces } from "../workspace/schema";

export const categories = pgTable("categories", {
  id: uuid("id").defaultRandom().primaryKey(),

  workspaceId: uuid("workspace_id")
    .notNull()
    .references(() => workspaces.id, {
      onDelete: "cascade",
    }),

  parentCategoryId: uuid("parent_category_id"),

  name: varchar("name", {
    length: 255,
  }).notNull(),

  icon: varchar("icon", {
    length: 255,
  }),

  position: integer("position").notNull().default(0),

  active: boolean("active").notNull().default(true),

  createdAt: timestamp("created_at").defaultNow().notNull(),

  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export type Category = typeof categories.$inferSelect;
export type NewCategory = typeof categories.$inferInsert;
