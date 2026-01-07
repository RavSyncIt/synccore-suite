
import React, { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Loader2, Zap, RotateCcw, Save, Download, History, X } from "lucide-react";
import ChatInput from "../components/search/ChatInput";
import MessageBubble from "../components/search/MessageBubble";
import { ChatSession } from "@/entities/ChatSession";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Card, CardContent } from "@/components/ui/card";

const AGENT_NAME = "catalog_navigator";

const examplePrompts = [
    "Get me romantic tracks.",
    "I'm looking for tracks with empowering lyrics for a triumphant moment.",
    "Recommend an eerie track for a chilling moment when a hidden secret is uncovered."
];

export default function SearchPage() {
    const [conversation, setConversation] = useState(null);
    const [messages, setMessages] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isSending, setIsSending] = useState(false);
    const messagesEndRef = useRef(null);

    const [savedSessions, setSavedSessions] = useState([]);
    const [showSaveDialog, setShowSaveDialog] = useState(false);
    const [showLoadDialog, setShowLoadDialog] = useState(false);
    const [sessionName, setSessionName] = useState("");
    const [agentError, setAgentError] = useState(null);

    useEffect(() => {
        const initConversation = async () => {
            try {
                // Import agentSDK dynamically with error handling
                const { agentSDK } = await import("@/agents");
                
                if (!agentSDK || typeof agentSDK.createConversation !== 'function') {
                    throw new Error('AgentSDK not available');
                }

                const newConversation = await agentSDK.createConversation({
                    agent_name: AGENT_NAME,
                    metadata: { name: `Search Session ${new Date().toISOString()}` }
                });
                
                setConversation(newConversation);
                setAgentError(null);
            } catch (error) {
                console.error("Failed to initialize conversation:", error);
                setAgentError("Failed to initialize AI assistant. Please refresh the page.");
            }
            setIsLoading(false);
        };
        initConversation();
    }, []);

    useEffect(() => {
        loadSavedSessions();
    }, []);

    useEffect(() => {
        if (!conversation) return;

        const setupSubscription = async () => {
            try {
                const { agentSDK } = await import("@/agents");
                
                if (!agentSDK || typeof agentSDK.subscribeToConversation !== 'function') {
                    throw new Error('AgentSDK subscription not available');
                }

                const unsubscribe = agentSDK.subscribeToConversation(conversation.id, (data) => {
                    setMessages(data.messages);
                    if(data.status !== 'running') {
                        setIsSending(false);
                    }
                });

                return () => unsubscribe();
            } catch (error) {
                console.error("Failed to setup subscription:", error);
                setAgentError("Lost connection to AI assistant");
            }
        };
        
        setupSubscription();
    }, [conversation]);

    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }, [messages]);

    const loadSavedSessions = async () => {
        try {
            const sessions = await ChatSession.list("-created_date");
            setSavedSessions(sessions);
        } catch (error) {
            console.error("Failed to load saved sessions:", error);
        }
    };

    const handleSaveSession = async () => {
        if (!sessionName.trim() || messages.length === 0) return;
        
        try {
            const sessionData = {
                name: sessionName.trim(),
                conversationId: conversation?.id,
                messages: messages.map(msg => ({
                    role: msg.role,
                    content: msg.content,
                    timestamp: msg.created_at
                })),
                lastMessage: messages[messages.length - 1]?.content?.substring(0, 100) + (messages[messages.length - 1]?.content?.length > 100 ? "..." : "") || ""
            };

            await ChatSession.create(sessionData);
            await loadSavedSessions();
            setSessionName("");
            setShowSaveDialog(false);
        } catch (error) {
            console.error("Failed to save session:", error);
        }
    };

    const handleLoadSession = async (session) => {
        try {
            const { agentSDK } = await import("@/agents");
            
            const newConversation = await agentSDK.createConversation({
                agent_name: AGENT_NAME,
                metadata: { name: `Loaded: ${session.name}` }
            });
            
            setConversation(newConversation);
            setMessages([]);
            
            // Replay messages from the saved session
            for (const msg of session.messages) {
                if (msg.role === 'user') {
                    await agentSDK.addMessage(newConversation, {
                        role: "user",
                        content: msg.content
                    });
                }
            }
            
            setShowLoadDialog(false);
        } catch (error) {
            console.error("Failed to load session:", error);
            setAgentError("Failed to load session");
        }
    };

    const handleDeleteSession = async (sessionId) => {
        try {
            await ChatSession.delete(sessionId);
            await loadSavedSessions();
        } catch (error) {
            console.error("Failed to delete session:", error);
        }
    };

    const handleClearChat = async () => {
        try {
            const { agentSDK } = await import("@/agents");
            
            const newConversation = await agentSDK.createConversation({
                agent_name: AGENT_NAME,
                metadata: { name: `Search Session ${new Date().toISOString()}` }
            });
            setConversation(newConversation);
            setMessages([]);
            setIsSending(false);
            setAgentError(null);
        } catch (error) {
            console.error("Failed to clear chat:", error);
            setAgentError("Failed to create new session");
        }
    };

    const handleDownloadChat = () => {
        if (messages.length === 0) return;
        
        const chatData = {
            timestamp: new Date().toISOString(),
            conversationId: conversation?.id,
            messages: messages.map(msg => ({
                role: msg.role,
                content: msg.content,
                timestamp: msg.created_at
            }))
        };

        const jsonContent = JSON.stringify(chatData, null, 2);
        const blob = new Blob([jsonContent], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `syncit-search-session-${new Date().toISOString().split('T')[0]}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    };

    const handleSendMessage = async (messageContent) => {
        if (!conversation || agentError) return;
        setIsSending(true);

        const tempUserMessage = {
            id: `temp_${Date.now()}`,
            role: 'user',
            content: messageContent,
            created_at: new Date().toISOString()
        };
        setMessages(prev => [...prev, tempUserMessage]);
        
        try {
            const { agentSDK } = await import("@/agents");
            
            await agentSDK.addMessage(conversation, {
                role: "user",
                content: messageContent
            });
        } catch (error) {
            console.error("Failed to send message:", error);
            setIsSending(false);
            setAgentError("Failed to send message to AI assistant");
        }
    };
    
    if (isLoading) {
        return (
            <div className="flex items-center justify-center h-full">
                <Loader2 className="w-8 h-8 text-gray-500 animate-spin" />
            </div>
        );
    }

    if (agentError) {
        return (
            <div className="flex items-center justify-center h-full">
                <div className="text-center">
                    <p className="text-red-600 mb-4">{agentError}</p>
                    <Button onClick={() => window.location.reload()}>
                        Refresh Page
                    </Button>
                </div>
            </div>
        );
    }
    
    return (
        <div className="flex flex-col h-full max-w-4xl mx-auto px-4 py-6">
            {/* Header with action buttons */}
            <div className="flex justify-between items-center mb-4">
                <div className="flex gap-2">
                    <Dialog open={showLoadDialog} onOpenChange={setShowLoadDialog}>
                        <DialogTrigger asChild>
                            <Button variant="outline" size="sm" className="text-gray-600 hover:text-gray-800">
                                <History className="w-4 h-4 mr-2" />
                                Load Session
                            </Button>
                        </DialogTrigger>
                        <DialogContent className="max-w-2xl max-h-[70vh] flex flex-col">
                            <DialogHeader>
                                <DialogTitle>Load Saved Session</DialogTitle>
                            </DialogHeader>
                            <div className="flex-1 overflow-y-auto space-y-3 p-1">
                                {savedSessions.length === 0 ? (
                                    <p className="text-gray-500 text-center py-8">No saved sessions yet</p>
                                ) : (
                                    savedSessions.map((session) => (
                                        <Card key={session.id} className="cursor-pointer hover:bg-gray-50 transition-colors duration-200">
                                            <CardContent className="p-4">
                                                <div className="flex items-center justify-between">
                                                    <div className="flex-1 pr-4" onClick={() => handleLoadSession(session)}>
                                                        <h4 className="font-medium text-gray-800">{session.name}</h4>
                                                        <p className="text-sm text-gray-500 mt-1">{session.lastMessage}</p>
                                                        <p className="text-xs text-gray-400 mt-2">
                                                            {new Date(session.created_date).toLocaleDateString()} • {session.messages.length} messages
                                                        </p>
                                                    </div>
                                                    <Button
                                                        variant="ghost"
                                                        size="sm"
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            handleDeleteSession(session.id);
                                                        }}
                                                        className="text-red-500 hover:text-red-700"
                                                    >
                                                        <X className="w-4 h-4" />
                                                    </Button>
                                                </div>
                                            </CardContent>
                                        </Card>
                                    ))
                                )}
                            </div>
                        </DialogContent>
                    </Dialog>
                </div>

                {messages.length > 0 && (
                    <div className="flex gap-2">
                        <Dialog open={showSaveDialog} onOpenChange={setShowSaveDialog}>
                            <DialogTrigger asChild>
                                <Button variant="outline" size="sm" className="text-gray-600 hover:text-gray-800">
                                    <Save className="w-4 h-4 mr-2" />
                                    Save Session
                                </Button>
                            </DialogTrigger>
                            <DialogContent>
                                <DialogHeader>
                                    <DialogTitle>Save Chat Session</DialogTitle>
                                </DialogHeader>
                                <div className="space-y-4">
                                    <Input
                                        placeholder="Enter session name..."
                                        value={sessionName}
                                        onChange={(e) => setSessionName(e.target.value)}
                                        className="w-full"
                                    />
                                    <div className="flex gap-2 justify-end">
                                        <Button variant="outline" onClick={() => setShowSaveDialog(false)}>
                                            Cancel
                                        </Button>
                                        <Button 
                                            onClick={handleSaveSession}
                                            disabled={!sessionName.trim()}
                                            style={{ backgroundColor: '#F96F51' }}
                                            className="text-white"
                                        >
                                            Save
                                        </Button>
                                    </div>
                                </div>
                            </DialogContent>
                        </Dialog>

                        <Button
                            variant="outline"
                            size="sm"
                            onClick={handleDownloadChat}
                            className="text-gray-600 hover:text-gray-800"
                        >
                            <Download className="w-4 h-4 mr-2" />
                            Download
                        </Button>
                        <Button
                            variant="outline" 
                            size="sm"
                            onClick={handleClearChat}
                            className="text-gray-600 hover:text-gray-800"
                        >
                            <RotateCcw className="w-4 h-4 mr-2" />
                            Clear Chat
                        </Button>
                    </div>
                )}
            </div>

            <div className="flex-1 overflow-y-auto mb-6 pr-2">
                {messages.length === 0 ? (
                    <div className="text-center pt-16">
                         <img 
                            src="https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/68cc08c26c4162c8627656f9/990937166_SyncVisor.png"
                            alt="SyncVisor"
                            className="h-20 w-auto object-contain mx-auto mb-6"
                          />
                        <h1 className="text-2xl font-bold text-gray-800">Let's find some music!</h1>
                        <p className="text-gray-600 mt-2 mb-8">Describe what you're looking for.</p>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-left">
                            {examplePrompts.map(prompt => (
                                <Button
                                    key={prompt}
                                    variant="outline"
                                    className="h-auto whitespace-normal text-sm p-4 bg-white/50"
                                    onClick={() => handleSendMessage(prompt)}
                                >
                                    <Zap className="w-4 h-4 mr-3 flex-shrink-0" />
                                    <span>{prompt}</span>
                                </Button>
                            ))}
                        </div>
                    </div>
                ) : (
                    messages.map((msg) => <MessageBubble key={msg.id} message={msg} />)
                )}
                 <div ref={messagesEndRef} />
            </div>
            
            <div className="flex-shrink-0">
                <ChatInput onSendMessage={handleSendMessage} isSending={isSending} />
            </div>
        </div>
    );
}
