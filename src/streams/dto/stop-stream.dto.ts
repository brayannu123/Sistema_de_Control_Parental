import { IsEnum, IsUUID } from 'class-validator';
import { STREAM_TYPES, StreamType } from './start-stream.dto';

export class StopStreamDto {
  @IsUUID()
  deviceId: string;

  @IsEnum(STREAM_TYPES, { message: 'streamType no es válido' })
  streamType: StreamType;
}
