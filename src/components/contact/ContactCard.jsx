import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Mail, Phone, Linkedin, ExternalLink, Edit, Trash2, CheckCircle, XCircle, Building } from 'lucide-react';

export default function ContactCard({ contact, onEdit, onDelete, onToggleVerified }) {
    return (
        <Card className="hover:shadow-lg transition-shadow">
            <CardContent className="p-6">
                <div className="flex justify-between items-start mb-4">
                    <div>
                        <h3 className="text-lg font-semibold text-gray-800">{contact.name}</h3>
                        {contact.company && (
                            <div className="flex items-center gap-2 text-sm text-gray-600 mt-1">
                                <Building className="w-4 h-4" />
                                {contact.company}
                            </div>
                        )}
                    </div>
                    <div className="flex items-center gap-2">
                        {contact.verified ? (
                            <Badge className="bg-green-100 text-green-800">
                                <CheckCircle className="w-3 h-3 mr-1" />
                                Verified
                            </Badge>
                        ) : (
                            <Badge variant="outline" className="text-gray-600">
                                <XCircle className="w-3 h-3 mr-1" />
                                Unverified
                            </Badge>
                        )}
                    </div>
                </div>

                <div className="space-y-2 mb-4">
                    {contact.email && (
                        <div className="flex items-center gap-2 text-sm text-gray-600">
                            <Mail className="w-4 h-4 flex-shrink-0" />
                            <a href={`mailto:${contact.email}`} className="hover:text-gray-800 truncate">
                                {contact.email}
                            </a>
                        </div>
                    )}
                    {contact.phone && (
                        <div className="flex items-center gap-2 text-sm text-gray-600">
                            <Phone className="w-4 h-4 flex-shrink-0" />
                            <a href={`tel:${contact.phone}`} className="hover:text-gray-800">
                                {contact.phone}
                            </a>
                        </div>
                    )}
                    {contact.linkedinUrl && (
                        <div className="flex items-center gap-2 text-sm text-gray-600">
                            <Linkedin className="w-4 h-4 flex-shrink-0" />
                            <a 
                                href={contact.linkedinUrl} 
                                target="_blank" 
                                rel="noopener noreferrer"
                                className="hover:text-gray-800 flex items-center gap-1 truncate"
                            >
                                LinkedIn Profile
                                <ExternalLink className="w-3 h-3" />
                            </a>
                        </div>
                    )}
                </div>

                {contact.tags && contact.tags.length > 0 && (
                    <div className="flex flex-wrap gap-2 mb-4">
                        {contact.tags.map((tag, idx) => (
                            <Badge key={idx} variant="outline" className="text-xs">
                                {tag}
                            </Badge>
                        ))}
                    </div>
                )}

                {contact.credits && contact.credits.length > 0 && (
                    <div className="mb-4">
                        <p className="text-xs font-medium text-gray-600 mb-1">Notable Credits:</p>
                        <p className="text-xs text-gray-500 line-clamp-2">
                            {contact.credits.join(', ')}
                        </p>
                    </div>
                )}

                <div className="flex gap-2 pt-4 border-t border-gray-100">
                    <Button
                        size="sm"
                        variant="outline"
                        onClick={() => onToggleVerified(contact)}
                        className="flex-1"
                    >
                        {contact.verified ? 'Mark Unverified' : 'Mark Verified'}
                    </Button>
                    <Button
                        size="sm"
                        variant="outline"
                        onClick={() => onEdit(contact)}
                    >
                        <Edit className="w-4 h-4" />
                    </Button>
                    <Button
                        size="sm"
                        variant="outline"
                        onClick={() => onDelete(contact.id)}
                        className="text-red-600 hover:text-red-700"
                    >
                        <Trash2 className="w-4 h-4" />
                    </Button>
                </div>
            </CardContent>
        </Card>
    );
}