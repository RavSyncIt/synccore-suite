import React, { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { X, Plus, Save, Loader2 } from "lucide-react";
import { AudioTrack } from "@/entities/AudioTrack";
import { toast } from "sonner";

const TagEditor = ({ label, tags, onTagsChange }) => {
    const [newTag, setNewTag] = useState("");
    
    const addTag = () => {
        if (newTag.trim() && !tags.includes(newTag.trim())) {
            onTagsChange([...tags, newTag.trim()]);
            setNewTag("");
        }
    };
    
    const removeTag = (tagToRemove) => {
        onTagsChange(tags.filter(tag => tag !== tagToRemove));
    };
    
    return (
        <div className="space-y-2">
            <Label>{label}</Label>
            <div className="flex flex-wrap gap-2 mb-2">
                {tags.map((tag) => (
                    <Badge key={tag} variant="secondary" className="font-normal">
                        {tag}
                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => removeTag(tag)}
                            className="ml-1 h-4 w-4 p-0 hover:bg-red-100"
                        >
                            <X className="h-3 w-3" />
                        </Button>
                    </Badge>
                ))}
            </div>
            <div className="flex gap-2">
                <Input
                    placeholder={`Add ${label.toLowerCase()}`}
                    value={newTag}
                    onChange={(e) => setNewTag(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && addTag()}
                />
                <Button type="button" variant="outline" onClick={addTag}>
                    <Plus className="h-4 w-4" />
                </Button>
            </div>
        </div>
    );
};

export default function TrackEditModal({ track, onClose, onSave }) {
    const [formData, setFormData] = useState({});
    const [saving, setSaving] = useState(false);
    
    useEffect(() => {
        if (track) {
            const metadata = track.finalMetadata || {};
            setFormData({
                title: metadata.title || track.fileName || "",
                artist: metadata.artist || "",
                tempoBPM: metadata.tempoBPM || "",
                key: metadata.key || "",
                energyLevel: metadata.energyLevel || "",
                energyDynamics: metadata.energyDynamics || "",
                vocals: metadata.vocals || "",
                emotion: metadata.emotion || "",
                emotionalDynamics: metadata.emotionalDynamics || "",
                genre: metadata.genre || [],
                subgenres: metadata.subgenres || [],
                moodTags: metadata.moodTags || [],
                moodAdvancedTags: metadata.moodAdvancedTags || [],
                instrumentTags: metadata.instrumentTags || [],
                sceneSuggestions: metadata.sceneSuggestions || [],
                similarArtists: metadata.similarArtists || [],
                characterTags: metadata.characterTags || [],
                movementTags: metadata.movementTags || [],
                description: metadata.description || "",
                lyrics: track.lyrics || ""
            });
        }
    }, [track]);
    
    const handleInputChange = (field, value) => {
        setFormData(prev => ({ ...prev, [field]: value }));
    };
    
    const handleSave = async () => {
        setSaving(true);
        try {
            const updatedFinalMetadata = { ...formData };
            delete updatedFinalMetadata.lyrics; // lyrics is separate from finalMetadata
            
            await AudioTrack.update(track.id, {
                finalMetadata: updatedFinalMetadata,
                lyrics: formData.lyrics,
                title: formData.title,
                artist: formData.artist
            });
            
            toast.success("Metadata updated successfully!");
            onSave();
            onClose();
        } catch (error) {
            console.error("Failed to save metadata:", error);
            toast.error("Failed to save metadata");
        }
        setSaving(false);
    };
    
    if (!track) return null;
    
    return (
        <Dialog open={!!track} onOpenChange={(open) => !open && onClose()}>
            <DialogContent className="max-w-4xl max-h-[90vh] flex flex-col">
                <DialogHeader className="flex-shrink-0">
                    <DialogTitle className="text-2xl text-gray-800">
                        Edit Track Metadata
                    </DialogTitle>
                </DialogHeader>
                
                <div className="flex-1 overflow-y-auto pr-2 space-y-6">
                    {/* Basic Info */}
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label>Title</Label>
                            <Input
                                value={formData.title || ""}
                                onChange={(e) => handleInputChange('title', e.target.value)}
                            />
                        </div>
                        <div className="space-y-2">
                            <Label>Artist</Label>
                            <Input
                                value={formData.artist || ""}
                                onChange={(e) => handleInputChange('artist', e.target.value)}
                            />
                        </div>
                    </div>
                    
                    {/* Musical Attributes */}
                    <div className="grid grid-cols-3 gap-4">
                        <div className="space-y-2">
                            <Label>Tempo (BPM)</Label>
                            <Input
                                type="number"
                                value={formData.tempoBPM || ""}
                                onChange={(e) => handleInputChange('tempoBPM', parseFloat(e.target.value) || "")}
                            />
                        </div>
                        <div className="space-y-2">
                            <Label>Key</Label>
                            <Input
                                value={formData.key || ""}
                                onChange={(e) => handleInputChange('key', e.target.value)}
                            />
                        </div>
                        <div className="space-y-2">
                            <Label>Vocals</Label>
                            <Select value={formData.vocals || ""} onValueChange={(value) => handleInputChange('vocals', value)}>
                                <SelectTrigger>
                                    <SelectValue placeholder="Select..." />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="yes">Yes</SelectItem>
                                    <SelectItem value="no">No</SelectItem>
                                    <SelectItem value="mixed">Mixed</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                    </div>
                    
                    {/* Energy & Emotion */}
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label>Energy Level</Label>
                            <Input
                                value={formData.energyLevel || ""}
                                onChange={(e) => handleInputChange('energyLevel', e.target.value)}
                            />
                        </div>
                        <div className="space-y-2">
                            <Label>Energy Dynamics</Label>
                            <Input
                                value={formData.energyDynamics || ""}
                                onChange={(e) => handleInputChange('energyDynamics', e.target.value)}
                            />
                        </div>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label>Emotion</Label>
                            <Input
                                value={formData.emotion || ""}
                                onChange={(e) => handleInputChange('emotion', e.target.value)}
                            />
                        </div>
                        <div className="space-y-2">
                            <Label>Emotional Dynamics</Label>
                            <Input
                                value={formData.emotionalDynamics || ""}
                                onChange={(e) => handleInputChange('emotionalDynamics', e.target.value)}
                            />
                        </div>
                    </div>
                    
                    {/* Tag Sections */}
                    <TagEditor 
                        label="Genres" 
                        tags={formData.genre || []} 
                        onTagsChange={(tags) => handleInputChange('genre', tags)} 
                    />
                    
                    <TagEditor 
                        label="Subgenres" 
                        tags={formData.subgenres || []} 
                        onTagsChange={(tags) => handleInputChange('subgenres', tags)} 
                    />
                    
                    <TagEditor 
                        label="Mood Tags" 
                        tags={formData.moodTags || []} 
                        onTagsChange={(tags) => handleInputChange('moodTags', tags)} 
                    />
                    
                    <TagEditor 
                        label="Advanced Mood Tags" 
                        tags={formData.moodAdvancedTags || []} 
                        onTagsChange={(tags) => handleInputChange('moodAdvancedTags', tags)} 
                    />
                    
                    <TagEditor 
                        label="Instruments" 
                        tags={formData.instrumentTags || []} 
                        onTagsChange={(tags) => handleInputChange('instrumentTags', tags)} 
                    />
                    
                    <TagEditor 
                        label="Scene Suggestions" 
                        tags={formData.sceneSuggestions || []} 
                        onTagsChange={(tags) => handleInputChange('sceneSuggestions', tags)} 
                    />
                    
                    <TagEditor 
                        label="Similar Artists" 
                        tags={formData.similarArtists || []} 
                        onTagsChange={(tags) => handleInputChange('similarArtists', tags)} 
                    />
                    
                    <TagEditor 
                        label="Character Tags" 
                        tags={formData.characterTags || []} 
                        onTagsChange={(tags) => handleInputChange('characterTags', tags)} 
                    />
                    
                    <TagEditor 
                        label="Movement Tags" 
                        tags={formData.movementTags || []} 
                        onTagsChange={(tags) => handleInputChange('movementTags', tags)} 
                    />
                    
                    {/* Description */}
                    <div className="space-y-2">
                        <Label>Sync Description</Label>
                        <Textarea
                            value={formData.description || ""}
                            onChange={(e) => handleInputChange('description', e.target.value)}
                            className="h-32"
                            placeholder="Enter sync description..."
                        />
                    </div>
                    
                    {/* Lyrics */}
                    <div className="space-y-2">
                        <Label>Lyrics</Label>
                        <Textarea
                            value={formData.lyrics || ""}
                            onChange={(e) => handleInputChange('lyrics', e.target.value)}
                            className="h-32"
                            placeholder="Enter lyrics..."
                        />
                    </div>
                </div>
                
                <DialogFooter className="flex-shrink-0 pt-4 gap-3">
                    <Button variant="outline" onClick={onClose}>
                        Cancel
                    </Button>
                    <Button 
                        onClick={handleSave} 
                        disabled={saving}
                        className="text-white"
                        style={{ backgroundColor: '#F96F51' }}
                    >
                        {saving ? (
                            <>
                                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                Saving...
                            </>
                        ) : (
                            <>
                                <Save className="w-4 h-4 mr-2" />
                                Save Changes
                            </>
                        )}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}