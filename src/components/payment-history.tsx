"use client";

import * as React from 'react';
import { useState, useEffect, useMemo } from 'react';
import { format } from 'date-fns';
import { ArrowUpDown, Trash2, Search, MoreHorizontal } from 'lucide-react';

import type { Member, Payment } from '@/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
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
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import { useToast } from '@/hooks/use-toast';
import { Skeleton } from '@/components/ui/skeleton';


type PaymentWithMember = Payment & { member: Member | undefined };
type SortKey = keyof PaymentWithMember | 'member.name' | 'member.flatNumber';

export default function PaymentHistory() {
  const { toast } = useToast();
  const [members, setMembers] = useState<Member[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [sortConfig, setSortConfig] = useState<{ key: SortKey; direction: 'ascending' | 'descending' } | null>(null);
  const [paymentToDelete, setPaymentToDelete] = useState<Payment | null>(null);


  useEffect(() => {
    try {
      const savedMembers = localStorage.getItem('societyMembers');
      const savedPayments = localStorage.getItem('societyPayments');
      setMembers(savedMembers ? JSON.parse(savedMembers) : []);
      setPayments(savedPayments ? JSON.parse(savedPayments) : []);
    } catch (error) {
      console.error('Failed to load data from localStorage', error);
    }
    setIsLoading(false);
  }, []);
  
  useEffect(() => {
    if(!isLoading) {
        localStorage.setItem("societyPayments", JSON.stringify(payments));
    }
  }, [payments, isLoading]);

  const handleDeletePayment = () => {
    if (!paymentToDelete) return;

    setPayments(payments.filter((p) => p.id !== paymentToDelete.id));
    toast({
      title: 'Payment Deleted',
      description: 'The payment record has been successfully deleted.',
      variant: 'destructive',
    });
    setPaymentToDelete(null);
  };

  const paymentsWithMemberData: PaymentWithMember[] = useMemo(() => {
    return payments.map(payment => ({
      ...payment,
      member: members.find(m => m.id === payment.memberId),
    }));
  }, [payments, members]);

  const requestSort = (key: SortKey) => {
    let direction: 'ascending' | 'descending' = 'ascending';
    if (sortConfig && sortConfig.key === key && sortConfig.direction === 'ascending') {
      direction = 'descending';
    }
    setSortConfig({ key, direction });
  };
  
  const getSortIndicator = (key: SortKey) => {
    if (!sortConfig || sortConfig.key !== key) {
      return <ArrowUpDown className="ml-2 h-4 w-4" />;
    }
    return sortConfig.direction === 'ascending' ? '▲' : '▼';
  };

  const sortedAndFilteredPayments = useMemo(() => {
    let sortableItems = [...paymentsWithMemberData];

    if (searchTerm) {
        sortableItems = sortableItems.filter(item => {
            const memberName = item.member?.name.toLowerCase() || '';
            const flatNumber = item.member?.flatNumber.toLowerCase() || '';
            const amount = item.amount.toString();
            return memberName.includes(searchTerm.toLowerCase()) || flatNumber.includes(searchTerm.toLowerCase()) || amount.includes(searchTerm);
        });
    }

    if (sortConfig !== null) {
      sortableItems.sort((a, b) => {
        const getNestedValue = (obj: any, path: string) => path.split('.').reduce((o, k) => (o || {})[k], obj);

        const aValue = sortConfig.key.includes('.') ? getNestedValue(a, sortConfig.key) : a[sortConfig.key as keyof PaymentWithMember];
        const bValue = sortConfig.key.includes('.') ? getNestedValue(b, sortConfig.key) : b[sortConfig.key as keyof PaymentWithMember];

        if (aValue < bValue) {
          return sortConfig.direction === 'ascending' ? -1 : 1;
        }
        if (aValue > bValue) {
          return sortConfig.direction === 'ascending' ? 1 : -1;
        }
        return 0;
      });
    }

    return sortableItems;
  }, [paymentsWithMemberData, searchTerm, sortConfig]);

  return (
    <div className="space-y-4">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
        <Input
          placeholder="Search by name, flat, or amount..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="pl-10"
        />
      </div>
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead onClick={() => requestSort('member.name')}>
                <div className="flex items-center cursor-pointer">
                    Member Name {getSortIndicator('member.name')}
                </div>
              </TableHead>
              <TableHead onClick={() => requestSort('member.flatNumber')}>
                <div className="flex items-center cursor-pointer">
                    Flat No. {getSortIndicator('member.flatNumber')}
                </div>
              </TableHead>
              <TableHead onClick={() => requestSort('amount')}>
                <div className="flex items-center cursor-pointer">
                    Amount Paid {getSortIndicator('amount')}
                </div>
              </TableHead>
              <TableHead onClick={() => requestSort('date')}>
                <div className="flex items-center cursor-pointer">
                    Payment Date {getSortIndicator('date')}
                </div>
              </TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
                Array.from({ length: 10 }).map((_, i) => (
                    <TableRow key={i}>
                        <TableCell><Skeleton className="h-5 w-32" /></TableCell>
                        <TableCell><Skeleton className="h-5 w-16" /></TableCell>
                        <TableCell><Skeleton className="h-5 w-24" /></TableCell>
                        <TableCell><Skeleton className="h-5 w-24" /></TableCell>
                        <TableCell className="text-right"><Skeleton className="h-8 w-8 ml-auto" /></TableCell>
                    </TableRow>
                ))
            ) : sortedAndFilteredPayments.length > 0 ? (
              sortedAndFilteredPayments.map((payment) => (
                <TableRow key={payment.id}>
                  <TableCell className="font-medium">{payment.member?.name || 'N/A'}</TableCell>
                  <TableCell>{payment.member?.flatNumber || 'N/A'}</TableCell>
                  <TableCell>₹{payment.amount.toFixed(2)}</TableCell>
                  <TableCell>{format(new Date(payment.date), 'PPP')}</TableCell>
                  <TableCell className="text-right">
                    <AlertDialog>
                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <Button variant="ghost" className="h-8 w-8 p-0">
                                <span className="sr-only">Open menu</span>
                                <MoreHorizontal className="h-4 w-4" />
                                </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                                <AlertDialogTrigger asChild>
                                    <DropdownMenuItem onSelect={(e) => { e.preventDefault(); setPaymentToDelete(payment); }}>
                                        <Trash2 className="mr-2 h-4 w-4" />
                                        <span>Delete</span>
                                    </DropdownMenuItem>
                                </AlertDialogTrigger>
                            </DropdownMenuContent>
                        </DropdownMenu>
                        <AlertDialogContent>
                            <AlertDialogHeader>
                            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                            <AlertDialogDescription>
                                This action cannot be undone. This will permanently delete the payment
                                record for {payment.member?.name} on {format(new Date(payment.date), 'PPP')}.
                            </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                            <AlertDialogCancel onClick={() => setPaymentToDelete(null)}>Cancel</AlertDialogCancel>
                            <AlertDialogAction onClick={handleDeletePayment}>Delete</AlertDialogAction>
                            </AlertDialogFooter>
                        </AlertDialogContent>
                    </AlertDialog>
                  </TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={5} className="h-24 text-center">
                  No payment records found.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
