import { Body, Controller, Post, Req, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { DevicesService } from './devices.service';
import { GenerateCodeDto } from './dto/generate-code.dto';
import { PairDeviceDto } from './dto/pair-device.dto';

@Controller('devices')
export class DevicesController {
  constructor(private readonly devicesService: DevicesService) {}

  @UseGuards(JwtAuthGuard)
  @Post('generate-code')
  generateCode(@Req() req: { user: { userId: string } }, @Body() dto: GenerateCodeDto) {
    return this.devicesService.generateCode(req.user.userId, dto);
  }

  @Post('pair')
  pair(@Body() dto: PairDeviceDto) {
    return this.devicesService.pair(dto);
  }
}
