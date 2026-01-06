import { io, Socket } from 'socket.io-client';

// Use current hostname (e.g., 192.168.x.x) if in browser, otherwise localhost
const getSocketUrl = () => {
    if (typeof window !== 'undefined') {
        const hostname = window.location.hostname;
        return `http://${hostname}:3002`;
    }
    return 'http://localhost:3002';
};

export const socket: Socket = io(getSocketUrl(), {
    autoConnect: false,
});
