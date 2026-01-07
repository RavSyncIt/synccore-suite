
import React, { useState } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Search, Loader2 } from 'lucide-react';

export default function SearchForm({ onSearch, isSearching, initialData }) {
    const [query, setQuery] = useState(initialData || {
        isrc: '',
        title: '',
        artist: '',
        url: ''
    });

    const handleInputChange = (field, value) => {
        setQuery(prev => ({ ...prev, [field]: value }));
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        onSearch(query);
    };

    return (
        <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                    <label htmlFor="isrc" className="block text-sm font-medium text-gray-700 mb-1">ISRC (International Standard Recording Code)</label>
                    <Input
                        id="isrc"
                        placeholder="e.g., GBCEN9700115"
                        value={query.isrc}
                        onChange={(e) => handleInputChange('isrc', e.target.value)}
                        className="border-gray-300"
                    />
                    <p className="text-xs text-gray-500 mt-1">This is the most reliable way to find a specific recording.</p>
                </div>
                <div>
                    <label htmlFor="url" className="block text-sm font-medium text-gray-700 mb-1">Song URL (Spotify, Apple Music, etc.)</label>
                    <Input
                        id="url"
                        placeholder="e.g., https://open.spotify.com/track/..."
                        value={query.url}
                        onChange={(e) => handleInputChange('url', e.target.value)}
                        className="border-gray-300"
                    />
                </div>
            </div>

            <div className="text-center text-sm text-gray-500">OR</div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                    <label htmlFor="title" className="block text-sm font-medium text-gray-700 mb-1">Song Title</label>
                    <Input
                        id="title"
                        placeholder="e.g., Wonderwall"
                        value={query.title}
                        onChange={(e) => handleInputChange('title', e.target.value)}
                        className="border-gray-300"
                    />
                </div>
                <div>
                    <label htmlFor="artist" className="block text-sm font-medium text-gray-700 mb-1">Artist Name</label>
                    <Input
                        id="artist"
                        placeholder="e.g., Oasis"
                        value={query.artist}
                        onChange={(e) => handleInputChange('artist', e.target.value)}
                        className="border-gray-300"
                    />
                </div>
            </div>

            <div className="flex justify-end pt-4">
                <Button 
                    type="submit" 
                    disabled={isSearching || (!query.isrc && !query.title && !query.url)}
                    className="text-white font-medium px-6 py-2 rounded-lg transition-all duration-200 hover:shadow-lg flex items-center gap-2"
                    style={{ backgroundColor: '#F96F51' }}
                >
                    {isSearching ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
                    {isSearching ? 'Search in Progress...' : 'Find Rights'}
                </Button>
            </div>
        </form>
    );
}
