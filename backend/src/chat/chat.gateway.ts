import {
    SubscribeMessage,
    WebSocketGateway,
    OnGatewayInit,
    WebSocketServer,
    OnGatewayConnection,
    OnGatewayDisconnect,
    MessageBody,
    ConnectedSocket,
} from '@nestjs/websockets';
import { Logger } from '@nestjs/common';
import { Socket, Server } from 'socket.io';
import { ChatService } from './chat.service';

@WebSocketGateway({
    cors: {
        origin: '*',
    },
})
export class ChatGateway
    implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect {
    @WebSocketServer() server: Server;
    private logger: Logger = new Logger('ChatGateway');

    constructor(private chatService: ChatService) { }

    afterInit(server: Server) {
        this.logger.log('Init');
    }

    private connectedUsers: Map<string, string> = new Map();

    handleDisconnect(client: Socket) {
        this.logger.log(`Client disconnected: ${client.id}`);
        this.connectedUsers.delete(client.id);
        this.broadcastActiveUsers();
    }

    handleConnection(client: Socket, ...args: any[]) {
        this.logger.log(`Client connected: ${client.id}`);
        const username = client.handshake.query.username as string;
        if (username) {
            this.connectedUsers.set(client.id, username);
            this.broadcastActiveUsers();
        }
    }

    private broadcastActiveUsers() {
        const users = Array.from(new Set(this.connectedUsers.values())); // Unique usernames
        this.server.emit('activeUsers', {
            count: users.length,
            users: users,
        });
    }

    @SubscribeMessage('msgToServer')
    async handleMessage(
        @ConnectedSocket() client: Socket,
        @MessageBody() payload: { sender: string; message: string; replyTo?: { id: string; sender: string; message: string, imagePath?: string }, imagePath?: string },
    ): Promise<void> {
        const savedMessage = await this.chatService.createMessage(payload.sender, payload.message, payload.replyTo, payload.imagePath);
        // Emit the saved message so clients get the ID (and reply info)
        this.server.emit('msgToClient', savedMessage);
    }
}
