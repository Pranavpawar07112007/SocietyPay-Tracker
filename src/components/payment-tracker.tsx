
"use client";

import * as React from "react";
import { useState, useEffect, useMemo } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { format, getMonth, getYear, isSameMonth } from "date-fns";
import { CalendarIcon, CheckCircle2, XCircle, ReceiptText, MoreHorizontal, Pencil, UserPlus, Trash2, MessageSquare, LogOut } from "lucide-react";
import { collection, onSnapshot, addDoc, updateDoc, deleteDoc, doc, query, where, getDocs, writeBatch } from "firebase/firestore";


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
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
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
import type { Member, Payment } from "@/types";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuth } from "@/context/auth-context";
import { db, getFirebaseAuth } from "@/lib/firebase";

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
  flatNumber: z.string().min(1, "Flat number is required."),
  mobileNumber: z.string().min(10, "Enter a valid mobile number.").max(10, "Enter a valid mobile number."),
});

type MemberWithPayment = Member & { currentMonthPayment: Payment | null };

export default function PaymentTracker() {
  const { toast } = useToast();
  const { user } = useAuth();
  const [members, setMembers] = useState<Member[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [filter, setFilter] = useState("all");
  const [isPaymentDialogOpen, setIsPaymentDialogOpen] = useState(false);
  const [isMemberDialogOpen, setIsMemberDialogOpen] = useState(false);
  const [selectedMember, setSelectedMember] = useState<Member | null>(null);
  const [editingPayment, setEditingPayment] = useState<Payment | null>(null);
  const [memberToDelete, setMemberToDelete] = useState<Member | null>(null);


  const paymentForm = useForm<z.infer<typeof paymentSchema>>({
    resolver: zodResolver(paymentSchema),
  });

  const memberForm = useForm<z.infer<typeof memberSchema>>({
    resolver: zodResolver(memberSchema),
    defaultValues: {
      name: "",
      flatNumber: "",
      mobileNumber: "",
    },
  });

  useEffect(() => {
    if (!user) return;
    setIsLoading(true);

    const membersCollection = collection(db, "users", user.uid, "members");
    const paymentsCollection = collection(db, "users", user.uid, "payments");

    const unsubMembers = onSnapshot(membersCollection, (snapshot) => {
        const membersList = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Member));
        setMembers(membersList);
        setIsLoading(false);
    });

    const unsubPayments = onSnapshot(paymentsCollection, (snapshot) => {
        const paymentsList = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Payment));
        setPayments(paymentsList);
    });

    return () => {
        unsubMembers();
        unsubPayments();
    };
}, [user]);

  
  const membersWithPayments = useMemo(() => {
    const today = new Date();
    return members.map((member) => {
      const currentMonthPayment = payments.find(p => p.memberId === member.id && isSameMonth(new Date(p.date), today)) || null;
      return { ...member, currentMonthPayment };
    }).sort((a, b) => a.flatNumber.localeCompare(b.flatNumber));
  }, [members, payments]);


  useEffect(() => {
    if (isPaymentDialogOpen) {
      if (editingPayment) {
        paymentForm.reset({
          amount: editingPayment.amount,
          date: new Date(editingPayment.date),
        });
      } else {
        paymentForm.reset({
            amount: undefined,
            date: new Date(),
        });
      }
    }
    if (isMemberDialogOpen) {
        if(selectedMember) {
            memberForm.reset({
                name: selectedMember.name,
                flatNumber: selectedMember.flatNumber,
                mobileNumber: selectedMember.mobileNumber,
            })
        } else {
            memberForm.reset({
                name: "",
                flatNumber: "",
                mobileNumber: "",
            });
        }
    }
  }, [isPaymentDialogOpen, isMemberDialogOpen, editingPayment, selectedMember, paymentForm, memberForm]);

  const handleRecordPaymentClick = (member: MemberWithPayment) => {
    setSelectedMember(member);
    setEditingPayment(member.currentMonthPayment);
    setIsPaymentDialogOpen(true);
  };
  
  const handleEditMemberClick = (member: Member) => {
    setSelectedMember(member);
    setIsMemberDialogOpen(true);
  };
  
  const handleAddMemberClick = () => {
    setSelectedMember(null);
    setIsMemberDialogOpen(true);
  };

  const handleDeleteMember = async () => {
    if (!memberToDelete || !user) return;

    try {
        const batch = writeBatch(db);

        // Delete the member document
        const memberDocRef = doc(db, "users", user.uid, "members", memberToDelete.id);
        batch.delete(memberDocRef);

        // Find and delete all payments for that member
        const paymentsQuery = query(collection(db, "users", user.uid, "payments"), where("memberId", "==", memberToDelete.id));
        const paymentsSnapshot = await getDocs(paymentsQuery);
        paymentsSnapshot.forEach(doc => {
            batch.delete(doc.ref);
        });

        await batch.commit();

        toast({
            title: "Member Deleted",
            description: `Member ${memberToDelete.name} and all their payment records have been deleted.`
        });
    } catch(e) {
        console.error("Error deleting member: ", e);
        toast({
            variant: "destructive",
            title: "Error",
            description: "Could not delete member. Please try again."
        });
    }
    setMemberToDelete(null);
  };

  const handleSendReminder = (member: Member) => {
    const currentMonth = format(new Date(), 'MMMM');
    const message = `Dear ${member.name}, this is a friendly reminder that your society maintenance payment for ${currentMonth} is due. Thank you, Deepak Pawar, Secretary, Aroma Residency.`;
    const whatsappUrl = `https://wa.me/91${member.mobileNumber}?text=${encodeURIComponent(message)}`;
    window.open(whatsappUrl, '_blank');
  }

  const onPaymentSubmit = async (values: z.infer<typeof paymentSchema>) => {
    if (!selectedMember || !user) return;

    const paymentData = {
        memberId: selectedMember.id,
        amount: values.amount,
        date: values.date.toISOString(),
    };

    try {
        if (editingPayment) {
            const paymentDocRef = doc(db, "users", user.uid, "payments", editingPayment.id);
            await updateDoc(paymentDocRef, paymentData);
            toast({
                title: "Payment Updated",
                description: `Payment for ${selectedMember.name} has been updated.`,
            });
        } else {
            const paymentsCollection = collection(db, "users", user.uid, "payments");
            await addDoc(paymentsCollection, paymentData);
            toast({
                title: "Payment Recorded",
                description: `Payment for ${selectedMember.name} has been recorded.`,
            });
        }
    } catch (e) {
        console.error("Error saving payment: ", e);
        toast({
            variant: "destructive",
            title: "Error",
            description: "Could not save payment. Please try again."
        });
    }
    
    setIsPaymentDialogOpen(false);
    setSelectedMember(null);
    setEditingPayment(null);
  };

  const onMemberSubmit = async (values: z.infer<typeof memberSchema>) => {
    if (!user) return;
    const memberData = { ...values, userId: user.uid };

    try {
        if (selectedMember) {
            const memberDocRef = doc(db, "users", user.uid, "members", selectedMember.id);
            await updateDoc(memberDocRef, values);
            toast({
                title: "Member Updated",
                description: `Details for ${values.name} have been updated.`,
            });
        } else {
            const membersCollection = collection(db, "users", user.uid, "members");
            await addDoc(membersCollection, values);
            toast({
                title: "Member Added",
                description: `${values.name} has been added to the society.`
            });
        }
    } catch (e) {
        console.error("Error saving member: ", e);
        toast({
            variant: "destructive",
            title: "Error",
            description: "Could not save member. Please try again."
        });
    }

    setIsMemberDialogOpen(false);
    setSelectedMember(null);
  };

  const filteredMembers = useMemo(() => {
    if (filter === "paid") {
      return membersWithPayments.filter((member) => member.currentMonthPayment !== null);
    }
    if (filter === "unpaid") {
      return membersWithPayments.filter((member) => member.currentMonthPayment === null);
    }
    return membersWithPayments;
  }, [membersWithPayments, filter]);

  const renderTable = (memberList: MemberWithPayment[]) => (
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
            ) : memberList.length > 0 ? (
                memberList.map((member) => (
                <TableRow key={member.id}>
                <TableCell className="font-medium">{member.name}</TableCell>
                <TableCell>{member.flatNumber}</TableCell>
                <TableCell>{member.mobileNumber}</TableCell>
                <TableCell>
                    {member.currentMonthPayment ? `₹${member.currentMonthPayment.amount.toFixed(2)}` : "N/A"}
                </TableCell>
                <TableCell>
                    {member.currentMonthPayment
                    ? format(new Date(member.currentMonthPayment.date), "PPP")
                    : "N/A"}
                </TableCell>
                <TableCell>
                    {member.currentMonthPayment ? (
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
                    <AlertDialog open={memberToDelete?.id === member.id} onOpenChange={(open) => !open && setMemberToDelete(null)}>
                        <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button variant="ghost" className="h-8 w-8 p-0">
                            <span className="sr-only">Open menu</span>
                            <MoreHorizontal className="h-4 w-4" />
                            </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => handleRecordPaymentClick(member)}>
                            <ReceiptText className="mr-2 h-4 w-4" />
                            <span>{member.currentMonthPayment ? "Edit Payment" : "Record Payment"}</span>
                            </DropdownMenuItem>
                             {!member.currentMonthPayment && (
                                <DropdownMenuItem onClick={() => handleSendReminder(member)}>
                                    <MessageSquare className="mr-2 h-4 w-4" />
                                    <span>Send Reminder</span>
                                </DropdownMenuItem>
                            )}
                            <DropdownMenuItem onClick={() => handleEditMemberClick(member)}>
                            <Pencil className="mr-2 h-4 w-4" />
                            <span>Edit Member</span>
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem className="text-red-600" onSelect={(e) => { e.preventDefault(); setMemberToDelete(member); }}>
                                <Trash2 className="mr-2 h-4 w-4" />
                                Delete Member
                            </DropdownMenuItem>
                        </DropdownMenuContent>
                        </DropdownMenu>
                        <AlertDialogContent>
                            <AlertDialogHeader>
                            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                            <AlertDialogDescription>
                                This action cannot be undone. This will permanently delete {memberToDelete?.name} and all their payment records.
                            </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                            <AlertDialogCancel onClick={() => setMemberToDelete(null)}>Cancel</AlertDialogCancel>
                            <AlertDialogAction onClick={handleDeleteMember}>Delete</AlertDialogAction>
                            </AlertDialogFooter>
                        </AlertDialogContent>
                    </AlertDialog>
                </TableCell>
                </TableRow>
            ))
            ) : (
            <TableRow>
                <TableCell colSpan={7} className="h-24 text-center">
                    {filter === 'all' ? 'No members added yet.' : 
                     filter === 'paid' ? 'No members have paid yet for this month.' :
                     filter === 'unpaid' ? 'All members have paid for this month.' :
                     'No members found for this filter.'}
                </TableCell>
            </TableRow>
            )}
        </TableBody>
        </Table>
    </div>
  );

  return (
    <>
      <Card className="w-full max-w-5xl shadow-lg">
        <CardHeader>
          <div className="flex justify-between items-start">
            <div className="flex items-center space-x-4">
              <ReceiptText className="h-10 w-10 text-primary" />
              <div>
                <CardTitle className="font-headline text-3xl">
                  Aroma Residency - SocietyPay Tracker
                </CardTitle>
                <CardDescription>
                  Track and manage monthly maintenance payments for society members.
                </CardDescription>
              </div>
            </div>
            <div className="text-right flex flex-col items-end gap-2">
                <div className="flex items-center">
                    <p className="text-sm text-muted-foreground mr-4">Logged in as {user?.email}</p>
                    <Button variant="ghost" size="icon" onClick={() => getFirebaseAuth().signOut()}>
                        <LogOut className="h-5 w-5" />
                    </Button>
                </div>
                <div>
                    <p className="text-lg font-semibold text-muted-foreground">{format(new Date(), 'MMMM')}</p>
                    <p className="text-sm text-muted-foreground">{format(new Date(), 'yyyy')}</p>
                </div>
            </div>
          </div>
        </CardHeader>
        <CardContent>
            <Tabs value={filter} onValueChange={setFilter}>
                <div className="flex justify-between items-center mb-4">
                    <TabsList>
                    <TabsTrigger value="all">All Members</TabsTrigger>
                    <TabsTrigger value="paid">Paid</TabsTrigger>
                    <TabsTrigger value="unpaid">Unpaid</TabsTrigger>
                    </TabsList>
                    <Button onClick={handleAddMemberClick}>
                        <UserPlus className="mr-2 h-4 w-4" />
                        Add Member
                    </Button>
                </div>
                <TabsContent value="all" className="mt-0">
                    {renderTable(filteredMembers)}
                </TabsContent>
                <TabsContent value="paid" className="mt-0">
                    {renderTable(filteredMembers)}
                </TabsContent>
                <TabsContent value="unpaid" className="mt-0">
                    {renderTable(filteredMembers)}
                </TabsContent>
            </Tabs>
        </CardContent>
      </Card>

      <Dialog open={isPaymentDialogOpen} onOpenChange={(isOpen) => {
          setIsPaymentDialogOpen(isOpen);
          if (!isOpen) {
              setSelectedMember(null);
              setEditingPayment(null);
          }
      }}>
        <DialogContent className="sm:max-w-[425px]">
          <Form {...paymentForm}>
            <form onSubmit={paymentForm.handleSubmit(onPaymentSubmit)} className="space-y-8">
              <DialogHeader>
                <DialogTitle>{editingPayment ? 'Edit' : 'Record'} Payment for {selectedMember?.name}</DialogTitle>
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
                      <FormLabel>Amount(₹)</FormLabel>
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
                <Button type="button" variant="ghost" onClick={() => setIsPaymentDialogOpen(false)}>Cancel</Button>
                <Button type="submit">Save Payment</Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
      
      <Dialog open={isMemberDialogOpen} onOpenChange={(isOpen) => {
          setIsMemberDialogOpen(isOpen);
          if (!isOpen) {
              setSelectedMember(null);
          }
      }}>
        <DialogContent className="sm:max-w-[425px]">
          <Form {...memberForm}>
            <form onSubmit={memberForm.handleSubmit(onMemberSubmit)} className="space-y-8">
              <DialogHeader>
                <DialogTitle>{selectedMember ? 'Edit' : 'Add'} Member Details</DialogTitle>
                <DialogDescription>
                  {selectedMember ? "Update the member's details." : "Enter the details for the new member."}
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
                  name="flatNumber"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Flat No.</FormLabel>
                      <FormControl>
                        <Input placeholder="e.g. A-101" {...field} />
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
                <Button type="submit">{selectedMember ? 'Save Changes' : 'Add Member'}</Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </>
  );
}
