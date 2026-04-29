
import { createClientFromRequest } from 'npm:@base44/sdk@0.7.1';

Deno.serve(async (req) => {
    try {
        // Authenticate user
        const base44 = createClientFromRequest(req);
        const user = await base44.auth.me();
        if (!user) {
            return Response.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { markdownContent, fileName } = await req.json();

        if (!markdownContent) {
            return Response.json({ error: 'markdownContent is required' }, { status: 400 });
        }

        // Convert Markdown to clean plain text
        const plainTextContent = convertMarkdownToPlainText(markdownContent);

        const safeFileName = (fileName || 'agreement').replace(/[^a-z0-9_ -]/gi, '_');

        return new Response(plainTextContent, {
            status: 200,
            headers: {
                'Content-Type': 'text/plain; charset=utf-8',
                'Content-Disposition': `attachment; filename="${safeFileName}.txt"`,
            },
        });

    } catch (error) {
        console.error('Text file generation error:', error);
        return Response.json({ error: error.message }, { status: 500 });
    }
});

function convertMarkdownToPlainText(markdown) {
    let text = markdown;

    // Remove headers but keep the text
    text = text.replace(/^(#+)\s/gm, '');

    // Remove bold and italic formatting but keep the text (handle bold first to avoid conflicts)
    text = text.replace(/\*\*\*(.*?)\*\*\*/g, '$1'); // Bold italic
    text = text.replace(/\*\*(.*?)\*\*/g, '$1'); // Bold
    text = text.replace(/\*(.*?)\*/g, '$1'); // Italic

    // Remove underline formatting
    text = text.replace(/__(.*?)__/g, '$1');
    text = text.replace(/_(.*?)_/g, '$1');
    
    // Handle bullet points by replacing them with a dash
    text = text.replace(/^\s*[-*]\s/gm, '- ');

    // Remove any remaining HTML tags just in case
    text = text.replace(/<[^>]*>/g, '');

    // Remove any remaining asterisks that might be left over
    text = text.replace(/\*/g, '');

    // Normalize line breaks
    text = text.replace(/\r\n/g, '\n');
    
    // Clean up extra spaces
    text = text.replace(/\s+/g, ' ');
    text = text.replace(/\n\s+/g, '\n');

    return text;
}
