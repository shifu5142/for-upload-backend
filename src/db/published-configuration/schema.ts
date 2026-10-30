import { integer, json, pgTable, timestamp, uuid } from "drizzle-orm/pg-core";

import { workspaces } from "../workspace/schema";
import { users } from "../users/schema";

export const publishedConfigurations = pgTable("published_configurations", {
  id: uuid("id").defaultRandom().primaryKey(),

  workspaceId: uuid("workspace_id")
    .notNull()
    .references(() => workspaces.id, {
      onDelete: "cascade",
    }),

  version: integer("version").notNull(),

  publishedAt: timestamp("published_at").defaultNow().notNull(),

  publishedBy: uuid("published_by")
    .notNull()
    .references(() => users.id),

  configuration: json("configuration").notNull(),
});

export type PublishedConfiguration =
  typeof publishedConfigurations.$inferSelect;

export type NewPublishedConfiguration =
  typeof publishedConfigurations.$inferInsert;
