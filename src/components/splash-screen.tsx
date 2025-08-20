
'use client';

import { Loader2 } from 'lucide-react';

const SplashScreen = () => {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background text-foreground animate-fade-in">
      <div className="flex items-center space-x-4 mb-4">
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="64"
          height="64"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="text-primary animate-pulse"
        >
           <path d="M12 2L2 7l10 5 10-5-10-5z" />
           <path d="M2 17l10 5 10-5" />
           <path d="M2 12l10 5 10-5" />
        </svg>
        <div className='flex flex-col'>
            <h1 className="text-4xl font-headline font-bold tracking-tighter">
            SocietyPay
            </h1>
            <p className="text-sm text-muted-foreground -mt-1">Aroma Residency</p>
        </div>
      </div>
      <div className="flex items-center space-x-2 text-muted-foreground">
        <Loader2 className="h-5 w-5 animate-spin" />
        <p className="text-lg">
            Loading your dashboard...
        </p>
      </div>
    </div>
  );
};

export default SplashScreen;
