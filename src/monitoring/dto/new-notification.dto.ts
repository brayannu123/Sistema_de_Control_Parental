import { IsString, IsUUID, MaxLength } from 'class-validator';

export class NewNotificationDto {
  @IsUUID() deviceId: string;
  @IsString() @MaxLength(150) appName: string;
  @IsString() @MaxLength(500) title: string;
  @IsString() @MaxLength(10000) content: string;
}
