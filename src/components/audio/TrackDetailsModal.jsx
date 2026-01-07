
import React from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Copy, Music, Zap, BarChart, Tag, Clapperboard, Palette, User, Wind, Edit3, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { AudioTrack } from "@/entities/AudioTrack";

const DetailRow = ({ icon, label, children }) => (
    <div className="flex items-start gap-4 py-3 border-b border-gray-100">
        <div className="flex items-center gap-2 w-40 text-sm font-medium text-gray-600">
            {React.createElement(icon, { className: "w-4 h-4 text-gray-400" })}
            <span>{label}</span>
        </div>
        <div className="flex-1 text-sm text-gray-800">{children}</div>
    </div>
);

const TagSection = ({ label, tags, icon }) => {
    if (!tags || tags.length === 0) return null;
    return (
        <DetailRow label={label} icon={icon}>
            <div className="flex flex-wrap gap-2">
                {tags.map((tag) => (
                    <Badge key={tag} variant="secondary" className="font-normal">{tag}</Badge>
                ))}
            </div>
        </DetailRow>
    );
};

export default function TrackDetailsModal({ track, onClose, onEdit, onDelete }) {
    if (!track) return null;

    const metadata = track.finalMetadata || {};

    const handleCopyDescription = () => {
        if (metadata.description) {
            navigator.clipboard.writeText(metadata.description);
            toast.success("Description copied to clipboard!");
        }
    };

    const handleDeleteTrack = async () => {
        if (confirm(`Are you sure you want to delete "${metadata.title || track.fileName}"? This action cannot be undone.`)) {
            try {
                await AudioTrack.delete(track.id);
                toast.success("Track deleted successfully!");
                onDelete(track.id);
                onClose();
            } catch (error) {
                console.error("Delete error details:", error);
                
                // Check for 404 errors in multiple ways
                const is404Error = 
                    (error.response && error.response.status === 404) ||
                    (error.status === 404) ||
                    (error.message && error.message.includes('404')) ||
                    (error.message && error.message.toLowerCase().includes('not found')) ||
                    (typeof error === 'string' && (error.includes('404') || error.toLowerCase().includes('not found')));

                if (is404Error) {
                    toast.success("Track was already deleted!");
                    onDelete(track.id);
                    onClose();
                    return;
                }
                
                toast.error(`Failed to delete track: ${error.message || error}`);
            }
        }
    };

    const handleClearMetadata = async () => {
        if (confirm(`Are you sure you want to clear all metadata for "${metadata.title || track.fileName}"? This will remove all analysis data but keep the audio file.`)) {
            try {
                await AudioTrack.update(track.id, {
                    finalMetadata: {},
                    cleanedMetadata: {},
                    rawMetadata: {},
                    lyrics: "",
                    status: "uploading"
                });
                toast.success("Metadata cleared successfully!");
                onClose();
            } catch (error) {
                console.error("Clear metadata error details:", error);
                
                // Check for 404 errors in multiple ways
                const is404Error = 
                    (error.response && error.response.status === 404) ||
                    (error.status === 404) ||
                    (error.message && error.message.includes('404')) ||
                    (error.message && error.message.toLowerCase().includes('not found')) ||
                    (typeof error === 'string' && (error.includes('404') || error.toLowerCase().includes('not found')));

                if (is404Error) {
                    toast.error("Track no longer exists");
                    onDelete(track.id);
                    onClose();
                    return;
                }
                
                toast.error(`Failed to clear metadata: ${error.message || error}`);
            }
        }
    };

    return (
        <Dialog open={!!track} onOpenChange={(open) => !open && onClose()}>
            <DialogContent className="max-w-4xl max-h-[90vh] flex flex-col">
                <DialogHeader className="flex-shrink-0">
                    <div className="flex items-center justify-between">
                        <div>
                            <DialogTitle className="text-2xl text-gray-800">
                                {metadata.title || track.fileName}
                            </DialogTitle>
                            <DialogDescription className="text-base text-gray-600">
                                {metadata.artist || "Unknown Artist"}
                            </DialogDescription>
                        </div>
                        <div className="flex gap-2">
                            <Button 
                                variant="outline" 
                                size="sm"
                                onClick={() => onEdit(track)}
                                className="text-gray-600 hover:text-gray-800"
                            >
                                <Edit3 className="w-4 h-4 mr-2" />
                                Edit
                            </Button>
                            <Button 
                                variant="outline" 
                                size="sm"
                                onClick={handleClearMetadata}
                                className="text-orange-600 hover:text-orange-700"
                            >
                                <Trash2 className="w-4 h-4 mr-2" />
                                Clear Metadata
                            </Button>
                            <Button 
                                variant="outline" 
                                size="sm"
                                onClick={handleDeleteTrack}
                                className="text-red-600 hover:text-red-700"
                            >
                                <Trash2 className="w-4 h-4 mr-2" />
                                Delete Track
                            </Button>
                        </div>
                    </div>
                </DialogHeader>
                
                <div className="flex-1 overflow-y-auto pr-2 space-y-6">
                    {/* Description Section */}
                    <div className="mt-4">
                        <h3 className="font-semibold text-lg text-gray-800 mb-2">Sync Description</h3>
                        <div className="relative p-4 bg-gray-50 rounded-lg border border-gray-200">
                            <Button
                                variant="ghost"
                                size="sm"
                                onClick={handleCopyDescription}
                                className="absolute top-2 right-2 text-gray-500 hover:text-gray-800"
                            >
                                <Copy className="w-4 h-4 mr-2" /> Copy
                            </Button>
                            <p className="text-gray-700 leading-relaxed whitespace-pre-wrap">
                                {metadata.description || "No description generated."}
                            </p>
                        </div>
                    </div>

                    {/* Lyrics Section */}
                    {track.lyrics && (
                        <div>
                            <h3 className="font-semibold text-lg text-gray-800 mb-2">Lyrics</h3>
                            <div className="p-4 bg-gray-50 rounded-lg border border-gray-200 max-h-60 overflow-y-auto">
                                <p className="text-gray-700 leading-relaxed whitespace-pre-wrap">
                                    {track.lyrics}
                                </p>
                            </div>
                        </div>
                    )}

                    {/* Metadata Details Section */}
                    <div>
                        <h3 className="font-semibold text-lg text-gray-800 mb-2">Track Attributes</h3>
                        <div className="bg-white rounded-lg border border-gray-200">
                           <DetailRow label="Tempo (BPM)" icon={Music}>
                                {metadata.tempoBPM ? Math.round(metadata.tempoBPM) : 'N/A'}
                           </DetailRow>
                           <DetailRow label="Key" icon={Tag}>
                                {metadata.key || 'N/A'}
                           </DetailRow>
                           <DetailRow label="Energy Level" icon={Zap}>
                                {metadata.energyLevel || 'N/A'}
                           </DetailRow>
                           <DetailRow label="Energy Dynamics" icon={BarChart}>
                                {metadata.energyDynamics || 'N/A'}
                           </DetailRow>
                           <DetailRow label="Vocals" icon={User}>
                                {metadata.vocals || 'N/A'}
                           </DetailRow>
                           <DetailRow label="Emotion" icon={Palette}>
                                {metadata.emotion || 'N/A'}
                           </DetailRow>
                           <DetailRow label="Emotional Dynamics" icon={BarChart}>
                                {metadata.emotionalDynamics || 'N/A'}
                           </DetailRow>
                           
                           <TagSection label="Genres" tags={metadata.genre} icon={Music} />
                           <TagSection label="Subgenres" tags={metadata.subgenres} icon={Music} />
                           <TagSection label="Moods" tags={metadata.moodTags} icon={Palette} />
                           <TagSection label="Advanced Moods" tags={metadata.moodAdvancedTags} icon={Palette} />
                           <TagSection label="Instruments" tags={metadata.instrumentTags} icon={Wind} />
                           <TagSection label="Scene Suggestions" tags={metadata.sceneSuggestions} icon={Clapperboard} />
                           <TagSection label="Similar Artists" tags={metadata.similarArtists} icon={User} />
                           <TagSection label="Character Tags" tags={metadata.characterTags} icon={Tag} />
                           <TagSection label="Movement Tags" tags={metadata.movementTags} icon={Wind} />
                        </div>
                    </div>
                </div>

                <DialogFooter className="flex-shrink-0 pt-4">
                    <Button onClick={onClose} variant="outline">Close</Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
