import { relations } from "drizzle-orm";
import { categories } from "./schema";
import { workspaces } from "../workspace/schema";
import { playbooks } from "../playbook/schema";
export const categoriesRelations = relations(categories, ({ one, many }) => ({
  workspace: one(workspaces, {
    fields: [categories.workspaceId],
    references: [workspaces.id],
  }), // Each category belongs to one workspace

  parentCategory: one(categories, {
    fields: [categories.parentCategoryId],
    references: [categories.id],
    relationName: "categoryHierarchy",
  }), // A category can have one parent category

  childCategories: many(categories, {
    relationName: "categoryHierarchy",
  }), // A category can have many child categories

  playbooks: many(playbooks), // One category can contain many playbooks
}));
