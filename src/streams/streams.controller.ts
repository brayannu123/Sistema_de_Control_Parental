import { Controller, Get, Param, Req, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { StreamsService } from './streams.service';

@Controller('devices/:id')
@UseGuards(JwtAuthGuard)
export class StreamsController {
  constructor(private readonly streams: StreamsService) {}

  @Get('streams')
  getStreamsHistory(@Param('id') id: string, @Req() req: { user: { userId: string } }) {
    return this.streams.getSessions(id, req.user.userId);
  }
}
