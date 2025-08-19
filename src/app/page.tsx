import PaymentTracker from '@/components/payment-tracker';

export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-start p-4 sm:p-8 md:p-12 lg:p-24 bg-background">
      <PaymentTracker />
    </main>
  );
}
