import Image from "next/image";
import TrafficDashboard from "@/components/TrafficDashboard"; 

export default function Home() {
  return (
    /* We remove all centering and max-width constraints. 
       The 'overflow-hidden' ensures the sidebar stays static while the grid scrolls.
    */
    <div className="min-h-screen w-full bg-[#f0f2f5] dark:bg-[#09090b] overflow-hidden">
      
      {/* Main is now just a wrapper for the Dashboard. 
          The Dashboard itself handles the 30/70 split internal to its component.
      */}
      <main className="w-full h-screen flex flex-col">
        
        {/* Optional Global Header: 
            If you want this header to float above the dashboard, keep it here.
            Otherwise, move this inside the Dashboard's sidebar for a 'Pro' look.
        */}
        

        {/* The Dashboard now owns the screen */}
        <TrafficDashboard />

      </main>
    </div>
  );
}