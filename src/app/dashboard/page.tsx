import Link from 'next/link';
import { Home } from 'lucide-react';

import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import Dashboard from '@/components/dashboard';

export default function DashboardPage() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-start p-4 sm:p-8 md:p-12 lg:p-24 bg-background">
      <Card className="w-full max-w-7xl shadow-lg">
        <CardHeader>
          <div className="flex justify-between items-start">
            <div>
              <CardTitle className="font-headline text-3xl">
                Aroma Residency - Society Dashboard
              </CardTitle>
              <CardDescription>
                An overview of your society's finances.
              </CardDescription>
            </div>
            <div className="flex gap-2">
                <Button asChild variant="outline">
                <Link href="/history">
                    View Payment History
                </Link>
                </Button>
                <Button asChild variant="outline">
                <Link href="/">
                    <Home className="mr-2 h-4 w-4" />
                    Back to Tracker
                </Link>
                </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <Dashboard />
        </CardContent>
      </Card>
    </main>
  );
}
