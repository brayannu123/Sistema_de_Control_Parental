import { IsEnum, IsUUID } from 'class-validator';

export const STREAM_TYPES = ['camera_front', 'camera_back', 'microphone', 'screen'] as const;
export type StreamType = (typeof STREAM_TYPES)[number];

export class StartStreamDto {
  @IsUUID()
  deviceId: string;

  @IsEnum(STREAM_TYPES, { message: 'streamType no es válido' })
  streamType: StreamType;
}
