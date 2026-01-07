import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { X, Plus } from 'lucide-react';
import { SyncOpportunity } from '@/entities/SyncOpportunity';

export default function ManualOpportunityForm({ isOpen, onClose, onSuccess }) {
    const [formData, setFormData] = useState({
        // Source
        platform: 'Direct Contact',
        orgName: '',
        orgUrl: '',
        author: '',
        
        // Brief
        title: '',
        description: '',
        media: [],
        territories: ['UK'],
        term: '12m',
        budgetMin: null,
        budgetMax: null,
        currency: 'GBP',
        deadline: '',
        keywords: [],
        
        // Contact
        contactName: '',
        contactRole: '',
        contactEmail: '',
        submissionUrl: '',
        
        // Trust
        trustScore: 90,
        trustDecision: 'green',
        trustNotes: ''
    });

    const [newKeyword, setNewKeyword] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);

    const mediaOptions = ['TV', 'Online', 'Social', 'Film', 'Trailer', 'Game', 'Podcast', 'OOH', 'In-Theatre'];
    const territoryOptions = ['UK', 'US', 'EU', 'Worldwide', 'Europe', 'Canada', 'Australia'];

    const handleInputChange = (field, value) => {
        setFormData(prev => ({ ...prev, [field]: value }));
    };

    const handleArrayToggle = (field, value) => {
        setFormData(prev => ({
            ...prev,
            [field]: prev[field].includes(value)
                ? prev[field].filter(item => item !== value)
                : [...prev[field], value]
        }));
    };

    const handleAddKeyword = () => {
        if (newKeyword.trim() && !formData.keywords.includes(newKeyword.trim())) {
            setFormData(prev => ({
                ...prev,
                keywords: [...prev.keywords, newKeyword.trim()]
            }));
            setNewKeyword('');
        }
    };

    const handleRemoveKeyword = (keyword) => {
        setFormData(prev => ({
            ...prev,
            keywords: prev.keywords.filter(k => k !== keyword)
        }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setIsSubmitting(true);

        try {
            const opportunity = {
                source: {
                    platform: formData.platform,
                    url: formData.orgUrl || '',
                    postedAt: new Date().toISOString(),
                    author: formData.author,
                    orgName: formData.orgName,
                    orgUrl: formData.orgUrl || '',
                    orgDomain: formData.orgUrl ? new URL(formData.orgUrl).hostname : ''
                },
                brief: {
                    title: formData.title,
                    description: formData.description,
                    media: formData.media,
                    territories: formData.territories,
                    term: formData.term,
                    budgetMin: formData.budgetMin || null,
                    budgetMax: formData.budgetMax || null,
                    currency: formData.currency,
                    deadline: formData.deadline || null,
                    keywords: formData.keywords
                },
                contact: {
                    name: formData.contactName,
                    role: formData.contactRole,
                    email: formData.contactEmail,
                    submissionUrl: formData.submissionUrl
                },
                trust: {
                    score: formData.trustScore,
                    decision: formData.trustDecision,
                    notes: formData.trustNotes || 'Manually added by SyncIt team'
                },
                status: 'new',
                dedupKey: `manual-${formData.orgName.toLowerCase().replace(/\s+/g, '-')}-${formData.title.toLowerCase().replace(/\s+/g, '-')}`
            };

            await SyncOpportunity.create(opportunity);
            onSuccess();
            onClose();
            
            // Reset form
            setFormData({
                platform: 'Direct Contact',
                orgName: '',
                orgUrl: '',
                author: '',
                title: '',
                description: '',
                media: [],
                territories: ['UK'],
                term: '12m',
                budgetMin: null,
                budgetMax: null,
                currency: 'GBP',
                deadline: '',
                keywords: [],
                contactName: '',
                contactRole: '',
                contactEmail: '',
                submissionUrl: '',
                trustScore: 90,
                trustDecision: 'green',
                trustNotes: ''
            });

        } catch (error) {
            console.error('Failed to create opportunity:', error);
            alert('Failed to create opportunity. Please try again.');
        }

        setIsSubmitting(false);
    };

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-3">
                        <div 
                            className="w-8 h-8 rounded-lg flex items-center justify-center"
                            style={{ backgroundColor: '#F96F51' }}
                        >
                            <Plus className="w-5 h-5 text-white" />
                        </div>
                        Add Manual Opportunity
                    </DialogTitle>
                </DialogHeader>

                <form onSubmit={handleSubmit} className="space-y-6">
                    {/* Source Information */}
                    <Card>
                        <CardHeader>
                            <CardTitle className="text-lg">Source Information</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <Label>Organization Name *</Label>
                                    <Input
                                        value={formData.orgName}
                                        onChange={(e) => handleInputChange('orgName', e.target.value)}
                                        placeholder="e.g., Netflix, BBC, Nike"
                                        required
                                    />
                                </div>
                                <div>
                                    <Label>Organization Website</Label>
                                    <Input
                                        type="url"
                                        value={formData.orgUrl}
                                        onChange={(e) => handleInputChange('orgUrl', e.target.value)}
                                        placeholder="https://example.com"
                                    />
                                </div>
                                <div>
                                    <Label>Contact Person</Label>
                                    <Input
                                        value={formData.author}
                                        onChange={(e) => handleInputChange('author', e.target.value)}
                                        placeholder="Contact or author name"
                                    />
                                </div>
                                <div>
                                    <Label>Source Platform</Label>
                                    <Select value={formData.platform} onValueChange={(value) => handleInputChange('platform', value)}>
                                        <SelectTrigger>
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="Direct Contact">Direct Contact</SelectItem>
                                            <SelectItem value="Email">Email</SelectItem>
                                            <SelectItem value="Partner Network">Partner Network</SelectItem>
                                            <SelectItem value="Brand Referral">Brand Referral</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Brief Details */}
                    <Card>
                        <CardHeader>
                            <CardTitle className="text-lg">Brief Details</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div>
                                <Label>Project Title *</Label>
                                <Input
                                    value={formData.title}
                                    onChange={(e) => handleInputChange('title', e.target.value)}
                                    placeholder="e.g., Music for Holiday Campaign 2024"
                                    required
                                />
                            </div>
                            <div>
                                <Label>Description *</Label>
                                <Textarea
                                    value={formData.description}
                                    onChange={(e) => handleInputChange('description', e.target.value)}
                                    placeholder="Detailed description of the sync opportunity..."
                                    className="h-32"
                                    required
                                />
                            </div>

                            {/* Media Types */}
                            <div>
                                <Label>Media Types</Label>
                                <div className="flex flex-wrap gap-2 mt-2">
                                    {mediaOptions.map(media => (
                                        <Badge
                                            key={media}
                                            variant={formData.media.includes(media) ? "default" : "outline"}
                                            className="cursor-pointer"
                                            onClick={() => handleArrayToggle('media', media)}
                                        >
                                            {media}
                                        </Badge>
                                    ))}
                                </div>
                            </div>

                            {/* Territories */}
                            <div>
                                <Label>Territories</Label>
                                <div className="flex flex-wrap gap-2 mt-2">
                                    {territoryOptions.map(territory => (
                                        <Badge
                                            key={territory}
                                            variant={formData.territories.includes(territory) ? "default" : "outline"}
                                            className="cursor-pointer"
                                            onClick={() => handleArrayToggle('territories', territory)}
                                        >
                                            {territory}
                                        </Badge>
                                    ))}
                                </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                                <div>
                                    <Label>License Term</Label>
                                    <Input
                                        value={formData.term}
                                        onChange={(e) => handleInputChange('term', e.target.value)}
                                        placeholder="e.g., 12m, perpetuity"
                                    />
                                </div>
                                <div>
                                    <Label>Budget Min</Label>
                                    <Input
                                        type="number"
                                        value={formData.budgetMin || ''}
                                        onChange={(e) => handleInputChange('budgetMin', e.target.value ? parseInt(e.target.value) : null)}
                                        placeholder="1000"
                                    />
                                </div>
                                <div>
                                    <Label>Budget Max</Label>
                                    <Input
                                        type="number"
                                        value={formData.budgetMax || ''}
                                        onChange={(e) => handleInputChange('budgetMax', e.target.value ? parseInt(e.target.value) : null)}
                                        placeholder="5000"
                                    />
                                </div>
                                <div>
                                    <Label>Currency</Label>
                                    <Select value={formData.currency} onValueChange={(value) => handleInputChange('currency', value)}>
                                        <SelectTrigger>
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="GBP">GBP (£)</SelectItem>
                                            <SelectItem value="USD">USD ($)</SelectItem>
                                            <SelectItem value="EUR">EUR (€)</SelectItem>
                                            <SelectItem value="UNKNOWN">Unknown</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                            </div>

                            <div>
                                <Label>Deadline</Label>
                                <Input
                                    type="date"
                                    value={formData.deadline}
                                    onChange={(e) => handleInputChange('deadline', e.target.value)}
                                />
                            </div>

                            {/* Keywords */}
                            <div>
                                <Label>Keywords</Label>
                                <div className="flex gap-2 mt-2 mb-2">
                                    <Input
                                        value={newKeyword}
                                        onChange={(e) => setNewKeyword(e.target.value)}
                                        placeholder="Add keyword..."
                                        onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddKeyword())}
                                    />
                                    <Button type="button" onClick={handleAddKeyword} variant="outline">
                                        <Plus className="w-4 h-4" />
                                    </Button>
                                </div>
                                <div className="flex flex-wrap gap-1">
                                    {formData.keywords.map(keyword => (
                                        <Badge key={keyword} variant="secondary" className="cursor-pointer">
                                            {keyword}
                                            <X 
                                                className="w-3 h-3 ml-1" 
                                                onClick={() => handleRemoveKeyword(keyword)}
                                            />
                                        </Badge>
                                    ))}
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Contact Information */}
                    <Card>
                        <CardHeader>
                            <CardTitle className="text-lg">Contact Information</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <Label>Contact Name</Label>
                                    <Input
                                        value={formData.contactName}
                                        onChange={(e) => handleInputChange('contactName', e.target.value)}
                                        placeholder="John Smith"
                                    />
                                </div>
                                <div>
                                    <Label>Contact Role</Label>
                                    <Input
                                        value={formData.contactRole}
                                        onChange={(e) => handleInputChange('contactRole', e.target.value)}
                                        placeholder="Music Supervisor"
                                    />
                                </div>
                                <div>
                                    <Label>Contact Email</Label>
                                    <Input
                                        type="email"
                                        value={formData.contactEmail}
                                        onChange={(e) => handleInputChange('contactEmail', e.target.value)}
                                        placeholder="contact@example.com"
                                    />
                                </div>
                                <div>
                                    <Label>Submission URL</Label>
                                    <Input
                                        type="url"
                                        value={formData.submissionUrl}
                                        onChange={(e) => handleInputChange('submissionUrl', e.target.value)}
                                        placeholder="https://submissions.example.com"
                                    />
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Trust Settings */}
                    <Card>
                        <CardHeader>
                            <CardTitle className="text-lg">Trust Assessment</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <Label>Trust Level</Label>
                                    <Select value={formData.trustDecision} onValueChange={(value) => handleInputChange('trustDecision', value)}>
                                        <SelectTrigger>
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="green">Green (High Trust)</SelectItem>
                                            <SelectItem value="amber">Amber (Medium Trust)</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div>
                                    <Label>Trust Score (1-100)</Label>
                                    <Input
                                        type="number"
                                        min="1"
                                        max="100"
                                        value={formData.trustScore}
                                        onChange={(e) => handleInputChange('trustScore', parseInt(e.target.value))}
                                    />
                                </div>
                            </div>
                            <div>
                                <Label>Trust Notes</Label>
                                <Textarea
                                    value={formData.trustNotes}
                                    onChange={(e) => handleInputChange('trustNotes', e.target.value)}
                                    placeholder="Additional notes about this opportunity's trustworthiness..."
                                />
                            </div>
                        </CardContent>
                    </Card>

                    {/* Submit Buttons */}
                    <div className="flex justify-end gap-3 pt-4 border-t">
                        <Button type="button" variant="outline" onClick={onClose}>
                            Cancel
                        </Button>
                        <Button 
                            type="submit" 
                            disabled={isSubmitting}
                            className="text-white"
                            style={{ backgroundColor: '#F96F51' }}
                        >
                            {isSubmitting ? 'Creating...' : 'Create Opportunity'}
                        </Button>
                    </div>
                </form>
            </DialogContent>
        </Dialog>
    );
}