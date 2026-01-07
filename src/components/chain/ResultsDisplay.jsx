
import React from 'react';
import ReactMarkdown from 'react-markdown';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Card, CardContent, CardHeader, CardTitle as UiCardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Download, X } from 'lucide-react';

function parseMarkdown(markdownContent) {
    if (!markdownContent) {
        return {
            rightsJson: null,
            evidenceTable: null,
            findings: null,
            suggestedActions: null,
            disclaimer: null,
        };
    }
    const sections = {
        rightsJson: null,
        evidenceTable: null,
        findings: null,
        suggestedActions: null,
        disclaimer: null,
    };

    // Extract RIGHTS_JSON
    const jsonRegex = /```json\s*([\s\S]*?)\s*```/;
    const jsonMatch = markdownContent.match(jsonRegex);
    if (jsonMatch) {
        sections.rightsJson = jsonMatch[1];
    }

    // Extract other sections by headers
    const evidenceMatch = markdownContent.match(/###? EVIDENCE TABLE\s*([\s\S]*?)(?=\n###?|\n$)/);
    if (evidenceMatch) sections.evidenceTable = evidenceMatch[1].trim();
    
    const findingsMatch = markdownContent.match(/###? FINDINGS & CONFIDENCE\s*([\s\S]*?)(?=\n###?|\n$)/);
    if (findingsMatch) sections.findings = findingsMatch[1].trim();

    const gapsMatch = markdownContent.match(/###? (?:GAPS & NEXT STEPS|SUGGESTED ACTIONS)\s*([\s\S]*?)(?=\n###?|\n$)/);
    if (gapsMatch) sections.suggestedActions = gapsMatch[1].trim();
    
    const disclaimerMatch = markdownContent.match(/###? DISCLAIMER\s*([\s\S]*?)(?=\n###?|\n$)/);
    if (disclaimerMatch) sections.disclaimer = disclaimerMatch[1].trim();

    return sections;
}

function parseMarkdownTable(markdown) {
    if (!markdown) return { headers: [], rows: [] };
    const lines = markdown.split('\n').map(line => line.trim()).filter(Boolean);
    if (lines.length < 2) return { headers: [], rows: [] };

    const headers = lines[0].split('|').map(h => h.trim()).filter(h => h);
    const rows = lines.slice(2).map(line => {
        return line.split('|').map(cell => cell.trim()).filter((cell, index) => index < headers.length);
    });

    return { headers, rows };
}

const EvidenceTable = ({ markdown }) => {
    const { headers, rows } = parseMarkdownTable(markdown);

    if (headers.length === 0) {
        return <p className="text-sm text-gray-500">No evidence table provided.</p>;
    }

    const renderCell = (cell) => {
        const linkMatch = cell.match(/\[(.*?)\]\((.*?)\)/);
        if (linkMatch) {
            return (
                <a href={linkMatch[2]} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">
                    {linkMatch[1]}
                </a>
            );
        }
        return cell;
    };

    return (
        <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                    <tr>
                        {headers.map((header, index) => (
                            <th key={index} scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                {header}
                            </th>
                        ))}
                    </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                    {rows.map((row, rowIndex) => (
                        <tr key={rowIndex}>
                            {row.map((cell, cellIndex) => (
                                <td key={cellIndex} className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">
                                    {renderCell(cell)}
                                </td>
                            ))}
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
};


export default function ResultsDisplay({ markdownContent, onClose }) {
    const sections = parseMarkdown(markdownContent);

    let formattedJson = sections.rightsJson;
    let rightsJsonObject = null;
    if (sections.rightsJson) {
        try {
            rightsJsonObject = JSON.parse(sections.rightsJson);
            formattedJson = JSON.stringify(rightsJsonObject, null, 2);
        } catch (e) {
            formattedJson = sections.rightsJson;
        }
    }
    
    const handleDownload = (format) => {
        let content = '';
        let filename = 'syncchain_report';
        let mimeType = 'text/plain';

        const project = rightsJsonObject?.recording?.title || 'report';
        filename = `SyncChain_${project.replace(/ /g, '_')}`;

        if (format === 'json') {
            content = formattedJson;
            filename += '.json';
            mimeType = 'application/json';
        } else if (format === 'txt') {
            const { headers, rows } = parseMarkdownTable(sections.evidenceTable);
            let evidenceText = 'N/A';
            if (headers.length > 0) {
                evidenceText = [
                    headers.join('\t'), // Tab-separated headers
                    ...rows.map(row => row.map(cell => cell.replace(/\[(.*?)\]\(.*?\)/g, '$1')).join('\t')) // Tab-separated cells, link text only
                ].join('\n');
            }

            content = `
FINDINGS & CONFIDENCE
---------------------
${sections.findings || 'N/A'}

SUGGESTED ACTIONS
-----------------
${sections.suggestedActions || 'N/A'}

EVIDENCE
--------
${evidenceText}

DISCLAIMER
----------
${sections.disclaimer || 'N/A'}
            `.trim();
            filename += '.txt';
        } else if (format === 'csv') {
            const { headers, rows } = parseMarkdownTable(sections.evidenceTable);
            if (headers.length > 0) {
                const csvRows = [
                    headers.join(','),
                    ...rows.map(row => row.map(cell => {
                        const cellText = cell.replace(/\[(.*?)\]\(.*?\)/g, '$1'); // Keep only link text
                        return `"${cellText.replace(/"/g, '""')}"`;
                    }).join(','))
                ];
                content = csvRows.join('\n');
                filename += '_evidence.csv';
                mimeType = 'text/csv';
            } else {
                alert("No evidence table data to download as CSV.");
                return;
            }
        }

        const blob = new Blob([content], { type: mimeType });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    };

    const renderSection = (title, content, isMarkdown = true) => {
        if (!content) return null;
        return (
            <Card className="bg-white/90 backdrop-blur-sm border-0 shadow-lg">
                <CardHeader>
                    <UiCardTitle className="text-xl text-gray-800">{title}</UiCardTitle>
                </CardHeader>
                <CardContent>
                    {isMarkdown ? (
                        <ReactMarkdown className="prose prose-sm max-w-none">
                            {content}
                        </ReactMarkdown>
                    ) : (
                        content
                    )}
                </CardContent>
            </Card>
        );
    };

    return (
        <Dialog open={!!markdownContent} onOpenChange={(open) => !open && onClose()}>
            <DialogContent className="max-w-4xl max-h-[90vh] flex flex-col">
                <DialogHeader>
                    <div className="flex justify-between items-start">
                         <DialogTitle className="text-2xl text-gray-800">Search Results</DialogTitle>
                         <Button variant="ghost" size="icon" onClick={onClose} className=" -mt-2 -mr-2">
                             <X className="w-5 h-5" />
                         </Button>
                    </div>
                </DialogHeader>

                <div className="space-y-6 flex-1 overflow-y-auto p-1 pr-4 -mr-4">
                    <Card className="bg-white/90 backdrop-blur-sm border-0 shadow-lg">
                        <CardHeader className="flex flex-row items-center justify-between">
                            <UiCardTitle className="text-xl text-gray-800">RIGHTS_JSON</UiCardTitle>
                            <div className="flex items-center gap-2">
                                <Button variant="outline" size="sm" onClick={() => handleDownload('json')}>
                                    <Download className="w-4 h-4 mr-2" /> JSON
                                </Button>
                                <Button variant="outline" size="sm" onClick={() => handleDownload('txt')}>
                                    <Download className="w-4 h-4 mr-2" /> Text
                                </Button>
                                <Button variant="outline" size="sm" onClick={() => handleDownload('csv')}>
                                    <Download className="w-4 h-4 mr-2" /> CSV
                                </Button>
                            </div>
                        </CardHeader>
                        <CardContent>
                            <pre className="bg-gray-800 text-white p-4 rounded-lg text-xs overflow-auto max-h-96">
                                <code>{formattedJson}</code>
                            </pre>
                        </CardContent>
                    </Card>

                    {renderSection("Evidence Table", <EvidenceTable markdown={sections.evidenceTable} />, false)}
                    {renderSection("Findings & Confidence", sections.findings)}
                    {renderSection("Suggested Actions", sections.suggestedActions)}
                    {renderSection("Disclaimer", sections.disclaimer)}
                </div>
                 <DialogFooter className="pt-4">
                    <Button onClick={onClose}>Close</Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
