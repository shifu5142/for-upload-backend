import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { Type } from "class-transformer";
import {
  IsArray,
  IsNotEmpty,
  IsOptional,
  IsString,
  ValidateNested,
} from "class-validator";

export class GetPromptsDto {
  @ApiProperty({ example: "messageTypes" })
  @IsString()
  @IsNotEmpty()
  categoryId!: string;

  @ApiProperty({ example: "course_information" })
  @IsString()
  @IsNotEmpty()
  subcategoryId!: string;

  @ApiProperty({ example: "certificate" })
  @IsString()
  @IsNotEmpty()
  itemId!: string;
}

export class CategoryPublishItemDto {
  @ApiProperty({ example: "consult_message_type" })
  @IsString()
  @IsNotEmpty()
  id!: string;

  @ApiPropertyOptional({ example: "בחירת סוג הודעה" })
  @IsOptional()
  @IsString()
  label?: string;

  @ApiPropertyOptional({ example: "הפרומפט שהמשתמש כתב" })
  @IsOptional()
  @IsString()
  prompt?: string;

  @ApiPropertyOptional({ example: "message-circle" })
  @IsOptional()
  @IsString()
  icon?: string;
}

export class CategoryPublishSubcategoryDto {
  @ApiProperty({ example: "consult_message_type" })
  @IsString()
  @IsNotEmpty()
  id!: string;

  @ApiProperty({ example: "בחירת סוג הודעה" })
  @IsString()
  @IsNotEmpty()
  name!: string;

  @ApiPropertyOptional({ example: "message-circle" })
  @IsOptional()
  @IsString()
  icon?: string;

  @ApiProperty({ type: [CategoryPublishItemDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CategoryPublishItemDto)
  items!: CategoryPublishItemDto[];
}

export class CategoryPublishDto {
  @ApiPropertyOptional({ example: "11111111-1111-4111-8111-111111111111" })
  @IsOptional()
  @IsString()
  workspaceId?: string;

  @ApiProperty({ example: "consult" })
  @IsString()
  @IsNotEmpty()
  id!: string;

  @ApiProperty({ example: "התייעצות" })
  @IsString()
  @IsNotEmpty()
  name!: string;

  @ApiPropertyOptional({ example: "message-circle" })
  @IsOptional()
  @IsString()
  icon?: string;

  @ApiProperty({ type: [CategoryPublishSubcategoryDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CategoryPublishSubcategoryDto)
  subcategories!: CategoryPublishSubcategoryDto[];
}
export type PromptItem = {
  id: string;
  label: string;
  prompt: string;
  attachment?: {
    path: string;
    filename: string;
    mimeType: string;
  };
  searchLabel?: string;
};

export type PromptSubcategory = {
  id: string;
  name: string;
  items: PromptItem[];
};

export type PromptCategory = {
  id: string;
  name: string;
  icon?: string;
  subcategories: PromptSubcategory[];
};
