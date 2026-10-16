import { IsNotEmpty, IsUUID } from 'class-validator';

export class WebrtcOfferDto {
  @IsUUID()
  deviceId: string;

  @IsNotEmpty()
  offer: Record<string, any>;
}
