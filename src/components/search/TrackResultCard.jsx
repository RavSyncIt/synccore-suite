import React from 'react';
import { Card, CardContent } from "@/components/ui/card";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Music, Music2, Tag, Zap, Smile, Guitar, BookOpen, Users, Info } from 'lucide-react';

const MetadataLine = ({ icon, label, children }) => {
    if (!children || (Array.isArray(children) && children.length === 0)) return null;
    return (
        <div className="flex items-start text-sm">
            <div className="w-6 h-6 flex-shrink-0 flex items-center justify-center">{icon}</div>
            <div className="ml-2">
                <span className="font-semibold text-gray-600">{label}:</span>
                <span className="ml-2 text-gray-800">{children}</span>
            </div>
        </div>
    );
};

export default function TrackResultCard({ track }) {
    if (!track || (!track.finalMetadata && !track.lyrics)) {
        return null;
    }

    const {
        title,
        artist,
        description,
        genre,
        subgenres,
        moodTags,
        characterTags, // Used for Themes
        energyLevel,
        emotion,
        instrumentTags,
        similarArtists
    } = track.finalMetadata || {};

    const trackTitle = title || track.fileName.replace(/\.[^/.]+$/, "");

    return (
        <Card className="bg-white/60 backdrop-blur-sm border-gray-200 shadow-lg my-4 animate-fade-in">
            <CardContent className="p-4">
                <div className="flex items-center gap-4 mb-3">
                     <div 
                        className="w-12 h-12 rounded-lg flex-shrink-0 flex items-center justify-center mt-1"
                        style={{ backgroundColor: 'rgba(249, 111, 81, 0.1)' }}
                    >
                        <Music2 className="w-6 h-6" style={{ color: '#F96F51' }} />
                    </div>
                    <h3 className="font-bold text-xl text-gray-800">
                        {artist ? `${artist} - ${trackTitle}` : trackTitle}
                    </h3>
                </div>

                <div className="space-y-2">
                    <MetadataLine icon={<Music size={16} />} label="Genre">
                        {genre?.join(', ')}{subgenres?.length > 0 && ` → ${subgenres.join(', ')}`}
                    </MetadataLine>
                    <MetadataLine icon={<Smile size={16} />} label="Mood">
                        {moodTags?.slice(0, 5).join(', ')}
                    </MetadataLine>
                    <MetadataLine icon={<Info size={16} />} label="Themes">
                        {characterTags?.slice(0, 5).join(', ')}
                    </MetadataLine>
                    <MetadataLine icon={<Zap size={16} />} label="Energy">
                        {energyLevel}
                    </MetadataLine>
                    <MetadataLine icon={<Tag size={16} />} label="Emotion">
                        {emotion}
                    </MetadataLine>
                    <MetadataLine icon={<Guitar size={16} />} label="Instruments">
                        {instrumentTags?.slice(0, 7).join(', ')}
                    </MetadataLine>
                    <MetadataLine icon={<Users size={16} />} label="Sounds Like">
                        {similarArtists?.join(', ')}
                    </MetadataLine>
                </div>
                
                {(description || track.lyrics) && (
                     <Accordion type="single" collapsible className="w-full mt-3">
                        <AccordionItem value="item-1" className="border-t pt-2">
                            <AccordionTrigger className="text-sm font-semibold text-gray-600 hover:no-underline [&[data-state=open]>svg]:text-orange-500">
                                <BookOpen className="w-4 h-4 mr-2" />
                                View Description & Lyrics
                            </AccordionTrigger>
                            <AccordionContent className="pt-2 text-sm text-gray-700 space-y-4">
                                {description && (
                                    <p className="whitespace-pre-wrap leading-relaxed">{description}</p>
                                )}
                                {track.lyrics && (
                                    <div>
                                        <h4 className="font-semibold mb-2 border-t pt-4">Lyrics</h4>
                                        <p className="whitespace-pre-wrap leading-relaxed max-h-60 overflow-y-auto">{track.lyrics}</p>
                                    </div>
                                )}
                            </AccordionContent>
                        </AccordionItem>
                    </Accordion>
                )}
            </CardContent>
        </Card>
    );
}