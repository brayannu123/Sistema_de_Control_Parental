import { Controller, Get, UseGuards } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

export interface IceServerConfig {
  urls: string | string[];
  username?: string;
  credential?: string;
}

@Controller('webrtc')
@UseGuards(JwtAuthGuard)
export class WebrtcController {
  constructor(private readonly config: ConfigService) {}

  @Get('config')
  getIceServers(): { iceServers: IceServerConfig[] } {
    const defaultStun = 'stun:stun.l.google.com:19302,stun:stun1.l.google.com:19302';
    const stunUrls = (this.config.get<string>('STUN_SERVERS') || defaultStun)
      .split(',')
      .map((url) => url.trim())
      .filter(Boolean);

    const iceServers: IceServerConfig[] = [{ urls: stunUrls }];

    const turnUrl = this.config.get<string>('TURN_URL');
    const turnUsername = this.config.get<string>('TURN_USERNAME');
    const turnCredential = this.config.get<string>('TURN_CREDENTIAL');

    if (turnUrl) {
      const turnConfig: IceServerConfig = {
        urls: turnUrl.split(',').map((u) => u.trim()).filter(Boolean),
      };
      if (turnUsername) {
        turnConfig.username = turnUsername;
      }
      if (turnCredential) {
        turnConfig.credential = turnCredential;
      }
      iceServers.push(turnConfig);
    }

    return { iceServers };
  }
}
