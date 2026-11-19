import { Type } from 'class-transformer';
import { IsInt, IsNumber, IsOptional, IsUUID, Max, Min } from 'class-validator';

export class UpdateLocationDto {
  @IsUUID() deviceId: string;
  @Type(() => Number) @IsNumber({ allowNaN: false, allowInfinity: false }) @Min(-90) @Max(90) latitude: number;
  @Type(() => Number) @IsNumber({ allowNaN: false, allowInfinity: false }) @Min(-180) @Max(180) longitude: number;
  @IsOptional() @Type(() => Number) @IsInt() @Min(0) @Max(100) batteryLevel?: number;
}
