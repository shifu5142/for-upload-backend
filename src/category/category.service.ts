import {
  HttpException,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
  UnauthorizedException,
} from "@nestjs/common";
import { and, asc, desc, eq, inArray, or } from "drizzle-orm";
import { getDatabase } from "src/db/database";
import { categories } from "src/db/categories/schema";
import { playbooks } from "src/db/playbook/schema";
import type { UpdateSubCategoryDto } from "./dto/updateSubCategory.dto";
import { ToggleCategoryDto } from "./dto/togglecategory.dto";
import { CreateSubCategoryDto } from "./dto/CreateSubCategory.dto";
import { AuthService } from "src/auth/auth.service";
import { isAdminUser } from "src/auth/is-admin";
import { UserDto } from "./dto/user.dto";
import { ToggleSubCategoryDto } from "./dto/toggleSubCategory.dto";
import { ReorderSubcategoriesDto } from "./dto/reorder-subcategories.dto";

@Injectable()
export class CategoryService {
  constructor(private readonly authService: AuthService) {}
  async getAllCategories(authorization?: string) {
    let userId: string | null = null;
    let isAdmin = false;
    if (authorization?.trim()) {
      const user = (await this.authService.syncKindeUser(
        authorization,
      )) as unknown as UserDto;
      if (!user.id) {
        throw new UnauthorizedException(
          `User not found — the token was accepted but syncKindeUser did not return an id. Response: ${JSON.stringify(user)}. Call POST /auth/sync-kinde-user and confirm this email exists in the users table`,
        );
      }
      userId = user.id as string;
      isAdmin = isAdminUser(user.role);
    }
    const database = getDatabase();

    const categoryRows = await database
      .select({
        id: categories.id,
        workspaceId: categories.workspaceId,
        parentCategoryId: categories.parentCategoryId,
        name: categories.name,
        icon: categories.icon,
        position: categories.position,
        active: categories.active,
        createdAt: categories.createdAt,
        updatedAt: categories.updatedAt,
      })
      .from(categories)
      .orderBy(asc(categories.position), asc(categories.name));

    const playbookRows = await database
      .select({
        id: playbooks.id,
        workspaceId: playbooks.workspaceId,
        categoryId: playbooks.categoryId,
        name: playbooks.name,
        buttonLabel: playbooks.buttonLabel,
        prompt: playbooks.prompt,
        icon: playbooks.icon,
        position: playbooks.position,
        active: playbooks.active,
        autoSend: playbooks.autoSend,
        userId: playbooks.userId,
        createdAt: playbooks.createdAt,
        updatedAt: playbooks.updatedAt,
      })
      .from(playbooks)
      .orderBy(asc(playbooks.position));

    const playbooksByCategory = new Map<string, typeof playbookRows>();
    for (const playbook of playbookRows) {
      const current = playbooksByCategory.get(playbook.categoryId) ?? [];
      current.push(playbook);
      playbooksByCategory.set(playbook.categoryId, current);
    }

    if (userId) {
      for (const [categoryId, rows] of playbooksByCategory) {
        const ownRows = rows.filter((playbook) => playbook.userId === userId);
        if (ownRows.length > 0) {
          playbooksByCategory.set(categoryId, ownRows);
          continue;
        }

        const sourceUserId = rows[0]?.userId;
        playbooksByCategory.set(
          categoryId,
          sourceUserId
            ? rows.filter((playbook) => playbook.userId === sourceUserId)
            : rows,
        );
      }
    }

    const visibleCategories = isAdmin
      ? categoryRows
      : categoryRows.filter((category) => category.active);

    const toCategoryObject = (category: (typeof visibleCategories)[number]) => ({
      id: category.id,
      workspace_id: category.workspaceId,
      parent_category_id: category.parentCategoryId,
      name: category.name,
      icon: category.icon,
      position: category.position,
      ...(isAdmin ? { active: category.active } : {}),
      created_at: category.createdAt,
      updated_at: category.updatedAt,
    });

    const toPlaybookObject = (
      playbook: (typeof playbookRows)[number],
    ) => ({
      id: playbook.id,
      position: playbook.position ?? 0,
      workspace_id: playbook.workspaceId,
      category_id: playbook.categoryId,
      name: playbook.name,
      button_label: playbook.buttonLabel,
      prompt: playbook.prompt,
      icon: playbook.icon,
      active: playbook.active,
      auto_send: playbook.autoSend,
      user_id: playbook.userId,
      created_at: playbook.createdAt,
      updated_at: playbook.updatedAt,
    });

    const relatedPlaybooks = (categoryId: string) =>
      (playbooksByCategory.get(categoryId) ?? [])
        .map(toPlaybookObject)
        .sort((left, right) => left.position - right.position);

    return visibleCategories
      .filter((category) => category.parentCategoryId === null)
      .map((category) => {
        const children = visibleCategories.filter(
          (subcategory) => subcategory.parentCategoryId === category.id,
        );
        return {
          ...toCategoryObject(category),
          playbooks: [
            ...relatedPlaybooks(category.id),
            ...children.flatMap((subcategory) =>
              relatedPlaybooks(subcategory.id),
            ),
          ].sort((left, right) => left.position - right.position),
          subcategories: children.map((subcategory) => ({
            ...toCategoryObject(subcategory),
            playbooks: relatedPlaybooks(subcategory.id),
          })),
        };
      });
  }

