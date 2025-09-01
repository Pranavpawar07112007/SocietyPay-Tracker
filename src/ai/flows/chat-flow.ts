
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
import { getExpenses, getMembers, getPayments, addMember, updateMember, deleteMember, addPayment, updatePayment, deletePayment, addExpense, deleteExpense } from '@/services/firestore';
import { z } from 'zod';
import { getMonth, getYear } from 'date-fns';

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

const addMemberTool = ai.defineTool(
    {
        name: 'addMember',
        description: 'Add a new society member.',
        inputSchema: MemberSchema.omit({ id: true }),
        outputSchema: MemberSchema,
    },
    async (member) => {
        return await addMember(member);
    }
);

const updateMemberTool = ai.defineTool(
    {
        name: 'updateMember',
        description: 'Update an existing society member.',
        inputSchema: z.object({ id: z.string(), data: MemberSchema.partial() }),
        outputSchema: z.void(),
    },
    async ({id, data}) => {
        return await updateMember(id, data);
    }
);

const deleteMemberTool = ai.defineTool(
    {
        name: 'deleteMember',
        description: 'Delete a society member.',
        inputSchema: z.object({ id: z.string() }),
        outputSchema: z.void(),
    },
    async ({id}) => {
        return await deleteMember(id);
    }
);

const listPaymentsTool = ai.defineTool(
    {
        name: 'listPayments',
        description: 'Get a list of all maintenance payments made by members.',
        inputSchema: z.object({
            month: z.number().optional().describe("The month to filter by (1-12)."),
            year: z.number().optional().describe("The year to filter by (e.g., 2024).")
        }),
        outputSchema: z.array(PaymentSchema),
    },
    async ({ month, year }) => {
        const allPayments = await getPayments();
        if (!month && !year) {
            return allPayments;
        }

        const currentYear = new Date().getFullYear();
        const filterYear = year || currentYear;

        return allPayments.filter(payment => {
            const paymentDate = new Date(payment.date);
            const paymentYear = getYear(paymentDate);
            const paymentMonth = getMonth(paymentDate) + 1; // date-fns is 0-indexed

            const yearMatch = paymentYear === filterYear;
            const monthMatch = month ? paymentMonth === month : true;

            return yearMatch && monthMatch;
        });
    }
);

const addPaymentTool = ai.defineTool(
    {
        name: 'addPayment',
        description: 'Add a new payment record.',
        inputSchema: PaymentSchema.omit({ id: true }),
        outputSchema: PaymentSchema,
    },
    async (payment) => {
        return await addPayment(payment);
    }
);

const updatePaymentTool = ai.defineTool(
    {
        name: 'updatePayment',
        description: 'Update an existing payment record.',
        inputSchema: z.object({ id: z.string(), data: PaymentSchema.partial() }),
        outputSchema: z.void(),
    },
    async ({id, data}) => {
        return await updatePayment(id, data);
    }
);

const deletePaymentTool = ai.defineTool(
    {
        name: 'deletePayment',
        description: 'Delete a payment record.',
        inputSchema: z.object({ id: z.string() }),
        outputSchema: z.void(),
    },
    async ({id}) => {
        return await deletePayment(id);
    }
);

const listExpensesTool = ai.defineTool(
    {
        name: 'listExpenses',
        description: 'Get a list of all society expenses.',
        inputSchema: z.object({
            month: z.number().optional().describe("The month to filter by (1-12)."),
            year: z.number().optional().describe("The year to filter by (e.g., 2024).")
        }),
        outputSchema: z.array(ExpenseSchema),
    },
    async ({ month, year }) => {
        const allExpenses = await getExpenses();
        if (!month && !year) {
            return allExpenses;
        }

        const currentYear = new Date().getFullYear();
        const filterYear = year || currentYear;

        return allExpenses.filter(expense => {
            const expenseDate = new Date(expense.date);
            const expenseYear = getYear(expenseDate);
            const expenseMonth = getMonth(expenseDate) + 1; // date-fns is 0-indexed

            const yearMatch = expenseYear === filterYear;
            const monthMatch = month ? expenseMonth === month : true;

            return yearMatch && monthMatch;
        });
    }
);

const addExpenseTool = ai.defineTool(
    {
        name: 'addExpense',
        description: 'Add a new expense record.',
        inputSchema: ExpenseSchema.omit({ id: true }),
        outputSchema: ExpenseSchema,
    },
    async (expense) => {
        return await addExpense(expense);
    }
);

const deleteExpenseTool = ai.defineTool(
    {
        name: 'deleteExpense',
        description: 'Delete an expense record.',
        inputSchema: z.object({ id: z.string() }),
        outputSchema: z.void(),
    },
    async ({id}) => {
        return await deleteExpense(id);
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
      tools: [
        listMembersTool,
        addMemberTool,
        updateMemberTool,
        deleteMemberTool,
        listPaymentsTool,
        addPaymentTool,
        updatePaymentTool,
        deletePaymentTool,
        listExpensesTool,
        addExpenseTool,
        deleteExpenseTool,
      ],
      config: {
        // Just use a temperature of 0 for basic chat.
        temperature: 0,
      },
    });

    return response.text;
  }
);
