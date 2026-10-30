import { IsArray, IsNotEmpty, IsString } from "class-validator";

export class ReorderSubcategoriesDto {
  @IsArray()
  @IsString({ each: true })
  @IsNotEmpty({ each: true })
  order!: string[];

  @IsString()
  @IsNotEmpty()
  category!: string;
}
