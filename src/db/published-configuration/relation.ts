import { relations } from "drizzle-orm";
import { publishedConfigurations } from "./schema";
import { workspaces } from "../workspace/schema";
import { users } from "../users/schema";

export const publishedConfigurationsRelations = relations(
  publishedConfigurations,
  ({ one }) => ({
    workspace: one(workspaces, {
      fields: [publishedConfigurations.workspaceId],
      references: [workspaces.id],
    }), // Each published configuration belongs to one workspace

    publishedBy: one(users, {
      fields: [publishedConfigurations.publishedBy],
      references: [users.id],
    }), // Each published configuration was published by one user
  }),
);
