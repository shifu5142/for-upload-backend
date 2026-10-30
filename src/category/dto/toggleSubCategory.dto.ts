import { IsNotEmpty, IsString } from "class-validator";

export class ToggleSubCategoryDto {
  @IsString()
  @IsNotEmpty()
  subcategoryId!: string;
}
