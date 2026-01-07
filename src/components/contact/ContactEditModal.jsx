import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { X } from 'lucide-react';

export default function ContactEditModal({ contact, onClose, onSave }) {
    const [formData, setFormData] = useState({
        name: contact.name || '',
        company: contact.company || '',
        email: contact.email || '',
        phone: contact.phone || '',
        linkedinUrl: contact.linkedinUrl || '',
        imdbUrl: contact.imdbUrl || '',
        website: contact.website || '',
        notes: contact.notes || '',
        credits: contact.credits || [],
        tags: contact.tags || [],
        verified: contact.verified || false,
        lastContacted: contact.lastContacted || ''
    });

    const [newCredit, setNewCredit] = useState('');
    const [newTag, setNewTag] = useState('');

    const handleAddCredit = () => {
        if (newCredit.trim()) {
            setFormData({ ...formData, credits: [...formData.credits, newCredit.trim()] });
            setNewCredit('');
        }
    };

    const handleRemoveCredit = (index) => {
        setFormData({ ...formData, credits: formData.credits.filter((_, i) => i !== index) });
    };

    const handleAddTag = () => {
        if (newTag.trim()) {
            setFormData({ ...formData, tags: [...formData.tags, newTag.trim()] });
            setNewTag('');
        }
    };

    const handleRemoveTag = (index) => {
        setFormData({ ...formData, tags: formData.tags.filter((_, i) => i !== index) });
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        onSave(formData);
    };

    return (
        <Dialog open={true} onOpenChange={onClose}>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle>Edit Contact</DialogTitle>
                </DialogHeader>
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <Label>Name *</Label>
                            <Input
                                value={formData.name}
                                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                required
                            />
                        </div>
                        <div>
                            <Label>Company</Label>
                            <Input
                                value={formData.company}
                                onChange={(e) => setFormData({ ...formData, company: e.target.value })}
                            />
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <Label>Email</Label>
                            <Input
                                type="email"
                                value={formData.email}
                                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                            />
                        </div>
                        <div>
                            <Label>Phone</Label>
                            <Input
                                value={formData.phone}
                                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                            />
                        </div>
                    </div>

                    <div>
                        <Label>LinkedIn URL</Label>
                        <Input
                            value={formData.linkedinUrl}
                            onChange={(e) => setFormData({ ...formData, linkedinUrl: e.target.value })}
                            placeholder="https://linkedin.com/in/..."
                        />
                    </div>

                    <div>
                        <Label>IMDB URL</Label>
                        <Input
                            value={formData.imdbUrl}
                            onChange={(e) => setFormData({ ...formData, imdbUrl: e.target.value })}
                            placeholder="https://imdb.com/name/..."
                        />
                    </div>

                    <div>
                        <Label>Website</Label>
                        <Input
                            value={formData.website}
                            onChange={(e) => setFormData({ ...formData, website: e.target.value })}
                            placeholder="https://..."
                        />
                    </div>

                    <div>
                        <Label>Credits</Label>
                        <div className="flex gap-2 mb-2">
                            <Input
                                value={newCredit}
                                onChange={(e) => setNewCredit(e.target.value)}
                                placeholder="Add a credit..."
                                onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddCredit())}
                            />
                            <Button type="button" onClick={handleAddCredit}>Add</Button>
                        </div>
                        <div className="flex flex-wrap gap-2">
                            {formData.credits.map((credit, idx) => (
                                <Badge key={idx} variant="secondary" className="flex items-center gap-1">
                                    {credit}
                                    <button type="button" onClick={() => handleRemoveCredit(idx)}>
                                        <X className="w-3 h-3" />
                                    </button>
                                </Badge>
                            ))}
                        </div>
                    </div>

                    <div>
                        <Label>Tags</Label>
                        <div className="flex gap-2 mb-2">
                            <Input
                                value={newTag}
                                onChange={(e) => setNewTag(e.target.value)}
                                placeholder="Add a tag..."
                                onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddTag())}
                            />
                            <Button type="button" onClick={handleAddTag}>Add</Button>
                        </div>
                        <div className="flex flex-wrap gap-2">
                            {formData.tags.map((tag, idx) => (
                                <Badge key={idx} variant="outline" className="flex items-center gap-1">
                                    {tag}
                                    <button type="button" onClick={() => handleRemoveTag(idx)}>
                                        <X className="w-3 h-3" />
                                    </button>
                                </Badge>
                            ))}
                        </div>
                    </div>

                    <div>
                        <Label>Notes</Label>
                        <Textarea
                            value={formData.notes}
                            onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                            className="h-24"
                        />
                    </div>

                    <div>
                        <Label>Last Contacted</Label>
                        <Input
                            type="date"
                            value={formData.lastContacted}
                            onChange={(e) => setFormData({ ...formData, lastContacted: e.target.value })}
                        />
                    </div>

                    <div className="flex justify-end gap-2 pt-4">
                        <Button type="button" variant="outline" onClick={onClose}>
                            Cancel
                        </Button>
                        <Button type="submit" style={{ backgroundColor: '#F96F51' }} className="text-white">
                            Save Changes
                        </Button>
                    </div>
                </form>
            </DialogContent>
        </Dialog>
    );
}