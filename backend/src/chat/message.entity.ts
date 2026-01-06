import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn } from 'typeorm';

@Entity()
export class Message {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column()
    sender: string;

    @Column()
    message: string;

    @Column({ nullable: true })
    replyToId: string;

    @Column({ nullable: true })
    replyToSender: string;

    @Column({ nullable: true })
    replyToMessage: string;

    @Column({ nullable: true })
    imagePath: string;

    @Column({ nullable: true })
    replyToImagePath: string;

    @CreateDateColumn()
    createdAt: Date;
}
