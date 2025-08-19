export interface Member {
  id: number;
  name: string;
  flatNumber: string;
  mobileNumber: string;
}

export interface Payment {
  id: string; // Unique ID for the payment, e.g., timestamp
  memberId: number;
  amount: number;
  date: string; // Stored as ISO string
}
