import { Injectable, NotFoundException, ConflictException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { JwtService } from '@nestjs/jwt';
import { randomInt } from 'crypto';
import { Repository } from 'typeorm';
import { Device } from './device.entity';
import { GenerateCodeDto } from './dto/generate-code.dto';
import { PairDeviceDto } from './dto/pair-device.dto';

const PAIRING_CODE_TTL_MS = 15 * 60 * 1000; // 15 minutos

@Injectable()
export class DevicesService {
  constructor(
    @InjectRepository(Device) private readonly devices: Repository<Device>,
    private readonly jwt: JwtService,
  ) {}

  async generateCode(parentId: string, dto: GenerateCodeDto) {
    const pairingCodeExpiresAt = new Date(Date.now() + PAIRING_CODE_TTL_MS);

    for (let attempt = 0; attempt < 10; attempt++) {
      const pairingCode = String(randomInt(100000, 1_000_000));
      const device = this.devices.create({
        parentId,
        pairingCode,
        pairingCodeExpiresAt,
        deviceName: dto.deviceName?.trim() || 'Dispositivo pendiente',
        isPaired: false,
      });
      try {
        const saved = await this.devices.save(device);
        return {
          id: saved.id,
          pairingCode: saved.pairingCode,
          pairingCodeExpiresAt: saved.pairingCodeExpiresAt,
          deviceName: saved.deviceName,
          isPaired: saved.isPaired,
          createdAt: saved.createdAt,
        };
      } catch (error) {
        if ((error as { code?: string }).code !== '23505') throw error;
      }
    }
    throw new ConflictException('No se pudo generar un código único; intenta de nuevo');
  }

  async pair(dto: PairDeviceDto) {
    const now = new Date();
    const device = await this.devices.findOne({
      where: { pairingCode: dto.pairingCode, isPaired: false },
    });
    if (!device) throw new NotFoundException('Código inválido o ya utilizado');

    if (device.pairingCodeExpiresAt && device.pairingCodeExpiresAt < now) {
      throw new BadRequestException('El código de emparejamiento ha expirado');
    }

    // El UPDATE condicional impide que dos agentes consuman el mismo código a la vez
    // y resetea pairingCode y su expiración a null al vincularse.
    const result = await this.devices.update(
      { id: device.id, isPaired: false, pairingCode: dto.pairingCode },
      {
        isPaired: true,
        deviceName: dto.deviceName.trim(),
        pairingCode: null,
        pairingCodeExpiresAt: null,
      },
    );
    if (!result.affected) throw new ConflictException('El código ya fue utilizado');

    const paired = await this.devices.findOneByOrFail({ id: device.id });
    const accessToken = await this.jwt.signAsync(
      { deviceId: paired.id },
      { subject: paired.id, expiresIn: '30d' },
    );
    return {
      id: paired.id,
      deviceName: paired.deviceName,
      isPaired: paired.isPaired,
      parentId: paired.parentId,
      accessToken,
    };
  }

  async findByParent(parentId: string) {
    return this.devices.find({
      where: { parentId },
      order: { createdAt: 'DESC' },
    });
  }

  async getStatus(deviceId: string) {
    const device = await this.devices.findOne({
      where: { id: deviceId },
    });
    if (!device || !device.isPaired) {
      throw new NotFoundException('Dispositivo no encontrado o no vinculado');
    }
    return {
      id: device.id,
      deviceName: device.deviceName,
      isPaired: device.isPaired,
      parentId: device.parentId,
      createdAt: device.createdAt,
    };
  }
}
