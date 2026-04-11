/**
 * Generate text trying providers in order: openai -> anthropic -> gemini -> groq.
 * Falls back on error. If a specific provider is requested, only that one is tried.
 */
export declare function generateText(prompt: string, systemPrompt?: string, provider?: string): Promise<string>;
/**
 * Returns an image URL (data URL). Uses OpenAI DALL-E 3 if configured,
 * otherwise returns a placeholder gradient SVG as a data URL.
 */
export declare function generateCover(prompt: string): Promise<string>;
export declare function structureText(rawText: string): Promise<{
    sections: Array<{
        title: string;
        content: string;
    }>;
}>;
export declare function improveText(text: string, instruction: string): Promise<string>;
export declare function editSelectionText(text: string, mode: string, instruction?: string): Promise<{
    editedText: string;
    mode: string;
    mock: boolean;
    provider: string;
}>;
export declare function suggestPrice(title: string, description: string, wordCount: number): Promise<{
    min: number;
    max: number;
    recommended: number;
}>;
