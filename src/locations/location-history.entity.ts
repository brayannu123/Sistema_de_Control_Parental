import { Column, CreateDateColumn, Entity, JoinColumn, ManyToOne, PrimaryGeneratedColumn, Index } from 'typeorm';
import { Device } from '../devices/device.entity';

@Entity('location_history')
@Index(['deviceId', 'timestamp'])
export class LocationHistory {
  @PrimaryGeneratedColumn('uuid') id: string;
  @Column({ type: 'uuid' }) deviceId: string;
  @ManyToOne(() => Device, { nullable: false, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'deviceId' }) device: Device;
  @Column({ type: 'double precision' }) latitude: number;
  @Column({ type: 'double precision' }) longitude: number;
  @Column({ type: 'int', nullable: true }) batteryLevel: number | null;
  @CreateDateColumn({ type: 'timestamptz' }) timestamp: Date;
}
