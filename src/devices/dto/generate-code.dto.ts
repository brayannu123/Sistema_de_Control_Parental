import { IsOptional, IsString, MaxLength, MinLength } from 'class-validator';

export class GenerateCodeDto {
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(100)
  deviceName?: string;
}
