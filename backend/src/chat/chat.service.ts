import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Message } from './message.entity';

@Injectable()
export class ChatService {
    constructor(
        @InjectRepository(Message)
        private messagesRepository: Repository<Message>,
    ) { }

    async createMessage(sender: string, message: string, replyTo?: { id: string; sender: string; message: string; imagePath?: string }, imagePath?: string): Promise<Message> {
        const newMessage = this.messagesRepository.create({
            sender,
            message,
            imagePath,
            replyToId: replyTo?.id,
            replyToSender: replyTo?.sender,
            replyToMessage: replyTo?.message,
            replyToImagePath: replyTo?.imagePath,
        });
        return this.messagesRepository.save(newMessage);
    }

    async getAllMessages(): Promise<Message[]> {
        const messages = await this.messagesRepository.find({
            order: { createdAt: 'DESC' },
            take: 100,
        });
        return messages.reverse();
    }
}
