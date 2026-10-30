import { relations } from "drizzle-orm";
import { playbooks } from "./schema";
import { workspaces } from "../workspace/schema";
import { categories } from "../categories/schema";
import { attachments } from "../attachments/schema";
export const playbooksRelations = relations(playbooks, ({ one, many }) => ({
  workspace: one(workspaces, {
    fields: [playbooks.workspaceId],
    references: [workspaces.id],
  }), // Each playbook belongs to one workspace

  category: one(categories, {
    fields: [playbooks.categoryId],
    references: [categories.id],
  }), // Each playbook belongs to one category

  attachments: many(attachments), // One playbook can have many attachments
}));
