import { relations } from "drizzle-orm";

import { workspaces } from "./schema";
import { users } from "../users/schema";
import { categories } from "../categories/schema";
import { playbooks } from "../playbook/schema";
import { attachments } from "../attachments/schema";
import { publishedConfigurations } from "../published-configuration/schema";

export const workspacesRelations = relations(workspaces, ({ many }) => ({
  users: many(users),
  categories: many(categories),
  playbooks: many(playbooks),
  attachments: many(attachments),
  publishedConfigurations: many(publishedConfigurations),
}));
