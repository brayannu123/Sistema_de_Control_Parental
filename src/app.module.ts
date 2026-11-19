import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthModule } from './auth/auth.module';
import { Device } from './devices/device.entity';
import { DevicesModule } from './devices/devices.module';
import { LocationHistory } from './locations/location-history.entity';
import { MonitoringModule } from './monitoring/monitoring.module';
import { NotificationLog } from './notifications/notification-log.entity';
import { StreamSession } from './streams/stream-session.entity';
import { StreamsModule } from './streams/streams.module';
import { User } from './users/user.entity';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    TypeOrmModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        type: 'postgres' as const,
        url: config.get<string>('DATABASE_URL'),
        entities: [User, Device, LocationHistory, NotificationLog, StreamSession],
        synchronize: config.get<string>('NODE_ENV') !== 'production',
        autoLoadEntities: true,
      }),
    }),
    AuthModule,
    DevicesModule,
    MonitoringModule,
    StreamsModule,
  ],
})
export class AppModule {}
