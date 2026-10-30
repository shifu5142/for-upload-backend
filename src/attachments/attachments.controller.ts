import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Query,
  UploadedFile,
  UseInterceptors,
} from "@nestjs/common";
import { FileInterceptor } from "@nestjs/platform-express";
import { AttachmentsService } from "./attachments.service";
import {
  UploadAttachmentDto,
  type UploadedAttachment,
} from "./dto/upload-attachment.dto";

@Controller("attachments")
export class AttachmentsController {
  constructor(private readonly attachmentsService: AttachmentsService) {}

  @Post("upload")
  @UseInterceptors(FileInterceptor("file_url"))
  upload(
    @UploadedFile() file: UploadedAttachment | undefined,
    @Body() body: UploadAttachmentDto,
  ) {
    return this.attachmentsService.upload({ ...body, file });
  }
  @Get("get-all-attachments")
  getAllAttachments(@Query("playbook_id") playbookId?: string) {
    return this.attachmentsService.getAllAttachments(playbookId);
  }

  @Delete("delete/:fileId")
  deleteAttachment(@Param("fileId") fileId: string) {
    return this.attachmentsService.deleteAttachment(fileId);
  }
}
