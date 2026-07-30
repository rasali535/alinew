"use client";
import React, { useState, useEffect } from 'react';
import { Minus, Square, X } from 'lucide-react';

export function DesktopTitleBar() {
  const [isDesktop, setIsDesktop] = useState(false);

  useEffect(() => {
    // Check if we are running in the Electron environment
    if (typeof window !== 'undefined' && (window as any).ralionDesktop?.isDesktop) {
      setIsDesktop(true);
    }
  }, []);

  if (!isDesktop) return null;

  const handleMinimize = () => {
    (window as any).ralionDesktop?.windowMinimize();
  };

  const handleMaximize = () => {
    (window as any).ralionDesktop?.windowMaximize();
  };

  const handleClose = () => {
    (window as any).ralionDesktop?.windowClose();
  };

  return (
    <div 
      className="flex items-center justify-between h-8 bg-zinc-950 border-b border-zinc-800/80 w-full shrink-0 select-none z-[9999]"
      style={{ WebkitAppRegion: 'drag' } as any}
    >
      <div className="flex items-center gap-2 px-4">
        <span className="text-[10px] font-bold tracking-widest text-zinc-500 uppercase">
          Ralion OS
        </span>
      </div>
      
      <div className="flex items-center h-full" style={{ WebkitAppRegion: 'no-drag' } as any}>
        <button 
          onClick={handleMinimize}
          className="flex items-center justify-center w-11 h-full text-zinc-400 hover:bg-zinc-800 hover:text-white transition-colors"
          title="Minimize"
        >
          <Minus className="w-3.5 h-3.5" />
        </button>
        <button 
          onClick={handleMaximize}
          className="flex items-center justify-center w-11 h-full text-zinc-400 hover:bg-zinc-800 hover:text-white transition-colors"
          title="Maximize"
        >
          <Square className="w-3 h-3" />
        </button>
        <button 
          onClick={handleClose}
          className="flex items-center justify-center w-11 h-full text-zinc-400 hover:bg-red-500 hover:text-white transition-colors"
          title="Close"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