  async deleteCategory(categoryId: string) {
    const database = getDatabase();

    const subcategories = await database
      .select({ id: categories.id })
      .from(categories)
      .where(eq(categories.parentCategoryId, categoryId));

    const subcategoryIds = subcategories.map((subcategory) => subcategory.id);

    if (subcategoryIds.length > 0) {
      await database
        .delete(playbooks)
        .where(inArray(playbooks.categoryId, subcategoryIds));
    }

    await database
      .delete(categories)
      .where(eq(categories.parentCategoryId, categoryId));

    const deleted = await database
      .delete(categories)
      .where(eq(categories.id, categoryId))
      .returning({ id: categories.id });

    if (deleted.length === 0) {
      throw new NotFoundException("Category not found");
    }

    return { message: "Category deleted successfully" };
  }
  async deleteSubCategory(categoryId: string, subcategoryId: string) {
    const database = getDatabase();

    const [subcategory] = await database
      .select({ id: categories.id })
      .from(categories)
      .where(
        and(
          eq(categories.id, subcategoryId),
          eq(categories.parentCategoryId, categoryId),
        ),
      )
      .limit(1);

    if (!subcategory) {
      throw new NotFoundException("Subcategory not found");
    }

    await database
      .delete(playbooks)
      .where(eq(playbooks.categoryId, subcategoryId));

    const deleted = await database
      .delete(categories)
      .where(
        and(
          eq(categories.id, subcategoryId),
          eq(categories.parentCategoryId, categoryId),
        ),
      )
      .returning({ id: categories.id });

    if (deleted.length === 0) {
      throw new NotFoundException("Subcategory not found");
    }

    return {
      message: "SubCategory deleted successfully",
    };
  }
  async updateSubCategory(authorization: string, body: UpdateSubCategoryDto) {
    const user = (await this.authService.syncKindeUser(
      authorization,
    )) as unknown as UserDto;
    if (!user.id) {
      throw new UnauthorizedException(
        `User not found — the token was accepted but syncKindeUser did not return an id. Response: ${JSON.stringify(user)}. Call POST /auth/sync-kinde-user and confirm this email exists in the users table`,
      );
    }
    const userId = user.id as string;
    const database = getDatabase();

    try {
      const [existingSubcategory] = await database
        .select({
          id: categories.id,
          name: categories.name,
          icon: categories.icon,
          parentCategoryId: categories.parentCategoryId,
        })
        .from(categories)
        .where(
          and(
            eq(categories.parentCategoryId, body.categoryId),
            eq(categories.name, body.subcategoryName),
          ),
        )
        .limit(1);

      let subcategory = existingSubcategory;
      if (!subcategory) {
        const [parent] = await database
          .select({
            id: categories.id,
            workspaceId: categories.workspaceId,
          })
          .from(categories)
          .where(eq(categories.id, body.categoryId))
          .limit(1);

        if (!parent) {
          throw new NotFoundException(
            `updateSubCategory failed at parent lookup — categoryId ${body.categoryId} does not exist`,
          );
        }

        const workspaceId = user.workspaceId ?? parent.workspaceId;
        if (!workspaceId) {
          throw new NotFoundException(
            `updateSubCategory failed at subcategory create — no workspace_id for user ${userId} or parent ${parent.id}`,
          );
        }

        try {
          [subcategory] = await database
            .insert(categories)
            .values({
              workspaceId,
              parentCategoryId: parent.id,
              name: body.subcategoryName,
              icon: body.icon ?? null,
              position: 0,
              active: true,
            })
            .returning({
              id: categories.id,
              name: categories.name,
              icon: categories.icon,
              parentCategoryId: categories.parentCategoryId,
            });
        } catch (error) {
          throw new InternalServerErrorException(
            `updateSubCategory failed at subcategory insert for "${body.subcategoryName}" under categoryId ${body.categoryId} — ${this.readErrorMessage(error)}`,
          );
        }

        if (!subcategory) {
          throw new InternalServerErrorException(
            `updateSubCategory failed after subcategory insert — no row returned for "${body.subcategoryName}" under categoryId ${body.categoryId}`,
          );
        }
      }

      const playbookReturn = {
        id: playbooks.id,
        category_id: playbooks.categoryId,
        name: playbooks.name,
        button_label: playbooks.buttonLabel,
        prompt: playbooks.prompt,
        icon: playbooks.icon,
        position: playbooks.position,
        user_id: playbooks.userId,
      };

      const existingForUser = await database
        .select({ id: playbooks.id })
        .from(playbooks)
        .where(
          and(
            eq(playbooks.categoryId, subcategory.id),
            eq(playbooks.userId, userId),
          ),
        )
        .limit(1);

      if (existingForUser.length > 0) {
        let updatedPlaybooks;
        try {
          updatedPlaybooks = await database
            .update(playbooks)
            .set({
              name: body.description ?? body.subcategoryName,
              buttonLabel: body.description ?? null,
              prompt: body.aiPrompt ?? "",
              ...(body.icon !== undefined ? { icon: body.icon } : {}),
              updatedAt: new Date(),
            })
            .where(
              and(
                eq(playbooks.categoryId, subcategory.id),
                eq(playbooks.userId, userId),
              ),
            )
            .returning(playbookReturn);
        } catch (error) {
          throw new InternalServerErrorException(
            `Failed to update playbooks for user ${userId} on subcategory ${subcategory.id} ("${body.subcategoryName}") — ${this.readErrorMessage(error)}`,
          );
        }

        return {
          message: `SubCategory updated for user ${userId} — updated ${updatedPlaybooks.length} playbook row(s)`,
          id: subcategory.id,
          name: subcategory.name,
          icon: subcategory.icon,
          parent_category_id: subcategory.parentCategoryId,
          playbooks: updatedPlaybooks,
        };
      }

      const [template] = await database
        .select({ workspaceId: playbooks.workspaceId })
        .from(playbooks)
        .where(eq(playbooks.categoryId, subcategory.id))
        .limit(1);

      const workspaceId = user.workspaceId ?? template?.workspaceId ?? null;
      if (!workspaceId) {
        throw new NotFoundException(
          `No workspace_id on the synced user ${userId} and no existing playbook for subcategory ${subcategory.id} to copy one from`,
        );
      }

      let insertedPlaybook;
      try {
        [insertedPlaybook] = await database
          .insert(playbooks)
          .values({
            workspaceId,
            categoryId: subcategory.id,
            name: body.description ?? body.subcategoryName,
            buttonLabel: body.description ?? null,
            prompt: body.aiPrompt ?? "",
            icon: body.icon ?? subcategory.icon,
            position: 0,
            active: true,
            autoSend: false,
            userId,
          })
          .returning(playbookReturn);
      } catch (error) {
        throw new InternalServerErrorException(
          `Failed to insert playbook for user ${userId} on subcategory ${subcategory.id} ("${body.subcategoryName}") — ${this.readErrorMessage(error)}`,
        );
      }

      if (!insertedPlaybook) {
        throw new InternalServerErrorException(
          `Insert for user ${userId} on subcategory ${subcategory.id} returned no row`,
        );
      }

      return {
        message: `SubCategory created for user ${userId} — inserted playbook for this category_id`,
        id: subcategory.id,
        name: subcategory.name,
        icon: subcategory.icon,
        parent_category_id: subcategory.parentCategoryId,
        playbooks: [insertedPlaybook],
      };
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }
      throw new InternalServerErrorException(
        `updateSubCategory failed for user ${userId}, categoryId ${body.categoryId}, subcategory "${body.subcategoryName}" — ${this.readErrorMessage(error)}`,
      );
    }
  }

  private readErrorMessage(error: unknown) {
    return error instanceof Error ? error.message : String(error);
  }
  async toggleActive(authorization: string, body: ToggleCategoryDto) {
    const user = (await this.authService.syncKindeUser(
      authorization,
    )) as unknown as UserDto;
    if (!user.id) {
      throw new UnauthorizedException(
        `User not found — the token was accepted but syncKindeUser did not return an id. Response: ${JSON.stringify(user)}. Call POST /auth/sync-kinde-user and confirm this email exists in the users table`,
      );
    }
    if (!isAdminUser(user.role)) {
      throw new UnauthorizedException(
        "Only admin users can see or toggle category active",
      );
    }
    const database = getDatabase();

    const [current] = await database
      .select()
      .from(categories)
      .where(eq(categories.id, body.categoryId))
      .limit(1);

    if (!current) {
      throw new NotFoundException("Category not found");
    }

    const [updated] = await database
      .update(categories)
      .set({
        active: !current.active,
        updatedAt: new Date(),
      })
      .where(eq(categories.id, body.categoryId))
      .returning();

    return updated;
  }
  async createSubCategory(authorization: string, body: CreateSubCategoryDto) {
    try {
      const user = (await this.authService.syncKindeUser(
        authorization,
      )) as unknown as UserDto;
      if (!user.id) {
        throw new UnauthorizedException(
          `User not found — the token was accepted but syncKindeUser did not return an id. Response: ${JSON.stringify(user)}. Call POST /auth/sync-kinde-user and confirm this email exists in the users table`,
        );
      }
      const userId = user.id as string;
      const workspaceId = user.workspaceId;
      if (!workspaceId) {
        throw new NotFoundException(
          `No workspace_id on the synced user ${userId} — sync the user workspace first`,
        );
      }

      let database;
      try {
        database = getDatabase();
      } catch (error) {
        throw new InternalServerErrorException(
          `createSubCategory failed at getDatabase — ${this.readErrorMessage(error)}`,
        );
      }

      try {
        const [category] = await database
          .select({ id: categories.id })
          .from(categories)
          .where(eq(categories.id, body.categoryId))
          .limit(1);

        if (!category) {
          throw new NotFoundException(
            `createSubCategory failed at category lookup — categoryId ${body.categoryId} does not exist in categories. Check the parent category id from the frontend`,
          );
        }
      } catch (error) {
        if (error instanceof HttpException) {
          throw error;
        }
        throw new InternalServerErrorException(
          `createSubCategory failed at category lookup for categoryId ${body.categoryId} — ${this.readErrorMessage(error)}`,
        );
      }

      let nextPosition = 0;
      try {
        const [lastPlaybook] = await database
          .select({ position: playbooks.position })
          .from(playbooks)
          .where(eq(playbooks.categoryId, body.categoryId))
          .orderBy(desc(playbooks.position))
          .limit(1);
        nextPosition = (lastPlaybook?.position ?? -1) + 1;
      } catch (error) {
        throw new InternalServerErrorException(
          `createSubCategory failed at position lookup for categoryId ${body.categoryId} — ${this.readErrorMessage(error)}`,
        );
      }

      let created;
      try {
        [created] = await database
          .insert(playbooks)
          .values({
            workspaceId,
            categoryId: body.categoryId,
            name: body.name,
            buttonLabel: body.description || null,
            prompt: body.prompt,
            icon: body.icon || null,
            position: nextPosition,
            active: body.active,
            autoSend: body.autoSend,
            userId,
          })
          .returning({
            id: playbooks.id,
            workspace_id: playbooks.workspaceId,
            category_id: playbooks.categoryId,
            name: playbooks.name,
            button_label: playbooks.buttonLabel,
            prompt: playbooks.prompt,
            icon: playbooks.icon,
            position: playbooks.position,
            active: playbooks.active,
            auto_send: playbooks.autoSend,
            user_id: playbooks.userId,
            created_at: playbooks.createdAt,
            updated_at: playbooks.updatedAt,
          });
      } catch (error) {
        throw new InternalServerErrorException(
          `createSubCategory failed at playbooks insert for user ${userId}, workspace ${workspaceId}, categoryId ${body.categoryId} — ${this.readErrorMessage(error)}. Check playbooks.workspace_id FK, category_id FK, and user_id`,
        );
      }

      if (!created) {
        throw new InternalServerErrorException(
          `createSubCategory failed after playbooks insert — no row returned for user ${userId} on category ${body.categoryId}`,
        );
      }

      return created;
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }
      throw new InternalServerErrorException(
        `createSubCategory failed at unexpected step for categoryId ${body.categoryId} — ${this.readErrorMessage(error)}`,
      );
    }
  }
  async toggleActiveSubcategory(
    authorization: string,
    body: ToggleSubCategoryDto,
  ) {
    const user = (await this.authService.syncKindeUser(
      authorization,
    )) as unknown as UserDto;
    if (!user.id) {
      throw new UnauthorizedException(
        `User not found — the token was accepted but syncKindeUser did not return an id. Response: ${JSON.stringify(user)}. Call POST /auth/sync-kinde-user and confirm this email exists in the users table`,
      );
    }
    if (!isAdminUser(user.role)) {
      throw new UnauthorizedException(
        "Only admin users can see or toggle subcategory active",
      );
    }
    const database = getDatabase();
    const [current] = await database
      .select()
      .from(playbooks)
      .where(eq(playbooks.id, body.subcategoryId))
      .limit(1);
    if (!current) {
      throw new NotFoundException("Subcategory not found");
    }
    const [updated] = await database
      .update(playbooks)
      .set({
        active: !current.active,
        updatedAt: new Date(),
      })
      .where(eq(playbooks.id, body.subcategoryId))
      .returning();
    return updated;
  }
  async reorderSubcategories(
    authorization: string,
    body: ReorderSubcategoriesDto,
  ) {
    const user = (await this.authService.syncKindeUser(
      authorization,
    )) as unknown as UserDto;
    if (!user.id) {
      throw new UnauthorizedException(
        `User not found — the token was accepted but syncKindeUser did not return an id. Response: ${JSON.stringify(user)}. Call POST /auth/sync-kinde-user and confirm this email exists in the users table`,
      );
    }
    const database = getDatabase();
    const categoryId = Array.isArray(body.category)
      ? body.category[0]
      : body.category;

    if (!categoryId) {
      throw new NotFoundException(
        "reorderSubcategories failed — missing category id",
      );
    }

    if (!body.order?.length) {
      throw new NotFoundException(
        "reorderSubcategories failed — order is empty",
      );
    }

    const existing = await database
      .select({ id: playbooks.id, categoryId: playbooks.categoryId })
      .from(playbooks)
      .where(
        or(
          inArray(playbooks.id, body.order),
          inArray(playbooks.categoryId, body.order),
        ),
      );

    if (existing.length === 0) {
      throw new NotFoundException(
        `reorderSubcategories failed — no playbooks found for category ${categoryId}`,
      );
    }

    const now = new Date();
    const updated = [];
    for (const [position, id] of body.order.entries()) {
      const rows = await database
        .update(playbooks)
        .set({
          position,
          updatedAt: now,
        })
        .where(
          or(
            and(eq(playbooks.id, id), eq(playbooks.categoryId, categoryId)),
            eq(playbooks.categoryId, id),
          ),
        )
        .returning({
          id: playbooks.id,
          category_id: playbooks.categoryId,
          position: playbooks.position,
        });
      updated.push(...rows);
    }

    return {
      message: `Playbook positions updated for category ${categoryId}`,
      categoryId,
      order: body.order,
      playbooks: updated,
    };
  }
}
