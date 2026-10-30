import { IsArray, IsBoolean, IsNotEmpty, IsString } from "class-validator";

export class CreateSubCategoryDto {
  @IsString()
  @IsNotEmpty()
  name!: string;

  @IsString()
  description!: string;

  @IsString()
  prompt!: string;

  @IsString()
  @IsNotEmpty()
  icon!: string;

  @IsBoolean()
  active!: boolean;

  @IsBoolean()
  autoSend!: boolean;

  @IsArray()
  attachments!: { id: string; name: string }[];

  @IsString()
  @IsNotEmpty()
  categoryId!: string;
}
