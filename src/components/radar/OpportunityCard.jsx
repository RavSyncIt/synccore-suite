
import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import {
    ExternalLink,
    Mail,
    Globe,
    DollarSign,
    Clock,
    Eye,
    MoreVertical,
    CheckCircle,
    MessageSquare,
    Archive,
    XCircle
} from 'lucide-react';

export default function OpportunityCard({ opportunity, onViewDetails, onUpdateStatus, trustBadgeConfig }) {
    const TrustIcon = trustBadgeConfig.icon;
    
    const formatBudget = (min, max, currency) => {
        if (!min && !max) return null;
        const symbol = currency === 'GBP' ? '£' : currency === 'USD' ? '$' : currency === 'EUR' ? '€' : '';
        
        if (min && max && min !== max) {
            return `${symbol}${min.toLocaleString()} - ${symbol}${max.toLocaleString()}`;
        } else if (min || max) {
            return `${symbol}${(min || max).toLocaleString()}+`;
        }
        return null;
    };

    const getStatusConfig = (status) => {
        switch (status) {
            case 'new':
                return { color: 'bg-blue-100 text-blue-800', label: 'New' };
            case 'contacted':
                return { color: 'bg-yellow-100 text-yellow-800', label: 'Contacted' };
            case 'pitched':
                return { color: 'bg-purple-100 text-purple-800', label: 'Pitched' };
            case 'won':
                return { color: 'bg-green-100 text-green-800', label: 'Won' };
            case 'lost':
                return { color: 'bg-red-100 text-red-800', label: 'Lost' };
            case 'archived':
                return { color: 'bg-gray-100 text-gray-800', label: 'Archived' };
            default:
                return { color: 'bg-gray-100 text-gray-800', label: status };
        }
    };

    const statusConfig = getStatusConfig(opportunity.status);
    const budget = formatBudget(opportunity.brief.budgetMin, opportunity.brief.budgetMax, opportunity.brief.currency);

    return (
        <Card className="bg-white/90 backdrop-blur-sm border-0 shadow-lg hover:shadow-xl transition-shadow duration-200">
            <CardContent className="p-6">
                <div className="flex items-start justify-between mb-4">
                    <div className="flex-1 min-w-0 mr-4">
                        <h3 className="font-semibold text-gray-800 text-lg truncate mb-2">
                            {opportunity.brief.title || 'Untitled Opportunity'}
                        </h3>
                        <div className="flex items-center gap-2 mb-2">
                            <span className="text-sm font-medium text-gray-600">{opportunity.source.orgName}</span>
                            {opportunity.source.url && (
                                <a
                                    href={opportunity.source.url}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="text-gray-400 hover:text-gray-600"
                                >
                                    <ExternalLink className="w-4 h-4" />
                                </a>
                            )}
                        </div>
                        <p className="text-sm text-gray-600 line-clamp-2 mb-3">
                            {opportunity.brief.description}
                        </p>
                    </div>

                    <div className="flex items-center gap-2">
                        <Badge className={`${trustBadgeConfig.color} border flex items-center gap-1`}>
                            <TrustIcon className="w-3 h-3" />
                            {trustBadgeConfig.label}
                        </Badge>
                        <Badge className={statusConfig.color}>
                            {statusConfig.label}
                        </Badge>
                    </div>
                </div>

                {/* Key Details */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4 text-sm">
                    {opportunity.brief.media && opportunity.brief.media.length > 0 && (
                        <div className="flex items-center gap-1 text-gray-600">
                            <Globe className="w-4 h-4" />
                            <span className="truncate">{opportunity.brief.media.join(', ')}</span>
                        </div>
                    )}
                    
                    {opportunity.brief.territories && opportunity.brief.territories.length > 0 && (
                        <div className="flex items-center gap-1 text-gray-600">
                            <Globe className="w-4 h-4" />
                            <span className="truncate">{opportunity.brief.territories.join(', ')}</span>
                        </div>
                    )}
                    
                    {budget && (
                        <div className="flex items-center gap-1 text-gray-600">
                            <DollarSign className="w-4 h-4" />
                            <span className="truncate">{budget}</span>
                        </div>
                    )}
                    
                    {opportunity.brief.deadline && (
                        <div className="flex items-center gap-1 text-gray-600">
                            <Clock className="w-4 h-4" />
                            <span className="truncate">{new Date(opportunity.brief.deadline).toLocaleDateString()}</span>
                        </div>
                    )}
                </div>

                {/* Keywords */}
                {opportunity.brief.keywords && opportunity.brief.keywords.length > 0 && (
                    <div className="flex flex-wrap gap-1 mb-4">
                        {opportunity.brief.keywords.slice(0, 5).map((keyword, index) => (
                            <Badge key={index} variant="outline" className="text-xs">
                                {keyword}
                            </Badge>
                        ))}
                        {opportunity.brief.keywords.length > 5 && (
                            <Badge variant="outline" className="text-xs">
                                +{opportunity.brief.keywords.length - 5} more
                            </Badge>
                        )}
                    </div>
                )}

                {/* Actions */}
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={() => onViewDetails(opportunity)}
                            className="text-gray-600 hover:text-gray-800"
                        >
                            <Eye className="w-4 h-4 mr-2" />
                            View Details
                        </Button>
                        
                        {opportunity.contact && opportunity.contact.email && (
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={() => window.open(`mailto:${opportunity.contact.email}`, '_blank')}
                                className="text-gray-600 hover:text-gray-800"
                            >
                                <Mail className="w-4 h-4 mr-2" />
                                Contact
                            </Button>
                        )}
                    </div>

                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon">
                                <MoreVertical className="w-4 h-4" />
                            </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent>
                            <DropdownMenuItem onClick={() => onUpdateStatus(opportunity.id, 'contacted')}>
                                <Mail className="w-4 h-4 mr-2" />
                                Mark as Contacted
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => onUpdateStatus(opportunity.id, 'pitched')}>
                                <MessageSquare className="w-4 h-4 mr-2" />
                                Mark as Pitched
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => onUpdateStatus(opportunity.id, 'won')}>
                                <CheckCircle className="w-4 h-4 mr-2" />
                                Mark as Won
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => onUpdateStatus(opportunity.id, 'lost')}>
                                <XCircle className="w-4 h-4 mr-2" />
                                Mark as Lost
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => onUpdateStatus(opportunity.id, 'archived')}>
                                <Archive className="w-4 h-4 mr-2" />
                                Archive
                            </DropdownMenuItem>
                        </DropdownMenuContent>
                    </DropdownMenu>
                </div>
            </CardContent>
        </Card>
    );
}
