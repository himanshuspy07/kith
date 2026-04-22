'use server';
/**
 * @fileOverview AI Smart Reply Generator.
 * 
 * - generateSmartReplies - Generates context-aware suggested replies for chat.
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';

const SmartReplyInputSchema = z.object({
  history: z.array(z.object({
    role: z.enum(['user', 'model', 'system']),
    content: z.string(),
  })).describe('The recent message history of the conversation.'),
});
export type SmartReplyInput = z.infer<typeof SmartReplyInputSchema>;

const SmartReplyOutputSchema = z.object({
  suggestions: z.array(z.string()).length(3).describe('Three brief, helpful suggested replies.'),
});
export type SmartReplyOutput = z.infer<typeof SmartReplyOutputSchema>;

export async function generateSmartReplies(input: SmartReplyInput): Promise<SmartReplyOutput> {
  const response = await ai.generate({
    model: 'googleai/gemini-2.0-flash-exp',
    input: input,
    output: { schema: SmartReplyOutputSchema },
    system: 'You are a helpful chat assistant. Based on the conversation history provided, generate 3 short, natural-sounding, and contextually appropriate reply suggestions for the user. Keep them under 10 words each.',
    prompt: `Analyze this conversation history and provide 3 smart reply suggestions:
    
    {{#each history}}
    {{role}}: {{{content}}}
    {{/each}}`,
  });

  const output = response.output;
  if (!output) throw new Error('Failed to generate smart replies');
  return output;
}
