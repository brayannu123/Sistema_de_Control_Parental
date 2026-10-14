import { ConflictException, Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { InjectRepository } from '@nestjs/typeorm';
import * as bcrypt from 'bcrypt';
import { Repository } from 'typeorm';
import { User } from '../users/user.entity';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';

const BCRYPT_ROUNDS = 12;

@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(User) private readonly users: Repository<User>,
    private readonly jwtService: JwtService,
  ) {}

  async register(dto: RegisterDto) {
    const email = dto.email.trim().toLowerCase();
    if (await this.users.exist({ where: { email } })) {
      throw new ConflictException('El correo ya está registrado');
    }

    const user = this.users.create({ email, password: await bcrypt.hash(dto.password, BCRYPT_ROUNDS) });
    try {
      const saved = await this.users.save(user);
      return { id: saved.id, email: saved.email, createdAt: saved.createdAt };
    } catch (error) {
      // La restricción UNIQUE resuelve también registros simultáneos con el mismo correo.
      if ((error as { code?: string }).code === '23505') {
        throw new ConflictException('El correo ya está registrado');
      }
      throw error;
    }
  }

  async login(dto: LoginDto) {
    const user = await this.users.createQueryBuilder('user')
      .addSelect('user.password')
      .where('LOWER(user.email) = :email', { email: dto.email.trim().toLowerCase() })
      .getOne();
    if (!user || !(await bcrypt.compare(dto.password, user.password))) {
      throw new UnauthorizedException('Credenciales inválidas');
    }

    const accessToken = await this.jwtService.signAsync({ sub: user.id, email: user.email });
    return { accessToken, tokenType: 'Bearer', expiresIn: process.env.JWT_EXPIRES_IN ?? '1h' };
  }
}
