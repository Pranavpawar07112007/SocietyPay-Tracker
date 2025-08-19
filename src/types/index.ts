export interface Member {
  id: number;
  name: string;
  flatNumber: string;
  amountPaid: number | null;
  paymentDate: string | null; // Stored as ISO string for localStorage compatibility
}
