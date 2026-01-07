
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Trash2, Loader2, Search } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

const loadingMessages = [
    "Querying databases...",
    "Scanning release formats...",
    "Analyzing publishers...",
    "Cross-referencing identifiers...",
    "Synthesizing findings..."
];

const StatusIndicator = ({ status }) => {
    const [message, setMessage] = useState(loadingMessages[0]);

    useEffect(() => {
        if (status === 'searching') {
            let currentIndex = 0;
            const intervalId = setInterval(() => {
                currentIndex = (currentIndex + 1) % loadingMessages.length;
                setMessage(loadingMessages[currentIndex]);
            }, 3500);
            return () => clearInterval(intervalId);
        }
    }, [status]);
    
    if (status === 'searching') {
        return (
            <Badge variant="outline" className="bg-blue-50 border-blue-200 text-blue-700">
                <Loader2 className="w-3 h-3 mr-2 animate-spin" />
                {message}
            </Badge>
        );
    }

    if (status === 'completed') {
        return <Badge variant="secondary" className="bg-green-100 border-green-200 text-green-700">Completed</Badge>;
    }
    
    if (status === 'failed') {
        return <Badge variant="destructive">Failed</Badge>;
    }

    return null;
};


export default function SavedSearches({ searches, onLoad, onDelete }) {
    if (!searches || searches.length === 0) {
        return (
             <Card className="bg-white/90 backdrop-blur-sm border-0 shadow-xl mt-8">
                <CardHeader>
                    <CardTitle>Search History</CardTitle>
                </CardHeader>
                <CardContent className="text-center py-12">
                     <Search className="mx-auto h-12 w-12 text-gray-400" />
                     <h3 className="mt-2 text-sm font-medium text-gray-900">No searches yet</h3>
                     <p className="mt-1 text-sm text-gray-500">Start a new search to see your history here.</p>
                </CardContent>
            </Card>
        );
    }

    return (
        <Card className="bg-white/90 backdrop-blur-sm border-0 shadow-xl mt-8">
            <CardHeader>
                <CardTitle>Search History</CardTitle>
                <CardDescription>Review and manage your past searches.</CardDescription>
            </CardHeader>
            <CardContent>
                <div className="space-y-3">
                    {searches.map((search) => (
                        <div key={search.id} className="flex items-center justify-between p-3 rounded-lg border border-gray-200 bg-white hover:bg-gray-50 transition-colors">
                            <div className="flex-1 min-w-0">
                                <p className="font-semibold text-gray-800 truncate">{search.trackTitle || 'Untitled Search'}</p>
                                <p className="text-sm text-gray-600 truncate">{search.trackArtist || 'Unknown Artist'}</p>
                                <div className="mt-2">
                                     <StatusIndicator status={search.status} />
                                </div>
                            </div>
                            <div className="flex items-center gap-2 ml-4">
                                <Button 
                                    variant="outline" 
                                    size="sm" 
                                    onClick={() => onLoad(search)}
                                    disabled={search.status !== 'completed'}
                                >
                                    View Results
                                </Button>
                                <Button variant="ghost" size="icon" onClick={() => onDelete(search.id)} className="text-gray-400 hover:text-red-500">
                                    <Trash2 className="w-4 h-4" />
                                </Button>
                            </div>
                        </div>
                    ))}
                </div>
            </CardContent>
        </Card>
    );
}
