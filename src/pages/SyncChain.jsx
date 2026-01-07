
import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { SyncChainSearch } from '@/entities/SyncChainSearch';
import { AudioTrack } from '@/entities/AudioTrack';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

import SearchForm from '../components/chain/SearchForm';
import ResultsDisplay from '../components/chain/ResultsDisplay';
import SavedSearches from '../components/chain/SavedSearches';

const AGENT_NAME = 'sync_chain';

export default function SyncChainPage() {
    const [isSearching, setIsSearching] = useState(false);
    const [agentError, setAgentError] = useState(null);
    const [isReady, setIsReady] = useState(false);
    const [searches, setSearches] = useState([]);
    const [selectedSearch, setSelectedSearch] = useState(null);
    const [activeConversationId, setActiveConversationId] = useState(null);
    const [syncPulseTracks, setSyncPulseTracks] = useState([]);
    const [initialSearchData, setInitialSearchData] = useState(null);

    const loadSearches = useCallback(async () => {
        try {
            const searches = await SyncChainSearch.list('-created_date');
            setSearches(searches);
            const runningSearch = searches.find(s => s.status === 'searching');
            if (runningSearch) {
                setIsSearching(true);
            } else {
                setIsSearching(false);
            }
        } catch (error) {
            console.error("Failed to load searches:", error);
            toast.error("Could not load search history.");
        }
    }, []);

    const loadSyncPulseTracks = useCallback(async () => {
        try {
            const tracks = await AudioTrack.filter({ status: 'complete' }, '-created_date');
            setSyncPulseTracks(tracks);
        } catch (error) {
            console.error("Failed to load SyncPulse tracks:", error);
            toast.error("Could not load your SyncPulse catalog.");
        }
    }, []);

    useEffect(() => {
        loadSearches();
        loadSyncPulseTracks();
        setIsReady(true);
    }, [loadSearches, loadSyncPulseTracks]);
    
    useEffect(() => {
        if (!activeConversationId) return;

        const setupSubscription = async () => {
            try {
                const { agentSDK } = await import('@/agents');
                const unsubscribe = agentSDK.subscribeToConversation(activeConversationId, async (data) => {
                    if (data.status !== 'running' && data.status !== 'pending') {
                        setIsSearching(false);
                        setActiveConversationId(null);
                        const lastMessage = data.messages[data.messages.length - 1];
                        
                        if (lastMessage && lastMessage.role === 'assistant' && lastMessage.content) {
                            const runningSearch = searches.find(s => s.status === 'searching');
                            if (runningSearch) {
                                let trackTitle = 'Search Result';
                                let trackArtist = 'Unknown';
                                const jsonRegex = /```json\s*([\s\S]*?)\s*```/;
                                const jsonMatch = lastMessage.content.match(jsonRegex);
                                if (jsonMatch && jsonMatch[1]) {
                                    try {
                                        const rightsJson = JSON.parse(jsonMatch[1]);
                                        trackTitle = rightsJson?.recording?.title || trackTitle;
                                        trackArtist = rightsJson?.recording?.artist || trackArtist;
                                    } catch (e) {
                                        console.error("Failed to parse rights JSON from markdown", e);
                                    }
                                }

                                await SyncChainSearch.update(runningSearch.id, {
                                    resultsMarkdown: lastMessage.content,
                                    status: 'completed',
                                    trackTitle,
                                    trackArtist
                                });
                                await loadSearches();
                            }
                        }
                    }
                });
                return () => unsubscribe();
            } catch (error) {
                console.error("Failed to subscribe to agent conversation:", error);
                setAgentError("Lost connection to the AI rights assistant.");
                setIsSearching(false);
                setActiveConversationId(null);
            }
        };
        setupSubscription();
    }, [activeConversationId, searches, loadSearches]);

    const handleTrackSelect = (trackId) => {
        if (!trackId) {
            setInitialSearchData(null);
            return;
        }
        const selected = syncPulseTracks.find(t => t.id === trackId);
        if (selected) {
            // Prefer finalMetadata, but fall back to fileName
            const title = selected.finalMetadata?.title || selected.fileName.replace(/\.[^/.]+$/, ""); // Remove file extension
            const artist = selected.finalMetadata?.artist || 'Unknown Artist';
            
            setInitialSearchData({
                title: title,
                artist: artist,
                isrc: '',
                url: ''
            });
        }
    };

    const handleSearch = async (query) => {
        if (isSearching) {
            toast.warning("A search is already in progress. Please wait.");
            return;
        }
        
        setIsSearching(true);
        setAgentError(null);
        toast.info("Starting new search...");

        try {
            // Create a new placeholder search record first
            await SyncChainSearch.create({
                queryTitle: query.title,
                queryArtist: query.artist,
                queryIsrc: query.isrc,
                queryUrl: query.url,
                trackTitle: query.title || 'New Search...',
                trackArtist: query.artist || 'Please wait...',
                status: 'searching',
            });
            await loadSearches(); // Refresh the list to show the new "searching" item

            // Now create a fresh conversation for this search
            const { agentSDK } = await import('@/agents');
            const newConversation = await agentSDK.createConversation({
                agent_name: AGENT_NAME,
                metadata: { name: `SyncChain: ${query.title || query.isrc}` }
            });
            setActiveConversationId(newConversation.id);

            const prompt = `
                Find rights information for the following track:
                Title: ${query.title || 'N/A'}
                Artist: ${query.artist || 'N/A'}
                ISRC: ${query.isrc || 'N/A'}
                DSP URL: ${query.url || 'N/A'}
            `;
            
            await agentSDK.addMessage(newConversation, { role: 'user', content: prompt });
        } catch (error) {
            console.error("Failed to start search:", error);
            setAgentError("Failed to communicate with the AI assistant.");
            setIsSearching(false);
        }
    };

    const handleDeleteSearch = async (searchId) => {
        try {
            await SyncChainSearch.delete(searchId);
            await loadSearches();
            toast.success("Search removed from history.");
        } catch (error) {
            console.error("Failed to delete search:", error);
            toast.error("Could not delete search from history.");
        }
    };

    return (
        <div className="p-4 md:p-8" style={{ backgroundColor: '#E3DDDB', minHeight: '100vh' }}>
            <div className="max-w-4xl mx-auto">
                <header className="mb-8">
                     <img 
                        src="https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/68cc08c26c4162c8627656f9/26aabd6e1_SyncChain.png"
                        alt="SyncChain"
                        className="h-16 w-auto object-contain mb-4"
                    />
                    <p className="text-gray-600 text-lg">
                        Identify master and publishing rights holders for any released song. This tool aggregates public data to provide a clear, structured view of who owns what.
                    </p>
                </header>

                <Card className="bg-white/90 backdrop-blur-sm border-0 shadow-xl mb-8">
                    <CardHeader>
                        <CardTitle>New Search</CardTitle>
                    </CardHeader>
                    <CardContent>
                        {!isReady ? (
                            <div className="flex items-center justify-center h-24">
                                <Loader2 className="w-6 h-6 animate-spin text-gray-500" />
                                <p className="ml-2 text-gray-600">Initializing Rights Finder...</p>
                            </div>
                        ) : (
                            <>
                                <div className="mb-6 space-y-2">
                                    <label htmlFor="syncpulse-track" className="block text-sm font-medium text-gray-700">
                                        Search for a track from your SyncPulse catalog
                                    </label>
                                    <Select onValueChange={handleTrackSelect}>
                                        <SelectTrigger id="syncpulse-track" className="border-gray-300">
                                            <SelectValue placeholder="Select a track..." />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {syncPulseTracks.length > 0 ? (
                                                syncPulseTracks.map(track => (
                                                    <SelectItem key={track.id} value={track.id}>
                                                        {track.finalMetadata?.title || track.fileName} by {track.finalMetadata?.artist || 'Unknown Artist'}
                                                    </SelectItem>
                                                ))
                                            ) : (
                                                <div className="p-4 text-center text-sm text-gray-500">No completed tracks in SyncPulse.</div>
                                            )}
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div className="text-center text-sm text-gray-500 my-4">OR</div>
                                <SearchForm 
                                    key={initialSearchData ? JSON.stringify(initialSearchData) : 'initial'}
                                    onSearch={handleSearch} 
                                    isSearching={isSearching}
                                    initialData={initialSearchData}
                                />
                            </>
                        )}
                        {agentError && <p className="text-red-500 mt-4">{agentError}</p>}
                    </CardContent>
                </Card>

                <SavedSearches
                    searches={searches}
                    onLoad={setSelectedSearch}
                    onDelete={handleDeleteSearch}
                />
            </div>

            {selectedSearch && (
                <ResultsDisplay
                    markdownContent={selectedSearch.resultsMarkdown}
                    onClose={() => setSelectedSearch(null)}
                />
            )}
        </div>
    );
}
