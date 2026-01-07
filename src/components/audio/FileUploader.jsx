
import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Upload, X, FileMusic } from "lucide-react";
import { UploadFile } from "@/integrations/Core";

export default function FileUploader({ onUploadComplete }) {
    const [isDragOver, setIsDragOver] = useState(false);
    const [selectedFiles, setSelectedFiles] = useState([]);
    const [uploading, setUploading] = useState(false);

    const handleDragOver = (e) => {
        e.preventDefault();
        setIsDragOver(true);
    };

    const handleDragLeave = (e) => {
        e.preventDefault();
        setIsDragOver(false);
    };

    const handleDrop = (e) => {
        e.preventDefault();
        setIsDragOver(false);
        const files = Array.from(e.dataTransfer.files).filter(file => 
            file.type.startsWith('audio/') || 
            file.name.toLowerCase().match(/\.(mp3|wav|flac|m4a|aac)$/)
        );
        setSelectedFiles(files);
    };

    const handleFileInput = (e) => {
        const files = Array.from(e.target.files);
        setSelectedFiles(files);
    };

    const handleBrowseClick = () => {
        document.getElementById('audio-upload').click();
    };

    const removeFile = (index) => {
        setSelectedFiles(files => files.filter((_, i) => i !== index));
    };

    const uploadFiles = async () => {
        if (selectedFiles.length === 0) return;
        
        setUploading(true);
        try {
            const uploadPromises = selectedFiles.map(async (file) => {
                const { file_url } = await UploadFile({ file });
                return {
                    fileName: file.name,
                    fileUrl: file_url,
                    size: file.size
                };
            });
            
            const uploadedFiles = await Promise.all(uploadPromises);
            onUploadComplete(uploadedFiles);
            setSelectedFiles([]);
        } catch (error) {
            console.error("Upload failed:", error);
        }
        setUploading(false);
    };

    return (
        <div className="space-y-4">
            <Card className="bg-white/90 backdrop-blur-sm border-0 shadow-xl">
                <CardContent className="p-6">
                    <div
                        className={`border-2 border-dashed rounded-xl p-8 text-center transition-all duration-200 ${
                            isDragOver 
                                ? 'border-orange-400 bg-orange-50' 
                                : 'border-gray-300 bg-gray-50'
                        }`}
                        onDragOver={handleDragOver}
                        onDragLeave={handleDragLeave}
                        onDrop={handleDrop}
                    >
                        <div className="mb-4">
                            <div 
                                className="w-16 h-16 mx-auto rounded-full flex items-center justify-center mb-4"
                                style={{ backgroundColor: 'rgba(249, 111, 81, 0.1)' }}
                            >
                                <Upload className="w-8 h-8" style={{ color: '#F96F51' }} />
                            </div>
                            <h3 className="text-lg font-semibold text-gray-800 mb-2">
                                Drag & Drop Audio Files
                            </h3>
                            <p className="text-gray-600 mb-4">Or click to browse your files</p>
                            
                            <input
                                type="file"
                                multiple
                                accept="audio/*,.mp3,.wav,.flac,.m4a,.aac"
                                onChange={handleFileInput}
                                className="hidden"
                                id="audio-upload"
                            />
                            
                            <Button 
                                type="button"
                                onClick={handleBrowseClick}
                                className="text-white font-medium px-6 py-2 rounded-lg transition-all duration-200 hover:shadow-lg"
                                style={{ 
                                    backgroundColor: '#F96F51'
                                }}
                            >
                                Browse Files
                            </Button>
                            
                            <p className="text-sm text-gray-500 mt-4">
                                Supported formats: MP3, WAV, FLAC, M4A, AAC
                            </p>
                        </div>
                    </div>
                </CardContent>
            </Card>

            {selectedFiles.length > 0 && (
                <Card className="bg-white/90 backdrop-blur-sm border-0 shadow-lg">
                    <CardContent className="p-4">
                        <h4 className="font-semibold text-gray-800 mb-3">
                            Selected Files ({selectedFiles.length})
                        </h4>
                        <div className="space-y-2 mb-4">
                            {selectedFiles.map((file, index) => (
                                <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                                    <div className="flex items-center gap-3">
                                        <FileMusic className="w-4 h-4 text-gray-500" />
                                        <div>
                                            <p className="font-medium text-gray-800">{file.name}</p>
                                            <p className="text-sm text-gray-500">
                                                {(file.size / (1024 * 1024)).toFixed(2)} MB
                                            </p>
                                        </div>
                                    </div>
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={() => removeFile(index)}
                                        className="text-gray-400 hover:text-red-500"
                                    >
                                        <X className="w-4 h-4" />
                                    </Button>
                                </div>
                            ))}
                        </div>
                        <Button 
                            onClick={uploadFiles}
                            disabled={uploading}
                            className="w-full text-white font-medium py-2 rounded-lg transition-all duration-200 hover:shadow-lg"
                            style={{ backgroundColor: '#F96F51' }}
                        >
                            {uploading ? "Uploading..." : `Upload ${selectedFiles.length} File${selectedFiles.length > 1 ? 's' : ''}`}
                        </Button>
                    </CardContent>
                </Card>
            )}
        </div>
    );
}
