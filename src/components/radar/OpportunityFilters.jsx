import React from 'react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';

export default function OpportunityFilters({ filters, onFiltersChange, className = '' }) {
    const handleFilterChange = (key, value) => {
        onFiltersChange({ ...filters, [key]: value });
    };

    return (
        <div className={`grid grid-cols-2 md:grid-cols-4 gap-4 ${className}`}>
            <div className="space-y-2">
                <Label className="text-sm font-medium text-gray-700">Trust Level</Label>
                <Select value={filters.trustLevel} onValueChange={(value) => handleFilterChange('trustLevel', value)}>
                    <SelectTrigger>
                        <SelectValue placeholder="All Trust Levels" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="all">All Trust Levels</SelectItem>
                        <SelectItem value="green">High Trust</SelectItem>
                        <SelectItem value="amber">Medium Trust</SelectItem>
                        <SelectItem value="red">Low Trust</SelectItem>
                    </SelectContent>
                </Select>
            </div>

            <div className="space-y-2">
                <Label className="text-sm font-medium text-gray-700">Media Type</Label>
                <Select value={filters.media} onValueChange={(value) => handleFilterChange('media', value)}>
                    <SelectTrigger>
                        <SelectValue placeholder="All Media" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="all">All Media</SelectItem>
                        <SelectItem value="TV">TV</SelectItem>
                        <SelectItem value="Online">Online</SelectItem>
                        <SelectItem value="Social">Social</SelectItem>
                        <SelectItem value="Film">Film</SelectItem>
                        <SelectItem value="Trailer">Trailer</SelectItem>
                        <SelectItem value="Game">Game</SelectItem>
                        <SelectItem value="OOH">OOH</SelectItem>
                    </SelectContent>
                </Select>
            </div>

            <div className="space-y-2">
                <Label className="text-sm font-medium text-gray-700">Territory</Label>
                <Select value={filters.territory} onValueChange={(value) => handleFilterChange('territory', value)}>
                    <SelectTrigger>
                        <SelectValue placeholder="All Territories" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="all">All Territories</SelectItem>
                        <SelectItem value="Worldwide">Worldwide</SelectItem>
                        <SelectItem value="UK">UK</SelectItem>
                        <SelectItem value="US">US</SelectItem>
                        <SelectItem value="EU">EU</SelectItem>
                        <SelectItem value="Europe">Europe</SelectItem>
                    </SelectContent>
                </Select>
            </div>

            <div className="space-y-2">
                <Label className="text-sm font-medium text-gray-700">Status</Label>
                <Select value={filters.status} onValueChange={(value) => handleFilterChange('status', value)}>
                    <SelectTrigger>
                        <SelectValue placeholder="All Status" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="all">All Status</SelectItem>
                        <SelectItem value="new">New</SelectItem>
                        <SelectItem value="contacted">Contacted</SelectItem>
                        <SelectItem value="pitched">Pitched</SelectItem>
                        <SelectItem value="won">Won</SelectItem>
                        <SelectItem value="lost">Lost</SelectItem>
                        <SelectItem value="archived">Archived</SelectItem>
                    </SelectContent>
                </Select>
            </div>
        </div>
    );
}