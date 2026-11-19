import { IsString, IsNotEmpty } from "class-validator";
export class RenameCategoryDto {
  @IsString()
  @IsNotEmpty()
  categoryId!: string;

  @IsString()
  @IsNotEmpty()
  name!: string;
}
