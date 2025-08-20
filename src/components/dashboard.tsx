
"use client";

import * as React from 'react';
import { useState, useEffect, useMemo, useTransition } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { format, getYear, getMonth } from 'date-fns';
import { IndianRupee, Trash2, CalendarIcon, PlusCircle, ArrowUpCircle, ArrowDownCircle, AlertCircle } from 'lucide-react';

import { getPayments } from '@/services/firestore';
import { addExpense, getExpenses, deleteExpense } from '@/services/firestore';
import type { Payment, Expense } from '@/types';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
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
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { useAuth } from '@/hooks/use-auth';

const expenseSchema = z.object({
  description: z.string().min(1, 'Description is required.'),
  amount: z.coerce.number().positive('Amount must be positive.'),
  date: z.string().refine((val) => !isNaN(Date.parse(val)), {
    message: "Please enter a valid date in YYYY-MM-DD format.",
  }),
});

const ALL_MONTHS = "all-months";
const ALL_YEARS = "all-years";

// This is the opening balance as of the start of tracking in this app.
const OPENING_BALANCE = 67689.94;

export default function Dashboard() {
  const { toast } = useToast();
  const { isEditor } = useAuth();
  const [payments, setPayments] = useState<Payment[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isPending, startTransition] = useTransition();
  const [isExpenseDialogOpen, setIsExpenseDialogOpen] = useState(false);
  const [expenseToDelete, setExpenseToDelete] = useState<Expense | null>(null);

  const [selectedMonth, setSelectedMonth] = useState<string>(new Date().getMonth().toString());
  const [selectedYear, setSelectedYear] = useState<string>(new Date().getFullYear().toString());


  const expenseForm = useForm<z.infer<typeof expenseSchema>>({
    resolver: zodResolver(expenseSchema),
    defaultValues: {
      description: '',
      amount: '' as any,
      date: format(new Date(), 'yyyy-MM-dd'),
    },
  });

  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true);
      try {
        const [paymentsData, expensesData] = await Promise.all([
          getPayments(),
          getExpenses(),
        ]);
        setPayments(paymentsData);
        setExpenses(expensesData);
      } catch (error) {
        console.error('Failed to load dashboard data', error);
        toast({
          variant: 'destructive',
          title: 'Error',
          description: 'Could not load dashboard data from the server.',
        });
      } finally {
        setIsLoading(false);
      }
    };
    fetchData();
  }, [toast]);
  
  useEffect(() => {
    if (!isExpenseDialogOpen) {
        expenseForm.reset({
            description: '',
            amount: '' as any,
            date: format(new Date(), 'yyyy-MM-dd'),
        });
    }
  }, [isExpenseDialogOpen, expenseForm])

  const filteredData = useMemo(() => {
    const isAllTime = selectedMonth === ALL_MONTHS && selectedYear === ALL_YEARS;
    
    const filteredPayments = payments.filter(p => {
        if (isAllTime) return true;
        const paymentDate = new Date(p.date);
        const monthMatch = selectedMonth === ALL_MONTHS || getMonth(paymentDate).toString() === selectedMonth;
        const yearMatch = selectedYear === ALL_YEARS || getYear(paymentDate).toString() === selectedYear;
        return monthMatch && yearMatch;
    });

    const filteredExpenses = expenses.filter(e => {
        if (isAllTime) return true;
        const expenseDate = new Date(e.date);
        const monthMatch = selectedMonth === ALL_MONTHS || getMonth(expenseDate).toString() === selectedMonth;
        const yearMatch = selectedYear === ALL_YEARS || getYear(expenseDate).toString() === selectedYear;
        return monthMatch && yearMatch;
    });

    return { filteredPayments, filteredExpenses };

  }, [payments, expenses, selectedMonth, selectedYear]);

  const { totalCollected, totalExpenses, netBalance } = useMemo(() => {
    const isAllTime = selectedMonth === ALL_MONTHS && selectedYear === ALL_YEARS;
    const collectionsFromPayments = filteredData.filteredPayments.reduce((sum, p) => sum + p.amount, 0);
    const totalCollected = collectionsFromPayments + (isAllTime ? OPENING_BALANCE : 0);
    const totalExpenses = filteredData.filteredExpenses.reduce((sum, e) => sum + e.amount, 0);
    const netBalance = totalCollected - totalExpenses;
    return { totalCollected, totalExpenses, netBalance };
  }, [filteredData, selectedMonth, selectedYear]);
  
  const sortedExpenses = useMemo(() => {
    return [...filteredData.filteredExpenses].sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [filteredData.filteredExpenses]);

  const availableYears = useMemo(() => {
    const allDates = [...payments.map(p => p.date), ...expenses.map(e => e.date)];
    const years = new Set(allDates.map(d => getYear(new Date(d)).toString()));
    return Array.from(years).sort((a,b) => parseInt(b) - parseInt(a));
  }, [payments, expenses]);


  const onExpenseSubmit = (values: z.infer<typeof expenseSchema>) => {
    if (!isEditor) return;
    startTransition(async () => {
      try {
        const expenseData = {
          ...values,
          date: new Date(values.date).toISOString(),
        };
        const newExpense = await addExpense(expenseData);
        setExpenses((prev) => [...prev, newExpense]);
        toast({
          title: 'Expense Recorded',
          description: 'The new expense has been successfully recorded.',
        });
      } catch (error) {
        console.error('Failed to save expense', error);
        toast({
          variant: 'destructive',
          title: 'Error',
          description: 'Could not save the expense. Please try again.',
        });
      } finally {
        setIsExpenseDialogOpen(false);
      }
    });
  };

  const handleDeleteExpense = () => {
    if (!expenseToDelete || !isEditor) return;

    startTransition(async () => {
        try {
            await deleteExpense(expenseToDelete.id);
            setExpenses(prev => prev.filter(e => e.id !== expenseToDelete.id));
            toast({
                title: "Expense Deleted",
                description: "The expense record has been successfully deleted."
            });
        } catch (error) {
            console.error("Failed to delete expense", error);
            toast({
                variant: "destructive",
                title: "Error",
                description: "Could not delete expense. Please try again."
            });
        } finally {
            setExpenseToDelete(null);
        }
    });
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
    }).format(amount);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row gap-4 justify-between items-center">
        <h2 className="text-xl font-semibold text-foreground">
          Financial Overview
        </h2>
        <div className="flex flex-col sm:flex-row gap-4 w-full sm:w-auto">
            <Select value={selectedMonth} onValueChange={setSelectedMonth}>
                <SelectTrigger className="w-full sm:w-[180px]">
                    <SelectValue placeholder="Select Month" />
                </SelectTrigger>
                <SelectContent>
                    <SelectItem value={ALL_MONTHS}>All Months</SelectItem>
                    {Array.from({length: 12}, (_, i) => (
                        <SelectItem key={i} value={i.toString()}>{format(new Date(0, i), 'MMMM')}</SelectItem>
                    ))}
                </SelectContent>
            </Select>
            <Select value={selectedYear} onValueChange={setSelectedYear}>
                <SelectTrigger className="w-full sm:w-[120px]">
                    <SelectValue placeholder="Select Year" />
                </SelectTrigger>
                <SelectContent>
                    <SelectItem value={ALL_YEARS}>All Years</SelectItem>
                    {availableYears.map(year => (
                        <SelectItem key={year} value={year}>{year}</SelectItem>
                    ))}
                </SelectContent>
            </Select>
        </div>
      </div>
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Total Collected
            </CardTitle>
            <ArrowUpCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {isLoading ? <Skeleton className="h-8 w-3/4" /> : <div className="text-2xl font-bold">{formatCurrency(totalCollected)}</div>}
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Total Expenses
            </CardTitle>
            <ArrowDownCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {isLoading ? <Skeleton className="h-8 w-3/4" /> : <div className="text-2xl font-bold">{formatCurrency(totalExpenses)}</div>}
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Net Balance</CardTitle>
            <IndianRupee className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {isLoading ? <Skeleton className="h-8 w-3/4" /> : <div className="text-2xl font-bold">{formatCurrency(netBalance)}</div>}
          </CardContent>
        </Card>
      </div>
      
      <Card>
        <CardHeader className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <CardTitle>Expense History</CardTitle>
            <p className="text-sm text-muted-foreground">
                Track all society expenditures.
            </p>
          </div>
          {isEditor && (
            <Dialog open={isExpenseDialogOpen} onOpenChange={setIsExpenseDialogOpen}>
                <DialogTrigger asChild>
                    <Button className="print-hide w-full sm:w-auto">
                        <PlusCircle className="mr-2 h-4 w-4" />
                        Record Expense
                    </Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-[425px]">
                    <Form {...expenseForm}>
                        <form onSubmit={expenseForm.handleSubmit(onExpenseSubmit)} className="space-y-8">
                        <DialogHeader>
                            <DialogTitle>Record New Expense</DialogTitle>
                            <DialogDescription>
                                Enter the details of the expense.
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
                                        <Input placeholder="e.g. Security guard salary" {...field} />
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
                                    <FormLabel>Amount (₹)</FormLabel>
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
                                    <FormItem>
                                    <FormLabel>Expense Date</FormLabel>
                                    <FormControl>
                                        <Input placeholder="YYYY-MM-DD" type="date" {...field} />
                                    </FormControl>
                                    <FormMessage />
                                    </FormItem>
                                )}
                            />
                        </div>
                        <DialogFooter>
                            <Button type="button" variant="ghost" onClick={() => setIsExpenseDialogOpen(false)} disabled={isPending}>Cancel</Button>
                            <Button type="submit" disabled={isPending || !isEditor}>Save Expense</Button>
                        </DialogFooter>
                        </form>
                    </Form>
                </DialogContent>
              </Dialog>
          )}
        </CardHeader>
        <CardContent>
          <div className="rounded-md border table-print overflow-x-auto">
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
                            <TableCell><Skeleton className="h-5 w-32 sm:w-48" /></TableCell>
                            <TableCell><Skeleton className="h-5 w-24" /></TableCell>
                            <TableCell><Skeleton className="h-5 w-24" /></TableCell>
                            <TableCell className="text-right"><Skeleton className="h-8 w-8 ml-auto rounded-full" /></TableCell>
                        </TableRow>
                    ))
                ) : sortedExpenses.length > 0 ? (
                  sortedExpenses.map((expense) => (
                    <TableRow key={expense.id}>
                      <TableCell className="font-medium min-w-[150px]">{expense.description}</TableCell>
                      <TableCell>{formatCurrency(expense.amount)}</TableCell>
                      <TableCell>{format(new Date(expense.date), 'PPP')}</TableCell>
                      <TableCell className="text-right print-hide">
                         {isEditor && (
                            <AlertDialog open={expenseToDelete?.id === expense.id} onOpenChange={(open) => !open && setExpenseToDelete(null)}>
                                <Button variant="ghost" size="icon" onClick={() => setExpenseToDelete(expense)} disabled={isPending}>
                                    <Trash2 className="h-4 w-4" />
                                    <span className="sr-only">Delete</span>
                                </Button>
                                <AlertDialogContent>
                                    <AlertDialogHeader>
                                    <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                                    <AlertDialogDescription>
                                        This action cannot be undone. This will permanently delete the expense: "{expense.description}".
                                    </AlertDialogDescription>
                                    </AlertDialogHeader>
                                    <AlertDialogFooter>
                                    <AlertDialogCancel onClick={() => setExpenseToDelete(null)}>Cancel</AlertDialogCancel>
                                    <AlertDialogAction onClick={handleDeleteExpense}>Delete</AlertDialogAction>
                                    </AlertDialogFooter>
                                </AlertDialogContent>
                            </AlertDialog>
                         )}
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={4} className="h-24 text-center">
                      <AlertCircle className="mx-auto h-8 w-8 text-muted-foreground mb-2" />
                      No expenses recorded for the selected period.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
