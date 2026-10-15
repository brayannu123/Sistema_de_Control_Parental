import { Controller, Get, Param, Req, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { MonitoringService } from './monitoring.service';

@Controller('devices/:id')
@UseGuards(JwtAuthGuard)
export class MonitoringController {
  constructor(private readonly monitoring: MonitoringService) {}
  @Get('locations')
  getLocations(@Param('id') id: string, @Req() req: { user: { userId: string } }) {
    return this.monitoring.getLocations(id, req.user.userId);
  }
  @Get('notifications')
  getNotifications(@Param('id') id: string, @Req() req: { user: { userId: string } }) {
    return this.monitoring.getNotifications(id, req.user.userId);
  }
}
