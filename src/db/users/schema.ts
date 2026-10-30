import { pgEnum, pgTable, timestamp, uuid, varchar } from "drizzle-orm/pg-core";

import { workspaces } from "../workspace/schema";

export const userRoleEnum = pgEnum("user_role", ["admin", "sales_rep"]);

export const users = pgTable("users", {
  id: uuid("id").defaultRandom().primaryKey(),

  workspaceId: uuid("workspace_id")
    .notNull()
    .references(() => workspaces.id, {
      onDelete: "cascade",
    }),

  email: varchar("email", {
    length: 255,
  })
    .notNull()
    .unique(),

  name: varchar("name", {
    length: 255,
  }),

  role: userRoleEnum("role").notNull().default("sales_rep"),

  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;
