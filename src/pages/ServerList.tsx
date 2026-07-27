import { useEffect, useState } from "react";
import axios from "axios";
import { Link } from "react-router-dom";
import { Server, Plus, Globe, Users, Wifi, WifiOff } from "lucide-react";
import { motion } from "framer-motion";
import { useAuth } from "../context/AuthContext";
import ServerLiveStats from "../components/ServerLiveStats";
import { SkeletonCard } from "../components/SkeletonLoader";

interface ServerInfo {
  id: string;
  name: string;
  status: string;
  ram: number;
  cpu: number;
  disk: number;
  port: number;
  version: string;
  type: string;
  ipAlias?: string;
  playerCount?: number;
}

export default function ServerList() {
  const [servers, setServers] = useState<ServerInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();

  const fetchServers = async () => {
    try {
      const res = await axios.get("/api/servers");
      const data = res.data;
      const enriched = await Promise.all(data.map(async (s: ServerInfo) => {
        if (s.status === "online") {
          try {
            const players = await axios.get(`/api/servers/${s.id}/players`);
            return { ...s, playerCount: players.data.count };
          } catch { return { ...s, playerCount: 0 }; }
        }
        return { ...s, playerCount: 0 };
      }));
      setServers(enriched);
    } catch(e) {}
    setLoading(false);
  };

  useEffect(() => {
    fetchServers();
    const interval = setInterval(fetchServers, 5000);
    return () => clearInterval(interval);
  }, []);

  const container = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: { staggerChildren: 0.05 }
    }
  };

  const itemAnim = {
    hidden: { opacity: 0, y: 20 },
    show: { opacity: 1, y: 0, transition: { type: "spring", stiffness: 300, damping: 24 } }
  };

  return (
    <motion.div 
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -15 }}
      transition={{ duration: 0.4, ease: "easeOut" }}
      className="p-5 md:p-10 max-w-7xl mx-auto"
    >
      <div className="flex flex-col md:flex-row md:items-end justify-between mb-10 gap-4">
        <div>
          <h1 className="text-4xl md:text-5xl font-black tracking-tight text-white mb-2 drop-shadow-lg">Instances</h1>
          <p className="text-purple-400/80 font-bold uppercase tracking-widest text-sm mt-2">Manage and monitor your server fleet.</p>
        </div>
        {user?.role === "admin" && (
          <Link to="/servers/create" className="px-5 py-2.5 bg-white text-black font-semibold rounded-xl hover:bg-zinc-200 transition-colors shadow-lg shadow-white/10 text-sm whitespace-nowrap inline-flex items-center self-start md:self-auto">
            <Plus size={18} className="mr-2" />
            New Instance
          </Link>
        )}
      </div>

      <motion.div variants={container} initial="hidden" animate="show" className="grid grid-cols-1 gap-4 md:gap-6">
        {loading ? <SkeletonCard count={3} /> : servers.map(server => {
          const isOnline = server.status === "online";
          const isInstalling = server.status === "installing" || server.status === "starting";
          return (
          <motion.div variants={itemAnim} key={server.id} className="bg-white/[0.03] backdrop-blur-2xl rounded-3xl border border-white/[0.06] p-5 md:p-6 flex flex-col group hover:bg-white/[0.06] hover:border-white/[0.12] transition-all shadow-[0_0_40px_-15px_rgba(0,0,0,0.5)] relative overflow-hidden">
            <div className={`absolute top-0 left-0 right-0 h-[2px] opacity-70 ${
              isOnline ? 'bg-gradient-to-r from-transparent via-emerald-500 to-transparent shadow-[0_0_15px_rgba(16,185,129,0.5)]' :
              isInstalling ? 'bg-gradient-to-r from-transparent via-cyan-500 to-transparent shadow-[0_0_15px_rgba(6,182,212,0.5)]' :
              'bg-gradient-to-r from-transparent via-zinc-500 to-transparent'
            }`} />
            <div className="absolute inset-0 bg-gradient-to-br from-white/[0.02] to-transparent opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" />
            
            <Link to={`/servers/${server.id}`} className="block flex-1 z-10 relative">
              <div className="flex justify-between items-start mb-4">
                <div className="flex items-center space-x-4">
                  <div className="w-14 h-14 rounded-2xl bg-black/60 border border-white/10 flex items-center justify-center group-hover:border-cyan-500/40 group-hover:bg-cyan-500/20 transition-all shadow-inner relative overflow-hidden backdrop-blur-sm">
                    <Server className="w-7 h-7 text-zinc-400 group-hover:text-cyan-400 transition-colors relative z-10" />
                  </div>
                  <div>
                    <h2 className="font-bold tracking-tight text-white text-xl group-hover:text-cyan-300 transition-colors drop-shadow-sm">{server.name}</h2>
                    <div className="flex items-center mt-1.5 space-x-2">
                       <span className="flex h-2.5 w-2.5 relative">
                          {isOnline && <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>}
                          {isInstalling && <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-cyan-400 opacity-75"></span>}
                          <span className={`relative inline-flex rounded-full h-2.5 w-2.5 ${
                            isOnline ? 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.8)]' :
                            isInstalling ? 'bg-cyan-500 shadow-[0_0_8px_rgba(6,182,212,0.8)]' : 'bg-zinc-600'
                          }`}></span>
                        </span>
                      <span className={`text-xs font-bold uppercase tracking-widest ${
                          isOnline ? 'text-emerald-500' :
                          isInstalling ? 'text-cyan-500' :
                          'text-zinc-500'
                        }`}>{
                          server.status === 'installing' ? 'Installing' :
                          server.status === 'starting' ? 'Starting' :
                          server.status === 'stopping' ? 'Stopping' :
                          server.status === 'crashed' || server.status === 'suspended' ? 'Stopped' :
                          isOnline ? 'Online' : 'Offline'
                        }</span>
                    </div>
                  </div>
                </div>
                {isOnline && (
                  <div className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-500/10 rounded-full border border-emerald-500/20">
                    <Users size={12} className="text-emerald-400" />
                    <span className="text-xs font-mono text-emerald-400 font-bold">{server.playerCount ?? "?"}</span>
                  </div>
                )}
              </div>

              {isOnline && (
                <div className="mb-4 px-3 py-2 bg-white/[0.02] rounded-xl border border-white/[0.04] flex items-center gap-2">
                  <Globe size={12} className="text-zinc-500 shrink-0" />
                  <span className="text-xs font-mono text-zinc-400 truncate">
                    {server.ipAlias ? `${server.ipAlias}:${server.port}` : `0.0.0.0:${server.port}`}
                  </span>
                  <Wifi size={12} className="text-emerald-500/60 shrink-0 ml-auto" />
                </div>
              )}
              {!isOnline && (
                <div className="mb-4 px-3 py-2 bg-white/[0.01] rounded-xl border border-white/[0.03] flex items-center gap-2">
                  <Globe size={12} className="text-zinc-600 shrink-0" />
                  <span className="text-xs font-mono text-zinc-600">Port {server.port}</span>
                  <WifiOff size={12} className="text-zinc-600 shrink-0 ml-auto" />
                </div>
              )}
              
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 md:gap-4 py-4 border-t border-white/[0.04] mt-auto bg-black/20 rounded-xl px-4 backdrop-blur-sm">
                <div>
                  <p className="text-purple-400/80 text-[10px] md:text-[11px] mb-1 font-bold uppercase tracking-[0.15em]">CPU</p>
                  <p className="font-mono text-white font-bold text-xs md:text-sm">{server.cpu || 100} <span className="text-zinc-500 opacity-70">%</span></p>
                </div>
                <div>
                  <p className="text-cyan-400/80 text-[10px] md:text-[11px] mb-1 font-bold uppercase tracking-[0.15em]">RAM</p>
                  <div className="font-mono text-white font-bold text-xs md:text-sm">
                    <ServerLiveStats serverId={server.id} limitRam={server.ram} status={server.status} />
                  </div>
                </div>
                <div>
                  <p className="text-orange-400/80 text-[10px] md:text-[11px] mb-1 font-bold uppercase tracking-[0.15em]">Disk</p>
                  <p className="font-mono text-white font-bold text-xs md:text-sm">{server.disk || 10} <span className="text-zinc-500 opacity-70">GB</span></p>
                </div>
                <div>
                  <p className="text-purple-400/80 text-[10px] md:text-[11px] mb-1 font-bold uppercase tracking-[0.15em]">Version</p>
                  <p className="text-white font-bold text-xs md:text-sm truncate font-mono" title={server.version}>
                    {server.type} {server.version}
                  </p>
                </div>
              </div>
            </Link>
          </motion.div>
          );
        })}
        {servers.length === 0 && (
          <motion.div variants={itemAnim} className="col-span-full py-32 flex flex-col items-center justify-center text-zinc-500 border border-dashed border-white/10 rounded-3xl bg-white/[0.01]">
            <div className="w-16 h-16 bg-white/5 rounded-2xl flex items-center justify-center mb-6 backdrop-blur-sm">
                <Server className="w-8 h-8 opacity-50" />
            </div>
            <h3 className="text-xl font-bold text-white mb-2">No Instances Running</h3>
            <p className="max-w-sm text-center mb-6 text-sm">You haven't deployed any servers yet. Create one to start managing your game instances.</p>
            {user?.role === "admin" && (
                <Link to="/servers/create" className="px-5 py-2.5 bg-white text-black font-semibold rounded-xl hover:bg-zinc-200 transition-colors shadow-lg shadow-white/10 text-sm">
                    Deploy your first server
                </Link>
            )}
          </motion.div>
        )}
      </motion.div>
    </motion.div>
  );
}
