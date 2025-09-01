
'use client';

import React, { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { MessageCircle, X, Send, Bot, User, Loader2 } from 'lucide-react';
import { chat } from '@/ai/flows/chat-flow';
import type { ChatInput } from '@/ai/schemas/chat-schema';
import { AnimatePresence, motion } from 'framer-motion';

interface Message {
    role: 'user' | 'model';
    content: string;
}

export function Chatbot() {
    const [isOpen, setIsOpen] = useState(false);
    const [messages, setMessages] = useState<Message[]>([]);
    const [input, setInput] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const messagesEndRef = useRef<HTMLDivElement>(null);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    };

    useEffect(scrollToBottom, [messages]);

    const handleSendMessage = async () => {
        if (input.trim() === '' || isLoading) return;

        const newMessages: Message[] = [...messages, { role: 'user', content: input }];
        setMessages(newMessages);
        setInput('');
        setIsLoading(true);

        try {
            const chatInput: ChatInput = {
                history: newMessages.slice(0, -1),
                message: input,
            };
            const response = await chat(chatInput);
            setMessages([...newMessages, { role: 'model', content: response }]);
        } catch (error) {
            console.error('Chatbot error:', error);
            setMessages([...newMessages, { role: 'model', content: 'Sorry, something went wrong.' }]);
        } finally {
            setIsLoading(false);
        }
    };

    const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSendMessage();
        }
    };

    return (
        <>
            <AnimatePresence>
                {isOpen && (
                    <motion.div
                        initial={{ opacity: 0, y: 50, scale: 0.9 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 50, scale: 0.9 }}
                        transition={{ duration: 0.2 }}
                        className="fixed bottom-24 right-4 z-50"
                    >
                        <Card className="w-80 h-[28rem] flex flex-col shadow-2xl glass-card">
                            <CardHeader className="flex flex-row items-center justify-between p-4 border-b">
                                <div className="flex items-center gap-2">
                                    <Bot className="h-6 w-6 text-primary" />
                                    <CardTitle className="text-lg font-headline">AI Assistant</CardTitle>
                                </div>
                                <Button variant="ghost" size="icon" onClick={() => setIsOpen(false)}>
                                    <X className="h-4 w-4" />
                                </Button>
                            </CardHeader>
                            <CardContent className="flex-1 overflow-y-auto p-4 space-y-4">
                                {messages.map((msg, index) => (
                                    <div key={index} className={`flex gap-2 items-start ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                                        {msg.role === 'model' && <Bot className="h-5 w-5 text-primary flex-shrink-0 mt-1" />}
                                        <div className={`rounded-lg px-3 py-2 text-sm max-w-[80%] ${msg.role === 'user' ? 'bg-primary text-primary-foreground' : 'bg-muted'}`}>
                                            <p className="whitespace-pre-wrap">{msg.content}</p>
                                        </div>
                                        {msg.role === 'user' && <User className="h-5 w-5 text-muted-foreground flex-shrink-0 mt-1" />}
                                    </div>
                                ))}
                                {isLoading && (
                                    <div className="flex gap-2 items-start justify-start">
                                        <Bot className="h-5 w-5 text-primary flex-shrink-0 mt-1" />
                                        <div className="rounded-lg px-3 py-2 text-sm bg-muted flex items-center">
                                            <Loader2 className="h-4 w-4 animate-spin" />
                                        </div>
                                    </div>
                                )}
                                <div ref={messagesEndRef} />
                            </CardContent>
                            <CardFooter className="p-4 border-t">
                                <div className="flex w-full items-center space-x-2">
                                    <Textarea
                                        value={input}
                                        onChange={(e) => setInput(e.target.value)}
                                        onKeyDown={handleKeyDown}
                                        placeholder="Ask a question..."
                                        className="resize-none min-h-[38px] max-h-24"
                                        rows={1}
                                        disabled={isLoading}
                                    />
                                    <Button onClick={handleSendMessage} disabled={isLoading || input.trim() === ''}>
                                        <Send className="h-4 w-4" />
                                    </Button>
                                </div>
                            </CardFooter>
                        </Card>
                    </motion.div>
                )}
            </AnimatePresence>

            <Button
                onClick={() => setIsOpen(!isOpen)}
                size="icon"
                className="fixed bottom-4 right-4 z-50 rounded-full h-16 w-16 shadow-lg"
            >
                 <AnimatePresence>
                    {isOpen ? (
                        <motion.div key="close" initial={{ rotate: 45, scale: 0 }} animate={{ rotate: 0, scale: 1 }} exit={{ rotate: 45, scale: 0 }}>
                            <X className="h-8 w-8" />
                        </motion.div>
                    ) : (
                        <motion.div key="open" initial={{ rotate: -45, scale: 0 }} animate={{ rotate: 0, scale: 1 }} exit={{ rotate: -45, scale: 0 }}>
                            <MessageCircle className="h-8 w-8" />
                        </motion.div>
                    )}
                 </AnimatePresence>
            </Button>
        </>
    );
}
