
import React from 'react';
import ReactMarkdown from 'react-markdown';
import { cn } from "@/lib/utils";
import TrackResultCard from './TrackResultCard';

const getTrackDataFromMessage = (content) => {
    const jsonBlockStart = '```json';
    const jsonBlockEnd = '```';
    const startIndex = content.indexOf(jsonBlockStart);

    // If no JSON block has started, the whole content is the intro.
    if (startIndex === -1) {
        return { intro: content, tracks: [] };
    }

    // A JSON block has started. The intro is everything before it.
    const intro = content.substring(0, startIndex);
    let tracks = [];

    // Now, try to parse the JSON only if the block appears to be complete.
    const endIndex = content.lastIndexOf(jsonBlockEnd);
    if (endIndex > startIndex) {
        try {
            const jsonString = content.substring(startIndex + jsonBlockStart.length, endIndex);
            const data = JSON.parse(jsonString);
            if (Array.isArray(data)) {
                tracks = data;
            }
        } catch (e) {
            // JSON is likely incomplete or invalid.
            // We'll keep the tracks array empty and wait for the next update.
            // The important thing is the intro is already separated.
        }
    }

    return { intro, tracks };
};


export default function MessageBubble({ message }) {
    const isUser = message.role === 'user';
    const { intro, tracks } = getTrackDataFromMessage(message.content);

    return (
        <div className={cn("flex gap-4 my-4", isUser ? "justify-end" : "justify-start")}>
            {!isUser && (
                <div 
                    className="h-9 w-9 rounded-lg bg-slate-200 flex items-center justify-center flex-shrink-0 mt-1"
                    style={{ backgroundColor: 'rgba(249, 111, 81, 0.1)' }}
                >
                     <img 
                        src="https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/68cc08c26c4162c8627656f9/e6c56c2e6_SyncitLogoSchema2.png"
                        alt="SyncIt"
                        className="h-4 w-auto object-contain"
                      />
                </div>
            )}
            <div className={cn("max-w-2xl", isUser && "flex flex-col items-end")}>
                {intro.trim() && (
                    <div className={cn(
                        "rounded-2xl px-4 py-3 shadow-md",
                        isUser ? "bg-slate-800 text-white" : "bg-white/80 backdrop-blur-sm border border-gray-200"
                    )}>
                        {isUser ? (
                            <p className="text-sm leading-relaxed">{intro}</p>
                        ) : (
                            <ReactMarkdown 
                                className="text-sm prose prose-sm prose-slate max-w-none [&>*:first-child]:mt-0 [&>*:last-child]:mb-0"
                                components={{ p: ({ children }) => <p className="mb-2 leading-relaxed">{children}</p> }}
                            >
                                {intro}
                            </ReactMarkdown>
                        )}
                    </div>
                )}
                {tracks.length > 0 && (
                    <div className="mt-2 w-full">
                        {tracks.map(track => (
                            <TrackResultCard key={track.id || track.fileName} track={track} />
                        ))}
                    </div>
                )}
            </div>
             {isUser && (
                <div className="h-9 w-9 rounded-lg bg-slate-800 text-white flex items-center justify-center flex-shrink-0 mt-1">
                    {/* Placeholder for User Avatar/Icon */}
                    <p className="text-sm font-semibold">You</p>
                </div>
            )}
        </div>
    );
}

