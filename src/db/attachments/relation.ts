import { relations } from "drizzle-orm";
import { attachments } from "./schema";
import { workspaces } from "../workspace/schema";
import { playbooks } from "../playbook/schema";
export const attachmentsRelations = relations(attachments, ({ one }) => ({
  workspace: one(workspaces, {
    fields: [attachments.workspaceId],
    references: [workspaces.id],
  }), // Each attachment belongs to one workspace

  playbook: one(playbooks, {
    fields: [attachments.playbookId],
    references: [playbooks.id],
  }), // Each attachment belongs to one playbook
}));
