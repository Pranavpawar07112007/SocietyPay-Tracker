
'use server';
/**
 * @fileOverview A simple chatbot flow.
 *
 * - chat - A function that handles the chatbot conversation.
 */

import {ai} from '@/ai/genkit';
import {
  ChatInput,
  ChatInputSchema,
  ChatOutput,
  ChatOutputSchema,
  ExpenseSchema,
  MemberSchema,
  PaymentSchema,
} from '@/ai/schemas/chat-schema';
import { getExpenses, getMembers, getPayments } from '@/services/firestore';
import { z } from 'zod';

export async function chat(input: ChatInput): Promise<ChatOutput> {
  return chatFlow(input);
}

const listMembersTool = ai.defineTool(
    {
        name: 'listMembers',
        description: 'Get a list of all society members.',
        inputSchema: z.object({}),
        outputSchema: z.array(MemberSchema),
    },
    async () => {
        return await getMembers();
    }
);

const listPaymentsTool = ai.defineTool(
    {
        name: 'listPayments',
        description: 'Get a list of all maintenance payments made by members.',
        inputSchema: z.object({}),
        outputSchema: z.array(PaymentSchema),
    },
    async () => {
        return await getPayments();
    }
);

const listExpensesTool = ai.defineTool(
    {
        name: 'listExpenses',
        description: 'Get a list of all society expenses.',
        inputSchema: z.object({}),
        outputSchema: z.array(ExpenseSchema),
    },
    async () => {
        return await getExpenses();
    }
);

const chatFlow = ai.defineFlow(
  {
    name: 'chatFlow',
    inputSchema: ChatInputSchema,
    outputSchema: ChatOutputSchema,
  },
  async (input) => {

    const history = input.history.map((msg) => ({
      role: msg.role,
      content: [{text: msg.content}],
    }));

    const response = await ai.generate({
      model: 'googleai/gemini-2.0-flash',
      prompt: input.message,
      history: history,
      tools: [listMembersTool, listPaymentsTool, listExpensesTool],
      config: {
        // Just use a temperature of 0 for basic chat.
        temperature: 0,
      },
    });

    return response.text;
  }
);
