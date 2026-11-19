import { IsNotEmpty, IsUUID } from 'class-validator';

export class WebrtcAnswerDto {
  @IsUUID()
  deviceId: string;

  @IsNotEmpty()
  answer: Record<string, any>;
}
