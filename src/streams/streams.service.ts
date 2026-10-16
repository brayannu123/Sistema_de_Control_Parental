import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Device } from '../devices/device.entity';
import { StartStreamDto } from './dto/start-stream.dto';
import { StopStreamDto } from './dto/stop-stream.dto';
import { StreamSession } from './stream-session.entity';

@Injectable()
export class StreamsService {
  constructor(
    @InjectRepository(Device) private readonly devices: Repository<Device>,
    @InjectRepository(StreamSession) private readonly sessions: Repository<StreamSession>,
  ) {}

  async assertParentOwnsDevice(deviceId: string, parentId: string) {
    const device = await this.devices.findOne({ where: { id: deviceId, parentId } });
    if (!device) throw new NotFoundException('Dispositivo no encontrado');
    return device;
  }

  async assertDeviceIdentity(deviceId: string) {
    const device = await this.devices.findOneBy({ id: deviceId, isPaired: true });
    if (!device) throw new NotFoundException('Dispositivo no encontrado o no vinculado');
    return device;
  }

  async startStream(dto: StartStreamDto) {
    await this.assertDeviceIdentity(dto.deviceId);

    const activeSession = await this.sessions.findOne({
      where: { deviceId: dto.deviceId, streamType: dto.streamType, status: 'active' },
      order: { startedAt: 'DESC' },
    });

    if (activeSession) {
      return activeSession;
    }

    const session = this.sessions.create({
      deviceId: dto.deviceId,
      streamType: dto.streamType,
      status: 'active',
      endedAt: null,
    });

    return this.sessions.save(session);
  }

  async stopStream(dto: StopStreamDto) {
    const session = await this.sessions.findOne({
      where: { deviceId: dto.deviceId, streamType: dto.streamType, status: 'active' },
      order: { startedAt: 'DESC' },
    });

    if (!session) {
      return null;
    }

    session.status = 'closed';
    session.endedAt = new Date();
    return this.sessions.save(session);
  }

  async startSession(dto: StartStreamDto) {
    return this.startStream(dto);
  }

  async stopSession(dto: StopStreamDto) {
    return this.stopStream(dto);
  }

  async closeActiveSessionsForDevice(deviceId: string) {
    const activeSessions = await this.sessions.find({ where: { deviceId, status: 'active' } });
    if (!activeSessions.length) {
      return [];
    }

    for (const session of activeSessions) {
      session.status = 'closed';
      session.endedAt = new Date();
    }

    return this.sessions.save(activeSessions);
  }

  async getSessions(deviceId: string, parentId: string) {
    await this.assertParentOwnsDevice(deviceId, parentId);
    return this.sessions.find({
      where: { deviceId },
      order: { startedAt: 'DESC' },
      take: 1000,
    });
  }
}
