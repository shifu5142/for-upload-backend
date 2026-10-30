import {
  boolean,
  integer,
  pgTable,
  text,
  timestamp,
  uuid,
  varchar,
} from "drizzle-orm/pg-core";

import { workspaces } from "../workspace/schema";
import { categories } from "../categories/schema";

export const playbooks = pgTable("playbooks", {
  id: uuid("id").defaultRandom().primaryKey(),

  workspaceId: uuid("workspace_id")
    .notNull()
    .references(() => workspaces.id, {
      onDelete: "cascade",
    }),

  categoryId: uuid("category_id")
    .notNull()
    .references(() => categories.id, {
      onDelete: "cascade",
    }),

  name: varchar("name", {
    length: 255,
  }).notNull(),

  buttonLabel: varchar("button_label", {
    length: 255,
  }),

  prompt: text("prompt").notNull(),

  icon: varchar("icon", {
    length: 255,
  }),

  position: integer("position").notNull().default(0),

  active: boolean("active").notNull().default(true),

  autoSend: boolean("auto_send").notNull().default(false),

  userId: uuid("user_id").notNull().defaultRandom(),

  createdAt: timestamp("created_at").defaultNow().notNull(),

  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export type Playbook = typeof playbooks.$inferSelect;
export type NewPlaybook = typeof playbooks.$inferInsert;
