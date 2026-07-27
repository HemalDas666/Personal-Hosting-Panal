import React, { useState, useRef } from "react";
import { Sidebar } from "./Sidebar";
import { Menu } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useLocation, matchPath } from "react-router-dom";
import { useSettings } from "../context/SettingsContext";

export default function Layout({ children }: { children: React.ReactNode }) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const location = useLocation();
  const { panelName, panelLogo } = useSettings();
  const sidebarRef = useRef<HTMLDivElement>(null);
  const dragStartX = useRef(0);

  const isServerView = matchPath("/servers/:id/*", location.pathname) && !matchPath("/servers/create", location.pathname);

  const handleTouchStart = (e: React.TouchEvent) => {
    dragStartX.current = e.touches[0].clientX;
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    const dx = e.changedTouches[0].clientX - dragStartX.current;
    if (dx < -80 && mobileOpen) {
      setMobileOpen(false);
    }
    if (dx > 80 && !mobileOpen && dragStartX.current < 30) {
      setMobileOpen(true);
    }
  };

  if (isServerView) {
    return (
      <div className="flex h-[100dvh] w-full bg-transparent text-zinc-100 font-sans overflow-hidden selection:bg-cyan-500/30">
        <div className="flex-1 flex flex-col min-w-0 h-full overflow-hidden relative">
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-3xl h-[400px] bg-gradient-to-r from-cyan-500/10 via-blue-500/10 to-purple-500/10 blur-[120px] rounded-full pointer-events-none qx-glow-pulse" />
          <main className="flex-1 w-full h-full relative z-10 overflow-hidden">
            {children}
          </main>
        </div>
      </div>
    );
  }

  return (
    <div
      className="flex h-[100dvh] w-full bg-transparent text-zinc-100 font-sans overflow-hidden selection:bg-cyan-500/30"
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
    >
      <AnimatePresence>
        {mobileOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 md:hidden"
            onClick={() => setMobileOpen(false)}
          />
        )}
      </AnimatePresence>

      <div ref={sidebarRef}>
        <AnimatePresence mode="wait">
          {mobileOpen && (
            <motion.div
              key="mobile-sidebar"
              initial={{ x: -280 }}
              animate={{ x: 0 }}
              exit={{ x: -280 }}
              transition={{ type: "spring", stiffness: 300, damping: 30 }}
              className="fixed inset-y-0 left-0 z-50 md:hidden"
              drag="x"
              dragConstraints={{ left: 0, right: 0 }}
              dragElastic={0.2}
              onDragEnd={(_, info) => {
                if (info.offset.x < -80) setMobileOpen(false);
              }}
            >
              <Sidebar onClose={() => setMobileOpen(false)} />
            </motion.div>
          )}
        </AnimatePresence>
        <div className="hidden md:block h-full">
          <Sidebar />
        </div>
      </div>

      <div className="flex-1 flex flex-col min-w-0 h-full overflow-hidden relative">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-3xl h-[400px] bg-gradient-to-r from-cyan-500/10 via-blue-500/10 to-purple-500/10 blur-[120px] rounded-full pointer-events-none qx-glow-pulse" />

        <div className="md:hidden flex items-center justify-between p-4 bg-black/20 backdrop-blur-xl border-b border-white/[0.04] flex-shrink-0 relative z-10">
          <div className="flex items-center gap-2">
            {panelLogo ? (
              <img src={panelLogo} alt="Logo" className="w-6 h-6 rounded object-cover" />
            ) : (
              <div className="w-6 h-6 rounded bg-gradient-to-br from-cyan-500 to-blue-600 shadow-[0_0_10px_rgba(6,182,212,0.5)]" />
            )}
            <h1 className="text-lg font-bold tracking-tight text-white truncate">{panelName}</h1>
          </div>
          <button onClick={() => setMobileOpen(true)} className="p-2 text-zinc-400 hover:text-white bg-white/[0.04] hover:bg-white/[0.08] rounded-lg transition-colors">
            <Menu size={20} />
          </button>
        </div>

        <main className={`flex-1 w-full h-full relative z-10 ${isServerView ? 'overflow-hidden' : 'overflow-x-hidden overflow-y-auto pb-safe custom-scrollbar'}`}>
          {children}
        </main>
      </div>
    </div>
  );
}
