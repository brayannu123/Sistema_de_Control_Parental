import { Column, CreateDateColumn, Entity, Index, JoinColumn, ManyToOne, OneToMany, PrimaryGeneratedColumn } from 'typeorm';
import { StreamSession } from '../streams/stream-session.entity';
import { User } from '../users/user.entity';

@Entity('devices')
@Index('UQ_devices_pairing_code', ['pairingCode'], { unique: true })
export class Device {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ length: 100, default: 'Dispositivo pendiente' })
  deviceName: string;

  @Column({ length: 6 })
  pairingCode: string;

  @Column({ default: false })
  isPaired: boolean;

  @Column({ type: 'uuid' })
  parentId: string;

  @ManyToOne(() => User, (user) => user.devices, { nullable: false, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'parentId' })
  parent: User;

  @OneToMany(() => StreamSession, (session) => session.device)
  streamSessions: StreamSession[];

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt: Date;
}
