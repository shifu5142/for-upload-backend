import { IsNotEmpty, IsOptional, IsString } from "class-validator";

export class UpdateSubCategoryDto {
  @IsString()
  @IsNotEmpty()
  categoryId!: string;

  @IsString()
  @IsNotEmpty()
  subcategoryName!: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsString()
  aiPrompt?: string;

  @IsOptional()
  @IsString()
  icon?: string;
}
