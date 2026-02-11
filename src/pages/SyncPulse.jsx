import React, { useState, useEffect, useCallback, useMemo } from "react";
import { base44 } from "@/api/base44Client";
import { Card, CardContent } from "@/components/ui/card";
import { Upload, Music2, TrendingUp, AlertCircle } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Toaster } from "@/components/ui/sonner";

import FileUploader from "../components/audio/FileUploader";
import TrackList from "../components/audio/TrackList";
import TrackProcessor from "../components/audio/TrackProcessor";
import TrackDetailsModal from "../components/audio/TrackDetailsModal";
import TrackEditModal from "../components/audio/TrackEditModal";

export default function SyncPulse() {
    const [tracks, setTracks] = useState([]);
    const [error, setError] = useState(null);
    const [selectedTrack, setSelectedTrack] = useState(null);
    const [editingTrack, setEditingTrack] = useState(null);
    const trackProcessor = useMemo(() => new TrackProcessor(), []);

    const loadTracks = useCallback(async () => {
        try {
            const trackData = await base44.entities.AudioTrack.list("-created_date");
            setTracks(trackData);
            return trackData; // Return data for chaining
        } catch (error) {
            console.error("Failed to load tracks:", error);
            setError("Failed to load tracks");
            return []; // Return an empty array on error
        }
    }, []); // setTracks and setError are stable, so empty dependency array is fine

    const processTrack = useCallback(async (initialTrack, isResume = false) => {
        let track = initialTrack; // Use a local variable to update the track state
        try {
            console.log(`Starting processing for: ${track.fileName}${isResume ? ' (resuming)' : ''}`);
            
            // Step 1: Transcribe Lyrics
            // Check if lyrics are missing AND if it's not already complete/error
            if (!track.lyrics && track.status !== 'complete' && track.status !== 'error') {
                try {
                    // Get latest track state
                    track = await base44.entities.AudioTrack.get(track.id);
                    if (track.status !== 'transcribing') { // Only update status if not already in this state
                        await base44.entities.AudioTrack.update(track.id, { status: "transcribing" });
                        await loadTracks();
                    }
                    
                    const transcribeLyrics = async (payload) => {
                        return await base44.functions.invoke('transcribeLyrics', payload);
                    };
                    await trackProcessor.processTrackStep1_Lyrics(track, transcribeLyrics);
                    await loadTracks();
                } catch (error) {
                    console.warn(`Lyrics transcription failed for ${track.fileName}: ${error.message}. Marking as 'transcription_failed' and continuing.`);
                    await base44.entities.AudioTrack.update(track.id, { status: "transcription_failed", errorMessage: `Lyrics transcription failed: ${error.message}` });
                    await loadTracks();
                }
            }
            track = await base44.entities.AudioTrack.get(track.id); // Refresh track after potential lyrics step

            // Step 2: Upload to Cyanite
            // Check if cyaniteTrackId is missing AND not complete/error
            if (!track.cyaniteTrackId && track.status !== 'complete' && track.status !== 'error') {
                track = await base44.entities.AudioTrack.get(track.id); // Get latest track state
                if (track.status !== 'uploading_to_cyanite') {
                    await base44.entities.AudioTrack.update(track.id, { status: "uploading_to_cyanite" });
                    await loadTracks();
                }
                await trackProcessor.processTrackStep2_CyaniteUpload(track);
                await loadTracks();
            }
            track = await base44.entities.AudioTrack.get(track.id); // Refresh track after upload step

            // Step 3: Wait for analysis and fetch results
            // Check if rawMetadata is missing AND not complete/error
            if (!track.rawMetadata && track.status !== 'complete' && track.status !== 'error') {
                track = await base44.entities.AudioTrack.get(track.id); // Get latest track state
                if (track.status !== 'analyzing') {
                    await base44.entities.AudioTrack.update(track.id, { status: "analyzing" });
                    await loadTracks();
                }
                await trackProcessor.processTrackStep3_CyaniteAnalysis(track);
                await loadTracks();
            }
            track = await base44.entities.AudioTrack.get(track.id); // Refresh track after analysis step
            
            // Step 4: Clean and enhance metadata
            // Check if cleanedMetadata is missing AND not complete/error
            if (!track.cleanedMetadata && track.status !== 'complete' && track.status !== 'error') {
                track = await base44.entities.AudioTrack.get(track.id); // Get latest track state
                if (track.status !== 'cleaning_metadata') {
                    await base44.entities.AudioTrack.update(track.id, { status: "cleaning_metadata" });
                    await loadTracks();
                }
                await trackProcessor.processTrackStep4_Clean(track);
                await loadTracks();
            }
            track = await base44.entities.AudioTrack.get(track.id); // Refresh track after cleaning step

            // Step 5: Generate description
            // Check if status is not 'complete' AND not error
            if (track.status !== 'complete' && track.status !== 'error') {
                track = await base44.entities.AudioTrack.get(track.id); // Get latest track state
                if (track.status !== 'describing') {
                    await base44.entities.AudioTrack.update(track.id, { status: "describing" });
                    await loadTracks();
                }
                await trackProcessor.processTrackStep5_Describe(track);
                await loadTracks();
            }

            console.log(`Processing completed for: ${track.fileName}`);
        } catch (error) {
            console.error(`Processing error for ${track.fileName}:`, error);
            await base44.entities.AudioTrack.update(initialTrack.id, { 
                status: "error",
                errorMessage: error.message || String(error)
            });
            await loadTracks();
        }
    }, [trackProcessor, loadTracks]); // Dependencies for useCallback

    const checkAndResumeStuckTracks = useCallback(async (currentTracks) => {
        console.log("Checking for stuck tracks...");
        const inProgressStatuses = ["uploading", "transcribing", "uploading_to_cyanite", "analyzing", "cleaning_metadata", "describing"];
        const stuckTracks = currentTracks.filter(track => {
            const twentyMinutes = 20 * 60 * 1000; /* 20 minutes */
            const lastUpdatedTime = track.updated_date ? new Date(track.updated_date).getTime() : new Date(track.created_date).getTime();
            const isOld = (Date.now() - lastUpdatedTime) > twentyMinutes;
            return inProgressStatuses.includes(track.status) && isOld;
        });

        if (stuckTracks.length > 0) {
            console.warn(`Found ${stuckTracks.length} potentially stuck tracks. Attempting to resume...`);
            for (const track of stuckTracks) {
                console.log(`Resuming track: ${track.fileName} (status: ${track.status}, last updated: ${track.updated_date || track.created_date})`);
                // We restart from the beginning. The processor is smart enough to handle this.
                processTrack(track, true).catch(e => {
                     console.error(`Error resuming track ${track.fileName}:`, e);
                });
            }
        } else {
            console.log("No stuck tracks found.");
        }
    }, [processTrack]); // Dependencies for useCallback
    
    useEffect(() => {
        loadTracks().then(loadedTracks => {
            if (loadedTracks && loadedTracks.length > 0) {
                checkAndResumeStuckTracks(loadedTracks);
            }
        });
    }, [loadTracks, checkAndResumeStuckTracks]); // Dependencies for useEffect

    const handleUploadComplete = async (uploadedFiles) => {
        try {
            setError(null);
            
            // Create track records
            const newTrackRecords = await base44.entities.AudioTrack.bulkCreate(
                uploadedFiles.map(file => ({
                    fileName: file.fileName,
                    fileUrl: file.fileUrl,
                    status: "uploading"
                }))
            );

            // Reload tracks to show new uploads immediately
            await loadTracks();
            
            // Process tracks with staggered delays to avoid overwhelming APIs
            for (let i = 0; i < newTrackRecords.length; i++) {
                const track = newTrackRecords[i];
                
                // Add increasing delay between tracks to spread out the load
                const delay = i * 2000; // 2 second delay between each track start
                
                setTimeout(() => {
                    processTrack(track).catch(error => {
                        console.error(`Processing failed for ${track.fileName}:`, error);
                    });
                }, delay);
            }
            
        } catch (error) {
            console.error("Upload failed:", error);
            setError(`Upload failed: ${error.message}`);
        }
    };

    const handleViewTrack = (track) => {
        setSelectedTrack(track);
    };

    const handleEditTrack = (track) => {
        setEditingTrack(track);
        setSelectedTrack(null); // Close details modal if open
    };

    const handleDeleteTrack = async (trackId) => {
        try {
            setError(null);
            await base44.entities.AudioTrack.delete(trackId);
            await loadTracks();
            // If the deleted track was the one currently in the modal, close the modal
            if (selectedTrack && selectedTrack.id === trackId) {
                setSelectedTrack(null);
            }
            // If the deleted track was the one currently being edited, close the edit modal
            if (editingTrack && editingTrack.id === trackId) {
                setEditingTrack(null);
            }
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
                console.log("Track already deleted (404), refreshing list");
                await loadTracks();
                if (selectedTrack && selectedTrack.id === trackId) {
                    setSelectedTrack(null);
                }
                if (editingTrack && editingTrack.id === trackId) {
                    setEditingTrack(null);
                }
                return; // Don't show error to user
            }
            
            setError(`Failed to delete track: ${error.message || error}`);
        }
    };

    const handleSaveEdit = async () => {
        setEditingTrack(null); // Close the edit modal
        await loadTracks(); // Refresh the tracks list
    };

    const handleExport = async (format) => {
        try {
            const completeTracks = tracks.filter(t => t.status === 'complete');
            
            if (completeTracks.length === 0) {
                setError("No completed tracks to export");
                return;
            }

            if (format === 'csv') {
                // Create comprehensive CSV export with all metadata fields
                const csvHeaders = [
                    "File Name", "Title", "Artist", "Description",
                    "Tempo (BPM)", "Key", "Energy Level", "Energy Dynamics", "Vocals",
                    "Genres", "Subgenres", "Mood Tags", "Advanced Mood Tags", 
                    "Instruments", "Scene Suggestions", "Emotion", "Emotional Dynamics",
                    "Similar Artists", "Character Tags", "Movement Tags"
                ];
                
                const csvRows = completeTracks.map(track => {
                    const meta = track.finalMetadata;
                    return [
                        track.fileName || "",
                        meta.title || "",
                        meta.artist || "",
                        (meta.description || "").replace(/"/g, '""').replace(/\n/g, ' '),
                        meta.tempoBPM ? Math.round(meta.tempoBPM) : "",
                        meta.key || "",
                        meta.energyLevel || "",
                        meta.energyDynamics || "",
                        meta.vocals || "",
                        (meta.genre || []).join("; "),
                        (meta.subgenres || []).join("; "),
                        (meta.moodTags || []).join("; "),
                        (meta.moodAdvancedTags || []).join("; "),
                        (meta.instrumentTags || []).join("; "),
                        (meta.sceneSuggestions || []).join("; "),
                        meta.emotion || "",
                        meta.emotionalDynamics || "",
                        (meta.similarArtists || []).join("; "),
                        (meta.characterTags || []).join("; "),
                        (meta.movementTags || []).join("; ")
                    ].map(field => `"${String(field)}"`);
                });

                const csvContent = [csvHeaders.join(","), ...csvRows.map(row => row.join(","))].join("\n");
                
                // Download CSV
                const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = 'syncit-metadata-export.csv';
                a.click();
                URL.revokeObjectURL(url);

            } else if (format === 'json') {
                const exportData = completeTracks.map(track => ({
                    fileName: track.fileName,
                    ...track.finalMetadata
                }));

                const jsonContent = JSON.stringify(exportData, null, 2);
                const blob = new Blob([jsonContent], { type: 'application/json' });
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = 'syncit-metadata-export.json';
                a.click();
                URL.revokeObjectURL(url);
            }

        } catch (error) {
            console.error("Export failed:", error);
            setError(`Export failed: ${error.message}`);
        }
    };

    return (
        <div className="p-4 md:p-8" style={{ backgroundColor: '#E3DDDB', minHeight: '100vh' }}>
            <Toaster />
            <div className="max-w-7xl mx-auto">
                <header className="mb-8">
                    <img 
                        src="https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/68cc08c26c4162c8627656f9/e0a136f7e_SyncPulse.png"
                        alt="SyncPulse Dashboard"
                        className="h-16 w-auto object-contain mb-4"
                    />
                    <p className="text-gray-600 text-lg">
                        Upload and manage your audio tracks for AI-powered metadata generation with our unique sync description tool. 
                        Get vivid descriptions that quote lyrics and comprehensive metadata automatically ingested into your searchable catalog.
                    </p>
                </header>

                {error && (
                    <Alert className="mb-6 border-red-200 bg-red-50">
                        <AlertCircle className="h-4 w-4 text-red-600" />
                        <AlertDescription className="text-red-800">
                            {error}
                        </AlertDescription>
                    </Alert>
                )}

                {/* Stats Cards */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                    <Card className="bg-white/90 backdrop-blur-sm border-0 shadow-lg">
                        <CardContent className="p-6">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-gray-600 text-sm font-medium">Total Tracks</p>
                                    <p className="text-3xl font-bold text-gray-800">{tracks.length}</p>
                                </div>
                                <div 
                                    className="w-12 h-12 rounded-full flex items-center justify-center"
                                    style={{ backgroundColor: 'rgba(249, 111, 81, 0.1)' }}
                                >
                                    <Music2 className="w-6 h-6" style={{ color: '#F96F51' }} />
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    <Card className="bg-white/90 backdrop-blur-sm border-0 shadow-lg">
                        <CardContent className="p-6">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-gray-600 text-sm font-medium">Completed</p>
                                    <p className="text-3xl font-bold text-gray-800">
                                        {tracks.filter(t => t.status === 'complete').length}
                                    </p>
                                </div>
                                <div 
                                    className="w-12 h-12 rounded-full flex items-center justify-center"
                                    style={{ backgroundColor: 'rgba(34, 197, 94, 0.1)' }}
                                >
                                    <TrendingUp className="w-6 h-6 text-green-600" />
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    <Card className="bg-white/90 backdrop-blur-sm border-0 shadow-lg">
                        <CardContent className="p-6">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-gray-600 text-sm font-medium">Processing</p>
                                    <p className="text-3xl font-bold text-gray-800">
                                        {tracks.filter(t => !['complete', 'error'].includes(t.status)).length}
                                    </p>
                                </div>
                                <div 
                                    className="w-12 h-12 rounded-full flex items-center justify-center animate-pulse"
                                    style={{ backgroundColor: 'rgba(59, 130, 246, 0.1)' }}
                                >
                                    <Upload className="w-6 h-6 text-blue-600" />
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </div>

                {/* Main Content */}
                <div className="space-y-8">
                    <FileUploader onUploadComplete={handleUploadComplete} />
                    <TrackList 
                        tracks={tracks} 
                        onViewTrack={handleViewTrack}
                        onExport={handleExport}
                        onDeleteTrack={handleDeleteTrack}
                        onEditTrack={handleEditTrack}
                        onRetryTrack={processTrack}
                    />
                </div>
            </div>
            
            {selectedTrack && (
                <TrackDetailsModal 
                    track={selectedTrack}
                    onClose={() => setSelectedTrack(null)}
                    onEdit={handleEditTrack}
                    onDelete={handleDeleteTrack}
                />
            )}
            
            {editingTrack && (
                <TrackEditModal 
                    track={editingTrack}
                    onClose={() => setEditingTrack(null)}
                    onSave={handleSaveEdit}
                />
            )}
        </div>
    );
}