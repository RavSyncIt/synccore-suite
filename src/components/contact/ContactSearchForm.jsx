import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Loader2, Search, Sparkles } from 'lucide-react';
import { toast } from 'sonner';
import { base44 } from '@/api/base44Client';

const AGENT_NAME = 'sync_contact';

export default function ContactSearchForm({ onSearchComplete }) {
    const [searchQuery, setSearchQuery] = useState({ name: '', context: '', company: '', city: '' });
    const [searchMode, setSearchMode] = useState('individual'); // 'individual', 'company', or 'city'
    const [isSearching, setIsSearching] = useState(false);
    const [conversation, setConversation] = useState(null);
    const [agentReady, setAgentReady] = useState(false);

    useEffect(() => {
        const initAgent = async () => {
            try {
                const newConv = await base44.agents.createConversation({
                    agent_name: AGENT_NAME,
                    metadata: { name: 'Contact Search' }
                });
                setConversation(newConv);
                setAgentReady(true);
            } catch (error) {
                console.error('Failed to initialize agent:', error);
                toast.error('Failed to initialize AI search');
            }
        };
        initAgent();
    }, []);

    useEffect(() => {
        if (!conversation) return;

        const unsubscribe = base44.agents.subscribeToConversation(conversation.id, (data) => {
            if (data.status === 'complete' && data.messages.length > 0) {
                const lastMessage = data.messages[data.messages.length - 1];
                if (lastMessage.role === 'assistant') {
                    parseAndSaveContact(lastMessage.content);
                }
            }
        });
        return () => unsubscribe();
    }, [conversation]);

    const parseAndSaveContact = async (content) => {
        try {
            // Extract JSON from markdown code block
            const jsonMatch = content.match(/```json\s*([\s\S]*?)\s*```/);
            if (jsonMatch) {
                const parsed = JSON.parse(jsonMatch[1]);
                
                // Check if it's an array (company search) or single object
                if (Array.isArray(parsed)) {
                    // Multiple contacts from company search
                    for (const contactData of parsed) {
                        await onSearchComplete(contactData);
                    }
                    toast.success(`Added ${parsed.length} contacts from ${searchQuery.company}`);
                } else {
                    // Single contact
                    await onSearchComplete(parsed);
                    toast.success('Contact added successfully!');
                }
                
                setIsSearching(false);
                setSearchQuery({ name: '', context: '', company: '', city: '' });
                
                // Create new conversation for next search
                initNewConversation();
            } else {
                toast.error('Could not parse contact data from AI response');
                setIsSearching(false);
            }
        } catch (error) {
            console.error('Failed to parse contact data:', error);
            toast.error('Failed to parse contact information');
            setIsSearching(false);
        }
    };

    const initNewConversation = async () => {
        try {
            const newConv = await base44.agents.createConversation({
                agent_name: AGENT_NAME,
                metadata: { name: 'Contact Search' }
            });
            setConversation(newConv);
        } catch (error) {
            console.error('Failed to create new conversation:', error);
        }
    };

    const handleSearch = async () => {
        const isValidIndividual = searchMode === 'individual' && searchQuery.name.trim();
        const isValidCompany = searchMode === 'company' && searchQuery.company.trim();
        const isValidCity = searchMode === 'city' && searchQuery.city.trim();
        
        if ((!isValidIndividual && !isValidCompany && !isValidCity) || !agentReady) return;

        setIsSearching(true);
        try {
            let prompt;
            if (searchMode === 'company') {
                prompt = `Find ALL music supervisors who work at: ${searchQuery.company}\n\nSearch LinkedIn, company websites, and IMDB to find the entire music supervision team. Return all supervisors you can find.`;
            } else if (searchMode === 'city') {
                prompt = `Find ALL music supervisors based in: ${searchQuery.city}\n\nSearch LinkedIn for music supervisors in this location, check local production companies and studios, and find professionals working in this area. Return all supervisors you can find.`;
            } else {
                prompt = `Find contact information for music supervisor: ${searchQuery.name}${searchQuery.context ? `\n\nAdditional context: ${searchQuery.context}` : ''}`;
            }
            
            await base44.agents.addMessage(conversation, {
                role: 'user',
                content: prompt
            });
        } catch (error) {
            console.error('Search failed:', error);
            toast.error('Search failed. Please try again.');
            setIsSearching(false);
        }
    };

    return (
        <Card className="bg-white/90 backdrop-blur-sm border-0 shadow-xl">
            <CardHeader>
                <CardTitle className="flex items-center gap-2">
                    <Sparkles className="w-5 h-5" style={{ color: '#F96F51' }} />
                    AI Contact Finder
                </CardTitle>
                <CardDescription>
                    Enter a music supervisor's name and let AI search LinkedIn, IMDB, and the web for their contact details.
                </CardDescription>
            </CardHeader>
            <CardContent>
                <div className="space-y-4">
                    <div className="flex gap-2 mb-4">
                        <Button
                            type="button"
                            variant={searchMode === 'individual' ? 'default' : 'outline'}
                            onClick={() => setSearchMode('individual')}
                            className="flex-1"
                            style={searchMode === 'individual' ? { backgroundColor: '#F96F51' } : {}}
                        >
                            Individual
                        </Button>
                        <Button
                            type="button"
                            variant={searchMode === 'company' ? 'default' : 'outline'}
                            onClick={() => setSearchMode('company')}
                            className="flex-1"
                            style={searchMode === 'company' ? { backgroundColor: '#F96F51' } : {}}
                        >
                            Company
                        </Button>
                        <Button
                            type="button"
                            variant={searchMode === 'city' ? 'default' : 'outline'}
                            onClick={() => setSearchMode('city')}
                            className="flex-1"
                            style={searchMode === 'city' ? { backgroundColor: '#F96F51' } : {}}
                        >
                            City
                        </Button>
                    </div>

                    {searchMode === 'individual' ? (
                        <>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    Supervisor Name *
                                </label>
                                <Input
                                    placeholder="e.g., John Smith"
                                    value={searchQuery.name}
                                    onChange={(e) => setSearchQuery({ ...searchQuery, name: e.target.value })}
                                    disabled={isSearching}
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    Additional Context (Optional)
                                </label>
                                <Textarea
                                    placeholder="e.g., Works at Netflix, supervised Stranger Things..."
                                    value={searchQuery.context}
                                    onChange={(e) => setSearchQuery({ ...searchQuery, context: e.target.value })}
                                    disabled={isSearching}
                                    className="h-20"
                                />
                            </div>
                        </>
                    ) : searchMode === 'company' ? (
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                Company Name *
                            </label>
                            <Input
                                placeholder="e.g., Netflix, HBO, Sony Pictures..."
                                value={searchQuery.company}
                                onChange={(e) => setSearchQuery({ ...searchQuery, company: e.target.value })}
                                disabled={isSearching}
                            />
                            <p className="text-sm text-gray-500 mt-2">
                                AI will search for all music supervisors working at this company
                            </p>
                        </div>
                    ) : (
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                City/Location *
                            </label>
                            <Input
                                placeholder="e.g., Los Angeles, London, Paris..."
                                value={searchQuery.city}
                                onChange={(e) => setSearchQuery({ ...searchQuery, city: e.target.value })}
                                disabled={isSearching}
                            />
                            <p className="text-sm text-gray-500 mt-2">
                                AI will search for all music supervisors based in this location
                            </p>
                        </div>
                    )}

                    <Button
                        onClick={handleSearch}
                        disabled={
                            (searchMode === 'individual' && !searchQuery.name.trim()) ||
                            (searchMode === 'company' && !searchQuery.company.trim()) ||
                            (searchMode === 'city' && !searchQuery.city.trim()) ||
                            isSearching
                        }
                        className="w-full text-white font-medium"
                        style={{ backgroundColor: '#F96F51' }}
                    >
                        {isSearching ? (
                            <>
                                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                {searchMode === 'city' ? 'Finding supervisors in area...' : searchMode === 'company' ? 'Finding team...' : 'Searching...'}
                            </>
                        ) : (
                            <>
                                <Search className="w-4 h-4 mr-2" />
                                {searchMode === 'city' ? 'Find All in City' : searchMode === 'company' ? 'Find All Supervisors' : 'Find Contact'}
                            </>
                        )}
                    </Button>
                </div>
            </CardContent>
        </Card>
    );
}