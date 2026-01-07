
import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
    ExternalLink,
    Mail,
    User,
    Building,
    FileText,
    Shield,
    AlertTriangle
} from 'lucide-react';

export default function OpportunityDetails({ opportunity, onClose, onUpdateStatus, trustBadgeConfig }) {
    const TrustIcon = trustBadgeConfig.icon;
    
    const formatBudget = (min, max, currency) => {
        if (!min && !max) return 'Not specified';
        const symbol = currency === 'GBP' ? '£' : currency === 'USD' ? '$' : currency === 'EUR' ? '€' : '';
        
        if (min && max && min !== max) {
            return `${symbol}${min.toLocaleString()} - ${symbol}${max.toLocaleString()}`;
        } else if (min || max) {
            return `${symbol}${(min || max).toLocaleString()}+`;
        }
        return 'Not specified';
    };

    return (
        <Dialog open={!!opportunity} onOpenChange={onClose}>
            <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-3">
                        <span className="text-xl">{opportunity.brief.title || 'Untitled Opportunity'}</span>
                        <Badge className={`${trustBadgeConfig.color} border flex items-center gap-1`}>
                            <TrustIcon className="w-3 h-3" />
                            {trustBadgeConfig.label} (Score: {opportunity.trust.score})
                        </Badge>
                    </DialogTitle>
                </DialogHeader>

                <div className="space-y-6">
                    {/* Source Information */}
                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <Building className="w-5 h-5" />
                                Source Information
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <label className="text-sm font-medium text-gray-600">Organization</label>
                                <p className="text-gray-800">{opportunity.source.orgName || 'Not specified'}</p>
                            </div>
                            <div>
                                <label className="text-sm font-medium text-gray-600">Platform</label>
                                <p className="text-gray-800">{opportunity.source.platform || 'Not specified'}</p>
                            </div>
                            <div>
                                <label className="text-sm font-medium text-gray-600">Author</label>
                                <p className="text-gray-800">{opportunity.source.author || 'Not specified'}</p>
                            </div>
                            <div>
                                <label className="text-sm font-medium text-gray-600">Posted</label>
                                <p className="text-gray-800">
                                    {opportunity.source.postedAt 
                                        ? new Date(opportunity.source.postedAt).toLocaleDateString()
                                        : 'Not specified'
                                    }
                                </p>
                            </div>
                            {opportunity.source.url && (
                                <div className="md:col-span-2">
                                    <label className="text-sm font-medium text-gray-600">Original Post</label>
                                    <div className="flex items-center gap-2">
                                        <a
                                            href={opportunity.source.url}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="text-blue-600 hover:text-blue-800 flex items-center gap-1"
                                        >
                                            <ExternalLink className="w-4 h-4" />
                                            View Original
                                        </a>
                                    </div>
                                </div>
                            )}
                        </CardContent>
                    </Card>

                    {/* Brief Details */}
                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <FileText className="w-5 h-5" />
                                Brief Details
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="space-y-4">
                                <div>
                                    <label className="text-sm font-medium text-gray-600">Description</label>
                                    <p className="text-gray-800 mt-1">{opportunity.brief.description || 'No description provided'}</p>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div>
                                        <label className="text-sm font-medium text-gray-600">Media Types</label>
                                        <div className="flex flex-wrap gap-1 mt-1">
                                            {opportunity.brief.media && opportunity.brief.media.length > 0 ? (
                                                opportunity.brief.media.map((media, index) => (
                                                    <Badge key={index} variant="outline">{media}</Badge>
                                                ))
                                            ) : (
                                                <span className="text-gray-500">Not specified</span>
                                            )}
                                        </div>
                                    </div>
                                    <div>
                                        <label className="text-sm font-medium text-gray-600">Territories</label>
                                        <div className="flex flex-wrap gap-1 mt-1">
                                            {opportunity.brief.territories && opportunity.brief.territories.length > 0 ? (
                                                opportunity.brief.territories.map((territory, index) => (
                                                    <Badge key={index} variant="outline">{territory}</Badge>
                                                ))
                                            ) : (
                                                <span className="text-gray-500">Not specified</span>
                                            )}
                                        </div>
                                    </div>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                    <div>
                                        <label className="text-sm font-medium text-gray-600">Budget</label>
                                        <p className="text-gray-800 mt-1">
                                            {formatBudget(opportunity.brief.budgetMin, opportunity.brief.budgetMax, opportunity.brief.currency)}
                                        </p>
                                    </div>
                                    <div>
                                        <label className="text-sm font-medium text-gray-600">Term</label>
                                        <p className="text-gray-800 mt-1">{opportunity.brief.term || 'Not specified'}</p>
                                    </div>
                                    <div>
                                        <label className="text-sm font-medium text-gray-600">Deadline</label>
                                        <p className="text-gray-800 mt-1">
                                            {opportunity.brief.deadline 
                                                ? new Date(opportunity.brief.deadline).toLocaleDateString()
                                                : 'Not specified'
                                            }
                                        </p>
                                    </div>
                                </div>

                                {opportunity.brief.keywords && opportunity.brief.keywords.length > 0 && (
                                    <div>
                                        <label className="text-sm font-medium text-gray-600">Keywords</label>
                                        <div className="flex flex-wrap gap-1 mt-1">
                                            {opportunity.brief.keywords.map((keyword, index) => (
                                                <Badge key={index} variant="outline">{keyword}</Badge>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                {opportunity.brief.deliverables && opportunity.brief.deliverables.length > 0 && (
                                    <div>
                                        <label className="text-sm font-medium text-gray-600">Deliverables</label>
                                        <div className="flex flex-wrap gap-1 mt-1">
                                            {opportunity.brief.deliverables.map((deliverable, index) => (
                                                <Badge key={index} variant="outline">{deliverable}</Badge>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </div>
                        </CardContent>
                    </Card>

                    {/* Contact Information */}
                    {opportunity.contact && (opportunity.contact.name || opportunity.contact.email || opportunity.contact.submissionUrl) && (
                        <Card>
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2">
                                    <User className="w-5 h-5" />
                                    Contact Information
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                {opportunity.contact.name && (
                                    <div>
                                        <label className="text-sm font-medium text-gray-600">Name</label>
                                        <p className="text-gray-800">{opportunity.contact.name}</p>
                                    </div>
                                )}
                                {opportunity.contact.role && (
                                    <div>
                                        <label className="text-sm font-medium text-gray-600">Role</label>
                                        <p className="text-gray-800">{opportunity.contact.role}</p>
                                    </div>
                                )}
                                {opportunity.contact.email && (
                                    <div>
                                        <label className="text-sm font-medium text-gray-600">Email</label>
                                        <a
                                            href={`mailto:${opportunity.contact.email}`}
                                            className="text-blue-600 hover:text-blue-800 flex items-center gap-1"
                                        >
                                            <Mail className="w-4 h-4" />
                                            {opportunity.contact.email}
                                        </a>
                                    </div>
                                )}
                                {opportunity.contact.submissionUrl && (
                                    <div>
                                        <label className="text-sm font-medium text-gray-600">Submission URL</label>
                                        <a
                                            href={opportunity.contact.submissionUrl}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="text-blue-600 hover:text-blue-800 flex items-center gap-1"
                                        >
                                            <ExternalLink className="w-4 h-4" />
                                            Submit Here
                                        </a>
                                    </div>
                                )}
                            </CardContent>
                        </Card>
                    )}

                    {/* Trust Scoring */}
                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <Shield className="w-5 h-5" />
                                Trust Analysis
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="space-y-4">
                                <div className="flex items-center gap-4">
                                    <Badge className={`${trustBadgeConfig.color} border flex items-center gap-1 text-base px-3 py-1`}>
                                        <TrustIcon className="w-4 h-4" />
                                        {trustBadgeConfig.label} (Score: {opportunity.trust.score}/100)
                                    </Badge>
                                </div>

                                {opportunity.trust.notes && (
                                    <div>
                                        <label className="text-sm font-medium text-gray-600">Analysis Notes</label>
                                        <p className="text-gray-800 mt-1">{opportunity.trust.notes}</p>
                                    </div>
                                )}

                                {opportunity.trust.signals?.scamPhrases && opportunity.trust.signals.scamPhrases.length > 0 && (
                                    <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                                        <div className="flex items-center gap-2 mb-2">
                                            <AlertTriangle className="w-4 h-4 text-red-600" />
                                            <span className="font-medium text-red-800">Warning Signals Detected</span>
                                        </div>
                                        <div className="flex flex-wrap gap-1">
                                            {opportunity.trust.signals.scamPhrases.map((phrase, index) => (
                                                <Badge key={index} className="bg-red-100 text-red-800">{phrase}</Badge>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </div>
                        </CardContent>
                    </Card>

                    {/* Actions */}
                    <div className="flex justify-end gap-2 pt-4 border-t">
                        <Button variant="outline" onClick={onClose}>
                            Close
                        </Button>
                        {opportunity.contact && opportunity.contact.email && (
                            <Button
                                onClick={() => window.open(`mailto:${opportunity.contact.email}`, '_blank')}
                                className="text-white"
                                style={{ backgroundColor: '#F96F51' }}
                            >
                                <Mail className="w-4 h-4 mr-2" />
                                Contact Now
                            </Button>
                        )}
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    );
}
