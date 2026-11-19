import { IsString, Matches, MaxLength, MinLength } from 'class-validator';

export class PairDeviceDto {
  @IsString()
  @Matches(/^\d{6}$/)
  pairingCode: string;

  @IsString()
  @MinLength(1)
  @MaxLength(100)
  deviceName: string;
}
