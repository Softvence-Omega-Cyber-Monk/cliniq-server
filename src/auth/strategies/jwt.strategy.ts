import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    private configService: ConfigService,
    private prisma: PrismaService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: configService.get('JWT_SECRET'),
    });
  }

  async validate(payload: any) {
    // Verify user still exists
    if (payload.userType === 'CLINIC') {
      const clinic = await this.prisma.privateClinic.findUnique({
        where: { id: payload.sub },
      });
      
      if (!clinic) {
        throw new UnauthorizedException('User not found');
      }
    } else if (payload.userType === 'THERAPIST') {
      const therapist = await this.prisma.therapist.findUnique({
        where: { id: payload.sub },
      });
      
      if (!therapist) {
        throw new UnauthorizedException('User not found');
      }
    }

    return {
      sub: payload.sub,
      email: payload.email,
      userType: payload.userType,
    };
  }
}