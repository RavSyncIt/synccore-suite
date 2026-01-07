
import React, { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { FileText, Loader2, AlertTriangle, Lightbulb, Music, Download } from 'lucide-react';
import { InvokeLLM } from '@/integrations/Core';
import { AudioTrack } from '@/entities/AudioTrack';
import ReactMarkdown from 'react-markdown';
import { toast } from 'sonner';
import { Input } from '@/components/ui/input';
import { SyncDeal } from '@/entities/SyncDeal';
import DealTracker from '../components/deals/DealTracker';

const systemPrompt = `
Title: Sync Deal Builder – Drafting & Term-Sheet Generator

Goal: Convert a user brief (usage description + synopsis) into (1) a normalized JSON term sheet, (2) fee recommendations, and (3) a clean draft sync license agreement using clauses from the clause library. Ask follow-ups only if a material ambiguity blocks drafting; otherwise make best-interest, industry-typical assumptions and mark them as assumptions.

Style & constraints:
- Jurisdictions supported: UK (English law), US (New York law). Default to UK if unspecified for users in Europe/London; otherwise US.
- Be precise, non-flowery, contract-ready. Use plain English.
- All outputs must include a JSON term sheet and a human-readable term sheet, then the full draft agreement.
- If user asks only for a quote or “deal recommendation”, skip the agreement and output term sheet + fee recs.
- Flag risks (e.g., perpetuity buyout, exclusivity, MFN, SAG-AFTRA/Equity considerations for ads with artists on-camera, moral rights if lyric edits, AI voice cloning, etc.).
- Never invent party names—use placeholders if unknown.

MANDATORY SECTIONS OF THE RESPONSE (in this order):
1) TERMS_JSON (exact schema below)
2) TERM SHEET (human-readable)
3) DRAFT AGREEMENT (choose UK or US template based on jurisdiction)
4) ASSUMPTIONS & OPEN QUESTIONS
5) RISK FLAGS (if any)

TERMS_JSON schema (strict):
\`\`\`json
{
  "projectTitle": "",
  "jurisdiction": "UK | US",
  "parties": { "licensorName": "", "licensorAddress": "", "licenseeName": "", "licenseeAddress": "" },
  "work": { "title": "", "artist": "", "writers": [], "publishers": [], "masterOwner": "", "isReRecordAllowed": false, "isLyricsEditAllowed": false, "isAIUsage": false },
  "usage": { "media": ["TV", "Online", "Social", "In-Theatre", "Radio", "In-Store", "Event", "Podcast", "Game", "App", "OOH", "UGC", "Internal", "FilmFestival", "Trailer", "StreamingSVOD", "AVOD", "EST", "Theatrical"], "edits": ["cutdowns", "lifts", "versions", "trailerized", "remix"], "exclusivity": "none | category | market | full", "exclusivityCategory": "", "geography": ["UK", "US", "EU", "Worldwide", "Custom"], "customTerritories": "", "term": { "length": "X months/years/perpetuity", "startDate": "", "options": [{"length":"","fee":"","trigger":""}] }, "impressionCaps": {"online": null, "social": null}, "placementType": "background | visual vocal | visual instrumental | feature vocal | feature instrumental | theme", "synopsis": "", "brandCategory": "", "contentSensitivity": ["alcohol","tobacco","political","religious","sexual","medical","children","weapons"] },
  "financials": { "currency": "USD | GBP | EUR", "feeStructure": "flat | tiered | media-split", "fees": { "publishing": 0, "master": 0, "total": 0, "breakdown": [ {"media":"Online","term":"12m","territory":"WW","amount":0} ] }, "stepUps": [{"trigger":"extend to TV","amount":0}], "mostFavouredNation": true, "paymentTerms": "30 days from invoice", "lateInterest": "4% over base/prime" },
  "credit": {"required": false, "line": ""},
  "delivery": {"materials":["wav","instrumental","stems","lyrics","cue sheet meta"],"deadline":""},
  "warrantiesApprovals": { "moralRightsWaiver": false, "lyricChangeApprovalNeeded": true, "finalCutApproval": "none | licensor | licensee | mutual" },
  "legal": { "law": "England and Wales | New York", "venue": "London | New York", "indemnityCap": "fee | 2x fee | uncapped", "confidentiality": true, "assignment": "consent not unreasonably withheld", "sublicensing": "none | production vendors only | full within scope" },
  "metadataForCueSheet": { "iswc": "", "isrc": "", "ipiCodes": [], "pro": "", "durationSeconds": null }
}
\`\`\`
`;

const exampleBrief = "We want to license 'Sunset Drive' by The Midnight for a new electric car ad. It's for a global campaign, 12 months, all media online & social. Background instrumental use. The brand is a luxury auto manufacturer. Synopsis: A couple drives the new EV through a futuristic city at night, showcasing its sleek design and quiet motor.";

export default function DealBuilderPage() {
    const [result, setResult] = useState(null);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState(null);
    const [tracks, setTracks] = useState([]);
    const [selectedTrack, setSelectedTrack] = useState(null); 
    const [isLoadingTracks, setIsLoadingTracks] = useState(true); // Initialize as true

    // State for structured form
    const [manualTitle, setManualTitle] = useState("");
    const [manualArtist, setManualArtist] = useState("");
    const [usage, setUsage] = useState("");
    const [term, setTerm] = useState("");
    const [territory, setTerritory] = useState("");
    const [rights, setRights] = useState("");
    const [budgetBand, setBudgetBand] = useState(""); 
    const [projectDetails, setProjectDetails] = useState(""); 
    const [isDownloadingDocx, setIsDownloadingDocx] = useState(false); // Renamed to isDownloadingRtf in spirit, but variable not changed to preserve current logic.
    const [isDownloadingJson, setIsDownloadingJson] = useState(false);

    // State for Deal Tracker
    const [deals, setDeals] = useState([]);

    const loadDeals = useCallback(async () => {
        try {
            const allDeals = await SyncDeal.list("-created_date");
            setDeals(allDeals);
        } catch (error) {
            console.error("Failed to load deals:", error);
        }
    }, []);

    const loadTracks = useCallback(async () => {
        try {
            const allTracks = await AudioTrack.list("-created_date");
            // Only show completed tracks with metadata
            const completedTracks = allTracks.filter(track => 
                track.status === 'complete' && 
                track.finalMetadata && 
                track.finalMetadata.title
            );
            setTracks(completedTracks);
        } catch (error) {
            console.error("Failed to load tracks:", error);
        } finally {
            setIsLoadingTracks(false);
        }
    }, []);

    useEffect(() => {
        loadDeals();
        loadTracks();
    }, [loadDeals, loadTracks]);

    const handleTrackSelect = (trackId) => {
        setSelectedTrack(trackId);
        if (trackId !== null) { // A catalog track was selected
            setManualTitle("");
            setManualArtist("");
        }
        // When trackId is null ("Enter Manually"), we don't clear manual input
        // and we don't clear usage, term, etc., as they are independent
    };

    const generateBriefFromForm = () => {
        let trackInfo;
        let trackIdentifier = "";

        if (selectedTrack) {
            const track = tracks.find(t => t.id === selectedTrack);
            if (track) {
                trackIdentifier = `We want to license '${track.finalMetadata.title}' by ${track.finalMetadata.artist || "an unspecified artist"}.`;
                
                // Add detailed track metadata if available
                const metadata = track.finalMetadata;
                let trackDetails = "";
                if (metadata.genre || metadata.moodTags || metadata.energyLevel || metadata.tempoBPM || metadata.key || metadata.vocals) {
                    trackDetails += `\n\nTrack Details:`;
                    if (metadata.genre && metadata.genre.length > 0) trackDetails += `\n- Genre: ${metadata.genre.join(", ")}`;
                    if (metadata.moodTags && metadata.moodTags.length > 0) trackDetails += `\n- Mood: ${metadata.moodTags.join(", ")}`;
                    if (metadata.energyLevel) trackDetails += `\n- Energy Level: ${metadata.energyLevel}`;
                    if (metadata.tempoBPM) trackDetails += `\n- Tempo: ${Math.round(metadata.tempoBPM)} BPM`;
                    if (metadata.key) trackDetails += `\n- Key: ${metadata.key}`;
                    if (metadata.vocals) trackDetails += `\n- Vocals: ${metadata.vocals}`;
                }
                trackInfo = `${trackIdentifier}${trackDetails}`;
            }
        } else { // No track selected, use manual input
            if (!manualTitle.trim()) {
                toast.error("Please provide a track title when entering manually.");
                return null; // Indicates an invalid brief, stop generation
            }
            trackInfo = `We want to license '${manualTitle}' by ${manualArtist.trim() || 'an unspecified artist'}.`;
        }

        // Ensure we have some track info before proceeding
        if (!trackInfo) {
            toast.error("Please select a track or provide a track title and artist.");
            return null;
        }

        const licenseTerms = `\n\nLicense Terms:
- Usage: ${usage || "Not specified"}
- Term: ${term || "Not specified"}
- Territory: ${territory || "Not specified"}
- Rights: ${rights || "Not specified"}
- Budget Band: ${budgetBand || "Not specified"}`; // Added Budget Band to the brief

        const projectInfo = projectDetails ? `\n\nProject Details & Synopsis:\n${projectDetails}` : "";

        return `${trackInfo}${licenseTerms}${projectInfo}`;
    };

    const handleGenerate = async () => {
        const finalBrief = generateBriefFromForm();
        if (!finalBrief) {
            return;
        }

        setIsLoading(true);
        setError(null);
        setResult(null);

        try {
            const userPrompt = `USER BRIEF:\n${finalBrief}`;
            const fullPrompt = `${systemPrompt}\n\n${userPrompt}`;
            const response = await InvokeLLM({ prompt: fullPrompt });
            const parsedResult = parseLLMResponse(response);
            setResult(parsedResult);

            // Save the generated deal with correct track info
            let finalTrackTitle = 'Unknown Track';
            let finalTrackArtist = 'Unknown Artist';

            if (selectedTrack) {
                const track = tracks.find(t => t.id === selectedTrack);
                if (track) {
                    finalTrackTitle = track.finalMetadata.title;
                    finalTrackArtist = track.finalMetadata.artist;
                }
            } else if (manualTitle) {
                finalTrackTitle = manualTitle;
                finalTrackArtist = manualArtist;
            } else if (parsedResult.json?.work?.title) {
                finalTrackTitle = parsedResult.json.work.title;
                finalTrackArtist = parsedResult.json.work.artist;
            }

            // --- Generate a smart project title ---
            let dealProjectTitle = parsedResult.json?.projectTitle || '';
            if (!dealProjectTitle && projectDetails) {
                // If no title from AI, use the first line of the project details
                dealProjectTitle = projectDetails.split('\n')[0].trim();
            } else if (!dealProjectTitle) {
                // If still no title, create a descriptive fallback
                const usageLabel = usage.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
                dealProjectTitle = `${usageLabel || 'License'} for '${finalTrackTitle}'`;
            }

            await SyncDeal.create({
                projectTitle: dealProjectTitle,
                licenseeName: parsedResult.json?.parties?.licenseeName || 'Unknown Licensee',
                trackTitle: finalTrackTitle,
                trackArtist: finalTrackArtist,
                status: 'draft',
                termsJson: parsedResult.json,
                termSheet: parsedResult.termSheet,
                agreement: parsedResult.agreement,
                assumptions: parsedResult.assumptions,
                risks: parsedResult.risks,
                brief: finalBrief,
            });
            await loadDeals(); // Refresh the deal list

        } catch (e) {
            console.error("Error generating deal:", e);
            setError("An error occurred while generating the agreement. Please try again.");
            toast.error("Failed to generate agreement.");
        } finally {
            setIsLoading(false);
        }
    };

    const parseLLMResponse = (response) => {
        const sections = {
            json: null,
            termSheet: "",
            agreement: "",
            assumptions: "",
            risks: "",
        };

        const jsonMatch = response.match(/TERMS_JSON\s*```json([\s\S]*?)```/);
        if (jsonMatch && jsonMatch[1]) {
            try {
                sections.json = JSON.parse(jsonMatch[1]);
            } catch (e) {
                console.error("Failed to parse TERMS_JSON", e);
                sections.json = { error: "Failed to parse JSON content." };
            }
        }

        // Use more robust regex to capture content between sections
        const extractSection = (response, startTag, endTags) => {
            const endPattern = endTags.map(tag => `(?=${tag})`).join('|');
            const regex = new RegExp(`${startTag}([\\s\\S]*?)(?:${endPattern}|$)`);
            const match = response.match(regex);
            return match ? match[1].trim() : '';
        };

        sections.termSheet = extractSection(response, 'TERM SHEET', ['DRAFT AGREEMENT', 'ASSUMPTIONS & OPEN QUESTIONS', 'RISK FLAGS', 'TERMS_JSON']);
        sections.agreement = extractSection(response, 'DRAFT AGREEMENT', ['ASSUMPTIONS & OPEN QUESTIONS', 'RISK FLAGS', 'TERMS_JSON']);
        sections.assumptions = extractSection(response, 'ASSUMPTIONS & OPEN QUESTIONS', ['RISK FLAGS', 'TERMS_JSON']);
        sections.risks = extractSection(response, 'RISK FLAGS', ['TERMS_JSON']);
        
        // Remove the TERMS_JSON block from the general sections if it was included in the match
        // (though the prompt explicitly states order, this is a safety measure)
        sections.termSheet = sections.termSheet.replace(/TERMS_JSON\s*```json[\s\S]*?```/, '').trim();
        sections.agreement = sections.agreement.replace(/TERMS_JSON\s*```json[\s\S]*?```/, '').trim();
        sections.assumptions = sections.assumptions.replace(/TERMS_JSON\s*```json[\s\S]*?```/, '').trim();
        sections.risks = sections.risks.replace(/TERMS_JSON\s*```json[\s\S]*?```/, '').trim();


        return sections;
    };

    const handleSelectDeal = (deal) => {
        setResult({
            json: deal.termsJson,
            termSheet: deal.termSheet,
            agreement: deal.agreement,
            assumptions: deal.assumptions,
            risks: deal.risks,
        });
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    const handleUpdateDealStatus = async (dealId, status) => {
        try {
            await SyncDeal.update(dealId, { status });
            await loadDeals();
            toast.success(`Deal status updated to ${status}.`);
        } catch (error) {
            toast.error("Failed to update deal status.");
            console.error("Error updating deal status:", error);
        }
    };

    const handleDeleteDeal = async (dealId) => {
        if (window.confirm("Are you sure you want to delete this deal?")) {
            try {
                await SyncDeal.delete(dealId);
                await loadDeals();
                toast.success("Deal deleted successfully.");
            } catch (error) {
                toast.error("Failed to delete deal.");
                console.error("Error deleting deal:", error);
            }
        }
    };

    const handleDownloadJson = () => {
        if (!result || !result.json) return;
        setIsDownloadingJson(true);
        try {
            const jsonContent = JSON.stringify(result.json, null, 2);
            const blob = new Blob([jsonContent], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            
            const projectTitle = result.json.projectTitle?.replace(/ /g, '_') || 'deal';
            
            a.href = url;
            a.download = `${projectTitle}_terms.json`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
        } catch (e) {
            toast.error("Failed to create JSON file.");
            console.error(e);
        } finally {
            setIsDownloadingJson(false);
        }
    };

    const handleDownloadDocx = async () => {
        if (!result || !result.agreement) return;
        setIsDownloadingDocx(true);
        try {
            // The generateDocx import is no longer needed as we are saving raw text.
            // const { generateDocx } = await import('@/functions/generateDocx'); 
            const projectTitle = result.json?.projectTitle || 'Generated Agreement';
            
            // For plain text download, we directly use the markdown content
            const textContent = result.agreement;

            const blob = new Blob([textContent], { type: 'text/plain' }); // Changed type to 'text/plain'
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `${projectTitle.replace(/ /g, '_')}.txt`; // Changed extension to '.txt'
            document.body.appendChild(a);
            a.click();
            window.URL.revokeObjectURL(url);
            a.remove();
            
        } catch (e) {
            toast.error("Failed to download text file."); // Updated toast message
            console.error(e);
        } finally {
            setIsDownloadingDocx(false);
        }
    };

    return (
        <div className="p-4 md:p-8" style={{ backgroundColor: '#E3DDDB', minHeight: '100vh' }}>
            <div className="max-w-4xl mx-auto">
                <header className="mb-8">
                    <img 
                        src="https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/68cc08c26c4162c8627656f9/714a36e76_SyncClause.png"
                        alt="SyncClause"
                        className="h-16 w-auto object-contain mb-4"
                    />
                    <p className="text-gray-600 text-lg">
                        Automatically generate a music sync license agreement from a simple brief. Describe the usage, and our AI will draft the term sheet and full agreement for you.
                    </p>
                </header>

                <Card className="bg-white/90 backdrop-blur-sm border-0 shadow-xl mb-8">
                    <CardHeader>
                        <CardTitle>1. Build Your License Brief</CardTitle>
                        <CardDescription>
                            Select a track from your catalog or manually enter details, then specify the license terms.
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-6">
                        {/* Track Selection & Manual Input */}
                        <div className="space-y-2">
                            <label className="text-sm font-medium text-gray-700">Track Source</label>
                            <Select value={selectedTrack} onValueChange={handleTrackSelect}>
                                <SelectTrigger className="border-gray-200">
                                    <SelectValue placeholder={isLoadingTracks ? "Loading tracks..." : "Select from catalog or enter manually"} />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value={null}>Enter Manually</SelectItem>
                                    {tracks.map((track) => (
                                        <SelectItem key={track.id} value={track.id}>
                                            <div className="flex items-center gap-2">
                                                <Music className="w-4 h-4" />
                                                <span>{track.finalMetadata.title} - {track.finalMetadata.artist}</span>
                                            </div>
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                        
                        {!selectedTrack && (
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <label className="text-sm font-medium text-gray-700">Track Title</label>
                                    <Input 
                                        placeholder="e.g., Sunset Drive"
                                        value={manualTitle}
                                        onChange={(e) => setManualTitle(e.target.value)}
                                        className="border-gray-200"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-sm font-medium text-gray-700">Artist Name</label>
                                    <Input 
                                        placeholder="e.g., The Midnight"
                                        value={manualArtist}
                                        onChange={(e) => setManualArtist(e.target.value)}
                                        className="border-gray-200"
                                    />
                                </div>
                            </div>
                        )}

                        {/* License Terms Grid */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <label className="text-sm font-medium text-gray-700">Usage</label>
                                <Select value={usage} onValueChange={setUsage}>
                                    <SelectTrigger className="border-gray-200">
                                        <SelectValue placeholder="Select usage type" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="tv-commercial">TV Commercial</SelectItem>
                                        <SelectItem value="online-advertising">Online Advertising</SelectItem>
                                        <SelectItem value="social-media">Social Media Campaign</SelectItem>
                                        <SelectItem value="film-soundtrack">Film Soundtrack</SelectItem>
                                        <SelectItem value="tv-show">TV Show/Series</SelectItem>
                                        <SelectItem value="streaming-content">Streaming Content</SelectItem>
                                        <SelectItem value="radio-commercial">Radio Commercial</SelectItem>
                                        <SelectItem value="corporate-video">Corporate Video</SelectItem>
                                        <SelectItem value="documentary">Documentary</SelectItem>
                                        <SelectItem value="trailer">Trailer/Promo</SelectItem>
                                        <SelectItem value="podcast">Podcast</SelectItem>
                                        <SelectItem value="video-game">Video Game</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>

                            <div className="space-y-2">
                                <label className="text-sm font-medium text-gray-700">Term</label>
                                <Select value={term} onValueChange={setTerm}>
                                    <SelectTrigger className="border-gray-200">
                                        <SelectValue placeholder="Select license term" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="6-months">6 Months</SelectItem>
                                        <SelectItem value="1-year">1 Year</SelectItem>
                                        <SelectItem value="2-years">2 Years</SelectItem>
                                        <SelectItem value="3-years">3 Years</SelectItem>
                                        <SelectItem value="5-years">5 Years</SelectItem>
                                        <SelectItem value="10-years">10 Years</SelectItem>
                                        <SelectItem value="perpetuity">Perpetuity</SelectItem>
                                        <SelectItem value="festival-run">Festival Run Only</SelectItem>
                                        <SelectItem value="theatrical-release">Theatrical Release Period</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>

                            <div className="space-y-2">
                                <label className="text-sm font-medium text-gray-700">Territory</label>
                                <Select value={territory} onValueChange={setTerritory}>
                                    <SelectTrigger className="border-gray-200">
                                        <SelectValue placeholder="Select territory" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="uk">United Kingdom</SelectItem>
                                        <SelectItem value="us">United States</SelectItem>
                                        <SelectItem value="eu">European Union</SelectItem>
                                        <SelectItem value="north-america">North America</SelectItem>
                                        <SelectItem value="worldwide">Worldwide</SelectItem>
                                        <SelectItem value="english-speaking">English-Speaking Territories</SelectItem>
                                        <SelectItem value="europe">Europe</SelectItem>
                                        <SelectItem value="asia-pacific">Asia-Pacific</SelectItem>
                                        <SelectItem value="latin-america">Latin America</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>

                            <div className="space-y-2">
                                <label className="text-sm font-medium text-gray-700">Rights Type</label>
                                <Select value={rights} onValueChange={setRights}>
                                    <SelectTrigger className="border-gray-200">
                                        <SelectValue placeholder="Select rights type" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="non-exclusive">Non-Exclusive</SelectItem>
                                        <SelectItem value="exclusive">Exclusive</SelectItem>
                                        <SelectItem value="category-exclusive">Category Exclusive</SelectItem>
                                        <SelectItem value="territory-exclusive">Territory Exclusive</SelectItem>
                                        <SelectItem value="media-exclusive">Media Exclusive</SelectItem>
                                        <SelectItem value="first-use">First Use Rights</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>

                            {/* New Budget Band Dropdown */}
                            <div className="space-y-2">
                                <label className="text-sm font-medium text-gray-700">Budget Band</label>
                                <Select value={budgetBand} onValueChange={setBudgetBand}>
                                    <SelectTrigger className="border-gray-200">
                                        <SelectValue placeholder="Select budget range" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="under-1k">Under £1,000</SelectItem>
                                        <SelectItem value="1k-5k">£1,000 - £5,000</SelectItem>
                                        <SelectItem value="5k-15k">£5,000 - £15,000</SelectItem>
                                        <SelectItem value="15k-50k">£15,000 - £50,000</SelectItem>
                                        <SelectItem value="50k-100k">£50,000 - £100,000</SelectItem>
                                        <SelectItem value="100k-250k">£100,000 - £250,000</SelectItem>
                                        <SelectItem value="250k-500k">£250,000 - £500,000</SelectItem>
                                        <SelectItem value="500k-plus">£500,000+</SelectItem>
                                        <SelectItem value="tbd">To Be Determined</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>

                            {/* Empty div to maintain grid alignment if needed (5 items = odd count) */}
                            <div></div>
                        </div>

                        {/* Project Details */}
                        <div className="space-y-2">
                            <label className="text-sm font-medium text-gray-700">Project Details & Synopsis</label>
                            <Textarea
                                placeholder="Describe your project: brand name, campaign concept, target audience, creative treatment, a brief synopsis, etc..."
                                value={projectDetails}
                                onChange={(e) => setProjectDetails(e.target.value)}
                                className="min-h-[100px] border-gray-200 text-base"
                            />
                        </div>
                        
                        <Button
                            onClick={handleGenerate}
                            disabled={isLoading}
                            className="w-full sm:w-auto text-white font-medium px-6 py-2 rounded-lg transition-all duration-200 hover:shadow-lg"
                            style={{ backgroundColor: '#F96F51' }}
                        >
                            {isLoading ? (
                                <>
                                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                    Generating...
                                </>
                            ) : (
                                <>
                                    <FileText className="w-4 h-4 mr-2" />
                                    Generate Agreement
                                </>
                            )}
                        </Button>
                    </CardContent>
                </Card>

                {error && <p className="text-red-500">{error}</p>}

                {result && (
                    <Card className="bg-white/90 backdrop-blur-sm border-0 shadow-xl mb-8">
                        <CardHeader>
                            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                                <div>
                                    <CardTitle>2. Generated Agreement</CardTitle>
                                    <CardDescription>Review the generated terms and draft agreement below.</CardDescription>
                                </div>
                                <div className="flex gap-2 flex-shrink-0">
                                    <Button variant="outline" size="sm" onClick={handleDownloadDocx} disabled={isDownloadingDocx}>
                                        {isDownloadingDocx ? <Loader2 className="w-4 h-4 mr-2 animate-spin"/> : <Download className="w-4 h-4 mr-2"/>}
                                        Download .txt
                                    </Button>
                                    <Button variant="outline" size="sm" onClick={handleDownloadJson} disabled={isDownloadingJson}>
                                        {isDownloadingJson ? <Loader2 className="w-4 h-4 mr-2 animate-spin"/> : <Download className="w-4 h-4 mr-2"/>}
                                        Download .json
                                    </Button>
                                </div>
                            </div>
                        </CardHeader>
                        <CardContent>
                            <Tabs defaultValue="term-sheet">
                                <TabsList className="grid w-full grid-cols-3">
                                    <TabsTrigger value="term-sheet">Term Sheet</TabsTrigger>
                                    <TabsTrigger value="agreement">Draft Agreement</TabsTrigger>
                                    <TabsTrigger value="technical">Technical Details</TabsTrigger>
                                </TabsList>
                                <TabsContent value="term-sheet" className="pt-4">
                                    <ReactMarkdown className="prose prose-sm max-w-none">{result.termSheet}</ReactMarkdown>
                                </TabsContent>
                                <TabsContent value="agreement" className="pt-4">
                                    <ReactMarkdown className="prose prose-sm max-w-none">{result.agreement}</ReactMarkdown>
                                </TabsContent>
                                <TabsContent value="technical" className="pt-4 space-y-6">
                                    {result.assumptions && (
                                        <div>
                                            <h3 className="font-semibold mb-2 flex items-center gap-2"><Lightbulb className="w-4 h-4 text-blue-500"/>Assumptions & Open Questions</h3>
                                            <ReactMarkdown className="prose prose-sm max-w-none bg-blue-50 p-3 rounded-lg border border-blue-200">{result.assumptions}</ReactMarkdown>
                                        </div>
                                    )}
                                    {result.risks && (
                                        <div>
                                            <h3 className="font-semibold mb-2 flex items-center gap-2"><AlertTriangle className="w-4 h-4 text-orange-500"/>Risk Flags</h3>
                                            <ReactMarkdown className="prose prose-sm max-w-none bg-orange-50 p-3 rounded-lg border border-orange-200">{result.risks}</ReactMarkdown>
                                        </div>
                                    )}
                                    {result.json && (
                                        <div>
                                            <h3 className="font-semibold mb-2">TERMS_JSON</h3>
                                            <pre className="bg-gray-800 text-white p-4 rounded-lg text-xs overflow-auto">
                                                {JSON.stringify(result.json, null, 2)}
                                            </pre>
                                        </div>
                                    )}
                                </TabsContent>
                            </Tabs>
                        </CardContent>
                    </Card>
                )}

                {/* Deal Tracker */}
                <DealTracker 
                    deals={deals}
                    onSelectDeal={handleSelectDeal}
                    onUpdateStatus={handleUpdateDealStatus}
                    onDeleteDeal={handleDeleteDeal}
                />
            </div>
        </div>
    );
}
