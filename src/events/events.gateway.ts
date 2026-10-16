import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  OnGatewayConnection,
  OnGatewayDisconnect,
  ConnectedSocket,
  MessageBody,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { Logger } from '@nestjs/common';
import { StreamsService } from '../streams/streams.service';
import { StartStreamDto } from '../streams/dto/start-stream.dto';
import { StopStreamDto } from '../streams/dto/stop-stream.dto';
import { WebrtcOfferDto } from '../streams/dto/webrtc-offer.dto';
import { WebrtcAnswerDto } from '../streams/dto/webrtc-answer.dto';
import { WebrtcIceCandidateDto } from '../streams/dto/webrtc-ice-candidate.dto';

@WebSocketGateway({
  cors: { origin: '*' },
  namespace: 'events',
})
export class EventsGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  private readonly logger = new Logger(EventsGateway.name);

  constructor(private readonly streamsService: StreamsService) {}

  handleConnection(client: Socket) {
    this.logger.log(`Cliente conectado: ${client.id}`);
  }

  handleDisconnect(client: Socket) {
    this.logger.log(`Cliente desconectado: ${client.id}`);
  }

  /**
   * Suscripción del Padre a la sala del dispositivo
   */
  @SubscribeMessage('subscribe_device')
  handleSubscribeDevice(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { deviceId: string },
  ) {
    const room = `device_${data.deviceId}`;
    client.join(room);
    this.logger.log(`Socket ${client.id} suscrito a la sala ${room}`);

    return {
      event: 'subscribed',
      data: { deviceId: data.deviceId },
    };
  }

  /**
   * Actualización de Ubicación GPS (Fase 2)
   */
  @SubscribeMessage('update_location')
  handleUpdateLocation(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { deviceId: string; latitude: number; longitude: number; batteryLevel?: number },
  ) {
    const room = `device_${data.deviceId}`;
    this.server.to(room).emit('location_updated', {
      id: `loc_${Date.now()}`,
      ...data,
      timestamp: new Date(),
    });
    return { status: 'ok' };
  }

  /**
   * Nueva Notificación Recibida (Fase 2)
   */
  @SubscribeMessage('new_notification')
  handleNewNotification(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { deviceId: string; appName: string; title: string; content: string },
  ) {
    const room = `device_${data.deviceId}`;
    this.server.to(room).emit('notification_received', {
      id: `notif_${Date.now()}`,
      ...data,
      receivedAt: new Date(),
    });
    return { status: 'ok' };
  }

  /**
   * Iniciar Transmisión de Streaming (Fase 3)
   */
  @SubscribeMessage('start_stream')
  async handleStartStream(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: StartStreamDto,
  ) {
    const room = `device_${data.deviceId}`;
    const session = await this.streamsService.startStream(data);

    this.server.to(room).emit('stream_requested', {
      sessionId: session.id,
      streamType: data.streamType,
    });

    return { event: 'stream_started', session };
  }

  /**
   * Detener Transmisión de Streaming (Fase 3)
   */
  @SubscribeMessage('stop_stream')
  async handleStopStream(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: StopStreamDto,
  ) {
    const room = `device_${data.deviceId}`;
    const session = await this.streamsService.stopStream(data);

    this.server.to(room).emit('stream_stopped', {
      sessionId: session?.id ?? null,
    });

    return { event: 'stream_stopped', session };
  }

  /**
   * Señalización WebRTC: Oferta (Offer)
   */
  @SubscribeMessage('webrtc_offer')
  handleWebRtcOffer(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: WebrtcOfferDto,
  ) {
    const room = `device_${data.deviceId}`;
    client.to(room).emit('webrtc_offer', data);
    return { status: 'ok' };
  }

  /**
   * Señalización WebRTC: Respuesta (Answer)
   */
  @SubscribeMessage('webrtc_answer')
  handleWebRtcAnswer(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: WebrtcAnswerDto,
  ) {
    const room = `device_${data.deviceId}`;
    client.to(room).emit('webrtc_answer', data);
    return { status: 'ok' };
  }

  /**
   * Señalización WebRTC: Candidato ICE
   */
  @SubscribeMessage('webrtc_ice_candidate')
  handleWebRtcIceCandidate(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: WebrtcIceCandidateDto,
  ) {
    const room = `device_${data.deviceId}`;
    client.to(room).emit('webrtc_ice_candidate', data);
    return { status: 'ok' };
  }
}
