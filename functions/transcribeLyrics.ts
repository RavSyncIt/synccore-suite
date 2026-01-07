import { createClientFromRequest } from 'npm:@base44/sdk@0.7.1';

export async function transcribeLyrics({ audioUrl }) {
    // This is a wrapper function that can be called from the frontend
    const response = await fetch('/api/functions/transcribeLyrics', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({ audioUrl })
    });
    
    if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Transcription failed');
    }
    
    return await response.json();
}

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        const user = await base44.auth.me();

        if (!user) {
            return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: { 'Content-Type': 'application/json' } });
        }

        const { audioUrl } = await req.json();

        if (!audioUrl) {
            return new Response(JSON.stringify({ error: 'audioUrl is required' }), { status: 400, headers: { 'Content-Type': 'application/json' } });
        }

        const userData = await base44.asServiceRole.entities.User.get(user.id);
        const gladiaToken = userData?.gladiaToken;

        if (!gladiaToken) {
            return new Response(JSON.stringify({ error: 'Gladia API key is not configured. Please add it in Settings.' }), { status: 400, headers: { 'Content-Type': 'application/json' } });
        }

        const GLADIA_API_UPLOAD = 'https://api.gladia.io/v2/upload';
        const GLADIA_API_TRANSCRIBE = 'https://api.gladia.io/v2/pre-recorded';

        // --- Step 1: Upload the audio file to Gladia ---
        
        console.log(`Attempting to download file from: ${audioUrl}`);
        
        // Add timeout and better error handling for file download
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 60000); // 60 second timeout
        
        const localAudioResponse = await fetch(audioUrl, {
            signal: controller.signal,
            headers: {
                'User-Agent': 'Mozilla/5.0 (compatible; SyncIt/1.0)'
            }
        });
        
        clearTimeout(timeoutId);
        
        if (!localAudioResponse.ok) {
            return new Response(JSON.stringify({ 
                error: `Failed to access the audio file: ${localAudioResponse.status} ${localAudioResponse.statusText}` 
            }), { status: 400, headers: { 'Content-Type': 'application/json' } });
        }
        
        const audioBlob = await localAudioResponse.blob();
        console.log(`File downloaded successfully, size: ${audioBlob.size} bytes`);

        // Create form data for the upload
        const formData = new FormData();
        formData.append('audio', audioBlob, 'audio.mp3');

        // Upload the file to Gladia
        const uploadResponse = await fetch(GLADIA_API_UPLOAD, {
            method: 'POST',
            headers: { 'x-gladia-key': gladiaToken },
            body: formData,
        });

        if (!uploadResponse.ok) {
            let errorData;
            try {
                errorData = await uploadResponse.json();
            } catch (jsonError) {
                errorData = { message: `Gladia Upload API returned non-JSON error or empty response. Status: ${uploadResponse.status}` };
            }
            return new Response(JSON.stringify({ 
                error: `Gladia Upload Error: ${errorData.message || 'Unknown error'}` 
            }), { status: 400, headers: { 'Content-Type': 'application/json' } });
        }

        const uploadData = await uploadResponse.json();
        const gladiaAudioUrl = uploadData.audio_url;

        // --- Step 2: Request the transcription ---

        const transcribeResponse = await fetch(GLADIA_API_TRANSCRIBE, {
            method: 'POST',
            headers: {
                'x-gladia-key': gladiaToken,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                audio_url: gladiaAudioUrl,
                detect_language: true
            }),
        });

        if (!transcribeResponse.ok) {
            let errorData;
            try {
                errorData = await transcribeResponse.json();
            } catch (jsonError) {
                errorData = { message: `Gladia Transcribe API returned non-JSON error or empty response. Status: ${transcribeResponse.status}` };
            }
            return new Response(JSON.stringify({ 
                error: `Gladia Transcription Request Error: ${errorData.message || 'Unknown error'}` 
            }), { status: 400, headers: { 'Content-Type': 'application/json' } });
        }

        const transcribeData = await transcribeResponse.json();
        const resultUrl = transcribeData.result_url;

        if (!resultUrl) {
            return new Response(JSON.stringify({ 
                error: 'Failed to get result_url from transcription request.' 
            }), { status: 400, headers: { 'Content-Type': 'application/json' } });
        }

        // --- Step 3: Poll for the result ---

        let attempts = 0;
        const maxAttempts = 60; // 5 minutes max (60 attempts * 5 seconds/attempt)

        while (attempts < maxAttempts) {
            const pollingResponse = await fetch(resultUrl, {
                headers: { 'x-gladia-key': gladiaToken },
            });

            if (!pollingResponse.ok) {
                let errorData;
                try {
                    errorData = await pollingResponse.json();
                } catch (jsonError) {
                    errorData = { message: `Gladia Polling API returned non-JSON error or empty response. Status: ${pollingResponse.status}` };
                }
                return new Response(JSON.stringify({ 
                    error: `Polling Error: ${errorData.message || 'Unknown error'}` 
                }), { status: 400, headers: { 'Content-Type': 'application/json' } });
            }

            const pollingData = await pollingResponse.json();
            
            if (pollingData.status === 'done') {
                const lyrics = pollingData.result?.transcription?.full_transcript || 'Lyrics could not be transcribed.';
                return new Response(JSON.stringify(lyrics), { 
                    status: 200, 
                    headers: { 'Content-Type': 'application/json' } 
                });
            } else if (pollingData.status === 'error') {
                return new Response(JSON.stringify({ 
                    error: `Transcription failed: ${pollingData.error || 'Unknown error'}` 
                }), { status: 400, headers: { 'Content-Type': 'application/json' } });
            }

            await new Promise(resolve => setTimeout(resolve, 5000));
            attempts++;
        }

        return new Response(JSON.stringify({ 
            error: 'Transcription timed out after 5 minutes' 
        }), { status: 408, headers: { 'Content-Type': 'application/json' } });

    } catch (error) {
        console.error('Gladia transcription function error:', error);
        
        if (error.name === 'AbortError') {
            return new Response(JSON.stringify({ 
                error: 'File download timed out after 60 seconds' 
            }), { status: 408, headers: { 'Content-Type': 'application/json' } });
        }
        
        return new Response(JSON.stringify({ 
            error: `Lyrics transcription failed: ${error.message}` 
        }), { status: 500, headers: { 'Content-Type': 'application/json' } });
    }
});