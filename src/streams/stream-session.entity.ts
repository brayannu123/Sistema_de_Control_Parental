import { Column, CreateDateColumn, Entity, Index, JoinColumn, ManyToOne, PrimaryGeneratedColumn } from 'typeorm';
import { Device } from '../devices/device.entity';

export type StreamType = 'camera_front' | 'camera_back' | 'microphone' | 'screen';
export type StreamSessionStatus = 'active' | 'closed';

@Entity('stream_sessions')
@Index(['deviceId', 'streamType', 'status'])
export class StreamSession {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  deviceId: string;

  @ManyToOne(() => Device, (device) => device.streamSessions, { nullable: false, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'deviceId' })
  device: Device;

  @Column({ type: 'varchar', length: 32 })
  streamType: StreamType;

  @CreateDateColumn({ type: 'timestamptz' })
  startedAt: Date;

  @Column({ type: 'timestamptz', nullable: true })
  endedAt: Date | null;

  @Column({ type: 'varchar', length: 20, default: 'active' })
  status: StreamSessionStatus;
}
