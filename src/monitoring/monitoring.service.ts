import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Device } from '../devices/device.entity';
import { LocationHistory } from '../locations/location-history.entity';
import { NotificationLog } from '../notifications/notification-log.entity';
import { UpdateLocationDto } from './dto/update-location.dto';
import { NewNotificationDto } from './dto/new-notification.dto';

@Injectable()
export class MonitoringService {
  constructor(@InjectRepository(Device) private readonly devices: Repository<Device>, @InjectRepository(LocationHistory) private readonly locations: Repository<LocationHistory>, @InjectRepository(NotificationLog) private readonly notifications: Repository<NotificationLog>) {}
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
  async saveLocation(dto: UpdateLocationDto) {
    await this.assertDeviceIdentity(dto.deviceId);
    return this.locations.save(this.locations.create({ ...dto }));
  }
  async saveNotification(dto: NewNotificationDto) {
    await this.assertDeviceIdentity(dto.deviceId);
    return this.notifications.save(this.notifications.create({ ...dto }));
  }
  async getLocations(deviceId: string, parentId: string) {
    await this.assertParentOwnsDevice(deviceId, parentId);
    return this.locations.find({ where: { deviceId }, order: { timestamp: 'DESC' }, take: 1000 });
  }
  async getNotifications(deviceId: string, parentId: string) {
    await this.assertParentOwnsDevice(deviceId, parentId);
    return this.notifications.find({ where: { deviceId }, order: { receivedAt: 'DESC' }, take: 1000 });
  }
}
