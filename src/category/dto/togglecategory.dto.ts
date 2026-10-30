import { IsBoolean, IsNotEmpty, IsOptional, IsString } from "class-validator";

export class ToggleCategoryDto {
  @IsString()
  @IsNotEmpty()
  categoryId!: string;

  @IsOptional()
  @IsBoolean()
  active?: boolean;

  @IsOptional()
  @IsBoolean()
  canToggleActive?: boolean;

  @IsOptional()
  @IsBoolean()
  changesEnabled?: boolean;
}
