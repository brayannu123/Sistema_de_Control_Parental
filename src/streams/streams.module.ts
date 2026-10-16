import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthModule } from '../auth/auth.module';
import { Device } from '../devices/device.entity';
import { StreamsController } from './streams.controller';
import { StreamsService } from './streams.service';
import { StreamSession } from './stream-session.entity';

@Module({
  imports: [AuthModule, TypeOrmModule.forFeature([Device, StreamSession])],
  controllers: [StreamsController],
  providers: [StreamsService],
  exports: [StreamsService],
})
export class StreamsModule {}
