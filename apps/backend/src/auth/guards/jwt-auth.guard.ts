import { Injectable, ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {
    canActivate(context: ExecutionContext) {
        const request = context.switchToHttp().getRequest();

        // If the standard header exists, AuthGuard works as usual
        const authHeader = request.headers['authorization'];
        if (authHeader) return super.canActivate(context);

        // Otherwise, check for token in query
        const token = request.query?.token;
        console.log(request.query)
        if (!token) {
            throw new UnauthorizedException('No token provided');
        }

        // Inject token into headers so passport-jwt can validate it
        request.headers['authorization'] = `Bearer ${token}`;
        return super.canActivate(context);
    }
}