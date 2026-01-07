import React from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { MoreVertical, File, Trash2, Archive, CheckCircle } from 'lucide-react';

const statusConfig = {
    draft: { color: 'bg-yellow-100 text-yellow-800', label: 'Draft' },
    completed: { color: 'bg-green-100 text-green-800', label: 'Completed' },
    archived: { color: 'bg-gray-100 text-gray-800', label: 'Archived' },
};

export default function DealTracker({ deals, onSelectDeal, onUpdateStatus, onDeleteDeal }) {
    return (
        <Card className="bg-white/90 backdrop-blur-sm border-0 shadow-xl mt-8">
            <CardHeader>
                <CardTitle>Deal Tracker</CardTitle>
                <CardDescription>
                    Review and manage all your generated license agreements.
                </CardDescription>
            </CardHeader>
            <CardContent>
                {deals.length === 0 ? (
                    <div className="text-center py-8 text-gray-500">
                        No deals generated yet. Create one above to see it here.
                    </div>
                ) : (
                    <div className="space-y-3">
                        {deals.map((deal) => {
                            const config = statusConfig[deal.status] || statusConfig.draft;
                            return (
                                <div key={deal.id} className="flex items-center justify-between p-4 rounded-lg border border-gray-200 bg-white hover:bg-gray-50 transition-colors">
                                    <div className="flex-1 min-w-0">
                                        <p className="font-semibold text-gray-800 truncate">{deal.projectTitle || 'Untitled Project'}</p>
                                        <p className="text-sm text-gray-600 truncate">{deal.trackTitle || 'Unknown Track'} by {deal.trackArtist || 'Unknown Artist'}</p>
                                    </div>
                                    <div className="flex items-center gap-4 ml-4">
                                        <Badge className={config.color}>{config.label}</Badge>
                                        <Button variant="outline" size="sm" onClick={() => onSelectDeal(deal)}>View</Button>
                                        <DropdownMenu>
                                            <DropdownMenuTrigger asChild>
                                                <Button variant="ghost" size="icon">
                                                    <MoreVertical className="w-4 h-4" />
                                                </Button>
                                            </DropdownMenuTrigger>
                                            <DropdownMenuContent>
                                                <DropdownMenuItem onClick={() => onUpdateStatus(deal.id, 'completed')}>
                                                    <CheckCircle className="w-4 h-4 mr-2" /> Mark as Completed
                                                </DropdownMenuItem>
                                                <DropdownMenuItem onClick={() => onUpdateStatus(deal.id, 'archived')}>
                                                    <Archive className="w-4 h-4 mr-2" /> Mark as Archived
                                                </DropdownMenuItem>
                                                <DropdownMenuItem onClick={() => onUpdateStatus(deal.id, 'draft')}>
                                                    <File className="w-4 h-4 mr-2" /> Mark as Draft
                                                </DropdownMenuItem>
                                                <DropdownMenuItem onClick={() => onDeleteDeal(deal.id)} className="text-red-600">
                                                    <Trash2 className="w-4 h-4 mr-2" /> Delete
                                                </DropdownMenuItem>
                                            </DropdownMenuContent>
                                        </DropdownMenu>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </CardContent>
        </Card>
    );
}