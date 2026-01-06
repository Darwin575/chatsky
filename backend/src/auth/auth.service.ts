import { Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { v4 as uuidv4 } from 'uuid';

@Injectable()
export class AuthService {
    constructor(private jwtService: JwtService) { }

    async loginAnonymous() {
        const payload = { sub: uuidv4(), username: `Guest-${Math.floor(Math.random() * 10000)}` };
        return {
            access_token: this.jwtService.sign(payload),
            user: payload,
        };
    }
}
