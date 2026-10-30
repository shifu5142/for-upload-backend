import { Allow, IsOptional, IsString } from "class-validator";

export type UploadedAttachment = {
  buffer: Buffer;
  mimetype: string;
  originalname: string;
};

export class UploadAttachmentDto {
  @Allow()
  file?: UploadedAttachment;

  @IsString()
  @IsOptional()
  fileType?: string;

  @IsString()
  @IsOptional()
  file_type?: string;

  @IsString()
  @IsOptional()
  fileName?: string;

  @IsString()
  @IsOptional()
  file_name?: string;

  @IsString()
  @IsOptional()
  playbookId?: string;

  @IsString()
  @IsOptional()
  playbook_id?: string;
}
