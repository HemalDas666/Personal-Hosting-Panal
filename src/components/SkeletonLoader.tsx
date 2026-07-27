import React from "react";

export function SkeletonCard({ count = 3 }: { count?: number }) {
  return (
    <div className="grid grid-cols-1 gap-4 md:gap-6">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="bg-white/[0.02] backdrop-blur-2xl rounded-3xl border border-white/[0.04] p-5 md:p-6 animate-pulse">
          <div className="flex items-center space-x-4 mb-4">
            <div className="w-14 h-14 rounded-2xl bg-white/[0.04]" />
            <div className="space-y-2 flex-1">
              <div className="h-5 bg-white/[0.04] rounded-lg w-48" />
              <div className="h-3 bg-white/[0.03] rounded-lg w-24" />
            </div>
          </div>
          <div className="h-3 bg-white/[0.03] rounded-lg w-full mb-4" />
          <div className="grid grid-cols-4 gap-4">
            {Array.from({ length: 4 }).map((_, j) => (
              <div key={j} className="h-10 bg-white/[0.03] rounded-xl" />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

export function SkeletonTable({ rows = 5 }: { rows?: number }) {
  return (
    <div className="space-y-3 animate-pulse">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="flex items-center gap-4 p-4 bg-white/[0.02] rounded-xl border border-white/[0.04]">
          <div className="w-10 h-10 rounded-xl bg-white/[0.04]" />
          <div className="flex-1 space-y-2">
            <div className="h-4 bg-white/[0.04] rounded w-1/3" />
            <div className="h-3 bg-white/[0.03] rounded w-1/5" />
          </div>
          <div className="h-8 w-20 bg-white/[0.04] rounded-lg" />
        </div>
      ))}
    </div>
  );
}

export function SkeletonGrid({ count = 6 }: { count?: number }) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 animate-pulse">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="bg-white/[0.02] rounded-2xl border border-white/[0.04] p-5 space-y-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-white/[0.04]" />
            <div className="space-y-2 flex-1">
              <div className="h-4 bg-white/[0.04] rounded w-2/3" />
              <div className="h-3 bg-white/[0.03] rounded w-1/3" />
            </div>
          </div>
          <div className="h-3 bg-white/[0.03] rounded w-full" />
          <div className="h-8 bg-white/[0.04] rounded-lg w-full" />
        </div>
      ))}
    </div>
  );
}
