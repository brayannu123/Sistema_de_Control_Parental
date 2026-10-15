import { UsePipes, ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { ConnectedSocket, MessageBody, OnGatewayConnection, OnGatewayDisconnect, SubscribeMessage, WebSocketGateway, WebSocketServer, WsException } from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { MonitoringService } from './monitoring.service';
import { SubscribeDeviceDto } from './dto/subscribe-device.dto';
import { UpdateLocationDto } from './dto/update-location.dto';
import { NewNotificationDto } from './dto/new-notification.dto';

type SocketIdentity = { userId?: string; sub?: string; deviceId?: string };

@WebSocketGateway({ namespace: '/events' })
export class EventsGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer() server: Server;
  constructor(private readonly jwt: JwtService, private readonly config: ConfigService, private readonly monitoring: MonitoringService) {}
  async handleConnection(client: Socket) {
    const authToken = client.handshake.auth?.token;
    const header = client.handshake.headers.authorization;
    const token = typeof authToken === 'string' ? authToken : typeof header === 'string' ? header.replace(/^Bearer\s+/i, '') : '';
    try {
      if (!token) throw new Error('missing token');
      const secret = this.config.get<string>('JWT_SECRET');
      if (!secret) throw new Error('missing secret');
      client.data.identity = await this.jwt.verifyAsync<SocketIdentity>(token, { secret });
    } catch { client.disconnect(true); }
  }
  handleDisconnect(_client: Socket) {}

  @SubscribeMessage('subscribe_device')
  @UsePipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }))
  async subscribeDevice(@ConnectedSocket() client: Socket, @MessageBody() dto: SubscribeDeviceDto) {
    const identity: SocketIdentity = client.data.identity;
    const parentId = identity?.userId ?? identity?.sub;
    if (!parentId || identity.deviceId) throw new WsException('Solo el padre puede suscribirse');
    try { await this.monitoring.assertParentOwnsDevice(dto.deviceId, parentId); }
    catch { throw new WsException('Dispositivo no encontrado'); }
    await client.join(this.room(dto.deviceId));
    return { event: 'subscribed', data: { deviceId: dto.deviceId } };
  }

  @SubscribeMessage('update_location')
  @UsePipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }))
  async updateLocation(@ConnectedSocket() client: Socket, @MessageBody() dto: UpdateLocationDto) {
    this.assertDeviceToken(client, dto.deviceId);
    try {
      const saved = await this.monitoring.saveLocation(dto);
      this.server.to(this.room(dto.deviceId)).emit('location_updated', saved);
      return { event: 'location_saved', data: saved };
    } catch { throw new WsException('No se pudo guardar la ubicación'); }
  }

  @SubscribeMessage('new_notification')
  @UsePipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }))
  async newNotification(@ConnectedSocket() client: Socket, @MessageBody() dto: NewNotificationDto) {
    this.assertDeviceToken(client, dto.deviceId);
    try {
      const saved = await this.monitoring.saveNotification(dto);
      this.server.to(this.room(dto.deviceId)).emit('notification_received', saved);
      return { event: 'notification_saved', data: saved };
    } catch { throw new WsException('No se pudo guardar la notificación'); }
  }

  private assertDeviceToken(client: Socket, deviceId: string) {
    const identity: SocketIdentity = client.data.identity;
    if (!identity?.deviceId || identity.deviceId !== deviceId) throw new WsException('Token de dispositivo inválido');
  }
  private room(deviceId: string) { return `device:${deviceId}`; }
}
