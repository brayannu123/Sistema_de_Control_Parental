import { Body, Controller, ForbiddenException, Get, Post, Req, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { DevicesService } from './devices.service';
import { GenerateCodeDto } from './dto/generate-code.dto';
import { PairDeviceDto } from './dto/pair-device.dto';

interface RequestWithUser {
  user: {
    userId: string;
    email?: string;
    deviceId?: string;
  };
}

@Controller('devices')
export class DevicesController {
  constructor(private readonly devicesService: DevicesService) {}

  @UseGuards(JwtAuthGuard)
  @Post('generate-code')
  generateCode(@Req() req: RequestWithUser, @Body() dto: GenerateCodeDto) {
    if (req.user.deviceId) {
      throw new ForbiddenException('Solo el padre puede generar códigos');
    }
    return this.devicesService.generateCode(req.user.userId, dto);
  }

  @Post('pair')
  pair(@Body() dto: PairDeviceDto) {
    return this.devicesService.pair(dto);
  }

  @UseGuards(JwtAuthGuard)
  @Get()
  getDevices(@Req() req: RequestWithUser) {
    if (req.user.deviceId) {
      throw new ForbiddenException('Solo el padre puede listar dispositivos');
    }
    return this.devicesService.findByParent(req.user.userId);
  }

  @UseGuards(JwtAuthGuard)
  @Get('status')
  getStatus(@Req() req: RequestWithUser) {
    const deviceId = req.user.deviceId;
    if (!deviceId) {
      throw new ForbiddenException('Solo el agente del dispositivo puede consultar este endpoint');
    }
    return this.devicesService.getStatus(deviceId);
  }
}
