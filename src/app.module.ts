import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthModule } from './auth/auth.module';
import { DevicesModule } from './devices/devices.module';
import { User } from './users/user.entity';
import { Device } from './devices/device.entity';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    TypeOrmModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        type: 'postgres' as const,
        url: config.get<string>('DATABASE_URL'),
        entities: [User, Device],
        synchronize: config.get<string>('NODE_ENV') !== 'production',
        autoLoadEntities: true,
      }),
    }),
    AuthModule,
    DevicesModule,
  ],
})
export class AppModule {}
