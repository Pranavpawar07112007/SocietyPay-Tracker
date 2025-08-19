"use client";

import * as React from 'react';
import { useState, useEffect, useMemo } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { format, getYear } from 'date-fns';
import {
  TrendingUp,
  TrendingDown,
  Wallet,
  MoreHorizontal,
  Trash2,
  Pencil,
  CalendarIcon,
  Printer,
} from 'lucide-react';

import type { Payment, Expense } from '@/types';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Calendar } from '@/components/ui/calendar';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';

const expenseSchema = z.object({
  description: z.string().min(1, 'Description is required.'),
  amount: z.coerce
    .number({ invalid_type_error: 'Please enter a valid amount.' })
    .positive({ message: 'Amount must be greater than 0.' }),
  date: z.date({
    required_error: 'An expense date is required.',
  }),
});

export default function Dashboard() {
  const { toast } = useToast();
  const [payments, setPayments] = useState<Payment[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isExpenseDialogOpen, setIsExpenseDialogOpen] = useState(false);
  const [editingExpense, setEditingExpense] = useState<Expense | null>(null);
  const [expenseToDelete, setExpenseToDelete] = useState<Expense | null>(null);

  const expenseForm = useForm<z.infer<typeof expenseSchema>>({
    resolver: zodResolver(expenseSchema),
    defaultValues: {
      description: '',
      amount: '' as any,
    }
  });

    useEffect(() => {
        setIsLoading(true);
        try {
            const storedPayments = localStorage.getItem('payments');
            const storedExpenses = localStorage.getItem('expenses');
            if (storedPayments) {
                setPayments(JSON.parse(storedPayments));
            }
            if (storedExpenses) {
                setExpenses(JSON.parse(storedExpenses));
            }
        } catch (error) {
            console.error("Failed to load data from localStorage", error);
            toast({
                variant: "destructive",
                title: "Error",
                description: "Could not load data from your browser's storage."
            });
        } finally {
            setIsLoading(false);
        }
    }, [toast]);

    useEffect(() => {
        try {
            localStorage.setItem('expenses', JSON.stringify(expenses));
        } catch (error) {
            console.error("Failed to save expenses to localStorage", error);
            toast({
                variant: "destructive",
                title: "Error",
                description: "Could not save expense data to your browser's storage."
            });
        }
    }, [expenses, toast]);

  useEffect(() => {
    if (isExpenseDialogOpen) {
        if (editingExpense) {
            expenseForm.reset({
                description: editingExpense.description,
                amount: editingExpense.amount,
                date: new Date(editingExpense.date),
            });
        } else {
            expenseForm.reset({
                description: '',
                amount: '' as any, // Use empty string for controlled input
                date: new Date(),
            });
        }
    }
  }, [isExpenseDialogOpen, editingExpense, expenseForm]);


  const totalCollection = useMemo(() => payments.reduce((acc, p) => acc + p.amount, 0), [payments]);
  const totalExpense = useMemo(() => expenses.reduce((acc, e) => acc + e.amount, 0), [expenses]);
  const netBalance = totalCollection - totalExpense;
  
  const handlePrint = () => {
    window.print();
  };

  const handleAddExpenseClick = () => {
    setEditingExpense(null);
    setIsExpenseDialogOpen(true);
  };

  const handleEditExpenseClick = (expense: Expense) => {
    setEditingExpense(expense);
    setIsExpenseDialogOpen(true);
  };
  
  const handleDeleteExpense = () => {
    if (!expenseToDelete) return;
    setExpenses(prev => prev.filter(e => e.id !== expenseToDelete.id));
    toast({
        title: 'Expense Deleted',
        description: 'The expense record has been successfully deleted.',
    });
    setExpenseToDelete(null);
  };

  const onExpenseSubmit = (values: z.infer<typeof expenseSchema>) => {
    const expenseData = { ...values, date: values.date.toISOString() };

    if (editingExpense) {
        setExpenses(prev => prev.map(e => e.id === editingExpense.id ? { ...expenseData, id: e.id } : e));
        toast({ title: 'Expense Updated' });
    } else {
        setExpenses(prev => [...prev, { ...expenseData, id: Date.now().toString() }]);
        toast({ title: 'Expense Added' });
    }
    
    setIsExpenseDialogOpen(false);
    setEditingExpense(null);
  }

  const sortedExpenses = useMemo(() => {
    return [...expenses].sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [expenses]);


  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Collection</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {isLoading ? <Skeleton className="h-8 w-32" /> : <div className="text-2xl font-bold">₹{totalCollection.toFixed(2)}</div>}
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Expenses</CardTitle>
            <TrendingDown className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {isLoading ? <Skeleton className="h-8 w-32" /> : <div className="text-2xl font-bold">₹{totalExpense.toFixed(2)}</div>}
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Net Balance</CardTitle>
            <Wallet className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
             {isLoading ? <Skeleton className="h-8 w-32" /> : <div className="text-2xl font-bold">₹{netBalance.toFixed(2)}</div>}
          </CardContent>
        </Card>
      </div>

      <div>
        <div className="flex justify-between items-center mb-4">
            <h2 className="text-2xl font-semibold">Expenses</h2>
            <div className="flex gap-2 print-hide">
              <Button onClick={handleAddExpenseClick}>Add Expense</Button>
              <Button onClick={handlePrint} variant="outline">
                  <Printer className="mr-2 h-4 w-4" />
                  Print Report
              </Button>
            </div>
        </div>
        <div className="rounded-md border table-print">
            <Table>
                <TableHeader>
                    <TableRow>
                        <TableHead>Description</TableHead>
                        <TableHead>Amount</TableHead>
                        <TableHead>Date</TableHead>
                        <TableHead className="text-right print-hide">Actions</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                {isLoading ? (
                    Array.from({ length: 3 }).map((_, i) => (
                        <TableRow key={i}>
                            <TableCell><Skeleton className="h-5 w-48" /></TableCell>
                            <TableCell><Skeleton className="h-5 w-24" /></TableCell>
                            <TableCell><Skeleton className="h-5 w-24" /></TableCell>
                            <TableCell className="text-right print-hide"><Skeleton className="h-8 w-8 ml-auto" /></TableCell>
                        </TableRow>
                    ))
                ) : sortedExpenses.length > 0 ? (
                    sortedExpenses.map((expense) => (
                        <TableRow key={expense.id}>
                            <TableCell className="font-medium">{expense.description}</TableCell>
                            <TableCell>₹{expense.amount.toFixed(2)}</TableCell>
                            <TableCell>{format(new Date(expense.date), 'PPP')}</TableCell>
                            <TableCell className="text-right print-hide">
                                <AlertDialog open={expenseToDelete?.id === expense.id} onOpenChange={(open) => !open && setExpenseToDelete(null)}>
                                    <DropdownMenu>
                                        <DropdownMenuTrigger asChild>
                                            <Button variant="ghost" className="h-8 w-8 p-0">
                                            <span className="sr-only">Open menu</span>
                                            <MoreHorizontal className="h-4 w-4" />
                                            </Button>
                                        </DropdownMenuTrigger>
                                        <DropdownMenuContent align="end">
                                            <DropdownMenuItem onClick={() => handleEditExpenseClick(expense)}>
                                                <Pencil className="mr-2 h-4 w-4" />
                                                Edit
                                            </DropdownMenuItem>
                                            <DropdownMenuItem className="text-red-600" onSelect={(e) => { e.preventDefault(); setExpenseToDelete(expense); }}>
                                                <Trash2 className="mr-2 h-4 w-4" />
                                                Delete
                                            </DropdownMenuItem>
                                        </DropdownMenuContent>
                                    </DropdownMenu>
                                    <AlertDialogContent>
                                        <AlertDialogHeader>
                                        <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                                        <AlertDialogDescription>
                                            This action cannot be undone. This will permanently delete the expense record for "{expenseToDelete?.description}".
                                        </AlertDialogDescription>
                                        </AlertDialogHeader>
                                        <AlertDialogFooter>
                                        <AlertDialogCancel onClick={() => setExpenseToDelete(null)}>Cancel</AlertDialogCancel>
                                        <AlertDialogAction onClick={handleDeleteExpense}>Delete</AlertDialogAction>
                                        </AlertDialogFooter>
                                    </AlertDialogContent>
                                </AlertDialog>
                            </TableCell>
                        </TableRow>
                    ))
                ) : (
                    <TableRow>
                        <TableCell colSpan={4} className="h-24 text-center">
                            No expenses recorded yet.
                        </TableCell>
                    </TableRow>
                )}
                </TableBody>
            </Table>
        </div>
      </div>

        <Dialog open={isExpenseDialogOpen} onOpenChange={(isOpen) => {
            setIsExpenseDialogOpen(isOpen);
            if (!isOpen) setEditingExpense(null);
        }}>
            <DialogContent className="sm:max-w-[425px]">
                <Form {...expenseForm}>
                    <form onSubmit={expenseForm.handleSubmit(onExpenseSubmit)} className="space-y-8">
                        <DialogHeader>
                            <DialogTitle>{editingExpense ? 'Edit' : 'Add'} Expense</DialogTitle>
                            <DialogDescription>
                                {editingExpense ? 'Update the details of the expense.' : 'Record a new expense for the society.'}
                            </DialogDescription>
                        </DialogHeader>
                        
                        <div className="grid gap-4 py-4">
                            <FormField
                                control={expenseForm.control}
                                name="description"
                                render={({ field }) => (
                                    <FormItem>
                                    <FormLabel>Description</FormLabel>
                                    <FormControl>
                                        <Input placeholder="e.g. Security Guard Salary" {...field} />
                                    </FormControl>
                                    <FormMessage />
                                    </FormItem>
                                )}
                            />
                            <FormField
                                control={expenseForm.control}
                                name="amount"
                                render={({ field }) => (
                                    <FormItem>
                                    <FormLabel>Amount(₹)</FormLabel>
                                    <FormControl>
                                        <Input placeholder="e.g. 10000" type="number" step="0.01" {...field} />
                                    </FormControl>
                                    <FormMessage />
                                    </FormItem>
                                )}
                            />
                            <FormField
                                control={expenseForm.control}
                                name="date"
                                render={({ field }) => (
                                    <FormItem className="flex flex-col">
                                    <FormLabel>Expense Date</FormLabel>
                                    <Popover>
                                        <PopoverTrigger asChild>
                                        <FormControl>
                                            <Button
                                            variant={"outline"}
                                            className={cn(
                                                "w-full pl-3 text-left font-normal",
                                                !field.value && "text-muted-foreground"
                                            )}
                                            >
                                            {field.value ? (
                                                format(field.value, "PPP")
                                            ) : (
                                                <span>Pick a date</span>
                                            )}
                                            <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                                        </FormControl>
                                        </PopoverTrigger>
                                        <PopoverContent className="w-auto p-0" align="start">
                                        <Calendar
                                            mode="single"
                                            selected={field.value}
                                            onSelect={field.onChange}
                                            captionLayout="dropdown-buttons"
                                            fromYear={getYear(new Date()) - 5}
                                            toYear={getYear(new Date())}
                                            disabled={(date) =>
                                            date > new Date() || date < new Date("2020-01-01")
                                            }
                                            initialFocus
                                        />
                                        </PopoverContent>
                                    </Popover>
                                    <FormMessage />
                                    </FormItem>
                                )}
                            />
                        </div>

                        <DialogFooter>
                            <Button type="button" variant="ghost" onClick={() => setIsExpenseDialogOpen(false)}>Cancel</Button>
                            <Button type="submit">Save Expense</Button>
                        </DialogFooter>
                    </form>
                </Form>
            </DialogContent>
        </Dialog>
    </div>
  );
}
