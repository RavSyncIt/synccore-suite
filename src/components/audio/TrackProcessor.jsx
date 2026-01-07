
import { User } from "@/entities/User";
import { Tag } from "@/entities/Tag";
import { AudioTrack } from "@/entities/AudioTrack";
import { InvokeLLM } from "@/integrations/Core";

class TrackProcessor {
    constructor() {
        this.CYANITE_GRAPHQL = "https://api.cyanite.ai/graphql";
        // Add a queue system for lyrics transcription
        this.lyricsQueue = [];
        this.activeLyricsRequests = 0;
        this.maxConcurrentLyrics = 2; // Keep under Gladia's limit of 3
    }

    async getCyaniteToken() {
        const user = await User.me();
        if (!user?.cyaniteToken) {
            throw new Error("API token not configured. Please add it in Settings.");
        }
        return user.cyaniteToken;
    }

    async cyaniteGQL(query, variables = {}) {
        const token = await this.getCyaniteToken();
        const response = await fetch(this.CYANITE_GRAPHQL, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ query, variables })
        });

        const data = await response.json();
        if (data.errors) {
            throw new Error(`API Error: ${data.errors[0].message}`);
        }
        return data.data;
    }

    async requestFileUpload() {
        const query = `
            mutation {
                fileUploadRequest {
                    id
                    uploadUrl
                }
            }
        `;
        const result = await this.cyaniteGQL(query);
        return result.fileUploadRequest;
    }

    async uploadToCyanite(uploadUrl, fileUrl) {
        try {
            console.log(`Attempting to fetch file from: ${fileUrl}`);
            
            // Add timeout and better error handling for file fetch
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 30000); // 30 second timeout
            
            const fileResponse = await fetch(fileUrl, {
                signal: controller.signal,
                headers: {
                    'User-Agent': 'Mozilla/5.0 (compatible; SyncIt/1.0)'
                }
            });
            
            clearTimeout(timeoutId);
            
            if (!fileResponse.ok) {
                throw new Error(`Failed to fetch file: ${fileResponse.status} ${fileResponse.statusText}`);
            }
            
            const fileBlob = await fileResponse.blob();
            console.log(`File fetched successfully, size: ${fileBlob.size} bytes`);
            
            // Upload to Cyanite's presigned URL
            const uploadResponse = await fetch(uploadUrl, {
                method: 'PUT',
                body: fileBlob,
                headers: {
                    'Content-Type': 'audio/mpeg'
                }
            });

            if (!uploadResponse.ok) {
                throw new Error(`Upload failed with status: ${uploadResponse.status}`);
            }

            return true;
        } catch (error) {
            if (error.name === 'AbortError') {
                throw new Error('File fetch timed out after 30 seconds');
            }
            throw new Error(`File upload failed: ${error.message}`);
        }
    }

    async createLibraryTrack(uploadId, title) {
        const query = `
            mutation LibraryTrackCreate($input: LibraryTrackCreateInput!) {
                libraryTrackCreate(input: $input) {
                    __typename
                    ... on LibraryTrackCreateSuccess {
                        createdLibraryTrack { 
                            id 
                            title 
                        }
                    }
                    ... on LibraryTrackCreateError {
                        code
                        message
                    }
                }
            }
        `;

        const variables = {
            input: { 
                uploadId, 
                title: title || "Untitled Track"
            }
        };

        const result = await this.cyaniteGQL(query, variables);
        const response = result.libraryTrackCreate;
        
        if (response.__typename !== "LibraryTrackCreateSuccess") {
            throw new Error(`Track creation failed: ${response.message} (${response.code})`);
        }
        
        return response.createdLibraryTrack.id;
    }

    async fetchAnalysis(trackId) {
        const query = `
            query LibraryTrackQuery($id: ID!) {
                libraryTrack(id: $id) {
                    __typename
                    ... on LibraryTrack {
                        id
                        title
                        audioAnalysisV7 {
                            __typename
                            ... on AudioAnalysisV7Finished {
                                result {
                                    bpmPrediction { 
                                        value 
                                        confidence 
                                    }
                                    keyPrediction { 
                                        value 
                                        confidence 
                                    }
                                    energyLevel
                                    energyDynamics
                                    moodTags
                                    moodAdvancedTags
                                    advancedGenreTags
                                    advancedSubgenreTags
                                    instrumentTags
                                    advancedInstrumentTags
                                    voiceoverExists
                                    voiceoverDegree
                                }
                            }
                            ... on AudioAnalysisV7Processing { 
                                __typename 
                            }
                            ... on AudioAnalysisV7NotStarted { 
                                __typename 
                            }
                        }
                    }
                    ... on LibraryTrackNotFoundError {
                        __typename
                    }
                }
            }
        `;

        const result = await this.cyaniteGQL(query, { id: trackId });
        return result.libraryTrack;
    }

    async processLyricsQueue() {
        while (this.lyricsQueue.length > 0 && this.activeLyricsRequests < this.maxConcurrentLyrics) {
            const { track, transcribeLyricsFn, resolve, reject } = this.lyricsQueue.shift();
            this.activeLyricsRequests++;
            
            this.performLyricsTranscription(track, transcribeLyricsFn)
                .then(resolve)
                .catch(async (error) => {
                    console.error(`Lyrics transcription failed for ${track.fileName}:`, error);
                    await AudioTrack.update(track.id, { status: "failed", errorMessage: error.message });
                    reject(error);
                })
                .finally(() => {
                    this.activeLyricsRequests--;
                    // Process next item in queue after a short delay
                    setTimeout(() => this.processLyricsQueue(), 1000);
                });
        }
    }

    async performLyricsTranscription(track, transcribeLyricsFn) {
        const user = await User.me();
        if (!user.gladiaToken) {
            console.warn("Gladia.io token not set, skipping lyrics transcription.");
            return; 
        }
        
        await AudioTrack.update(track.id, { status: "transcribing", errorMessage: null });
        
        // Add retry logic for concurrent request limits
        let retries = 5;
        let delay = 3000; // Start with 3 second delay
        
        while (retries > 0) {
            try {
                const response = await transcribeLyricsFn({ audioUrl: track.fileUrl });
                const lyrics = response.data;
                await AudioTrack.update(track.id, { lyrics });
                console.log(`Lyrics transcription completed for: ${track.fileName}`);
                return;
            } catch (error) {
                if (error.message && error.message.includes('Max concurrent requests')) {
                    console.log(`Concurrent request limit hit for ${track.fileName}, retrying in ${delay/1000} seconds...`);
                    retries--;
                    if (retries > 0) {
                        await new Promise(resolve => setTimeout(resolve, delay));
                        delay = Math.min(delay * 1.5, 15000); // Exponential backoff, max 15 seconds
                        continue;
                    }
                }
                throw error;
            }
        }
        
        throw new Error('Max retries reached for lyrics transcription');
    }

    async processTrackStep1_Lyrics(track, transcribeLyricsFn) {
        console.log(`Queueing lyrics transcription for: ${track.fileName}`);
        
        return new Promise((resolve, reject) => {
            this.lyricsQueue.push({
                track,
                transcribeLyricsFn,
                resolve,
                reject
            });
            
            // Start processing the queue
            this.processLyricsQueue();
        });
    }

    async processTrackStep2_CyaniteUpload(track) {
        console.log(`Starting analysis for: ${track.fileName}`);
        
        try {
            // Step 1: Upload to Cyanite and start analysis
            await AudioTrack.update(track.id, { status: "analyzing", errorMessage: null });

            // Request upload URL
            const uploadRequest = await this.requestFileUpload();
            console.log('Got upload request:', uploadRequest.id);

            // Upload file to Cyanite
            await this.uploadToCyanite(uploadRequest.uploadUrl, track.fileUrl);
            console.log('File uploaded successfully');
            
            // Create library track
            const cyaniteTrackId = await this.createLibraryTrack(
                uploadRequest.id, 
                track.title || track.fileName.replace(/\.(mp3|wav|flac|m4a|aac)$/i, '')
            );
            
            console.log('Library track created:', cyaniteTrackId);

            await AudioTrack.update(track.id, { 
                cyaniteTrackId,
                status: "analyzing"
            });

            return cyaniteTrackId;
        } catch (error) {
            console.error('Step 2 (Cyanite Upload) failed:', error);
            await AudioTrack.update(track.id, { status: "failed", errorMessage: error.message });
            throw error;
        }
    }

    async processTrackStep3_CyaniteAnalysis(track) {
        console.log(`Waiting for analysis: ${track.fileName}`);
        
        try {
            // Fetch the latest track data to get the cyaniteTrackId
            const updatedTrackData = await AudioTrack.list();
            const currentTrack = updatedTrackData.find(t => t.id === track.id);
            
            if (!currentTrack || !currentTrack.cyaniteTrackId) {
                throw new Error("Track ID not found. Step 2 may have failed or not completed successfully.");
            }

            console.log(`Using Cyanite track ID: ${currentTrack.cyaniteTrackId}`);

            // Step 2: Wait for analysis and fetch results
            let attempts = 0;
            const maxAttempts = 120; // 10 minutes max
            const pollInterval = 5000; // 5 seconds

            while (attempts < maxAttempts) {
                const analysis = await this.fetchAnalysis(currentTrack.cyaniteTrackId);
                
                if (analysis.__typename === "LibraryTrackNotFoundError") {
                    throw new Error("Track not found in library. The Cyanite track may have expired or been deleted.");
                }
                
                const analysisStatus = analysis.audioAnalysisV7.__typename;
                console.log(`Analysis status: ${analysisStatus}, attempt: ${attempts + 1}`);
                
                if (analysisStatus === "AudioAnalysisV7Finished") {
                    const rawMetadata = this.mapCyaniteResults(analysis.audioAnalysisV7.result);
                    await AudioTrack.update(track.id, { 
                        rawMetadata,
                        status: "cleaning",
                        errorMessage: null
                    });
                    console.log('Analysis completed');
                    return rawMetadata;
                }
                
                await new Promise(resolve => setTimeout(resolve, pollInterval));
                attempts++;
            }

            throw new Error("Analysis timed out after 10 minutes");
        } catch (error) {
            console.error('Step 3 (Cyanite Analysis) failed:', error);
            await AudioTrack.update(track.id, { status: "failed", errorMessage: error.message });
            throw error;
        }
    }

    mapCyaniteResults(v7Result) {
        return {
            tempo: v7Result.bpmPrediction?.value,
            keyPrediction: v7Result.keyPrediction,
            energyLevel: v7Result.energyLevel,
            energyDynamics: v7Result.energyDynamics,
            genre: v7Result.advancedGenreTags,
            subgenre: v7Result.advancedSubgenreTags,
            moodTags: v7Result.moodTags,
            moodAdvancedTags: v7Result.moodAdvancedTags,
            instrumentTags: v7Result.instrumentTags || v7Result.advancedInstrumentTags,
            voiceoverExists: v7Result.voiceoverExists,
            voiceoverDegree: v7Result.voiceoverDegree
        };
    }

    async processTrackStep4_Clean(track) {
        console.log(`Cleaning metadata for: ${track.fileName}`);
        
        try {
            // Fetch the latest track data to get the rawMetadata
            const updatedTrackData = await AudioTrack.list();
            const currentTrack = updatedTrackData.find(t => t.id === track.id);
            
            if (!currentTrack || !currentTrack.rawMetadata) {
                throw new Error("Raw metadata not found. Step 3 may have failed or not completed successfully.");
            }

            // Step 3: Clean and enhance metadata with AI
            const rawMetadata = currentTrack.rawMetadata;
            
            // Parse filename for artist/title using a more robust regex
            const fileName = track.fileName.replace(/\.(mp3|wav|flac|m4a|aac)$/i, '');
            let artist = null, title = fileName;
            
            const parts = fileName.split(/\s*-\s*/);
            if (parts.length > 1) {
                artist = parts[0].trim();
                title = parts.slice(1).join(' - ').trim();
            }

            const cleanedMetadata = {
                title: title,
                artist: artist,
                genre: this.extractTopTags(rawMetadata.genre),
                subgenres: this.extractTopTags(rawMetadata.subgenre),
                moodTags: this.extractTopTags(rawMetadata.moodTags),
                moodAdvancedTags: this.extractTopTags(rawMetadata.moodAdvancedTags),
                tempoBPM: rawMetadata.tempo,
                key: rawMetadata.keyPrediction?.value,
                energyLevel: rawMetadata.energyLevel,
                energyDynamics: rawMetadata.energyDynamics,
                instrumentTags: this.extractTopTags(rawMetadata.instrumentTags),
                vocals: rawMetadata.voiceoverExists ? "yes" : "no",
                voiceGender: rawMetadata.voiceoverDegree > 0.5 ? "mixed" : "unknown"
            };

            // Use AI to enhance missing fields
            const enhancedMetadata = await this.enhanceMetadataWithAI(cleanedMetadata);
            
            await AudioTrack.update(track.id, { 
                cleanedMetadata: enhancedMetadata,
                status: "describing",
                errorMessage: null
            });

            console.log('Metadata cleaned and enhanced');
            return enhancedMetadata;
        } catch (error) {
            console.error('Step 4 (Clean) failed:', error);
            await AudioTrack.update(track.id, { status: "failed", errorMessage: error.message });
            throw error;
        }
    }

    extractTopTags(tagDict) {
        if (!tagDict) return [];
        if (Array.isArray(tagDict)) return tagDict;
        if (typeof tagDict === 'object') {
            return Object.entries(tagDict)
                .sort(([,a], [,b]) => b - a)
                .slice(0, 10) // Take top 10
                .map(([tag]) => tag);
        }
        return [];
    }

    async enhanceMetadataWithAI(metadata) {
        const prompt = `
        You are a music metadata expert. Given this track metadata, fill in missing sync-relevant fields:

        Current metadata:
        ${JSON.stringify(metadata, null, 2)}

        Please provide ONLY a JSON response with these additional fields:
        - emotion: string (e.g., "happy", "melancholic", "energetic")  
        - emotionalDynamics: string (e.g., "building", "steady", "drops")
        - sceneSuggestions: array of strings (5-8 scene types this would suit)
        - similarArtists: array of strings (3-5 similar artists)
        - characterTags: array of strings (5-8 character descriptors)
        - movementTags: array of strings (3-5 movement/pacing descriptors)

        Base suggestions on the genre, mood, energy, and instruments provided.
        `;

        try {
            const response = await InvokeLLM({
                prompt,
                response_json_schema: {
                    type: "object",
                    properties: {
                        emotion: { type: "string" },
                        emotionalDynamics: { type: "string" },
                        sceneSuggestions: { type: "array", items: { type: "string" } },
                        similarArtists: { type: "array", items: { type: "string" } },
                        characterTags: { type: "array", items: { type: "string" } },
                        movementTags: { type: "array", items: { type: "string" } }
                    }
                }
            });

            return { ...metadata, ...response };
        } catch (error) {
            console.error('AI enhancement failed:', error);
            // Return original metadata if AI enhancement fails
            return metadata;
        }
    }

    async processTrackStep5_Describe(track) {
        console.log(`Generating description for: ${track.fileName}`);
        
        try {
            const updatedTrackData = await AudioTrack.list();
            const currentTrack = updatedTrackData.find(t => t.id === track.id);
            
            if (!currentTrack || !currentTrack.cleanedMetadata) {
                throw new Error("Cleaned metadata not found. Step 4 may have failed or not completed successfully.");
            }

            const metadata = currentTrack.cleanedMetadata;
            const tags = await Tag.list();
            const customTags = tags.map(t => t.tag);

            // Add lyrics to the prompt if they exist
            let prompt = `
                You are a sync music supervisor and music journalist writing cinematic, emotionally evocative, and visually rich descriptions of songs for music supervisors, editors, and creative directors.

                Track title: "${metadata.title}"
                Artist: ${metadata.artist || "Unknown Artist"}
                Genre: ${metadata.genre?.join(", ") || ""}
                Mood tags: ${metadata.moodTags?.join(", ") || ""}
                Scene suggestions: ${metadata.sceneSuggestions?.join(", ") || ""}
                Instruments: ${metadata.instrumentTags?.join(", ") || ""}
                Associated sync tags: ${customTags.join(", ")}
            `;

            if (currentTrack.lyrics) {
                prompt += `\n\nLyrics:\n${currentTrack.lyrics}`;
            }

            prompt += `
                \n\nWrite a richly detailed, sync-optimized description of this track in 8 to 10 cinematic sentences. If lyrics are provided, use their themes to inform the description. Weave 2 or 3 short, impactful quotes from the lyrics directly into the description to reinforce the song's message. Format the lyric quotes in italics. Focus on the sonic texture, mood, pacing, and evolution of the track.

                Reference the types of visual scenes this song would suit — such as high-end fashion campaigns, moody drama sequences, luxury product spots, sports montages, modern romance trailers, late-night driving scenes, or stylized ads. Mention how the emotion or energy of the track aligns with those visual moods.

                Avoid generic phrases like "This track features..." or "This song is great for...". Do not list metadata. Think like a sync curator and music storyteller, painting a compelling, sync-driven picture that helps creatives imagine exactly where and how this song belongs on screen.
            `;

            const description = await InvokeLLM({ prompt });

            const finalMetadata = {
                ...metadata,
                description: description.trim()
            };

            await AudioTrack.update(track.id, { 
                finalMetadata,
                status: "complete",
                errorMessage: null
            });

            console.log('Description generated, track complete');
            return finalMetadata;
        } catch (error) {
            console.error('Step 5 (Describe) failed:', error);
            await AudioTrack.update(track.id, { status: "failed", errorMessage: error.message });
            throw error;
        }
    }
}

export default TrackProcessor;
