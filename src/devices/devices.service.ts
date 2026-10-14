import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { randomInt } from 'crypto';
import { Repository } from 'typeorm';
import { Device } from './device.entity';
import { GenerateCodeDto } from './dto/generate-code.dto';
import { PairDeviceDto } from './dto/pair-device.dto';

@Injectable()
export class DevicesService {
  constructor(@InjectRepository(Device) private readonly devices: Repository<Device>) {}

  async generateCode(parentId: string, dto: GenerateCodeDto) {
    for (let attempt = 0; attempt < 10; attempt++) {
      const pairingCode = String(randomInt(100000, 1_000_000));
      const device = this.devices.create({
        parentId,
        pairingCode,
        deviceName: dto.deviceName?.trim() || 'Dispositivo pendiente',
        isPaired: false,
      });
      try {
        const saved = await this.devices.save(device);
        return { id: saved.id, pairingCode: saved.pairingCode, deviceName: saved.deviceName, isPaired: saved.isPaired, createdAt: saved.createdAt };
      } catch (error) {
        if ((error as { code?: string }).code !== '23505') throw error;
      }
    }
    throw new ConflictException('No se pudo generar un código único; intenta de nuevo');
  }

  async pair(dto: PairDeviceDto) {
    const device = await this.devices.findOne({ where: { pairingCode: dto.pairingCode, isPaired: false } });
    if (!device) throw new NotFoundException('Código inválido o ya utilizado');

    // El UPDATE condicional impide que dos agentes consuman el mismo código a la vez.
    const result = await this.devices.update(
      { id: device.id, isPaired: false },
      { isPaired: true, deviceName: dto.deviceName.trim() },
    );
    if (!result.affected) throw new ConflictException('El código ya fue utilizado');

    const paired = await this.devices.findOneByOrFail({ id: device.id });
    return { id: paired.id, deviceName: paired.deviceName, isPaired: paired.isPaired, parentId: paired.parentId };
  }
}
