'use client';

import { useEffect, useState, useRef } from 'react';
import { socket } from '@/socket';
import { motion, AnimatePresence } from 'framer-motion';
import { Send, User, Zap, LogOut, CheckCircle2, Reply, X } from 'lucide-react';
import ReactMarkdown from 'react-markdown';

interface Message {
    id?: string;
    sender: string;
    message: string;
    isMe: boolean;
    timestamp: number;
    replyTo?: {
        id: string;
        sender: string;
        message: string;
        imagePath?: string;
    };
    imagePath?: string;
}

export default function Chat() {
    const [messages, setMessages] = useState<Message[]>([]);
    const [inputValue, setInputValue] = useState('');
    const [replyingTo, setReplyingTo] = useState<Message | null>(null);
    const [isConnected, setIsConnected] = useState(false);
    const [username, setUsername] = useState<string | null>(null);
    const [tempUsername, setTempUsername] = useState('');
    const [hasJoined, setHasJoined] = useState(false);
    const [countdown, setCountdown] = useState<string | null>(null);
    const [countdown12, setCountdown12] = useState<string | null>(null);
    const [activeUserCount, setActiveUserCount] = useState(0);
    const [activeUserList, setActiveUserList] = useState<string[]>([]);

    useEffect(() => {
        const updateCountdown = () => {
            const now = new Date();
            const currentHour = now.getHours();

            // 6PM Countdown (18:00), visible 9am-6pm
            const startHour6PM = 9;
            const endHour6PM = 18;

            if (currentHour >= startHour6PM && currentHour < endHour6PM) {
                const target = new Date(now);
                target.setHours(endHour6PM, 0, 0, 0);
                const diff = target.getTime() - now.getTime();
                if (diff > 0) {
                    const hours = Math.floor(diff / (1000 * 60 * 60));
                    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
                    const seconds = Math.floor((diff % (1000 * 60)) / 1000);
                    setCountdown(`${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`);
                } else {
                    setCountdown(null);
                }
            } else {
                setCountdown(null);
            }

            // 12PM Countdown (12:00), visible 9am-12pm
            const startHour12PM = 9;
            const endHour12PM = 12;

            if (currentHour >= startHour12PM && currentHour < endHour12PM) {
                const target = new Date(now);
                target.setHours(endHour12PM, 0, 0, 0);
                const diff = target.getTime() - now.getTime();

                if (diff > 0) {
                    const hours = Math.floor(diff / (1000 * 60 * 60));
                    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
                    const seconds = Math.floor((diff % (1000 * 60)) / 1000);
                    setCountdown12(`${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`);
                } else {
                    setCountdown12(null);
                }
            } else {
                setCountdown12(null);
            }
        };

        const timer = setInterval(updateCountdown, 1000);
        updateCountdown(); // Initial call
        return () => clearInterval(timer);
    }, []);
    const messagesEndRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        // Only connect when we have a username and initiated join
        if (!hasJoined) return;

        // Use our custom username instead of fetching random one if provided
        // However, backend issues tokens. 
        // Let's modify the flow: 
        // We will still auth anonymously to get a token, but we will "display" the chosen name
        // OR, ideally, we pass the username to the auth endpoint. 
        // Since I can't easily change the backend without full context switch, 
        // I will cheat slightly: I'll use the backend random auth for the TOKEN, 
        // but I'll store my LOCAL username for display. 
        // WAIT: The backend broadcasts the sender name. If I use a local name, the backend will still broadcast "Guest-123".
        // I MUST modify the backend to accept a username, OR just accept the random one for now 
        // and just make the UI better. 
        // 
        // Better User Friendly approach:
        // Let's stick to the generated one for "ease", but SHOW it clearly.
        // actually, let's keep the random one for "simplicity" of backend, but make the UI amazing.

        const login = async () => {
            try {
                const hostname = window.location.hostname;
                const API_URL = `http://${hostname}:3002`;

                // Auth
                const resAuth = await fetch(`${API_URL}/auth/anonymous`, { method: 'POST' });
                const dataAuth = await resAuth.json();

                if (dataAuth.access_token) {
                    setUsername(dataAuth.user.username);
                    socket.auth = { token: dataAuth.access_token };
                    // Pass username in query for active user tracking
                    socket.io.opts.query = { username: dataAuth.user.username };
                    socket.connect();

                    // Fetch History
                    const resHistory = await fetch(`${API_URL}/chat/messages`);
                    const dataHistory = await resHistory.json();

                    // Map history to local shape (backend returns {createdAt, id, message, sender, replyToId, replyToSender, replyToMessage})
                    if (Array.isArray(dataHistory)) {
                        setMessages(dataHistory.map((m: any) => ({
                            id: m.id,
                            sender: m.sender,
                            message: m.message,
                            isMe: m.sender === dataAuth.user.username,
                            timestamp: new Date(m.createdAt).getTime(),
                            imagePath: m.imagePath,
                            replyTo: m.replyToId ? {
                                id: m.replyToId,
                                sender: m.replyToSender,
                                message: m.replyToMessage,
                                imagePath: m.replyToImagePath
                            } : undefined
                        })));
                    }
                }
            } catch (err) {
                console.error('Login/Fetch failed', err);
            }
        };
        login();

        function onConnect() {
            setIsConnected(true);
        }

        function onDisconnect() {
            setIsConnected(false);
        }

        function onMessage(payload: { sender: string; message: string }) {
            setMessages((prev) => [
                ...prev,
                {
                    ...payload,
                    isMe: payload.sender === username, // Check against state
                    timestamp: Date.now(),
                },
            ]);
        }

        function onActiveUsers(data: { count: number, users: string[] }) {
            setActiveUserCount(data.count);
            setActiveUserList(data.users);
        }

        socket.on('activeUsers', onActiveUsers);
        socket.on('connect', onConnect);
        socket.on('disconnect', onDisconnect);
        socket.on('msgToClient', (payload: any) => {
            setMessages(currentMessages => {
                const isMe = payload.sender === usernameRef.current;

                if (!isMe) {
                    sendNativeNotification(payload.sender, payload.message);
                    document.title = "💬 New Message!";
                    setTimeout(() => document.title = "Chatsky", 3000);
                }

                // Map flattened fields to nested object if present
                const replyTo = payload.replyToId ? {
                    id: payload.replyToId,
                    sender: payload.replyToSender,
                    message: payload.replyToMessage,
                    imagePath: payload.replyToImagePath
                } : undefined;

                // Handle case where payload might already have nested replyTo (if backend logic changed, though currently it emits entity)
                // or if we emitted it ourselves ideally, but we rely on backend broadcast.

                return [...currentMessages, {
                    ...payload,
                    isMe,
                    timestamp: Date.now(),
                    replyTo: replyTo || payload.replyTo // Fallback if backend passed it nested
                }];
            });
        });

        return () => {
            socket.off('connect', onConnect);
            socket.off('disconnect', onDisconnect);
            socket.off('activeUsers', onActiveUsers);
            socket.off('msgToClient');
            socket.disconnect();
        };
    }, [hasJoined]);

    // Ref to track username for the event listener closure
    const usernameRef = useRef(username);
    useEffect(() => { usernameRef.current = username; }, [username]);



    // Native notification helper
    const sendNativeNotification = (sender: string, message: string) => {
        if ('Notification' in window && Notification.permission === 'granted') {
            new Notification(`New message from ${sender}`, {
                body: message,
                icon: '/icon.png' // Optional, if we had one
            });
        }
    };

    // useEffect(() => {
    //     // Prune messages older than 10 seconds every 1 second
    //     const interval = setInterval(() => {
    //         const now = Date.now();
    //         setMessages(prev => prev.filter(msg => now - msg.timestamp < 10000));
    //     }, 1000);
    //     return () => clearInterval(interval);
    // }, []);

    const handleJoin = async (e: React.FormEvent) => {
        e.preventDefault();
        setHasJoined(true);

        if (!('Notification' in window)) {
            alert("This browser does not support desktop notification");
            return;
        }

        if (Notification.permission === 'granted') {
            // Already active
            return;
        }

        if (Notification.permission !== 'denied') {
            // Requesting...
            const permission = await Notification.requestPermission();
            if (permission === 'granted') {
                new Notification("Chatsky", { body: "Notifications enabled!" });
            }
        } else {
            // It was denied before
            alert("Notifications are currently BLOCKED. You need to click the Lock icon in your address bar and 'Reset permissions' or 'Allow' notifications manually.");
        }
    }

    // Auto-scroll needs to be fast
    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);

    const sendMessage = (e: React.FormEvent) => {
        e.preventDefault();
        if (inputValue.trim() && username) {
            const payload: any = { sender: username, message: inputValue };
            if (replyingTo) {
                payload.replyTo = {
                    id: replyingTo.id, // ID might be missing for optimistic messages, but okay for persisted ones
                    sender: replyingTo.sender,
                    message: replyingTo.message,
                    imagePath: replyingTo.imagePath
                };
            }
            socket.emit('msgToServer', payload);
            setInputValue('');
            setReplyingTo(null);
        }
    };

    const fileInputRef = useRef<HTMLInputElement>(null);

    const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        const formData = new FormData();
        formData.append('file', file);

        try {
            const hostname = window.location.hostname;
            const API_URL = `http://${hostname}:3002`;

            const res = await fetch(`${API_URL}/upload`, {
                method: 'POST',
                body: formData,
            });
            const data = await res.json();

            if (data.url && username) {
                const msgPayload: any = {
                    sender: username,
                    message: "",
                    imagePath: data.url
                };
                socket.emit('msgToServer', msgPayload);
            }
        } catch (err) {
            console.error("Upload failed", err);
            alert("Failed to upload image");
        }

        if (fileInputRef.current) fileInputRef.current.value = '';
    };

    const textareaRef = useRef<HTMLTextAreaElement>(null);

    const formatText = (syntax: string, type: 'wrap' | 'block' = 'wrap') => {
        if (!textareaRef.current) return;

        const start = textareaRef.current.selectionStart;
        const end = textareaRef.current.selectionEnd;
        const text = inputValue;

        let newText = '';
        let selectionStart = 0;
        let selectionEnd = 0;

        if (start === end) {
            // No selection: Insert placeholder
            let placeholder = 'text';
            if (syntax === '**') placeholder = 'bold text';
            else if (syntax === '*') placeholder = 'italic text';
            else if (syntax === '```') placeholder = 'code block';

            const before = text.substring(0, start);
            const after = text.substring(end);

            if (type === 'block') {
                newText = `${before}\`\`\`\n${placeholder}\n\`\`\`${after}`;
                selectionStart = start + 4;
                selectionEnd = selectionStart + placeholder.length;
            } else {
                newText = `${before}${syntax}${placeholder}${syntax}${after}`;
                selectionStart = start + syntax.length;
                selectionEnd = selectionStart + placeholder.length;
            }
        } else {
            // Existing selection: Wrap it
            const before = text.substring(0, start);
            const selected = text.substring(start, end);
            const after = text.substring(end);

            if (type === 'block') {
                newText = `${before}\`\`\`\n${selected}\n\`\`\`${after}`;
                selectionStart = start + 4;
                selectionEnd = selectionStart + selected.length;
            } else {
                newText = `${before}${syntax}${selected}${syntax}${after}`;
                selectionStart = end + (syntax.length * 2);
                selectionEnd = selectionStart;
            }
        }

        setInputValue(newText);

        setTimeout(() => {
            textareaRef.current?.focus();
            textareaRef.current?.setSelectionRange(selectionStart, selectionEnd);
        }, 0);
    };

    if (!hasJoined) {
        return (
            <div className="flex h-screen w-full flex-col items-center justify-center bg-[#0a0a0a] text-white p-4 relative overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/20 via-purple-500/10 to-transparent pointer-events-none" />

                <motion.div
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="z-10 max-w-md w-full text-center space-y-8"
                >
                    <div className="space-y-2">
                        <div className="mx-auto w-16 h-16 bg-gradient-to-tr from-indigo-500 to-purple-600 rounded-2xl flex items-center justify-center mb-6 shadow-2xl shadow-indigo-500/30">
                            <Zap size={32} fill="white" className="text-white" />
                        </div>
                        <h1 className="text-4xl font-bold tracking-tighter">Chatsky</h1>
                        <h4 className="text-2xl font-bold tracking-tighter">Libak Didto, Libak Diri</h4>
                        {/* <p className="text-zinc-400 text-lg">Enter the anonymous void.</p> */}
                    </div>

                    <button
                        onClick={() => setHasJoined(true)}
                        className="cursor-pointer h-16 w-full py-10 bg-white text-black font-bold text-lg rounded-xl hover:scale-[1.02] active:scale-[0.98] transition-transform shadow-xl"
                    >
                        Start Chatting
                    </button>
                    <p className="text-xs text-zinc-600">No login required. Completely anonymous.</p>
                </motion.div>
            </div>
        )
    }

    return (
        <div className="flex flex-col h-[100dvh] bg-[#0a0a0a] text-white font-sans overflow-hidden">
            {/* Navbar */}
            <header className="px-4 py-3 sm:py-4 lg:py-5 bg-zinc-900/50 backdrop-blur-md border-b border-white/5 flex items-center justify-between z-10 sticky top-0 shrink-0">
                {/* Left: Chatsky Logo */}
                <div className="flex items-center gap-3 shrink-0">
                    <div className={`w-2 h-2 rounded-full ${isConnected ? 'bg-green-500 shadow-[0_0_10px_rgba(34,197,94,0.5)]' : 'bg-red-500'}`} />
                    <h1 className="font-bold text-sm tracking-wide">Chatsky</h1>
                </div>

                {/* Center: Countdown Timers */}
                {(countdown || countdown12) && (
                    <div className="flex flex-row gap-2 sm:gap-4 lg:gap-8 items-center">
                        {/* 12 PM Countdown */}
                        {countdown12 && (
                            <div className="bg-black/90 backdrop-blur-xl border border-white/20 px-2 py-1 sm:px-4 sm:py-2 lg:px-6 lg:py-4 rounded-lg sm:rounded-xl flex items-center gap-1.5 sm:gap-2 lg:gap-3 shadow-[0_0_30px_rgba(16,185,129,0.3)] transition-all duration-300">
                                <span className="relative flex h-2 w-2 sm:h-3 sm:w-3 lg:h-4 lg:w-4 shrink-0">
                                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                                    <span className="relative inline-flex rounded-full h-2 w-2 sm:h-3 sm:w-3 lg:h-4 lg:w-4 bg-emerald-500"></span>
                                </span>
                                <div className="flex flex-col items-center leading-none">
                                    <span className="text-[7px] sm:text-[10px] lg:text-xs uppercase tracking-[0.1em] sm:tracking-[0.2em] text-emerald-300 font-bold mb-0.5 opacity-90">Noon</span>
                                    <span className="font-mono leading-none font-black text-emerald-50 tracking-wide sm:tracking-wider shadow-black drop-shadow-lg" style={{ fontSize: 'clamp(0.875rem, 3vw, 2rem)' }}>
                                        {countdown12}
                                    </span>
                                </div>
                            </div>
                        )}

                        {/* 6 PM Countdown */}
                        {countdown && (
                            <div className="bg-black/90 backdrop-blur-xl border border-white/20 px-2 py-1 sm:px-4 sm:py-2 lg:px-6 lg:py-4 rounded-lg sm:rounded-xl flex items-center gap-1.5 sm:gap-2 lg:gap-3 shadow-[0_0_30px_rgba(79,70,229,0.3)] transition-all duration-300">
                                <span className="relative flex h-2 w-2 sm:h-3 sm:w-3 lg:h-4 lg:w-4 shrink-0">
                                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-indigo-400 opacity-75"></span>
                                    <span className="relative inline-flex rounded-full h-2 w-2 sm:h-3 sm:w-3 lg:h-4 lg:w-4 bg-indigo-500"></span>
                                </span>
                                <div className="flex flex-col items-center leading-none">
                                    <span className="text-[7px] sm:text-[10px] lg:text-xs uppercase tracking-[0.1em] sm:tracking-[0.2em] text-indigo-300 font-bold mb-0.5 opacity-90">Evening</span>
                                    <span className="font-mono leading-none font-black text-indigo-50 tracking-wide sm:tracking-wider shadow-black drop-shadow-lg" style={{ fontSize: 'clamp(0.875rem, 3vw, 2rem)' }}>
                                        {countdown}
                                    </span>
                                </div>
                            </div>
                        )}
                    </div>
                )}

                {/* Right: Active Users & Username */}
                <div className="flex items-center gap-4 sm:gap-6 shrink-0">
                    {/* Active Users Badge */}
                    <div className="relative group">
                        <button className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-zinc-800/50 hover:bg-zinc-800 transition-all border border-white/5 hover:border-green-500/30">
                            <span className="relative flex h-2 w-2">
                                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                                <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
                            </span>
                            <span className="text-xs font-medium text-zinc-300 group-hover:text-green-400 transition-colors">
                                <span className="hidden sm:inline">{activeUserCount} online</span>
                                <span className="sm:hidden">{activeUserCount}</span>
                            </span>
                        </button>

                        {/* Dropdown (visible on group-hover) */}
                        <div className="absolute right-0 top-full mt-3 w-56 bg-[#1a1a1a] border border-white/10 rounded-xl shadow-2xl backdrop-blur-xl overflow-hidden hidden group-hover:block z-50 ring-1 ring-black/5" style={{ transformOrigin: 'top right' }}>
                            <div className="px-4 py-3 border-b border-white/5 bg-white/5 flex justify-between items-center">
                                <span className="text-[10px] uppercase tracking-wider text-zinc-400 font-bold">People Online</span>
                                <span className="text-[10px] font-mono text-zinc-500">{activeUserCount}</span>
                            </div>
                            <div className="max-h-[200px] overflow-y-auto scrollbar-thin scrollbar-thumb-zinc-700 p-1">
                                {activeUserList.map((user, i) => (
                                    <div key={i} className="px-3 py-2 text-sm text-zinc-300 rounded-lg hover:bg-white/5 flex items-center gap-3 transition-colors">
                                        <div className={`w-2 h-2 rounded-full ring-2 ring-black ${user === username ? 'bg-indigo-500' : 'bg-green-500'}`} />
                                        <span className={`truncate ${user === username ? 'text-indigo-300 font-bold' : ''}`}>
                                            {user === username ? 'You' : user}
                                        </span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>

                    {/* Username */}
                    <div className="px-4 py-1.5 bg-indigo-500/10 rounded-full border border-indigo-500/20 text-xs text-indigo-300 font-medium font-mono">
                        {username || '...'}
                    </div>
                </div>
            </header>

            {/* Messages */}
            <main className="flex-1 overflow-y-auto overflow-x-hidden py-4 space-y-2 pb-10">
                <div className="max-w-4xl mx-auto w-full space-y-2 px-2">
                    <AnimatePresence initial={false}>
                        {messages.map((msg, index) => {
                            const isMe = msg.sender === username;
                            return (
                                <motion.div
                                    key={msg.id || index}
                                    initial={{ opacity: 0, y: 20, scale: 0.95 }}
                                    animate={{ opacity: 1, y: 0, scale: 1 }}
                                    exit={{ opacity: 0, scale: 0.95, transition: { duration: 0.2 } }}
                                    className={`flex gap-3 w-full group ${isMe ? 'flex-row-reverse' : 'flex-row'}`}
                                >
                                    <div className={`flex flex-col max-w-[90%] ${isMe ? 'items-end ml-auto' : 'items-start mr-auto'}`}>
                                        {/* Username (Top, no padding) */}
                                        {!isMe && (
                                            <span className="text-xs font-bold text-zinc-400 leading-none select-none">
                                                {msg.sender}
                                            </span>
                                        )}

                                        <div
                                            className={`flex items-end gap-2 w-full ${isMe ? 'justify-end' : 'justify-start'}`}
                                            style={{
                                                paddingLeft: isMe ? 0 : '6px',
                                                paddingRight: isMe ? '6px' : 0
                                            }}
                                        >
                                            {/* Reply Button (Left for Me) */}
                                            {isMe && (
                                                <button
                                                    onClick={() => setReplyingTo(msg)}
                                                    className="p-2 rounded-full text-zinc-500 hover:text-white hover:bg-zinc-800 transition-all opacity-0 group-hover:opacity-100 shrink-0"
                                                    title="Reply"
                                                >
                                                    <Reply size={16} />
                                                </button>
                                            )}

                                            <div
                                                className={`relative px-4 py-2 shadow-xl backdrop-blur-sm
                                                    ${isMe
                                                        ? 'bg-indigo-600 text-white rounded-2xl rounded-tr-sm border border-indigo-500/50 origin-right mr-2'
                                                        : 'bg-zinc-800/80 text-zinc-200 rounded-2xl rounded-tl-sm border border-white/5 origin-left ml-2'
                                                    } hover:scale-[1.01] transition-transform duration-200 min-w-[100px] max-w-full`}
                                            >
                                                {/* Reply Context */}
                                                {msg.replyTo && (
                                                    <div className={`mb-2 px-2 py-1 rounded bg-black/20 border-l-2 ${isMe ? 'border-white/30' : 'border-indigo-400'} text-xs flex gap-2 items-center`}>
                                                        {msg.replyTo.imagePath && (
                                                            <div className="shrink-0 rounded overflow-hidden border border-white/10" style={{ width: '20px', height: '20px' }}>
                                                                <img
                                                                    src={`http://${typeof window !== 'undefined' ? window.location.hostname : 'localhost'}:3002${msg.replyTo.imagePath}`}
                                                                    alt="Replying to attachment"
                                                                    className="w-full h-full object-cover"
                                                                />
                                                            </div>
                                                        )}
                                                        <div className="overflow-hidden min-w-0">
                                                            <span className="font-bold opacity-75 block truncate">{msg.replyTo.sender}</span>
                                                            <p className="opacity-60 truncate">{msg.replyTo.message}</p>
                                                        </div>
                                                    </div>
                                                )}

                                                {/* Valid Image Display */}
                                                {msg.imagePath && (
                                                    <div className="mb-2 rounded-lg overflow-hidden border border-white/10">
                                                        {/* eslint-disable-next-line @next/next/no-img-element */}
                                                        <img
                                                            src={`http://${typeof window !== 'undefined' ? window.location.hostname : 'localhost'}:3002${msg.imagePath}`}
                                                            alt="Attachment"
                                                            className="max-w-full h-auto object-cover max-h-[300px]"
                                                            loading="lazy"
                                                        />
                                                    </div>
                                                )}

                                                <div className="text-[15px] leading-relaxed whitespace-pre-wrap break-words markdown-content mb-1">
                                                    <ReactMarkdown
                                                        components={{
                                                            p: ({ node, ...props }) => <p {...props} className="break-words whitespace-pre-wrap break-all" />,
                                                            code: ({ node, ...props }) => (
                                                                <code {...props} className="bg-black/20 rounded px-1 py-0.5 text-sm font-mono inline-block" />
                                                            ),
                                                            pre: ({ node, ...props }) => (
                                                                <pre {...props} className="bg-black/20 rounded-lg p-2 my-2 overflow-x-auto text-sm font-mono block" />
                                                            )
                                                        }}
                                                    >
                                                        {msg.message}
                                                    </ReactMarkdown>
                                                </div>

                                                {/* Timestamp (Inside bubble, bottom right) */}
                                                <div className={`text-[9px] opacity-60 text-right leading-none mt-1 ${isMe ? 'text-white' : 'text-zinc-400'}`}>
                                                    {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                </div>
                                            </div>

                                            {/* Reply Button (Right for Others) */}
                                            {!isMe && (
                                                <button
                                                    onClick={() => setReplyingTo(msg)}
                                                    className="p-2 rounded-full text-zinc-500 hover:text-white hover:bg-zinc-800 transition-all opacity-0 group-hover:opacity-100 shrink-0"
                                                    title="Reply"
                                                >
                                                    <Reply size={16} />
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                </motion.div>
                            )
                        })}
                    </AnimatePresence>
                    <div ref={messagesEndRef} className="h-4" />
                </div>
            </main>

            {/* Input Bar (Docked) */}
            <div className="py-4 bg-zinc-900/30 backdrop-blur-lg border-t border-white/5 z-20 shrink-0">
                <form onSubmit={sendMessage} className="max-w-4xl mx-auto w-full flex flex-col gap-2 px-2">
                    {/* Replying To Banner */}
                    <AnimatePresence>
                        {replyingTo && (
                            <motion.div
                                initial={{ opacity: 0, y: 10, height: 0 }}
                                animate={{ opacity: 1, y: 0, height: 'auto' }}
                                exit={{ opacity: 0, y: 10, height: 0 }}
                                className="flex items-center justify-between bg-zinc-800/80 border border-zinc-700/50 rounded-xl px-4 py-2 text-sm text-zinc-300"
                            >
                                <div className="flex items-center gap-2 overflow-hidden flex-1">
                                    <Reply size={14} className="text-indigo-400 shrink-0" />
                                    {replyingTo.imagePath && (
                                        <div className="shrink-0 rounded overflow-hidden border border-white/10" style={{ width: '20px', height: '20px' }}>
                                            <img
                                                src={`http://${typeof window !== 'undefined' ? window.location.hostname : 'localhost'}:3002${replyingTo.imagePath}`}
                                                alt="Replying to attachment"
                                                className="w-full h-full object-cover"
                                            />
                                        </div>
                                    )}
                                    <div className="overflow-hidden min-w-0 flex items-center gap-1">
                                        <span className="font-bold text-indigo-400 shrink-0">Replying to {replyingTo.sender}:</span>
                                        <span className="truncate">{replyingTo.message}</span>
                                    </div>
                                </div>
                                <button
                                    onClick={() => setReplyingTo(null)}
                                    className="p-1 hover:bg-white/10 rounded-full transition-colors"
                                >
                                    <X size={14} />
                                </button>
                            </motion.div>
                        )}
                    </AnimatePresence>

                    <div className="flex-1 bg-zinc-900/90 backdrop-blur-xl border border-zinc-700/50 rounded-2xl shadow-2xl flex flex-col transition-all focus-within:border-indigo-500/30 focus-within:ring-1 focus-within:ring-indigo-500/10 overflow-hidden">
                        {/* Toolbar */}
                        <div className="flex items-center gap-1 p-2 border-b border-white/5 bg-white/5">
                            <input
                                type="file"
                                ref={fileInputRef}
                                className="hidden"
                                accept="image/*"
                                onChange={handleFileUpload}
                            />
                            <button
                                onClick={() => fileInputRef.current?.click()}
                                type="button"
                                className="p-1.5 text-zinc-400 hover:text-indigo-400 hover:bg-indigo-500/10 rounded-lg transition-colors flex items-center gap-1"
                            >
                                <div className="w-4 h-4 rounded-full border border-current flex items-center justify-center">
                                    <span className="text-[9px] font-bold leading-none">+</span>
                                </div>
                            </button>
                            <button
                                onClick={() => formatText('**')}
                                type="button"
                                className="p-1.5 text-zinc-400 hover:text-white hover:bg-white/10 rounded-lg transition-colors"
                                title="Bold"
                            >
                                <span className="font-bold text-xs serif">B</span>
                            </button>
                            <button
                                onClick={() => formatText('*')}
                                type="button"
                                className="p-1.5 text-zinc-400 hover:text-white hover:bg-white/10 rounded-lg transition-colors italic"
                                title="Italic"
                            >
                                <span className="font-serif text-xs">I</span>
                            </button>
                            <button
                                onClick={() => formatText('```', 'block')}
                                type="button"
                                className="p-1.5 text-zinc-400 hover:text-white hover:bg-white/10 rounded-lg transition-colors"
                                title="Code"
                            >
                                <span className="font-mono text-xs">{'<>'}</span>
                            </button>
                        </div>

                        <div className="flex items-end gap-2 p-3">
                            <textarea
                                ref={textareaRef}
                                className="flex-1 bg-transparent border-none focus:ring-0 text-white placeholder-zinc-500 text-[15px] min-h-[80px] max-h-[200px] resize-none py-1 leading-relaxed outline-none scrollbar-thin scrollbar-thumb-zinc-700 overflow-x-hidden"
                                style={{ color: '#ffffff' }}
                                value={inputValue}
                                onChange={(e) => setInputValue(e.target.value)}
                                onKeyDown={(e) => {
                                    if (e.key === 'Enter' && !e.shiftKey) {
                                        e.preventDefault();
                                        if (inputValue.trim()) sendMessage(e);
                                    }
                                }}
                                placeholder="Write a message..."
                                autoFocus
                            />
                            <button
                                onClick={sendMessage}
                                type="button"
                                disabled={!inputValue.trim()}
                                className={`p-2.5 rounded-xl transition-all duration-200 mb-0.5
                                    ${inputValue.trim()
                                        ? 'bg-indigo-600 text-white hover:bg-indigo-500 shadow-lg shadow-indigo-500/20'
                                        : 'bg-zinc-800 text-zinc-600'}`}
                            >
                                <Send size={18} fill={inputValue.trim() ? "currentColor" : "none"} />
                            </button>
                        </div>
                    </div>
                </form>
            </div >
        </div >
    );
}
