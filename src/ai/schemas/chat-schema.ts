import {z} from 'zod';

/**
 * @fileOverview Zod schemas and TypeScript types for the chatbot functionality.
 *
 * - ChatInputSchema - The Zod schema for the chat function's input.
 * - ChatInput - The TypeScript type inferred from the ChatInputSchema.
 * - ChatOutputSchema - The Zod schema for the chat function's output.
 * - ChatOutput - The TypeScript type inferred from the ChatOutputSchema.
 */

const MessageSchema = z.object({
  role: z.enum(['user', 'model']),
  content: z.string(),
});

export const ChatInputSchema = z.object({
  history: z.array(MessageSchema),
  message: z.string(),
});
export type ChatInput = z.infer<typeof ChatInputSchema>;

export const ChatOutputSchema = z.string();
export type ChatOutput = z.infer<typeof ChatOutputSchema>;
