import { relations } from "drizzle-orm";
import { users } from "./schema";
import { workspaces } from "../workspace/schema";
import { publishedConfigurations } from "../published-configuration/schema";
export const usersRelations = relations(users, ({ one, many }) => ({
  workspace: one(workspaces, {
    fields: [users.workspaceId],
    references: [workspaces.id],
  }), // Each user belongs to one workspace

  publishedConfigurations: many(publishedConfigurations), // One user can publish many configurations
}));
