import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Key } from "lucide-react";
import { toast } from "sonner";

export default function Settings() {
    const [cyaniteToken, setCyaniteToken] = useState("");
    const [gladiaToken, setGladiaToken] = useState("");
    const [isLoading, setIsLoading] = useState(false);

    useEffect(() => {
        const fetchUserData = async () => {
            try {
                const user = await base44.auth.me();
                if (user) {
                    if (user.cyaniteToken) {
                        setCyaniteToken(user.cyaniteToken);
                    }
                    if (user.gladiaToken) {
                        setGladiaToken(user.gladiaToken);
                    }
                }
            } catch (error) {
                console.error("Failed to fetch user data:", error);
            }
        };
        fetchUserData();
    }, []);

    const handleSave = async () => {
        setIsLoading(true);
        try {
            await base44.auth.updateMe({ cyaniteToken, gladiaToken });
            toast.success("Settings saved successfully!");
        } catch (error) {
            console.error("Failed to save settings:", error);
            toast.error("Failed to save settings. Please try again.");
        }
        setIsLoading(false);
    };

    return (
        <div className="p-4 md:p-8" style={{ backgroundColor: '#E3DDDB', minHeight: '100vh' }}>
            <div className="max-w-2xl mx-auto">
                 <header className="mb-8">
                    <h1 className="text-4xl font-bold text-gray-800 mb-2">Settings</h1>
                    <p className="text-gray-600 text-lg">Configure your API keys and application preferences.</p>
                </header>

                <Card className="bg-white/90 backdrop-blur-sm border-0 shadow-xl">
                    <CardHeader className="pb-4">
                        <CardTitle className="flex items-center gap-3 text-xl">
                            <div 
                                className="w-8 h-8 rounded-lg flex items-center justify-center"
                                style={{ backgroundColor: '#F96F51' }}
                            >
                                <Key className="w-5 h-5 text-white" />
                            </div>
                            <span className="text-gray-800">API Keys</span>
                        </CardTitle>
                        <CardDescription className="text-gray-600">
                            Your API keys are stored securely and are only used to interact with third-party services on your behalf.
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-6">
                            <div className="space-y-2">
                                <Label htmlFor="metadata-api-token" className="text-gray-700 font-medium">Metadata API Token</Label>
                                <Input
                                    id="metadata-api-token"
                                    type="password"
                                    placeholder="Enter your Metadata API token"
                                    value={cyaniteToken}
                                    onChange={(e) => setCyaniteToken(e.target.value)}
                                    className="border-gray-200 focus:ring-2 focus:ring-opacity-50"
                                    style={{ 
                                        focusRingColor: '#F96F51',
                                        focusBorderColor: '#F96F51'
                                    }}
                                />
                                <p className="text-sm text-gray-500">
                                    Required for audio analysis and metadata generation.
                                </p>
                            </div>
                            
                            <div className="space-y-2">
                                <Label htmlFor="lyric-api-key" className="text-gray-700 font-medium">Lyric API Key</Label>
                                <Input
                                    id="lyric-api-key"
                                    type="password"
                                    placeholder="Enter your Lyric API key"
                                    value={gladiaToken}
                                    onChange={(e) => setGladiaToken(e.target.value)}
                                    className="border-gray-200 focus:ring-2 focus:ring-opacity-50"
                                    style={{ 
                                        focusRingColor: '#F96F51',
                                        focusBorderColor: '#F96F51'
                                    }}
                                />
                                <p className="text-sm text-gray-500">
                                    Required for automatic lyric transcription from audio files.
                                </p>
                            </div>
                        </div>
                    </CardContent>
                    <CardFooter className="border-t border-gray-100 px-6 py-4">
                        <Button 
                            onClick={handleSave} 
                            disabled={isLoading}
                            className="text-white font-medium px-6 py-2 rounded-lg transition-all duration-200 hover:shadow-lg"
                            style={{ 
                                backgroundColor: '#F96F51',
                                ':hover': { backgroundColor: '#E45A42' }
                            }}
                        >
                            {isLoading ? "Saving..." : "Save Settings"}
                        </Button>
                    </CardFooter>
                </Card>
            </div>
        </div>
    );
}