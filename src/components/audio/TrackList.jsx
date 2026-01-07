
import React from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
    Music,
    Clock,
    CheckCircle,
    AlertCircle,
    Loader2,
    Download,
    Eye,
    X,
    ChevronDown,
    RefreshCw, // Added RefreshCw icon
    Edit3 // Added Edit3 icon
} from "lucide-react";
import { motion } from "framer-motion";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";


const statusConfig = {
    uploading: {
        icon: Loader2,
        color: "bg-blue-100 text-blue-800",
        label: "Uploading",
        animated: true
    },
    transcribing: {
        icon: Loader2,
        color: "bg-teal-100 text-teal-800",
        label: "Transcribing",
        animated: true
    },
    transcription_failed: {
        icon: AlertCircle,
        color: "bg-red-100 text-red-800",
        label: "Transcription Failed",
        animated: false
    },
    transcription_skipped: {
        icon: AlertCircle,
        color: "bg-yellow-100 text-yellow-800",
        label: "Transcription Skipped",
        animated: false
    },
    uploading_to_cyanite: {
        icon: Loader2,
        color: "bg-cyan-100 text-cyan-800",
        label: "Uploading to Analyzer",
        animated: true
    },
    analyzing: {
        icon: Loader2,
        color: "bg-yellow-100 text-yellow-800",
        label: "Analyzing",
        animated: true
    },
    cleaning_metadata: {
        icon: Loader2,
        color: "bg-purple-100 text-purple-800",
        label: "Cleaning Metadata",
        animated: true
    },
    describing: {
        icon: Loader2,
        color: "bg-indigo-100 text-indigo-800",
        label: "Describing",
        animated: true
    },
    complete: {
        icon: CheckCircle,
        color: "bg-green-100 text-green-800",
        label: "Complete",
        animated: false
    },
    error: {
        icon: AlertCircle,
        color: "bg-red-100 text-red-800",
        label: "Error",
        animated: false
    },
    default: {
        icon: Clock,
        color: "bg-gray-100 text-gray-800",
        label: "Processing",
        animated: true
    }
};

