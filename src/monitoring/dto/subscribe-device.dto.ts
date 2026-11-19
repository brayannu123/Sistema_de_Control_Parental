import { IsUUID } from 'class-validator';
export class SubscribeDeviceDto { @IsUUID() deviceId: string; }
