import React, { useState, useRef } from 'react';
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Send, Loader2 } from 'lucide-react';

export default function ChatInput({ onSendMessage, isSending }) {
    const [message, setMessage] = useState("");
    const textareaRef = useRef(null);

    const handleSend = () => {
        if (message.trim()) {
            onSendMessage(message);
            setMessage("");
        }
    };

    const handleKeyDown = (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSend();
        }
    };

    return (
        <div className="relative">
            <Textarea
                ref={textareaRef}
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Find tracks in the style of Calvin Harris with uplifting summer festival vibes..."
                className="w-full pr-12 py-3 pl-4 border-gray-300 rounded-xl shadow-inner bg-white"
                rows={1}
                style={{ minHeight: '52px', resize: 'none' }}
                disabled={isSending}
            />
            <Button
                size="icon"
                onClick={handleSend}
                disabled={isSending || !message.trim()}
                className="absolute right-3 top-1/2 -translate-y-1/2 h-8 w-8 rounded-lg text-white"
                style={{ backgroundColor: '#F96F51' }}
            >
                {isSending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
            </Button>
        </div>
    );
}