export default function TrackList({ tracks, onViewTrack, onExport, onDeleteTrack, onEditTrack, onRetryTrack }) {
    const StatusIcon = ({ status }) => {
        const config = statusConfig[status] || statusConfig.default;
        const IconComponent = config.icon;

        return (
            <IconComponent
                className={`w-4 h-4 ${config.animated ? 'animate-spin' : ''}`}
            />
        );
    };

    const handleDownloadTrack = (track, format) => {
        if (track.status !== 'complete' || !track.finalMetadata) {
            return;
        }

        const metadata = track.finalMetadata;

        if (format === 'json') {
            const downloadData = {
                fileName: track.fileName,
                title: metadata.title || track.fileName,
                artist: metadata.artist || "Unknown Artist",
                description: metadata.description || "",
                metadata: {
                    tempo: metadata.tempoBPM ? Math.round(metadata.tempoBPM) : null,
                    key: metadata.key || null,
                    energyLevel: metadata.energyLevel || null,
                    energyDynamics: metadata.energyDynamics || null,
                    vocals: metadata.vocals || null,
                    genres: metadata.genre || [],
                    subgenres: metadata.subgenres || [],
                    moods: metadata.moodTags || [],
                    advancedMoods: metadata.moodAdvancedTags || [],
                    instruments: metadata.instrumentTags || [],
                    sceneSuggestions: metadata.sceneSuggestions || [],
                    emotion: metadata.emotion || null,
                    emotionalDynamics: metadata.emotionalDynamics || null,
                    similarArtists: metadata.similarArtists || [],
                    characterTags: metadata.characterTags || [],
                    movementTags: metadata.movementTags || []
                }
            };
            const jsonContent = JSON.stringify(downloadData, null, 2);
            const blob = new Blob([jsonContent], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `${(metadata.title || track.fileName).replace(/\.[^/.]+$/, "")}-metadata.json`;
            document.body.appendChild(a); // Append to body to make it clickable
            a.click();
            document.body.removeChild(a); // Clean up the element
            URL.revokeObjectURL(url);
        } else if (format === 'csv') {
            // Create comprehensive CSV with all metadata fields
            const csvHeaders = ["Key", "Value"];
            const csvRows = [
                ["File Name", track.fileName || ""],
                ["Title", metadata.title || ""],
                ["Artist", metadata.artist || ""],
                ["Tempo (BPM)", metadata.tempoBPM ? Math.round(metadata.tempoBPM) : ""],
                ["Key", metadata.key || ""],
                ["Energy Level", metadata.energyLevel || ""],
                ["Energy Dynamics", metadata.energyDynamics || ""],
                ["Vocals", metadata.vocals || ""],
                ["Emotion", metadata.emotion || ""],
                ["Emotional Dynamics", metadata.emotionalDynamics || ""],
                ["Genres", (metadata.genre || []).join("; ")],
                ["Subgenres", (metadata.subgenres || []).join("; ")],
                ["Mood Tags", (metadata.moodTags || []).join("; ")],
                ["Advanced Mood Tags", (metadata.moodAdvancedTags || []).join("; ")],
                ["Instruments", (metadata.instrumentTags || []).join("; ")],
                ["Scene Suggestions", (metadata.sceneSuggestions || []).join("; ")],
                ["Similar Artists", (metadata.similarArtists || []).join("; ")],
                ["Character Tags", (metadata.characterTags || []).join("; ")],
                ["Movement Tags", (metadata.movementTags || []).join("; ")],
                ["Description", (metadata.description || "").replace(/\n/g, ' ')]
            ];

            const csvContent = [
                csvHeaders.join(","),
                ...csvRows.map(row => row.map(field => `"${String(field).replace(/"/g, '""')}"`).join(","))
            ].join("\n");

            const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `${(metadata.title || track.fileName).replace(/\.[^/.]+$/, "")}-metadata.csv`;
            document.body.appendChild(a); // Append to body to make it clickable
            a.click();
            document.body.removeChild(a); // Clean up the element
            URL.revokeObjectURL(url);
        }
    };

    if (tracks.length === 0) {
        return (
            <Card className="bg-white/90 backdrop-blur-sm border-0 shadow-xl">
                <CardContent className="p-12">
                    <div className="text-center">
                        <div
                            className="w-16 h-16 mx-auto rounded-full flex items-center justify-center mb-4"
                            style={{ backgroundColor: 'rgba(249, 111, 81, 0.1)' }}
                        >
                            <Music className="w-8 h-8" style={{ color: '#F96F51' }} />
                        </div>
                        <h3 className="text-xl font-semibold text-gray-800 mb-2">No tracks uploaded yet</h3>
                        <p className="text-gray-600">Upload your first audio file to get started with AI-powered metadata generation</p>
                    </div>
                </CardContent>
            </Card>
        );
    }

    const completeTracks = tracks.filter(t => t.status === 'complete').length;

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-2xl font-bold text-gray-800">Your Tracks</h2>
                    <p className="text-gray-600">{completeTracks} of {tracks.length} tracks completed</p>
                </div>
                {completeTracks > 0 && (
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button
                                className="text-white font-medium px-4 py-2 rounded-lg transition-all duration-200 hover:shadow-lg flex items-center gap-2"
                                style={{ backgroundColor: '#F96F51' }}
                            >
                                <Download className="w-4 h-4" />
                                Export All
                                <ChevronDown className="w-4 h-4" />
                            </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent>
                            <DropdownMenuItem onClick={() => onExport('csv')}>
                                Export as CSV (for Excel)
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => onExport('json')}>
                                Export as JSON
                            </DropdownMenuItem>
                        </DropdownMenuContent>
                    </DropdownMenu>
                )}
            </div>

            <div className="grid gap-4">
                {tracks.map((track) => {
                    const config = statusConfig[track.status] || statusConfig.default;

                    return (
                        <motion.div
                            key={track.id}
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.3 }}
                        >
                            <Card className="bg-white/90 backdrop-blur-sm border-0 shadow-lg hover:shadow-xl transition-shadow duration-200">
                                <CardContent className="p-6">
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-4 flex-1 min-w-0"> {/* Added flex-1 min-w-0 */}
                                            <div
                                                className="w-12 h-12 rounded-lg flex items-center justify-center flex-shrink-0" // Added flex-shrink-0
                                                style={{ backgroundColor: 'rgba(249, 111, 81, 0.1)' }}
                                            >
                                                <Music className="w-6 h-6" style={{ color: '#F96F51' }} />
                                            </div>

                                            <div className="min-w-0"> {/* Added min-w-0 */}
                                                <h3 className="font-semibold text-gray-800 truncate" title={track.title || track.fileName}>
                                                    {track.title || track.fileName}
                                                </h3>
                                                {track.artist && (
                                                    <p className="text-sm text-gray-600">{track.artist}</p>
                                                )}
                                                <div className="flex items-center gap-2 mt-2 flex-wrap"> {/* Added flex-wrap */}
                                                    <Badge className={`${config.color} flex-shrink-0`}> {/* Added flex-shrink-0 */}
                                                        <StatusIcon status={track.status} />
                                                        <span className="ml-2">{config.label}</span>
                                                    </Badge>

                                                    {track.finalMetadata?.tempoBPM && (
                                                        <Badge variant="outline" className="text-gray-600 flex-shrink-0"> {/* Added flex-shrink-0 */}
                                                            {Math.round(track.finalMetadata.tempoBPM)} BPM
                                                        </Badge>
                                                    )}

                                                    {track.finalMetadata?.key && (
                                                        <Badge variant="outline" className="text-gray-600 flex-shrink-0"> {/* Added flex-shrink-0 */}
                                                            {track.finalMetadata.key}
                                                        </Badge>
                                                    )}
                                                    
                                                    {/* Moved errorMessage here */}
                                                    {track.errorMessage && (
                                                        <div className="text-sm text-red-600 truncate" title={track.errorMessage}>
                                                            {track.errorMessage}
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        </div>

                                        <div className="flex items-center gap-2 flex-shrink-0 ml-4"> {/* Added flex-shrink-0 ml-4 */}
                                            {track.status === 'complete' && (
                                                <>
                                                    <DropdownMenu>
                                                        <DropdownMenuTrigger asChild>
                                                            <Button
                                                                variant="outline"
                                                                size="sm"
                                                                className="text-gray-600 hover:text-gray-800 flex items-center gap-2"
                                                            >
                                                                <Download className="w-4 h-4" />
                                                                Download
                                                                <ChevronDown className="w-4 h-4" />
                                                            </Button>
                                                        </DropdownMenuTrigger>
                                                        <DropdownMenuContent>
                                                            <DropdownMenuItem onClick={() => handleDownloadTrack(track, 'csv')}>
                                                                Download CSV
                                                            </DropdownMenuItem>
                                                            <DropdownMenuItem onClick={() => handleDownloadTrack(track, 'json')}>
                                                                Download JSON
                                                            </DropdownMenuItem>
                                                        </DropdownMenuContent>
                                                    </DropdownMenu>

                                                    <Button
                                                        variant="outline"
                                                        size="sm"
                                                        onClick={() => onViewTrack(track)}
                                                        className="text-gray-600 hover:text-gray-800 hidden sm:flex" // Added hidden sm:flex
                                                    >
                                                        <Eye className="w-4 h-4 mr-2" />
                                                        View Details
                                                    </Button>
                                                </>
                                            )}
                                            
                                            {/* Added Edit Button */}
                                            <Button
                                                variant="outline"
                                                size="sm"
                                                onClick={() => onEditTrack(track)}
                                                className="text-gray-600 hover:text-gray-800 hidden sm:flex"
                                            >
                                                <Edit3 className="w-4 h-4 mr-2" />
                                                Edit
                                            </Button>

                                            {/* Added Retry Button */}
                                            {track.status === 'error' && (
                                                <Button
                                                    variant="outline"
                                                    size="sm"
                                                    onClick={() => onRetryTrack(track)}
                                                    className="text-blue-600 hover:text-blue-700 border-blue-200 hover:bg-blue-50"
                                                >
                                                    <RefreshCw className="w-4 h-4 mr-2" />
                                                    Retry
                                                </Button>
                                            )}
                                            
                                            {/* Delete button always available now, with updated styling */}
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                onClick={() => onDeleteTrack(track.id)}
                                                className="text-gray-400 hover:text-red-500 hover:bg-red-50"
                                            >
                                                <X className="w-4 h-4" />
                                            </Button>
                                        </div>
                                    </div>

                                    {track.finalMetadata?.description && (
                                        <div className="mt-4 pt-4 border-t border-gray-100">
                                            <p className="text-sm text-gray-700 line-clamp-3">
                                                {track.finalMetadata.description}
                                            </p>
                                        </div>
                                    )}
                                </CardContent>
                            </Card>
                        </motion.div>
                    );
                })}
            </div>
        </div>
    );
}
