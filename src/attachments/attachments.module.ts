import { Module } from "@nestjs/common";
import { SupabaseModule } from "src/supabase/supabse.module";
import { AttachmentsController } from "./attachments.controller";
import { AttachmentsService } from "./attachments.service";

@Module({
  imports: [SupabaseModule],
  controllers: [AttachmentsController],
  providers: [AttachmentsService],
})
export class AttachmentsModule {}
