import { Injectable, NotFoundException } from "@nestjs/common";
import { and, eq, isNull } from "drizzle-orm";
import { getDatabase } from "src/db/database";
import { categories } from "src/db/categories/schema";
import { playbooks } from "src/db/playbook/schema";
import { workspaces } from "src/db/workspace/schema";
import prompts from "../lib/prompts.json";
import type {
  CategoryPublishDto,
  PromptCategory,
  PromptItem,
} from "./dto/get-prompts.dto";

const catalog = prompts as PromptCategory[];
const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const isUuid = (value: string) => UUID_PATTERN.test(value);

type PlaybookRow = {
  id?: string;
  name?: string;
  button_label?: string | null;
  prompt?: string;
};

@Injectable()
export class PromptsDataService {
  async getPrompt(categoryId: string, subcategoryId: string, itemId: string) {
    const fromDatabase =
      isUuid(categoryId) && isUuid(subcategoryId)
        ? await this.getPromptByUuids(categoryId, subcategoryId, itemId)
        : await this.getPromptByCatalogIds(categoryId, subcategoryId, itemId);

    if (fromDatabase) {
      return fromDatabase;
    }

    const fromCatalog = this.findCatalogItem(categoryId, subcategoryId, itemId);
    if (fromCatalog) {
      return fromCatalog;
    }

    throw new NotFoundException("Prompt not found");
  }

  async categoryPublish(body: CategoryPublishDto) {
    const database = getDatabase();
    const workspaceId = await this.resolveWorkspaceId(body.workspaceId);

    const [parent] = await database
      .insert(categories)
      .values({
        workspaceId,
        name: body.name,
        icon: body.icon ?? null,
        position: 0,
        active: true,
        parentCategoryId: null,
      })
      .returning({
        id: categories.id,
        name: categories.name,
        icon: categories.icon,
      });

    if (!parent) {
      throw new Error("Failed to insert parent category");
    }

    const publishedSubcategories = [];

    for (const [subcategoryIndex, subcategory] of (
      body.subcategories ?? []
    ).entries()) {
      const [sub] = await database
        .insert(categories)
        .values({
          workspaceId,
          name: subcategory.name,
          icon: subcategory.icon ?? null,
          position: subcategoryIndex,
          active: true,
          parentCategoryId: parent.id,
        })
        .returning({
          id: categories.id,
          name: categories.name,
          parent_category_id: categories.parentCategoryId,
        });

      if (!sub) {
        throw new Error("Failed to insert subcategory");
      }

      const items = subcategory.items ?? [];
      let publishedItems: PlaybookRow[] = [];

      if (items.length > 0) {
        publishedItems = await database
          .insert(playbooks)
          .values(
            items.map((item, itemIndex) => ({
              workspaceId,
              categoryId: sub.id,
              name: item.label ?? item.id,
              buttonLabel: item.label,
              prompt: item.prompt ?? "",
              position: itemIndex,
              active: true,
              autoSend: false,
            })),
          )
          .returning({
            id: playbooks.id,
            category_id: playbooks.categoryId,
            name: playbooks.name,
            button_label: playbooks.buttonLabel,
            prompt: playbooks.prompt,
          });
      }

      publishedSubcategories.push({
        ...sub,
        items: publishedItems,
      });
    }

    return {
      ...parent,
      subcategories: publishedSubcategories,
    };
  }

  private async resolveWorkspaceId(workspaceId?: string) {
    if (workspaceId && isUuid(workspaceId)) {
      return workspaceId;
    }

    const database = getDatabase();
    const [existing] = await database
      .select({ id: workspaces.id })
      .from(workspaces)
      .limit(1);
    if (existing?.id) {
      return existing.id;
    }

    const [created] = await database
      .insert(workspaces)
      .values({ name: "default" })
      .returning({ id: workspaces.id });
    if (!created?.id) {
      throw new Error("Failed to create workspace");
    }

    return created.id;
  }

  private findCatalogItem(
    categoryId: string,
    subcategoryId: string,
    itemId: string,
  ): PromptItem | null {
    const category = catalog.find((entry) => entry.id === categoryId);
    const subcategory = category?.subcategories.find(
      (entry) => entry.id === subcategoryId,
    );
    return subcategory?.items.find((item) => item.id === itemId) ?? null;
  }

  private async getPromptByUuids(
    categoryId: string,
    subcategoryId: string,
    itemId: string,
  ) {
    const filters = [
      eq(playbooks.categoryId, subcategoryId),
      eq(categories.parentCategoryId, categoryId),
      eq(playbooks.active, true),
    ];
    if (isUuid(itemId)) {
      filters.push(eq(playbooks.id, itemId));
    }

    const data = await getDatabase()
      .select({
        id: playbooks.id,
        name: playbooks.name,
        button_label: playbooks.buttonLabel,
        prompt: playbooks.prompt,
      })
      .from(playbooks)
      .innerJoin(categories, eq(playbooks.categoryId, categories.id))
      .where(and(...filters));

    return this.toPromptItem(this.pickPlaybook(data, itemId), itemId);
  }

  private async getPromptByCatalogIds(
    categoryId: string,
    subcategoryId: string,
    itemId: string,
  ) {
    const catalogItem = this.findCatalogItem(categoryId, subcategoryId, itemId);
    const category = catalog.find((entry) => entry.id === categoryId);
    const subcategory = category?.subcategories.find(
      (entry) => entry.id === subcategoryId,
    );
    if (!category || !subcategory) {
      return null;
    }

    const database = getDatabase();
    const [parent] = await database
      .select({ id: categories.id })
      .from(categories)
      .where(
        and(eq(categories.name, category.name), isNull(categories.parentCategoryId)),
      )
      .limit(1);

    const parentId = parent?.id;
    if (!parentId) {
      return null;
    }

    const [child] = await database
      .select({ id: categories.id })
      .from(categories)
      .where(
        and(
          eq(categories.name, subcategory.name),
          eq(categories.parentCategoryId, parentId),
        ),
      )
      .limit(1);

    const childId = child?.id;
    if (!childId) {
      return null;
    }

    const playbookRows = await database
      .select({
        id: playbooks.id,
        name: playbooks.name,
        button_label: playbooks.buttonLabel,
        prompt: playbooks.prompt,
      })
      .from(playbooks)
      .where(and(eq(playbooks.categoryId, childId), eq(playbooks.active, true)));

    return this.toPromptItem(
      this.pickPlaybook(playbookRows, itemId, catalogItem),
      itemId,
      catalogItem,
    );
  }

  private pickPlaybook(
    rows: PlaybookRow[],
    itemId: string,
    catalogItem?: PromptItem | null,
  ): PlaybookRow | null {
    if (rows.length === 0) {
      return null;
    }

    const match =
      rows.find((row) => row.id === itemId) ??
      rows.find((row) => row.button_label === itemId) ??
      rows.find(
        (row) =>
          Boolean(catalogItem) &&
          (row.name === catalogItem?.label ||
            row.button_label === catalogItem?.label),
      );

    if (match) {
      return match;
    }

    return rows.length === 1 ? (rows[0] ?? null) : null;
  }

  private toPromptItem(
    row: PlaybookRow | null,
    itemId: string,
    catalogItem?: PromptItem | null,
  ) {
    if (!row?.prompt) {
      return null;
    }

    return {
      id: row.id ?? itemId,
      label: row.name ?? catalogItem?.label ?? itemId,
      prompt: row.prompt,
    };
  }

}
