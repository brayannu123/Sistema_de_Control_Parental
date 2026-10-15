import { Column, CreateDateColumn, Entity, Index, JoinColumn, ManyToOne, PrimaryGeneratedColumn } from 'typeorm';
import { Device } from '../devices/device.entity';

@Entity('notification_logs')
@Index(['deviceId', 'receivedAt'])
export class NotificationLog {
  @PrimaryGeneratedColumn('uuid') id: string;
  @Column({ type: 'uuid' }) deviceId: string;
  @ManyToOne(() => Device, { nullable: false, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'deviceId' }) device: Device;
  @Column({ length: 150 }) appName: string;
  @Column({ length: 500 }) title: string;
  @Column({ type: 'text' }) content: string;
  @CreateDateColumn({ type: 'timestamptz' }) receivedAt: Date;
}
