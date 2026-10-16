import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthModule } from '../auth/auth.module';
import { Device } from '../devices/device.entity';
import { LocationHistory } from '../locations/location-history.entity';
import { NotificationLog } from '../notifications/notification-log.entity';
import { StreamSession } from '../streams/stream-session.entity';
import { StreamsModule } from '../streams/streams.module';
import { EventsGateway } from './events.gateway';
import { MonitoringController } from './monitoring.controller';
import { MonitoringService } from './monitoring.service';

@Module({
  imports: [AuthModule, TypeOrmModule.forFeature([Device, LocationHistory, NotificationLog, StreamSession]), StreamsModule],
  controllers: [MonitoringController],
  providers: [MonitoringService, EventsGateway],
  exports: [MonitoringService],
})
export class MonitoringModule {}
