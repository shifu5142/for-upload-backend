import { pgTable, text, timestamp, uuid, varchar } from "drizzle-orm/pg-core";

import { workspaces } from "../workspace/schema";
import { playbooks } from "../playbook/schema";

export const attachments = pgTable("attachments", {
  id: uuid("id").defaultRandom().primaryKey(),

  workspaceId: uuid("workspace_id")
    .notNull()
    .references(() => workspaces.id, {
      onDelete: "cascade",
    }),

  playbookId: uuid("playbook_id")
    .notNull()
    .references(() => playbooks.id, {
      onDelete: "cascade",
    }),

  fileName: varchar("file_name", {
    length: 255,
  }).notNull(),

  fileUrl: text("file_url").notNull(),

  fileType: varchar("file_type", {
    length: 100,
  }),

  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export type Attachment = typeof attachments.$inferSelect;
export type NewAttachment = typeof attachments.$inferInsert;
