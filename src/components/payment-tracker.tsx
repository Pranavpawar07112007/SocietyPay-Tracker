"use client";

import * as React from "react";
import { useState, useEffect, useMemo } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { format } from "date-fns";
import { CalendarIcon, CheckCircle2, XCircle, ReceiptText, MoreHorizontal, Edit, Pencil } from "lucide-react";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import type { Member } from "@/types";
import { initialMembers } from "@/data/members";
import { Skeleton } from "@/components/ui/skeleton";


const paymentSchema = z.object({
  amount: z.coerce
    .number({ invalid_type_error: "Please enter a valid amount." })
    .positive({ message: "Amount must be greater than 0." }),
  date: z.date({
    required_error: "A payment date is required.",
  }),
});

const memberSchema = z.object({
  name: z.string().min(1, "Name is required."),
  mobileNumber: z.string().min(10, "Enter a valid mobile number.").max(10, "Enter a valid mobile number."),
});

export default function PaymentTracker() {
  const { toast } = useToast();
  const [members, setMembers] = useState<Member[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [filter, setFilter] = useState("all");
  const [isPaymentDialogOpen, setIsPaymentDialogOpen] = useState(false);
  const [isMemberDialogOpen, setIsMemberDialogOpen] = useState(false);
  const [selectedMember, setSelectedMember] = useState<Member | null>(null);

  const paymentForm = useForm<z.infer<typeof paymentSchema>>({
    resolver: zodResolver(paymentSchema),
  });

  const memberForm = useForm<z.infer<typeof memberSchema>>({
    resolver: zodResolver(memberSchema),
  });

  useEffect(() => {
    try {
      const savedMembers = localStorage.getItem("societyMembers");
      const parsedMembers = savedMembers ? JSON.parse(savedMembers) : initialMembers;
      // Simple migration for users who have old data without mobileNumber
      const migratedMembers = parsedMembers.map((m: Member) => ({
        ...m,
        mobileNumber: m.mobileNumber || '9876543210'
      }));
      setMembers(migratedMembers);
    } catch (error) {
      console.error("Failed to load members from localStorage", error);
      setMembers(initialMembers);
    }
    setIsLoading(false);
  }, []);

  useEffect(() => {
    if (!isLoading) {
      localStorage.setItem("societyMembers", JSON.stringify(members));
    }
  }, [members, isLoading]);

  useEffect(() => {
    if (selectedMember) {
      paymentForm.reset({
        amount: selectedMember.amountPaid ?? undefined,
        date: selectedMember.paymentDate
          ? new Date(selectedMember.paymentDate)
          : undefined,
      });
      memberForm.reset({
        name: selectedMember.name,
        mobileNumber: selectedMember.mobileNumber,
      })
    }
  }, [selectedMember, paymentForm, memberForm]);

  const handleRecordPaymentClick = (member: Member) => {
    setSelectedMember(member);
    setIsPaymentDialogOpen(true);
  };
  
  const handleEditMemberClick = (member: Member) => {
    setSelectedMember(member);
    setIsMemberDialogOpen(true);
  };

  const onPaymentSubmit = (values: z.infer<typeof paymentSchema>) => {
    if (!selectedMember) return;

    setMembers(
      members.map((m) =>
        m.id === selectedMember.id
          ? {
              ...m,
              amountPaid: values.amount,
              paymentDate: values.date.toISOString(),
            }
          : m
      )
    );
    toast({
      title: "Payment Recorded",
      description: `Payment for ${selectedMember.name} has been updated.`,
      variant: "default",
      className: "bg-accent text-accent-foreground",
    });
    setIsPaymentDialogOpen(false);
    setSelectedMember(null);
  };

  const onMemberSubmit = (values: z.infer<typeof memberSchema>) => {
    if (!selectedMember) return;

    setMembers(
      members.map((m) =>
        m.id === selectedMember.id ? { ...m, ...values } : m
      )
    );
    toast({
      title: "Member Updated",
      description: `Details for ${values.name} have been updated.`,
    });
    setIsMemberDialogOpen(false);
    setSelectedMember(null);
  };


  const filteredMembers = useMemo(() => {
    if (filter === "paid") {
      return members.filter((member) => member.amountPaid !== null);
    }
    if (filter === "unpaid") {
      return members.filter((member) => member.amountPaid === null);
    }
    return members;
  }, [members, filter]);

  return (
    <>
      <Card className="w-full max-w-5xl shadow-lg">
        <CardHeader>
          <div className="flex items-center space-x-4">
            <ReceiptText className="h-10 w-10 text-primary" />
            <div>
              <CardTitle className="font-headline text-3xl">
                SocietyPay Tracker
              </CardTitle>
              <CardDescription>
                Track and manage monthly maintenance payments for society members.
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <Tabs value={filter} onValueChange={setFilter}>
            <TabsList>
              <TabsTrigger value="all">All Members</TabsTrigger>
              <TabsTrigger value="paid">Paid</TabsTrigger>
              <TabsTrigger value="unpaid">Unpaid</TabsTrigger>
            </TabsList>
            <TabsContent value={filter} className="mt-4">
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-[200px]">Member Name</TableHead>
                      <TableHead>Flat No.</TableHead>
                      <TableHead>Mobile No.</TableHead>
                      <TableHead>Amount Paid</TableHead>
                      <TableHead>Payment Date</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {isLoading ? (
                      Array.from({ length: 5 }).map((_, i) => (
                        <TableRow key={i}>
                          <TableCell><Skeleton className="h-5 w-32" /></TableCell>
                          <TableCell><Skeleton className="h-5 w-16" /></TableCell>
                          <TableCell><Skeleton className="h-5 w-24" /></TableCell>
                          <TableCell><Skeleton className="h-5 w-20" /></TableCell>
                          <TableCell><Skeleton className="h-5 w-24" /></TableCell>
                          <TableCell><Skeleton className="h-6 w-20 rounded-full" /></TableCell>
                          <TableCell className="text-right"><Skeleton className="h-8 w-8 ml-auto" /></TableCell>
                        </TableRow>
                      ))
                    ) : filteredMembers.length > 0 ? (
                      filteredMembers.map((member) => (
                        <TableRow key={member.id}>
                          <TableCell className="font-medium">{member.name}</TableCell>
                          <TableCell>{member.flatNumber}</TableCell>
                          <TableCell>{member.mobileNumber}</TableCell>
                          <TableCell>
                            {member.amountPaid ? `₹${member.amountPaid.toFixed(2)}` : "N/A"}
                          </TableCell>
                          <TableCell>
                            {member.paymentDate
                              ? format(new Date(member.paymentDate), "PPP")
                              : "N/A"}
                          </TableCell>
                          <TableCell>
                            {member.amountPaid ? (
                              <Badge className="bg-accent text-accent-foreground hover:bg-accent/80">
                                <CheckCircle2 className="mr-2 h-4 w-4" />
                                Paid
                              </Badge>
                            ) : (
                              <Badge variant="destructive">
                                <XCircle className="mr-2 h-4 w-4" />
                                Unpaid
                              </Badge>
                            )}
                          </TableCell>
                          <TableCell className="text-right">
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" className="h-8 w-8 p-0">
                                  <span className="sr-only">Open menu</span>
                                  <MoreHorizontal className="h-4 w-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuItem onClick={() => handleEditMemberClick(member)}>
                                  <Pencil className="mr-2 h-4 w-4" />
                                  <span>Edit Member</span>
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => handleRecordPaymentClick(member)}>
                                  <ReceiptText className="mr-2 h-4 w-4" />
                                  <span>{member.amountPaid ? "Edit Payment" : "Record Payment"}</span>
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </TableCell>
                        </TableRow>
                      ))
                    ) : (
                      <TableRow>
                        <TableCell colSpan={7} className="h-24 text-center">
                          No members found for this filter.
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      <Dialog open={isPaymentDialogOpen} onOpenChange={setIsPaymentDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <Form {...paymentForm}>
            <form onSubmit={paymentForm.handleSubmit(onPaymentSubmit)} className="space-y-8">
              <DialogHeader>
                <DialogTitle>Record Payment for {selectedMember?.name}</DialogTitle>
                <DialogDescription>
                  Enter the amount and date of the maintenance payment.
                </DialogDescription>
              </DialogHeader>
              
              <div className="grid gap-4 py-4">
                <FormField
                  control={paymentForm.control}
                  name="amount"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Amount (₹)</FormLabel>
                      <FormControl>
                        <Input placeholder="e.g. 2500" type="number" step="0.01" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={paymentForm.control}
                  name="date"
                  render={({ field }) => (
                    <FormItem className="flex flex-col">
                      <FormLabel>Payment Date</FormLabel>
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
                            </Button>
                          </FormControl>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="start">
                          <Calendar
                            mode="single"
                            selected={field.value}
                            onSelect={field.onChange}
                            disabled={(date) =>
                              date > new Date() || date < new Date("1900-01-01")
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
                <Button type="button" variant="ghost" onClick={() => setIsPaymentDialogOpen(false)}>Cancel</Button>
                <Button type="submit">Save Payment</Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
      
      <Dialog open={isMemberDialogOpen} onOpenChange={setIsMemberDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <Form {...memberForm}>
            <form onSubmit={memberForm.handleSubmit(onMemberSubmit)} className="space-y-8">
              <DialogHeader>
                <DialogTitle>Edit Member Details</DialogTitle>
                <DialogDescription>
                  Update the member's name and mobile number.
                </DialogDescription>
              </DialogHeader>
              
              <div className="grid gap-4 py-4">
                <FormField
                  control={memberForm.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Name</FormLabel>
                      <FormControl>
                        <Input placeholder="e.g. Ramesh Kumar" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={memberForm.control}
                  name="mobileNumber"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Mobile Number</FormLabel>
                      <FormControl>
                        <Input placeholder="e.g. 9876543210" type="tel" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <DialogFooter>
                <Button type="button" variant="ghost" onClick={() => setIsMemberDialogOpen(false)}>Cancel</Button>
                <Button type="submit">Save Changes</Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </>
  );
}
