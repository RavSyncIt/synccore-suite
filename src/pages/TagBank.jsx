
import React, { useState, useEffect } from "react";
import { Tag } from "@/entities/Tag";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem } from "@/components/ui/command";
import { Plus, Trash2, Tags, Upload, Loader2, Edit3, Save, X, FolderOpen, ChevronsUpDown, Check, Lightbulb, Wand2 } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { InvokeLLM } from "@/integrations/Core";

export default function TagBank() {
    const [tags, setTags] = useState([]);
    const [newTag, setNewTag] = useState("");
    const [newCategory, setNewCategory] = useState("");
    const [bulkTags, setBulkTags] = useState("");
    const [bulkCategory, setBulkCategory] = useState("");
    const [isComboboxOpen, setComboboxOpen] = useState(false);
    const [isSingleComboboxOpen, setSingleComboboxOpen] = useState(false); // New state for single tag combobox
    const [uploading, setUploading] = useState(false);
    const [message, setMessage] = useState(null);
    const [editingCategory, setEditingCategory] = useState(null);
    const [newCategoryName, setNewCategoryName] = useState("");
    const [editingTag, setEditingTag] = useState(null);
    const [newTagCategory, setNewTagCategory] = useState("");
    const [suggestedTags, setSuggestedTags] = useState([]);
    const [isSuggesting, setIsSuggesting] = useState(false);

    useEffect(() => {
        loadTags();
    }, []);

    const loadTags = async () => {
        const tagData = await Tag.list("-created_date");
        setTags(tagData);
    };

    // Get unique categories with tag counts
    const getCategories = () => {
        const categoryMap = {};
        tags.forEach(tag => {
            const category = tag.category || 'General'; // Default to 'General' if category is null/undefined
            if (!categoryMap[category]) {
                categoryMap[category] = [];
            }
            categoryMap[category].push(tag);
        });
        return categoryMap;
    };

    const handleAddTag = async (tagToAdd, categoryToAdd) => {
        const tagName = tagToAdd || newTag;
        const categoryName = categoryToAdd || newCategory || 'General';

        if (!tagName.trim()) {
            setMessage({ type: 'error', text: 'Tag name cannot be empty.' });
            setTimeout(() => setMessage(null), 3000);
            return;
        }
        
        // Prevent adding duplicate tags (case-insensitive)
        if (tags.some(t => t.tag.toLowerCase() === tagName.toLowerCase())) {
             setMessage({ type: 'error', text: `Tag "${tagName}" already exists.` });
             setTimeout(() => setMessage(null), 3000);
             return;
        }
        
        try {
            await Tag.create({ tag: tagName.trim(), category: categoryName });
            
            if (!tagToAdd) { // Only clear inputs if it's not a suggested tag
                setNewTag("");
                setNewCategory("");
            }
            
            loadTags();
            setMessage({ type: 'success', text: 'Tag added successfully!' });
            setTimeout(() => setMessage(null), 3000);
        } catch (error) {
            console.error("Failed to add tag:", error);
            setMessage({ type: 'error', text: 'Failed to add tag' });
            setTimeout(() => setMessage(null), 3000);
        }
    };

    const handleBulkAdd = async () => {
        if (!bulkTags.trim()) return;
        
        setUploading(true);
        try {
            // Parse bulk tags - split by comma, semicolon, or newline
            const tagList = bulkTags
                .split(/[,;\n]/)
                .map(tag => tag.trim())
                .filter(tag => tag.length > 0);

            if (tagList.length === 0) {
                setMessage({ type: 'error', text: 'No valid tags found' });
                setUploading(false);
                return;
            }

            // Check for duplicates
            const existingTagsLowerCase = tags.map(t => t.tag.toLowerCase());
            const newTags = tagList.filter(tag => !existingTagsLowerCase.includes(tag.toLowerCase()));
            
            if (newTags.length === 0) {
                setMessage({ type: 'error', text: 'All tags already exist' });
                setUploading(false);
                return;
            }

            // Bulk create tags
            const tagObjects = newTags.map(tag => ({
                tag: tag,
                category: bulkCategory || 'General'
            }));

            await Tag.bulkCreate(tagObjects);
            
            setBulkTags("");
            setBulkCategory(""); // Clear category after bulk add
            loadTags();
            
            setMessage({ 
                type: 'success', 
                text: `Successfully added ${newTags.length} new tags${newTags.length < tagList.length ? ` (${tagList.length - newTags.length} duplicates skipped)` : ''}!` 
            });
            setTimeout(() => setMessage(null), 5000);
        } catch (error) {
            console.error("Bulk add failed:", error);
            setMessage({ type: 'error', text: 'Failed to add tags' });
            setTimeout(() => setMessage(null), 3000);
        }
        setUploading(false);
    };

    const handleFileUpload = async (event) => {
        const file = event.target.files[0];
        if (!file) return;

        if (!file.name.toLowerCase().endsWith('.txt')) {
            setMessage({ type: 'error', text: 'Please upload a .txt file' });
            setTimeout(() => setMessage(null), 3000);
            return;
        }

        setUploading(true);
        try {
            // Read file content
            const fileContent = await new Promise((resolve, reject) => {
                const reader = new FileReader();
                reader.onload = (e) => resolve(e.target.result);
                reader.onerror = reject;
                reader.readAsText(file);
            });

            // Parse tags from file content
            const tagList = fileContent
                .split(/[\r\n,;]/)
                .map(tag => tag.trim())
                .filter(tag => tag.length > 0);

            if (tagList.length === 0) {
                setMessage({ type: 'error', text: 'No valid tags found in file' });
                setUploading(false);
                return;
            }

            // Check for duplicates
            const existingTagsLowerCase = tags.map(t => t.tag.toLowerCase());
            const newTags = tagList.filter(tag => !existingTagsLowerCase.includes(tag.toLowerCase()));
            
            if (newTags.length === 0) {
                setMessage({ type: 'error', text: 'All tags from file already exist' });
                setUploading(false);
                return;
            }

            // Auto-detect category from filename
            const fileName = file.name.toLowerCase().replace('.txt', '');
            let detectedCategory = 'General';
            if (fileName.includes('genre')) detectedCategory = 'Genres';
            else if (fileName.includes('mood')) detectedCategory = 'Moods';
            else if (fileName.includes('instrument')) detectedCategory = 'Instruments';
            else if (fileName.includes('scene')) detectedCategory = 'Scenes';

            // Bulk create tags
            const tagObjects = newTags.map(tag => ({
                tag: tag,
                category: detectedCategory
            }));

            await Tag.bulkCreate(tagObjects);
            loadTags();
            
            setMessage({ 
                type: 'success', 
                text: `Successfully imported ${newTags.length} tags from ${file.name} (Category: ${detectedCategory})${newTags.length < tagList.length ? ` - ${tagList.length - newTags.length} duplicates skipped` : ''}!` 
            });
            setTimeout(() => setMessage(null), 5000);
        } catch (error) {
            console.error("File upload failed:", error);
            setMessage({ type: 'error', text: 'Failed to process file' });
            setTimeout(() => setMessage(null), 3000);
        }
        setUploading(false);
        
        // Reset file input
        event.target.value = '';
    };

    const handleDeleteTag = async (id) => {
        try {
            await Tag.delete(id);
            loadTags();
            setMessage({ type: 'success', text: 'Tag deleted successfully!' });
            setTimeout(() => setMessage(null), 3000);
        } catch (error) {
            setMessage({ type: 'error', text: 'Failed to delete tag' });
            setTimeout(() => setMessage(null), 3000);
        }
    };

    // New handler for updating category name
    const handleUpdateCategory = async (oldCategory) => {
        if (!newCategoryName.trim() || newCategoryName.trim() === oldCategory) {
            setEditingCategory(null);
            setNewCategoryName("");
            return;
        }

        try {
            const lowerCaseNewName = newCategoryName.trim().toLowerCase();
            const categoriesMap = getCategories();
            const existingCategoryNames = Object.keys(categoriesMap).map(name => name.toLowerCase());

            if (existingCategoryNames.includes(lowerCaseNewName) && lowerCaseNewName !== oldCategory.toLowerCase()) {
                setMessage({ type: 'error', text: `Category "${newCategoryName.trim()}" already exists. Please choose a different name.` });
                setTimeout(() => setMessage(null), 5000);
                return;
            }

            const tagsToUpdate = tags.filter(tag => (tag.category || 'General') === oldCategory);
            
            for (const tag of tagsToUpdate) {
                await Tag.update(tag.id, { ...tag, category: newCategoryName.trim() });
            }

            loadTags();
            setEditingCategory(null);
            setNewCategoryName("");
            setMessage({ 
                type: 'success', 
                text: `Category "${oldCategory}" renamed to "${newCategoryName.trim()}" (${tagsToUpdate.length} tags updated)` 
            });
            setTimeout(() => setMessage(null), 3000);
        } catch (error) {
            console.error("Failed to update category:", error);
            setMessage({ type: 'error', text: 'Failed to update category' });
            setTimeout(() => setMessage(null), 3000);
        }
    };

    // New handler for updating a single tag's category
    const handleUpdateTagCategory = async (tagId, currentTag) => {
        if (!newTagCategory || newTagCategory === (currentTag.category || 'General')) {
            setEditingTag(null);
            setNewTagCategory("");
            return;
        }

        try {
            await Tag.update(tagId, { ...currentTag, category: newTagCategory });
            loadTags();
            setEditingTag(null);
            setNewTagCategory("");
            setMessage({ type: 'success', text: 'Tag category updated successfully!' });
            setTimeout(() => setMessage(null), 3000);
        } catch (error) {
            console.error("Failed to update tag category:", error);
            setMessage({ type: 'error', text: 'Failed to update tag category' });
            setTimeout(() => setMessage(null), 3000);
        }
    };

    // New handler for deleting an entire category and its tags
    const handleDeleteCategory = async (categoryName) => {
        if (!confirm(`Are you sure you want to delete the "${categoryName}" category and all its tags? This action cannot be undone.`)) {
            return;
        }

        try {
            const tagsToDelete = tags.filter(tag => (tag.category || 'General') === categoryName);
            
            for (const tag of tagsToDelete) {
                await Tag.delete(tag.id);
            }

            loadTags();
            setMessage({ 
                type: 'success', 
                text: `Category "${categoryName}" and ${tagsToDelete.length} tags deleted successfully!` 
            });
            setTimeout(() => setMessage(null), 3000);
        } catch (error) {
            console.error("Failed to delete category:", error);
            setMessage({ type: 'error', text: 'Failed to delete category' });
            setTimeout(() => setMessage(null), 3000);
        }
    };

    const handleGenerateSuggestions = async () => {
        setIsSuggesting(true);
        setSuggestedTags([]); // Clear previous suggestions

        try {
            const existingTagsString = tags.map(t => `${t.tag} (category: ${t.category || 'General'})`).join(', ');

            const prompt = `
                You are a music metadata and sync licensing expert. You are tasked with expanding a library of tags used for describing music.

                Here is a list of existing tags:
                ${existingTagsString}

                Based on this list, generate 10 new, relevant, and diverse tag suggestions. Group them into logical categories (like 'Moods', 'Genres', 'Instruments', 'Scene Types', 'Keywords'). Include common professional sync terms and descriptive keywords. Avoid suggesting tags that are direct synonyms or already exist in the list.

                For each suggestion, provide the tag itself, a suitable category, and a brief reason why it's a good addition.
            `;

            const response = await InvokeLLM({
                prompt,
                response_json_schema: {
                    type: "object",
                    properties: {
                        suggestions: {
                            type: "array",
                            items: {
                                type: "object",
                                properties: {
                                    tag: { type: "string" },
                                    category: { type: "string" },
                                    reason: { type: "string" }
                                },
                                required: ["tag", "category", "reason"]
                            }
                        }
                    },
                    required: ["suggestions"]
                }
            });
            
            if (response && response.suggestions) {
                 // Filter out suggestions that already exist (case-insensitive)
                const existingTagNames = tags.map(t => t.tag.toLowerCase());
                const uniqueSuggestions = response.suggestions.filter(s => !existingTagNames.includes(s.tag.toLowerCase()));
                setSuggestedTags(uniqueSuggestions);
            } else {
                setMessage({ type: 'error', text: 'AI did not return valid suggestions.' });
                setTimeout(() => setMessage(null), 3000);
            }

        } catch (error) {
            console.error("Failed to generate suggestions:", error);
            setMessage({ type: 'error', text: 'Failed to generate AI suggestions.' });
            setTimeout(() => setMessage(null), 3000);
        }

        setIsSuggesting(false);
    };
    
    const handleAddSuggestedTag = (suggestion) => {
        handleAddTag(suggestion.tag, suggestion.category);
        // Remove the added tag from the suggestions list
        setSuggestedTags(prev => prev.filter(s => s.tag !== suggestion.tag));
    };

    const categories = getCategories();
    // Ensure 'General' is always an option even if no tags are assigned to it yet
    const allCategoryNames = Array.from(new Set([...Object.keys(categories), 'General'])).sort((a, b) => a.localeCompare(b));
    const categoryNames = allCategoryNames; // Use this for displaying categories in dropdowns

    return (
        <div className="p-4 md:p-8" style={{ backgroundColor: '#E3DDDB', minHeight: '100vh' }}>
            <div className="max-w-5xl mx-auto">
                <header className="mb-8">
                    <img 
                        src="https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/68cc08c26c4162c8627656f9/768f9852c_SyncDex.png"
                        alt="SyncDex"
                        className="h-16 w-auto object-contain mb-4"
                    />
                    <p className="text-gray-600 text-lg">Manage your custom tags used for generating descriptions.</p>
                </header>

                {message && (
                    <Alert className={`mb-6 ${message.type === 'success' ? 'border-green-200 bg-green-50' : 'border-red-200 bg-red-50'}`}>
                        <AlertDescription className={message.type === 'success' ? 'text-green-800' : 'text-red-800'}>
                            {message.text}
                        </AlertDescription>
                    </Alert>
                )}

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    <div className="lg:col-span-2">
                        <Card className="mb-8 bg-white/90 backdrop-blur-sm border-0 shadow-xl">
                            <CardHeader className="pb-4">
                                <CardTitle className="flex items-center gap-3 text-xl">
                                    <div 
                                        className="w-8 h-8 rounded-lg flex items-center justify-center"
                                        style={{ backgroundColor: '#F96F51' }}
                                    >
                                        <Plus className="w-5 h-5 text-white" />
                                    </div>
                                    <span className="text-gray-800">Manage Tags & Categories</span>
                                </CardTitle>
                            </CardHeader>
                            <CardContent>
                                <Tabs defaultValue="single" className="w-full">
                                    <TabsList className="grid w-full grid-cols-4">
                                        <TabsTrigger value="single">Single Tag</TabsTrigger>
                                        <TabsTrigger value="bulk">Bulk Text</TabsTrigger>
                                        <TabsTrigger value="file">Upload File</TabsTrigger>
                                        <TabsTrigger value="categories">Categories</TabsTrigger>
                                    </TabsList>
                                    
                                    <TabsContent value="single" className="space-y-4">
                                        <div className="flex flex-col sm:flex-row gap-4">
                                            <Input 
                                                placeholder="Tag (e.g., 'Uplifting')" 
                                                value={newTag} 
                                                onChange={(e) => setNewTag(e.target.value)}
                                                className="border-gray-200 focus:ring-2 focus:ring-opacity-50"
                                                style={{ 
                                                    focusRingColor: '#F96F51',
                                                    focusBorderColor: '#F96F51'
                                                }}
                                            />
                                            
                                            <Popover open={isSingleComboboxOpen} onOpenChange={setSingleComboboxOpen}>
                                                <PopoverTrigger asChild>
                                                    <Button
                                                        variant="outline"
                                                        role="combobox"
                                                        aria-expanded={isSingleComboboxOpen}
                                                        className="w-full sm:w-64 justify-between font-normal text-gray-500"
                                                    >
                                                        {newCategory ? newCategory : "Select or type category..."}
                                                        <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                                                    </Button>
                                                </PopoverTrigger>
                                                <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0">
                                                    <Command>
                                                        <CommandInput 
                                                            placeholder="Search or type new category..."
                                                            value={newCategory}
                                                            onValueChange={setNewCategory} // Allows typing a new category
                                                        />
                                                        <CommandEmpty>
                                                            <div className="p-4 text-sm text-center text-gray-500">
                                                                No category found. <br/> Type to create a new one.
                                                            </div>
                                                        </CommandEmpty>
                                                        <CommandGroup>
                                                            {categoryNames.map((category) => (
                                                                <CommandItem
                                                                    key={category}
                                                                    value={category}
                                                                    onSelect={(currentValue) => {
                                                                        setNewCategory(currentValue === newCategory ? "" : currentValue);
                                                                        setSingleComboboxOpen(false);
                                                                    }}
                                                                >
                                                                    <Check
                                                                        className={`mr-2 h-4 w-4 ${newCategory.toLowerCase() === category.toLowerCase() ? "opacity-100" : "opacity-0"}`}
                                                                    />
                                                                    {category}
                                                                </CommandItem>
                                                            ))}
                                                        </CommandGroup>
                                                    </Command>
                                                </PopoverContent>
                                            </Popover>
                                            
                                            <Button 
                                                onClick={() => handleAddTag()} 
                                                className="flex items-center gap-2 text-white font-medium px-6 py-2 rounded-lg transition-all duration-200 hover:shadow-lg whitespace-nowrap"
                                                style={{ 
                                                    backgroundColor: '#F96F51'
                                                }}
                                            >
                                                <Plus className="w-4 h-4" />
                                                Add Tag
                                            </Button>
                                        </div>
                                    </TabsContent>
                                    
                                    <TabsContent value="bulk" className="space-y-4">
                                        <div className="space-y-4">
                                            <Popover open={isComboboxOpen} onOpenChange={setComboboxOpen}>
                                                <PopoverTrigger asChild>
                                                    <Button
                                                        variant="outline"
                                                        role="combobox"
                                                        aria-expanded={isComboboxOpen}
                                                        className="w-full justify-between font-normal text-gray-500"
                                                    >
                                                        {bulkCategory ? bulkCategory : "Select or type new category..."}
                                                        <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                                                    </Button>
                                                </PopoverTrigger>
                                                <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0">
                                                    <Command>
                                                        <CommandInput 
                                                            placeholder="Search or type new category..."
                                                            value={bulkCategory}
                                                            onValueChange={setBulkCategory} // Allows typing a new category
                                                        />
                                                        <CommandEmpty>
                                                            <div className="p-4 text-sm text-center text-gray-500">
                                                                No category found. <br/> Type to create a new one.
                                                            </div>
                                                        </CommandEmpty>
                                                        <CommandGroup>
                                                            {categoryNames.map((category) => (
                                                                <CommandItem
                                                                    key={category}
                                                                    value={category}
                                                                    onSelect={(currentValue) => {
                                                                        setBulkCategory(currentValue === bulkCategory ? "" : currentValue);
                                                                        setComboboxOpen(false);
                                                                    }}
                                                                >
                                                                    <Check
                                                                        className={`mr-2 h-4 w-4 ${bulkCategory.toLowerCase() === category.toLowerCase() ? "opacity-100" : "opacity-0"}`}
                                                                    />
                                                                    {category}
                                                                </CommandItem>
                                                            ))}
                                                        </CommandGroup>
                                                    </Command>
                                                </PopoverContent>
                                            </Popover>

                                            <Textarea 
                                                placeholder="Enter multiple tags separated by commas, semicolons, or new lines:&#10;&#10;Pop, Rock, Electronic&#10;Jazz, Blues&#10;Ambient; Chillout; House"
                                                value={bulkTags}
                                                onChange={(e) => setBulkTags(e.target.value)}
                                                className="h-32 border-gray-200 focus:ring-2 focus:ring-opacity-50"
                                                style={{ 
                                                    focusRingColor: '#F96F51',
                                                    focusBorderColor: '#F96F51'
                                                }}
                                            />
                                            <Button 
                                                onClick={handleBulkAdd} 
                                                disabled={uploading}
                                                className="flex items-center gap-2 text-white font-medium px-6 py-2 rounded-lg transition-all duration-200 hover:shadow-lg"
                                                style={{ 
                                                    backgroundColor: '#F96F51'
                                                }}
                                            >
                                                {uploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                                                {uploading ? "Adding..." : "Add All Tags"}
                                            </Button>
                                        </div>
                                    </TabsContent>
                                    
                                    <TabsContent value="file" className="space-y-4">
                                        <div className="space-y-4">
                                            <div className="text-sm text-gray-600 mb-4">
                                                <p className="mb-2"><strong>File format:</strong> .txt file with one tag per line or comma/semicolon separated</p>
                                                <p><strong>Auto-categorization:</strong> Files named with "genre", "mood", "instrument", or "scene" will be auto-categorized</p>
                                            </div>
                                            
                                            <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center">
                                                <input
                                                    type="file"
                                                    accept=".txt"
                                                    onChange={handleFileUpload}
                                                    className="hidden"
                                                    id="tag-file-upload"
                                                    disabled={uploading}
                                                />
                                                <div 
                                                    className="w-12 h-12 mx-auto rounded-full flex items-center justify-center mb-3"
                                                    style={{ backgroundColor: 'rgba(249, 111, 81, 0.1)' }}
                                                >
                                                    {uploading ? 
                                                        <Loader2 className="w-6 h-6 animate-spin" style={{ color: '#F96F51' }} /> :
                                                        <Upload className="w-6 h-6" style={{ color: '#F96F51' }} />
                                                    }
                                                </div>
                                                <p className="text-lg font-medium text-gray-800 mb-2">
                                                    {uploading ? "Processing..." : "Upload Tags File"}
                                                </p>
                                                <p className="text-sm text-gray-500 mb-4">Click to select a .txt file</p>
                                                
                                                <Button
                                                    type="button"
                                                    onClick={() => document.getElementById('tag-file-upload').click()}
                                                    disabled={uploading}
                                                    className="text-white font-medium px-6 py-2 rounded-lg transition-all duration-200 hover:shadow-lg"
                                                    style={{ backgroundColor: '#F96F51' }}
                                                >
                                                    Browse Files
                                                </Button>
                                            </div>
                                        </div>
                                    </TabsContent>

                                    {/* New Categories Management Tab Content */}
                                    <TabsContent value="categories" className="space-y-6">
                                        <div className="text-sm text-gray-600 mb-4">
                                            <p>Organize your tags by categories. You can rename categories, move tags between categories, or delete entire categories.</p>
                                        </div>

                                        {Object.keys(categories).length === 0 ? ( // Check actual categories with tags
                                            <div className="text-center py-8">
                                                <FolderOpen className="w-12 h-12 mx-auto text-gray-400 mb-4" />
                                                <p className="text-gray-500">No categories found. Add some tags first!</p>
                                            </div>
                                        ) : (
                                            <div className="space-y-4">
                                                {categoryNames.filter(name => categories[name] && categories[name].length > 0).map(categoryName => ( // Only map categories that actually have tags
                                                    <Card key={categoryName} className="bg-gray-50 border border-gray-200">
                                                        <CardHeader className="pb-3">
                                                            <div className="flex items-center justify-between">
                                                                <div className="flex items-center gap-3">
                                                                    {editingCategory === categoryName ? (
                                                                        <div className="flex items-center gap-2">
                                                                            <Input 
                                                                                value={newCategoryName}
                                                                                onChange={(e) => setNewCategoryName(e.target.value)}
                                                                                placeholder="New category name"
                                                                                className="w-48"
                                                                            />
                                                                            <Button 
                                                                                size="sm" 
                                                                                onClick={() => handleUpdateCategory(categoryName)}
                                                                                className="text-white"
                                                                                style={{ backgroundColor: '#F96F51' }}
                                                                            >
                                                                                <Save className="w-4 h-4" />
                                                                            </Button>
                                                                            <Button 
                                                                                size="sm" 
                                                                                variant="outline"
                                                                                onClick={() => {
                                                                                    setEditingCategory(null);
                                                                                    setNewCategoryName("");
                                                                                }}
                                                                            >
                                                                                <X className="w-4 h-4" />
                                                                            </Button>
                                                                        </div>
                                                                    ) : (
                                                                        <>
                                                                            <h3 className="text-lg font-semibold text-gray-800">{categoryName}</h3>
                                                                            <Badge variant="secondary">
                                                                                {categories[categoryName].length} tags
                                                                            </Badge>
                                                                        </>
                                                                    )}
                                                                </div>
                                                                
                                                                {editingCategory !== categoryName && (
                                                                    <div className="flex gap-2">
                                                                        <Button 
                                                                            size="sm" 
                                                                            variant="outline"
                                                                            onClick={() => {
                                                                                setEditingCategory(categoryName);
                                                                                setNewCategoryName(categoryName);
                                                                            }}
                                                                        >
                                                                            <Edit3 className="w-4 h-4" />
                                                                        </Button>
                                                                        <Button 
                                                                            size="sm" 
                                                                            variant="outline"
                                                                            onClick={() => handleDeleteCategory(categoryName)}
                                                                            className="text-red-600 hover:text-red-700"
                                                                        >
                                                                            <Trash2 className="w-4 h-4" />
                                                                        </Button>
                                                                    </div>
                                                                )}
                                                            </div>
                                                        </CardHeader>
                                                        
                                                        <CardContent className="pt-0">
                                                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
                                                                {categories[categoryName].map(tag => (
                                                                    <div key={tag.id} className="flex items-center justify-between bg-white p-2 rounded border">
                                                                        <span className="text-sm font-medium text-gray-700">{tag.tag}</span>
                                                                        <div className="flex gap-1">
                                                                            {editingTag === tag.id ? (
                                                                                <div className="flex items-center gap-1">
                                                                                    <Select 
                                                                                        value={newTagCategory}
                                                                                        onValueChange={setNewTagCategory}
                                                                                    >
                                                                                        <SelectTrigger className="w-24 h-6 text-xs">
                                                                                            <SelectValue placeholder="Select category"/>
                                                                                        </SelectTrigger>
                                                                                        <SelectContent>
                                                                                            {categoryNames.map(cat => (
                                                                                                <SelectItem key={cat} value={cat}>
                                                                                                    {cat}
                                                                                                </SelectItem>
                                                                                            ))}
                                                                                        </SelectContent>
                                                                                    </Select>
                                                                                    <Button 
                                                                                        size="sm" 
                                                                                        variant="ghost"
                                                                                        onClick={() => handleUpdateTagCategory(tag.id, tag)}
                                                                                        className="h-6 w-6 p-0"
                                                                                    >
                                                                                        <Save className="w-3 h-3" />
                                                                                    </Button>
                                                                                    <Button 
                                                                                        size="sm" 
                                                                                        variant="ghost"
                                                                                        onClick={() => {
                                                                                            setEditingTag(null);
                                                                                            setNewTagCategory("");
                                                                                        }}
                                                                                        className="h-6 w-6 p-0"
                                                                                    >
                                                                                        <X className="w-3 h-3" />
                                                                                    </Button>
                                                                                </div>
                                                                            ) : (
                                                                                <>
                                                                                    <Button 
                                                                                        size="sm" 
                                                                                        variant="ghost"
                                                                                        onClick={() => {
                                                                                            setEditingTag(tag.id);
                                                                                            setNewTagCategory(tag.category || 'General'); // Initialize with current category
                                                                                        }}
                                                                                        className="h-6 w-6 p-0 hover:bg-gray-100"
                                                                                    >
                                                                                        <Edit3 className="w-3 h-3" />
                                                                                    </Button>
                                                                                    <Button 
                                                                                        size="sm" 
                                                                                        variant="ghost"
                                                                                        onClick={() => handleDeleteTag(tag.id)}
                                                                                        className="h-6 w-6 p-0 hover:bg-red-50 hover:text-red-600"
                                                                                    >
                                                                                        <Trash2 className="w-3 h-3" />
                                                                                    </Button>
                                                                                </>
                                                                            )}
                                                                        </div>
                                                                    </div>
                                                                ))}
                                                            </div>
                                                        </CardContent>
                                                    </Card>
                                                ))}
                                            </div>
                                        )}
                                    </TabsContent>
                                </Tabs>
                            </CardContent>
                        </Card>
                    </div>

                    {/* AI Suggestions Column */}
                    <div className="lg:col-span-1">
                        <Card className="bg-white/90 backdrop-blur-sm border-0 shadow-xl sticky top-8">
                             <CardHeader className="pb-4">
                                <CardTitle className="flex items-center gap-3 text-xl">
                                    <div 
                                        className="w-8 h-8 rounded-lg flex items-center justify-center"
                                        style={{ backgroundColor: 'rgba(139, 92, 246, 0.1)' }}
                                    >
                                        <Wand2 className="w-5 h-5 text-violet-600" />
                                    </div>
                                    <span className="text-gray-800">AI Suggestions</span>
                                </CardTitle>
                                <CardDescription className="text-gray-600 pt-2">
                                    Let AI suggest new tags based on your existing library.
                                </CardDescription>
                            </CardHeader>
                            <CardContent>
                                <Button
                                    onClick={handleGenerateSuggestions}
                                    disabled={isSuggesting}
                                    className="w-full text-white font-medium py-2 rounded-lg transition-all duration-200 hover:shadow-lg"
                                    style={{ backgroundColor: '#F96F51' }}
                                >
                                    {isSuggesting ? (
                                        <>
                                            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                            Generating...
                                        </>
                                    ) : (
                                        <>
                                            <Lightbulb className="w-4 h-4 mr-2" />
                                            Generate New Tags
                                        </>
                                    )}
                                </Button>

                                <div className="mt-6 space-y-3 max-h-96 overflow-y-auto pr-2">
                                    {suggestedTags.length === 0 && !isSuggesting && (
                                        <div className="text-center py-8">
                                            <p className="text-gray-500">Click generate to get AI-powered tag ideas.</p>
                                        </div>
                                    )}
                                    {isSuggesting && suggestedTags.length === 0 && (
                                         <div className="text-center py-8">
                                            <Loader2 className="w-8 h-8 mx-auto text-gray-400 animate-spin mb-4" />
                                            <p className="text-gray-500">Analyzing your tags...</p>
                                        </div>
                                    )}
                                    {suggestedTags.map((suggestion, index) => (
                                        <div key={index} className="bg-gray-50 border border-gray-200 p-3 rounded-lg">
                                            <div className="flex justify-between items-start">
                                                <div>
                                                    <div className="flex items-center gap-2">
                                                        <span className="font-semibold text-gray-800">{suggestion.tag}</span>
                                                        <Badge variant="outline">{suggestion.category}</Badge>
                                                    </div>
                                                    <p className="text-xs text-gray-600 mt-1">{suggestion.reason}</p>
                                                </div>
                                                <Button
                                                    size="sm"
                                                    variant="ghost"
                                                    onClick={() => handleAddSuggestedTag(suggestion)}
                                                    className="h-7 w-7 p-0 ml-2 hover:bg-green-100 hover:text-green-700"
                                                >
                                                    <Plus className="w-4 h-4" />
                                                </Button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </CardContent>
                        </Card>
                    </div>
                </div>

                <Card className="bg-white/90 backdrop-blur-sm border-0 shadow-xl mt-8">
                    <CardHeader className="pb-4">
                        <CardTitle className="flex items-center gap-3 text-xl">
                            <div 
                                className="w-8 h-8 rounded-lg flex items-center justify-center"
                                style={{ backgroundColor: '#F96F51' }}
                            >
                                <Tags className="w-5 h-5 text-white" />
                            </div>
                            <span className="text-gray-800">All Tags ({tags.length})</span>
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        {tags.length === 0 ? (
                            <div className="text-center py-12">
                                <div 
                                    className="w-16 h-16 mx-auto rounded-full flex items-center justify-center mb-4"
                                    style={{ backgroundColor: 'rgba(249, 111, 81, 0.1)' }}
                                >
                                    <Tags className="w-8 h-8" style={{ color: '#F96F51' }} />
                                </div>
                                <p className="text-gray-500 text-lg">No tags added yet</p>
                                <p className="text-gray-400 text-sm">Add your first tags above to get started</p>
                            </div>
                        ) : (
                            <div className="rounded-lg overflow-hidden border border-gray-200">
                                <Table>
                                    <TableHeader style={{ backgroundColor: 'rgba(249, 111, 81, 0.05)' }}>
                                        <TableRow>
                                            <TableHead className="font-semibold text-gray-800">Tag</TableHead>
                                            <TableHead className="font-semibold text-gray-800">Category</TableHead>
                                            <TableHead className="text-right font-semibold text-gray-800">Actions</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {tags.map((tag) => (
                                            <TableRow key={tag.id} className="hover:bg-gray-50">
                                                <TableCell className="font-medium text-gray-800">{tag.tag}</TableCell>
                                                <TableCell className="text-gray-600">{tag.category || 'General'}</TableCell>
                                                <TableCell className="text-right">
                                                    <Button 
                                                        variant="ghost" 
                                                        size="icon" 
                                                        onClick={() => handleDeleteTag(tag.id)}
                                                        className="hover:bg-red-50 hover:text-red-600 transition-colors"
                                                    >
                                                        <Trash2 className="w-4 h-4" />
                                                    </Button>
                                                </TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            </div>
                        )}
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
