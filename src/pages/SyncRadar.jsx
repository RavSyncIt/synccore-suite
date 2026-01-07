
import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { 
    Search, 
    Radar, 
    Shield, 
    ShieldAlert, 
    ShieldX,
    Filter,
    Plus
} from 'lucide-react';
import { SyncOpportunity } from '@/entities/SyncOpportunity';
import OpportunityCard from '../components/radar/OpportunityCard';
import OpportunityFilters from '../components/radar/OpportunityFilters';
import OpportunityDetails from '../components/radar/OpportunityDetails';
import ManualOpportunityForm from '../components/radar/ManualOpportunityForm';
import { toast } from "sonner";

export default function SyncRadarPage() {
    const [opportunities, setOpportunities] = useState([]);
    const [filteredOpportunities, setFilteredOpportunities] = useState([]);
    const [isLoading, setIsLoading] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedOpportunity, setSelectedOpportunity] = useState(null);
    const [showFilters, setShowFilters] = useState(false);
    const [filters, setFilters] = useState({
        trustLevel: 'all',
        media: 'all',
        territory: 'all',
        status: 'all'
    });
    const [scanConversationId, setScanConversationId] = useState(null);
    const [showManualForm, setShowManualForm] = useState(false);

    const loadOpportunities = useCallback(async () => {
        try {
            const allOpportunities = await SyncOpportunity.list('-created_date');
            setOpportunities(allOpportunities);
            setFilteredOpportunities(allOpportunities);
        } catch (error) {
            console.error('Failed to load opportunities:', error);
        }
    }, []);

    useEffect(() => {
        loadOpportunities();
    }, [loadOpportunities]);

    useEffect(() => {
        let filtered = [...opportunities];

        // Apply search query
        if (searchQuery.trim()) {
            filtered = filtered.filter(opp => 
                opp.brief.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                opp.brief.description?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                opp.source.orgName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                opp.brief.keywords?.some(keyword => 
                    keyword.toLowerCase().includes(searchQuery.toLowerCase())
                )
            );
        }

        // Apply filters
        if (filters.trustLevel !== 'all') {
            filtered = filtered.filter(opp => opp.trust.decision === filters.trustLevel);
        }

        if (filters.media !== 'all') {
            filtered = filtered.filter(opp => 
                opp.brief.media?.includes(filters.media)
            );
        }

        if (filters.territory !== 'all') {
            filtered = filtered.filter(opp => 
                opp.brief.territories?.includes(filters.territory)
            );
        }

        if (filters.status !== 'all') {
            filtered = filtered.filter(opp => opp.status === filters.status);
        }

        setFilteredOpportunities(filtered);
    }, [opportunities, searchQuery, filters]);

    useEffect(() => {
        if (!scanConversationId) return;

        const setupSubscription = async () => {
            try {
                const { agentSDK } = await import('@/agents');
                console.log(`Subscribing to conversation: ${scanConversationId}`);
                const unsubscribe = agentSDK.subscribeToConversation(scanConversationId, (data) => {
                    const lastMessage = data.messages[data.messages.length - 1];
                    
                    if (lastMessage && lastMessage.role === 'assistant' && lastMessage.tool_calls) {
                        const completedCreateCall = lastMessage.tool_calls.find(
                            (call) => call.name === 'SyncOpportunity.create' && (call.status === 'completed' || call.status === 'success')
                        );

                        if (completedCreateCall) {
                            console.log('Agent created a new opportunity, reloading list...');
                            toast.info("New opportunity found by SyncRadar!");
                            loadOpportunities();
                        }
                    }
                });

                return () => {
                    console.log(`Unsubscribing from conversation: ${scanConversationId}`);
                    unsubscribe();
                };
            } catch (error) {
                console.error("Failed to subscribe to conversation:", error);
            }
        };

        setupSubscription();
    }, [scanConversationId, loadOpportunities]);

    const handleStartScan = async () => {
        setIsLoading(true);
        try {
            const { agentSDK } = await import('@/agents');
            // Create a conversation with the SyncRadar agent
            const conversation = await agentSDK.createConversation({
                agent_name: 'sync_radar',
                metadata: { name: `Sync Scan ${new Date().toISOString()}` }
            });

            setScanConversationId(conversation.id);
            toast.success("SyncRadar scan initiated. You will be notified as new opportunities are found.");

            // Start the scan with a comprehensive prompt
            await agentSDK.addMessage(conversation, {
                role: 'user',
                content: `Scan for new sync opportunities across major sources. Focus on:
                - TV/Film/Trailer opportunities from production companies
                - Brand/Commercial campaigns from agencies
                - Government/Educational tenders
                - Music supervisor job postings
                - Social media calls for music
                
                Search recent postings (last 7 days) and return only GREEN and AMBER opportunities with proper trust scoring.`
            });

        } catch (error) {
            console.error('Failed to start scan:', error);
            toast.error("Failed to start scan.");
        } finally {
            setIsLoading(false);
        }
    };

    const handleUpdateStatus = async (opportunityId, newStatus) => {
        try {
            await SyncOpportunity.update(opportunityId, { status: newStatus });
            await loadOpportunities();
        } catch (error) {
            console.error('Failed to update opportunity status:', error);
        }
    };

    const getTrustBadgeConfig = (trustDecision) => {
        switch (trustDecision) {
            case 'green':
                return { 
                    icon: Shield, 
                    color: 'bg-green-100 text-green-800 border-green-200',
                    label: 'High Trust'
                };
            case 'amber':
                return { 
                    icon: ShieldAlert, 
                    color: 'bg-yellow-100 text-yellow-800 border-yellow-200',
                    label: 'Medium Trust'
                };
            case 'red':
                return { 
                    icon: ShieldX, 
                    color: 'bg-red-100 text-red-800 border-red-200',
                    label: 'Low Trust'
                };
            default:
                return { 
                    icon: Shield, 
                    color: 'bg-gray-100 text-gray-800 border-gray-200',
                    label: 'Unknown'
                };
        }
    };

    const handleManualFormSuccess = () => {
        loadOpportunities();
        toast.success("Opportunity added successfully!");
        setShowManualForm(false); // Close the form after success
    };

    const stats = {
        total: opportunities.length,
        green: opportunities.filter(o => o.trust.decision === 'green').length,
        amber: opportunities.filter(o => o.trust.decision === 'amber').length,
        new: opportunities.filter(o => o.status === 'new').length
    };

    return (
        <div className="p-4 md:p-8" style={{ backgroundColor: '#E3DDDB', minHeight: '100vh' }}>
            <div className="max-w-7xl mx-auto">
                <header className="mb-8">
                    <img 
                        src="https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/68cc08c26c4162c8627656f9/1d93852fb_SyncRadar.png"
                        alt="SyncRadar"
                        className="h-16 w-auto object-contain mb-4"
                    />
                    <p className="text-gray-600 text-lg">
                        Discover and score public sync opportunities from across the web. Find legitimate briefs from film/TV productions, brands, and agencies with AI-powered trust scoring.
                    </p>
                </header>

                {/* Stats Cards */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
                    <Card className="bg-white/90 backdrop-blur-sm border-0 shadow-lg">
                        <CardContent className="p-6">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-gray-600 text-sm font-medium">Total Opportunities</p>
                                    <p className="text-3xl font-bold text-gray-800">{stats.total}</p>
                                </div>
                                <Radar className="w-8 h-8" style={{ color: '#F96F51' }} />
                            </div>
                        </CardContent>
                    </Card>

                    <Card className="bg-white/90 backdrop-blur-sm border-0 shadow-lg">
                        <CardContent className="p-6">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-gray-600 text-sm font-medium">High Trust</p>
                                    <p className="text-3xl font-bold text-green-600">{stats.green}</p>
                                </div>
                                <Shield className="w-8 h-8 text-green-600" />
                            </div>
                        </CardContent>
                    </Card>

                    <Card className="bg-white/90 backdrop-blur-sm border-0 shadow-lg">
                        <CardContent className="p-6">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-gray-600 text-sm font-medium">Medium Trust</p>
                                    <p className="text-3xl font-bold text-yellow-600">{stats.amber}</p>
                                </div>
                                <ShieldAlert className="w-8 h-8 text-yellow-600" />
                            </div>
                        </CardContent>
                    </Card>

                    <Card className="bg-white/90 backdrop-blur-sm border-0 shadow-lg">
                        <CardContent className="p-6">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-gray-600 text-sm font-medium">New Opportunities</p>
                                    <p className="text-3xl font-bold" style={{ color: '#F96F51' }}>{stats.new}</p>
                                </div>
                                <Plus className="w-8 h-8" style={{ color: '#F96F51' }} />
                            </div>
                        </CardContent>
                    </Card>
                </div>

                {/* Search and Controls */}
                <Card className="bg-white/90 backdrop-blur-sm border-0 shadow-xl mb-8">
                    <CardContent className="p-6">
                        <div className="flex flex-col md:flex-row gap-4">
                            <div className="flex-1">
                                <Input
                                    placeholder="Search opportunities by title, company, or keywords..."
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    className="text-lg"
                                />
                            </div>
                            <div className="flex gap-2">
                                <Button
                                    variant="outline"
                                    onClick={() => setShowFilters(!showFilters)}
                                    className="flex items-center gap-2"
                                >
                                    <Filter className="w-4 h-4" />
                                    Filters
                                </Button>
                                <Button
                                    variant="outline"
                                    onClick={() => setShowManualForm(true)}
                                    className="flex items-center gap-2 text-gray-700 hover:text-gray-900"
                                >
                                    <Plus className="w-4 h-4" />
                                    Add Manual
                                </Button>
                                <Button
                                    onClick={handleStartScan}
                                    disabled={isLoading}
                                    className="text-white font-medium px-6 py-2 rounded-lg transition-all duration-200 hover:shadow-lg flex items-center gap-2"
                                    style={{ backgroundColor: '#F96F51' }}
                                >
                                    {isLoading ? (
                                        <>
                                            <Radar className="w-4 h-4 animate-spin" />
                                            Scanning...
                                        </>
                                    ) : (
                                        <>
                                            <Search className="w-4 h-4" />
                                            Start New Scan
                                        </>
                                    )}
                                </Button>
                            </div>
                        </div>

                        {showFilters && (
                            <OpportunityFilters 
                                filters={filters} 
                                onFiltersChange={setFilters}
                                className="mt-4" 
                            />
                        )}
                    </CardContent>
                </Card>

                {/* Opportunities List */}
                <div className="grid gap-4">
                    {filteredOpportunities.length === 0 ? (
                        <Card className="bg-white/90 backdrop-blur-sm border-0 shadow-xl">
                            <CardContent className="p-12">
                                <div className="text-center">
                                    <Radar className="w-16 h-16 mx-auto text-gray-400 mb-4" />
                                    <h3 className="text-xl font-semibold text-gray-800 mb-2">
                                        {opportunities.length === 0 ? 'No opportunities found yet' : 'No opportunities match your filters'}
                                    </h3>
                                    <p className="text-gray-600 mb-4">
                                        {opportunities.length === 0 
                                            ? 'Start your first scan to discover sync opportunities'
                                            : 'Try adjusting your search or filters'
                                        }
                                    </p>
                                    {opportunities.length === 0 && (
                                        <Button
                                            onClick={handleStartScan}
                                            disabled={isLoading}
                                            className="text-white font-medium px-6 py-2 rounded-lg"
                                            style={{ backgroundColor: '#F96F51' }}
                                        >
                                            Start Scanning
                                        </Button>
                                    )}
                                </div>
                            </CardContent>
                        </Card>
                    ) : (
                        filteredOpportunities.map((opportunity) => (
                            <OpportunityCard
                                key={opportunity.id}
                                opportunity={opportunity}
                                onViewDetails={setSelectedOpportunity}
                                onUpdateStatus={handleUpdateStatus}
                                trustBadgeConfig={getTrustBadgeConfig(opportunity.trust.decision)}
                            />
                        ))
                    )}
                </div>
            </div>

            {selectedOpportunity && (
                <OpportunityDetails
                    opportunity={selectedOpportunity}
                    onClose={() => setSelectedOpportunity(null)}
                    onUpdateStatus={handleUpdateStatus}
                    trustBadgeConfig={getTrustBadgeConfig(selectedOpportunity.trust.decision)}
                />
            )}

            {showManualForm && (
                <ManualOpportunityForm
                    isOpen={showManualForm}
                    onClose={() => setShowManualForm(false)}
                    onSuccess={handleManualFormSuccess}
                />
            )}
        </div>
    );
}
