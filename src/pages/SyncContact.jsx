import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2, Search, UserPlus, CheckCircle, XCircle } from 'lucide-react';
import { toast } from 'sonner';
import { MusicSupervisor } from '@/entities/MusicSupervisor';

import ContactSearchForm from '../components/contact/ContactSearchForm';
import ContactCard from '../components/contact/ContactCard';
import ContactEditModal from '../components/contact/ContactEditModal';

export default function SyncContactPage() {
    const [contacts, setContacts] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [editingContact, setEditingContact] = useState(null);
    const [filterVerified, setFilterVerified] = useState('all');

    useEffect(() => {
        loadContacts();
    }, []);

    const loadContacts = async () => {
        try {
            const data = await MusicSupervisor.list('-created_date');
            setContacts(data);
        } catch (error) {
            console.error('Failed to load contacts:', error);
            toast.error('Failed to load contacts');
        }
        setIsLoading(false);
    };

    const handleSearchComplete = async (contactData) => {
        try {
            await MusicSupervisor.create(contactData);
            await loadContacts();
        } catch (error) {
            console.error('Failed to save contact:', error);
            toast.error('Failed to save contact');
        }
    };

    const handleEdit = (contact) => {
        setEditingContact(contact);
    };

    const handleSaveEdit = async (updatedData) => {
        try {
            await MusicSupervisor.update(editingContact.id, updatedData);
            await loadContacts();
            setEditingContact(null);
            toast.success('Contact updated successfully!');
        } catch (error) {
            console.error('Failed to update contact:', error);
            toast.error('Failed to update contact');
        }
    };

    const handleDelete = async (contactId) => {
        if (!confirm('Are you sure you want to delete this contact?')) return;
        
        try {
            await MusicSupervisor.delete(contactId);
            await loadContacts();
            toast.success('Contact deleted successfully!');
        } catch (error) {
            console.error('Failed to delete contact:', error);
            toast.error('Failed to delete contact');
        }
    };

    const handleToggleVerified = async (contact) => {
        try {
            await MusicSupervisor.update(contact.id, { ...contact, verified: !contact.verified });
            await loadContacts();
            toast.success(`Contact marked as ${!contact.verified ? 'verified' : 'unverified'}`);
        } catch (error) {
            console.error('Failed to update verification status:', error);
            toast.error('Failed to update verification status');
        }
    };

    const filteredContacts = contacts.filter(contact => {
        const matchesSearch = searchQuery === '' || 
            contact.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
            (contact.company && contact.company.toLowerCase().includes(searchQuery.toLowerCase()));
        
        const matchesVerified = filterVerified === 'all' || 
            (filterVerified === 'verified' && contact.verified) ||
            (filterVerified === 'unverified' && !contact.verified);
        
        return matchesSearch && matchesVerified;
    });

    if (isLoading) {
        return (
            <div className="flex items-center justify-center h-full">
                <Loader2 className="w-8 h-8 text-gray-500 animate-spin" />
            </div>
        );
    }

    return (
        <div className="p-4 md:p-8" style={{ backgroundColor: '#E3DDDB', minHeight: '100vh' }}>
            <div className="max-w-6xl mx-auto">
                <header className="mb-8">
                    <img 
                        src="https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/68cc08c26c4162c8627656f9/synccontact-logo.png"
                        alt="SyncContact"
                        className="h-16 w-auto object-contain mb-4"
                        onError={(e) => {
                            e.target.style.display = 'none';
                            e.target.nextSibling.style.display = 'block';
                        }}
                    />
                    <h1 className="text-4xl font-bold text-gray-800 mb-2" style={{ display: 'none' }}>SyncContact</h1>
                    <p className="text-gray-600 text-lg">
                        Find and manage music supervisor contact information using AI-powered research.
                    </p>
                </header>

                {/* Stats */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                    <Card className="bg-white/90 backdrop-blur-sm border-0 shadow-lg">
                        <CardContent className="p-6">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-gray-600 text-sm font-medium">Total Contacts</p>
                                    <p className="text-3xl font-bold text-gray-800">{contacts.length}</p>
                                </div>
                                <div 
                                    className="w-12 h-12 rounded-full flex items-center justify-center"
                                    style={{ backgroundColor: 'rgba(249, 111, 81, 0.1)' }}
                                >
                                    <UserPlus className="w-6 h-6" style={{ color: '#F96F51' }} />
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    <Card className="bg-white/90 backdrop-blur-sm border-0 shadow-lg">
                        <CardContent className="p-6">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-gray-600 text-sm font-medium">Verified</p>
                                    <p className="text-3xl font-bold text-gray-800">
                                        {contacts.filter(c => c.verified).length}
                                    </p>
                                </div>
                                <div 
                                    className="w-12 h-12 rounded-full flex items-center justify-center"
                                    style={{ backgroundColor: 'rgba(34, 197, 94, 0.1)' }}
                                >
                                    <CheckCircle className="w-6 h-6 text-green-600" />
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    <Card className="bg-white/90 backdrop-blur-sm border-0 shadow-lg">
                        <CardContent className="p-6">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-gray-600 text-sm font-medium">Unverified</p>
                                    <p className="text-3xl font-bold text-gray-800">
                                        {contacts.filter(c => !c.verified).length}
                                    </p>
                                </div>
                                <div 
                                    className="w-12 h-12 rounded-full flex items-center justify-center"
                                    style={{ backgroundColor: 'rgba(239, 68, 68, 0.1)' }}
                                >
                                    <XCircle className="w-6 h-6 text-red-600" />
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </div>

                {/* Search Form */}
                <ContactSearchForm onSearchComplete={handleSearchComplete} />

                {/* Contacts List */}
                <Card className="bg-white/90 backdrop-blur-sm border-0 shadow-xl mt-8">
                    <CardHeader>
                        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                            <CardTitle>Your Contacts ({filteredContacts.length})</CardTitle>
                            <div className="flex flex-col sm:flex-row gap-3 w-full md:w-auto">
                                <Input
                                    placeholder="Search contacts..."
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    className="w-full sm:w-64"
                                />
                                <div className="flex gap-2">
                                    <Button
                                        variant={filterVerified === 'all' ? 'default' : 'outline'}
                                        size="sm"
                                        onClick={() => setFilterVerified('all')}
                                        style={filterVerified === 'all' ? { backgroundColor: '#F96F51' } : {}}
                                        className={filterVerified === 'all' ? 'text-white' : ''}
                                    >
                                        All
                                    </Button>
                                    <Button
                                        variant={filterVerified === 'verified' ? 'default' : 'outline'}
                                        size="sm"
                                        onClick={() => setFilterVerified('verified')}
                                        style={filterVerified === 'verified' ? { backgroundColor: '#F96F51' } : {}}
                                        className={filterVerified === 'verified' ? 'text-white' : ''}
                                    >
                                        Verified
                                    </Button>
                                    <Button
                                        variant={filterVerified === 'unverified' ? 'default' : 'outline'}
                                        size="sm"
                                        onClick={() => setFilterVerified('unverified')}
                                        style={filterVerified === 'unverified' ? { backgroundColor: '#F96F51' } : {}}
                                        className={filterVerified === 'unverified' ? 'text-white' : ''}
                                    >
                                        Unverified
                                    </Button>
                                </div>
                            </div>
                        </div>
                    </CardHeader>
                    <CardContent>
                        {filteredContacts.length === 0 ? (
                            <div className="text-center py-12">
                                <Search className="w-12 h-12 mx-auto text-gray-400 mb-4" />
                                <p className="text-gray-500">
                                    {searchQuery || filterVerified !== 'all' 
                                        ? 'No contacts found matching your filters' 
                                        : 'No contacts yet. Use the search above to find and add music supervisors.'}
                                </p>
                            </div>
                        ) : (
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                {filteredContacts.map(contact => (
                                    <ContactCard
                                        key={contact.id}
                                        contact={contact}
                                        onEdit={handleEdit}
                                        onDelete={handleDelete}
                                        onToggleVerified={handleToggleVerified}
                                    />
                                ))}
                            </div>
                        )}
                    </CardContent>
                </Card>

                {editingContact && (
                    <ContactEditModal
                        contact={editingContact}
                        onClose={() => setEditingContact(null)}
                        onSave={handleSaveEdit}
                    />
                )}
            </div>
        </div>
    );
}