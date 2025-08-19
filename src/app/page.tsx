import Link from 'next/link';
import { Button } from '@/components/ui/button';
import PaymentTracker from '@/components/payment-tracker';
import { History } from 'lucide-react';

export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-start p-4 sm:p-8 md:p-12 lg:p-24 bg-background">
      <div className="w-full max-w-5xl mb-4 flex justify-end">
        <Button asChild>
          <Link href="/history">
            <History className="mr-2 h-4 w-4" />
            View History
          </Link>
        </Button>
      </div>
      <PaymentTracker />
    </main>
  );
}
