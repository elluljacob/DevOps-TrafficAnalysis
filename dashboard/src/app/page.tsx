import Image from "next/image";
import TrafficDashboard from "@/components/TrafficDashboard"; 

export default function Home() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-zinc-50 font-sans dark:bg-black">
      <main className="flex min-h-screen w-full max-w-5xl flex-col items-center py-16 px-4 sm:px-16 bg-white dark:bg-black sm:items-start">
        
        {/* Header */}
        <div className="flex items-center gap-4 mb-8">
          <Image className="dark:invert" src="/next.svg" alt="Next.js logo" width={100} height={20} priority />
          <div className="h-6 w-[1px] bg-zinc-300"></div>
          <h1 className="text-xl font-semibold text-zinc-800 dark:text-zinc-100">Traffic Analytics</h1>
        </div>

        <div className="w-full flex flex-col gap-6">
          {/* The New Dashboard */}
          <TrafficDashboard />

          {/* Info Card */}
          <div className="p-6 rounded-lg bg-blue-50 dark:bg-zinc-900/50 border border-blue-100 dark:border-zinc-800">
             <h3 className="font-semibold text-blue-900 dark:text-blue-200">System Status</h3>
             <p className="text-sm text-blue-800/80 dark:text-zinc-400 mt-1">
               Connected to TrafficSense API v2.0. Monitoring 5 data streams. 
               {process.env.USE_MOCK_DATA === 'true' ? ' (MOCK MODE ACTIVE)' : ' (LIVE DATABASE)'}
             </p>
          </div>
        </div>

      </main>
    </div>
  );
}