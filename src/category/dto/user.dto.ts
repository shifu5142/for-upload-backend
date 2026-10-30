import { IsNotEmpty, IsString } from "class-validator";
export class UserDto {
  @IsString()
  @IsNotEmpty()
  id!: string | null;
  @IsString()
  @IsNotEmpty()
  email!: string | null;
  @IsString()
  name!: string | null;
  @IsString()
  role!: string | null;
  @IsString()
  workspaceId!: string | null;
}
