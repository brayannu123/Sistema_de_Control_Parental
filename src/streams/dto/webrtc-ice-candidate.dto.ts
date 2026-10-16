import { IsNotEmpty, IsUUID } from 'class-validator';

export class WebrtcIceCandidateDto {
  @IsUUID()
  deviceId: string;

  @IsNotEmpty()
  candidate: Record<string, any>;
}
