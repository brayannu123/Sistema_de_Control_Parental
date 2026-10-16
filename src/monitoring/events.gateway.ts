import { UsePipes, ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { ConnectedSocket, MessageBody, OnGatewayConnection, OnGatewayDisconnect, SubscribeMessage, WebSocketGateway, WebSocketServer, WsException } from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { StartStreamDto } from '../streams/dto/start-stream.dto';
import { StopStreamDto } from '../streams/dto/stop-stream.dto';
import { WebrtcAnswerDto } from '../streams/dto/webrtc-answer.dto';
import { WebrtcIceCandidateDto } from '../streams/dto/webrtc-ice-candidate.dto';
import { WebrtcOfferDto } from '../streams/dto/webrtc-offer.dto';
import { StreamsService } from '../streams/streams.service';
import { MonitoringService } from './monitoring.service';
import { SubscribeDeviceDto } from './dto/subscribe-device.dto';
import { UpdateLocationDto } from './dto/update-location.dto';
import { NewNotificationDto } from './dto/new-notification.dto';

type SocketIdentity = { userId?: string; sub?: string; deviceId?: string };

@WebSocketGateway({ namespace: '/events' })
export class EventsGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer() server: Server;

  constructor(
    private readonly jwt: JwtService,
    private readonly config: ConfigService,
    private readonly monitoring: MonitoringService,
    private readonly streams: StreamsService,
  ) {}

  async handleConnection(client: Socket) {
    const authToken = client.handshake.auth?.token;
    const header = client.handshake.headers.authorization;
    const token = typeof authToken === 'string' ? authToken : typeof header === 'string' ? header.replace(/^Bearer\s+/i, '') : '';
    try {
      if (!token) throw new Error('missing token');
      const secret = this.config.get<string>('JWT_SECRET');
      if (!secret) throw new Error('missing secret');
      const identity = await this.jwt.verifyAsync<SocketIdentity>(token, { secret });
      client.data.identity = identity;

      if (identity?.deviceId) {
        await client.join(this.room(identity.deviceId));
      }
    } catch {
      client.disconnect(true);
    }
  }

  async handleDisconnect(client: Socket) {
    const identity: SocketIdentity = client.data.identity;
    if (!identity?.deviceId) return;

    try {
      const sessions = await this.streams.closeActiveSessionsForDevice(identity.deviceId);
      if (sessions.length > 0) {
        this.server.to(this.room(identity.deviceId)).emit('stream_stopped', {
          deviceId: identity.deviceId,
          reason: 'disconnect',
          sessions,
        });
      }
    } catch {
      // Ignoramos errores de cierre para no romper la desconexión del socket.
    }
  }

  @SubscribeMessage('subscribe_device')
  @UsePipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }))
  async subscribeDevice(@ConnectedSocket() client: Socket, @MessageBody() dto: SubscribeDeviceDto) {
    const identity: SocketIdentity = client.data.identity;
    const parentId = identity?.userId ?? identity?.sub;
    if (!parentId || identity.deviceId) throw new WsException('Solo el padre puede suscribirse');
    try {
      await this.monitoring.assertParentOwnsDevice(dto.deviceId, parentId);
    } catch {
      throw new WsException('Dispositivo no encontrado');
    }
    await client.join(this.room(dto.deviceId));
    return { event: 'subscribed', data: { deviceId: dto.deviceId } };
  }

  @SubscribeMessage('start_stream')
  @UsePipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }))
  async startStream(@ConnectedSocket() client: Socket, @MessageBody() dto: StartStreamDto) {
    const identity: SocketIdentity = client.data.identity;
    const parentId = identity?.userId ?? identity?.sub;
    if (!parentId || identity.deviceId) throw new WsException('Solo el padre puede iniciar la transmisión');

    await this.monitoring.assertParentOwnsDevice(dto.deviceId, parentId);
    const session = await this.streams.startSession(dto);
    this.server.to(this.room(dto.deviceId)).emit('stream_started', session);
    return { event: 'stream_started', data: session };
  }

  @SubscribeMessage('stop_stream')
  @UsePipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }))
  async stopStream(@ConnectedSocket() client: Socket, @MessageBody() dto: StopStreamDto) {
    const identity: SocketIdentity = client.data.identity;
    const parentId = identity?.userId ?? identity?.sub;

    if (parentId) {
      await this.monitoring.assertParentOwnsDevice(dto.deviceId, parentId);
    } else {
      this.assertDeviceToken(client, dto.deviceId);
    }

    const session = await this.streams.stopSession(dto);
    this.server.to(this.room(dto.deviceId)).emit('stream_stopped', session);
    return { event: 'stream_stopped', data: session };
  }

  @SubscribeMessage('webrtc_offer')
  @UsePipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }))
  async webrtcOffer(@ConnectedSocket() client: Socket, @MessageBody() dto: WebrtcOfferDto) {
    await this.assertActorCanAccessDevice(client, dto.deviceId);
    const payload = { deviceId: dto.deviceId, offer: dto.offer, sender: client.data.identity?.deviceId ?? 'parent' };
    this.server.to(this.room(dto.deviceId)).emit('webrtc_offer', payload);
    return { event: 'webrtc_offer_sent', data: payload };
  }

  @SubscribeMessage('webrtc_answer')
  @UsePipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }))
  async webrtcAnswer(@ConnectedSocket() client: Socket, @MessageBody() dto: WebrtcAnswerDto) {
    await this.assertActorCanAccessDevice(client, dto.deviceId);
    const payload = { deviceId: dto.deviceId, answer: dto.answer, sender: client.data.identity?.deviceId ?? 'parent' };
    this.server.to(this.room(dto.deviceId)).emit('webrtc_answer', payload);
    return { event: 'webrtc_answer_sent', data: payload };
  }

  @SubscribeMessage('webrtc_ice_candidate')
  @UsePipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }))
  async webrtcIceCandidate(@ConnectedSocket() client: Socket, @MessageBody() dto: WebrtcIceCandidateDto) {
    await this.assertActorCanAccessDevice(client, dto.deviceId);
    const payload = { deviceId: dto.deviceId, candidate: dto.candidate, sender: client.data.identity?.deviceId ?? 'parent' };
    this.server.to(this.room(dto.deviceId)).emit('webrtc_ice_candidate', payload);
    return { event: 'webrtc_ice_candidate_sent', data: payload };
  }

  @SubscribeMessage('update_location')
  @UsePipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }))
  async updateLocation(@ConnectedSocket() client: Socket, @MessageBody() dto: UpdateLocationDto) {
    this.assertDeviceToken(client, dto.deviceId);
    try {
      const saved = await this.monitoring.saveLocation(dto);
      this.server.to(this.room(dto.deviceId)).emit('location_updated', saved);
      return { event: 'location_saved', data: saved };
    } catch {
      throw new WsException('No se pudo guardar la ubicación');
    }
  }

  @SubscribeMessage('new_notification')
  @UsePipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }))
  async newNotification(@ConnectedSocket() client: Socket, @MessageBody() dto: NewNotificationDto) {
    this.assertDeviceToken(client, dto.deviceId);
    try {
      const saved = await this.monitoring.saveNotification(dto);
      this.server.to(this.room(dto.deviceId)).emit('notification_received', saved);
      return { event: 'notification_saved', data: saved };
    } catch {
      throw new WsException('No se pudo guardar la notificación');
    }
  }

  private assertDeviceToken(client: Socket, deviceId: string) {
    const identity: SocketIdentity = client.data.identity;
    if (!identity?.deviceId || identity.deviceId !== deviceId) throw new WsException('Token de dispositivo inválido');
  }

  private async assertActorCanAccessDevice(client: Socket, deviceId: string) {
    const identity: SocketIdentity = client.data.identity;
    const parentId = identity?.userId ?? identity?.sub;

    if (parentId) {
      await this.monitoring.assertParentOwnsDevice(deviceId, parentId);
      return;
    }

    this.assertDeviceToken(client, deviceId);
  }

  private room(deviceId: string) {
    return `device:${deviceId}`;
  }
}
