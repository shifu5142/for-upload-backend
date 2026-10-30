import {
  BadRequestException,
  HttpException,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
} from "@nestjs/common";
import { eq, sql } from "drizzle-orm";
import { attachments } from "../db/attachments/schema";
import { getDatabase } from "../db/database";
import { playbooks } from "../db/playbook/schema";
import { SupabaseService } from "../supabase/supabase.service";
import { UploadAttachmentDto } from "./dto/upload-attachment.dto";

const BUCKET = "attachments";

const PLAYBOOK_ID =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export type AttachmentUploadResult = {
  file_type: string | null;
  file_url: string;
  file_name: string;
  playbook_id: string;
};

@Injectable()
export class AttachmentsService {
  constructor(private readonly supabase: SupabaseService) {}

  async upload(input: UploadAttachmentDto): Promise<AttachmentUploadResult> {
    const file = input.file;
    const playbookId = (input.playbookId ?? input.playbook_id ?? "").trim();
    const fileName = (
      input.fileName ||
      input.file_name ||
      file?.originalname ||
      ""
    ).trim();
    const fileType = (
      input.fileType ||
      input.file_type ||
      file?.mimetype ||
      ""
    ).trim();

    try {
      let database;
      try {
        database = getDatabase();
      } catch (error) {
        throw new InternalServerErrorException(
          `upload failed at getDatabase — ${this.readErrorMessage(error)}`,
        );
      }

      let playbook;
      try {
        [playbook] = await database
          .select({
            id: playbooks.id,
            workspaceId: playbooks.workspaceId,
          })
          .from(playbooks)
          .where(eq(playbooks.id, playbookId))
          .limit(1);
      } catch (error) {
        throw new InternalServerErrorException(
          `upload failed at playbook lookup for playbook_id ${playbookId} — ${this.readErrorMessage(error)}`,
        );
      }

      if (!playbook) {
        throw new NotFoundException(
          `upload failed at playbook lookup — playbook_id ${playbookId} does not exist`,
        );
      }

      let fileUrl;
      try {
        fileUrl = await this.storeFile({
          ...input,
          file,
          playbookId,
          fileName,
          fileType,
        });
      } catch (error) {
        if (error instanceof HttpException) {
          throw error;
        }
        throw new InternalServerErrorException(
          `upload failed at storeFile for playbook_id ${playbookId}, file "${fileName}" — ${this.readErrorMessage(error)}`,
        );
      }

      let row;
      try {
        [row] = await database
          .insert(attachments)
          .values({
            workspaceId: playbook.workspaceId,
            playbookId,
            fileName: fileName.slice(0, 255),
            fileUrl,
            fileType: fileType.slice(0, 100) || null,
          })
          .returning({
            fileType: attachments.fileType,
            fileUrl: attachments.fileUrl,
            fileName: attachments.fileName,
            playbookId: attachments.playbookId,
          });
      } catch (error) {
        throw new InternalServerErrorException(
          `upload failed at attachments insert for playbook_id ${playbookId}, workspace ${playbook.workspaceId} — ${this.readErrorMessage(error)}. Check attachments.workspace_id FK and playbook_id FK`,
        );
      }

      if (!row) {
        throw new InternalServerErrorException(
          `upload failed after attachments insert — no row returned for playbook_id ${playbookId}, file "${fileName}"`,
        );
      }

      return {
        file_type: row.fileType,
        file_url: row.fileUrl,
        file_name: row.fileName,
        playbook_id: row.playbookId,
      };
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }
      throw new InternalServerErrorException(
        `upload failed at unexpected step for playbook_id ${playbookId || "(empty)"}, file "${fileName || "(empty)"}" — ${this.readErrorMessage(error)}`,
      );
    }
  }

  private async storeFile(input: UploadAttachmentDto) {
    const playbookId = (input.playbookId ?? input.playbook_id ?? "").trim();
    const fileName = (
      input.fileName ||
      input.file_name ||
      input.file?.originalname ||
      ""
    ).trim();
    const fileType = (
      input.fileType ||
      input.file_type ||
      input.file?.mimetype ||
      ""
    ).trim();
    const buffer = input.file?.buffer;
    if (!buffer?.length) {
      throw new BadRequestException(
        "storeFile failed at buffer validation — missing file buffer",
      );
    }

    let storage;
    try {
      storage = this.supabase.getClient().storage;
    } catch (error) {
      throw new InternalServerErrorException(
        `storeFile failed at supabase client for playbook_id ${playbookId} — ${this.readErrorMessage(error)}`,
      );
    }

    try {
      await this.ensureAttachmentsBucket();
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }
      throw new InternalServerErrorException(
        `storeFile failed at ensureBucket "${BUCKET}" — ${this.readErrorMessage(error)}`,
      );
    }

    const safeName = fileName.replace(/[^\w.\-]+/g, "_").slice(0, 180);
    const path = `${playbookId}/${crypto.randomUUID()}-${safeName}`;
    const options = {
      contentType: fileType || "application/octet-stream",
      upsert: false,
    };

    let uploaded;
    try {
      uploaded = await storage.from(BUCKET).upload(path, buffer, options);
    } catch (error) {
      throw new InternalServerErrorException(
        `storeFile failed at storage upload for bucket "${BUCKET}", path "${path}" — ${this.readErrorMessage(error)}`,
      );
    }
    if (uploaded.error) {
      throw new BadRequestException(
        `storeFile failed at storage upload for bucket "${BUCKET}", path "${path}" — ${uploaded.error.message}`,
      );
    }

    try {
      return storage.from(BUCKET).getPublicUrl(path).data.publicUrl;
    } catch (error) {
      throw new InternalServerErrorException(
        `storeFile failed at getPublicUrl for bucket "${BUCKET}", path "${path}" — ${this.readErrorMessage(error)}`,
      );
    }
  }

  private async ensureAttachmentsBucket() {
    const database = getDatabase();
    try {
      await database.execute(sql`
        insert into storage.buckets (id, name, public)
        values (${BUCKET}, ${BUCKET}, true)
        on conflict (id) do update set public = true
      `);
    } catch (error) {
      throw new InternalServerErrorException(
        `storeFile failed at createBucket "${BUCKET}" — ${this.readErrorMessage(error)}`,
      );
    }

    try {
      await database.execute(
        sql.raw(`
        do $$
        begin
          if not exists (
            select 1 from pg_policies
            where schemaname = 'storage'
              and tablename = 'objects'
              and policyname = 'attachments_insert'
          ) then
            create policy attachments_insert on storage.objects
              for insert to anon, authenticated
              with check (bucket_id = '${BUCKET}');
          end if;
          if not exists (
            select 1 from pg_policies
            where schemaname = 'storage'
              and tablename = 'objects'
              and policyname = 'attachments_select'
          ) then
            create policy attachments_select on storage.objects
              for select to anon, authenticated, public
              using (bucket_id = '${BUCKET}');
          end if;
        end $$;
      `),
      );
    } catch (error) {
      throw new InternalServerErrorException(
        `storeFile failed at createBucket policies for "${BUCKET}" — ${this.readErrorMessage(error)}`,
      );
    }
  }

  private readErrorMessage(error: unknown) {
    return error instanceof Error ? error.message : String(error);
  }
  async deleteAttachment(fileId: string) {
    const id = fileId?.trim();
    if (!id) {
      throw new BadRequestException(
        "deleteAttachment failed at id validation — missing file id",
      );
    }
    if (!PLAYBOOK_ID.test(id)) {
      throw new BadRequestException(
        `deleteAttachment failed at id validation — "${id}" is not a uuid`,
      );
    }

    try {
      let database;
      try {
        database = getDatabase();
      } catch (error) {
        throw new InternalServerErrorException(
          `deleteAttachment failed at getDatabase — ${this.readErrorMessage(error)}`,
        );
      }

      let deleted;
      try {
        deleted = await database
          .delete(attachments)
          .where(eq(attachments.id, id))
          .returning({ id: attachments.id });
      } catch (error) {
        throw new InternalServerErrorException(
          `deleteAttachment failed at attachments delete for file ${id} — ${this.readErrorMessage(error)}`,
        );
      }

      if (deleted.length === 0) {
        throw new NotFoundException(
          `deleteAttachment failed — file ${id} not found in attachments`,
        );
      }

      return {
        message: "File deleted successfully",
        id: deleted[0]?.id,
      };
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }
      throw new InternalServerErrorException(
        `deleteAttachment failed at unexpected step for file ${id} — ${this.readErrorMessage(error)}`,
      );
    }
  }

  async getAllAttachments(playbook_id?: string) {
    const database = getDatabase();
    const rows = playbook_id
      ? await database
          .select()
          .from(attachments)
          .where(eq(attachments.playbookId, playbook_id))
      : await database.select().from(attachments);

    return rows.map((row) => ({
      id: row.id,
      workspace_id: row.workspaceId,
      playbook_id: row.playbookId,
      file_name: row.fileName,
      file_url: row.fileUrl,
      file_type: row.fileType,
      created_at: row.createdAt,
    }));
  }
}
