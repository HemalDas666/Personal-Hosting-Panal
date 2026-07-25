import React, { useEffect, useState, useRef } from "react";
import axios from "axios";
import { Map, Upload, Trash2, FileArchive, Download, Globe, Check, X, Folder, Search, HardDrive, FileIcon } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

const formatSize = (bytes: number) => {
  if (!bytes || bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + " " + sizes[i];
};

interface WorldInfo {
  name: string;
  isDirectory: boolean;
  size: number;
  fileCount: number;
  hasRegionData: boolean;
}

export default function MapsManager({ serverId }: { serverId: string }) {
  const [worlds, setWorlds] = useState<WorldInfo[]>([]);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [extracting, setExtracting] = useState<string | null>(null);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [downloading, setDownloading] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const fetchWorlds = async () => {
    setLoading(true);
    try {
      const res = await axios.get(`/api/servers/${serverId}/files?path=/`);
      if (res.data.isFile) {
        setWorlds([]);
      } else {
        const items: any[] = res.data || [];
        const worldInfos: WorldInfo[] = [];
        for (const item of items) {
          if (item.isDirectory) {
            const dirName = item.name;
            try {
              const dirRes = await axios.get(`/api/servers/${serverId}/files?path=/${encodeURIComponent(dirName)}`);
              const dirFiles = dirRes.data.isFile ? [] : (dirRes.data || []);
              const totalSize = dirFiles.reduce((sum: number, f: any) => sum + (f.size || 0), 0);
              const hasRegion = dirFiles.some((f: any) => f.name === "region" || f.name === "level.dat");
              worldInfos.push({ name: dirName, isDirectory: true, size: totalSize, fileCount: dirFiles.length, hasRegionData: hasRegion });
            } catch {
              worldInfos.push({ name: dirName, isDirectory: true, size: 0, fileCount: 0, hasRegionData: false });
            }
          } else {
            worldInfos.push({ name: item.name, isDirectory: false, size: item.size || 0, fileCount: 0, hasRegionData: false });
          }
        }
        setWorlds(worldInfos);
      }
    } catch {
      setWorlds([]);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchWorlds();
  }, [serverId]);

  const showMessage = (type: "success" | "error", text: string) => {
    setMessage({ type, text });
    setTimeout(() => setMessage(null), 4000);
  };

  const handleUpload = async (file: File) => {
    if (!file.name.toLowerCase().endsWith(".zip")) {
      showMessage("error", "Only .zip files are supported for maps.");
      return;
    }
    setUploading(true);
    setUploadProgress(0);
    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("path", "/");
      await axios.post(`/api/servers/${serverId}/files/upload`, formData, {
        headers: { "Content-Type": "multipart/form-data" },
        onUploadProgress: (e) => {
          if (e.total) setUploadProgress(Math.round((e.loaded / e.total) * 100));
        },
      });
      setExtracting(file.name);
      await axios.post(`/api/servers/${serverId}/files/unzip`, { path: `/${file.name}` });
      setExtracting(null);
      showMessage("success", `Map "${file.name}" uploaded and extracted.`);
      await fetchWorlds();
    } catch (e: any) {
      showMessage("error", e.response?.data?.error || e.message || "Upload failed");
    }
    setUploading(false);
    setUploadProgress(0);
  };

  const handleDelete = async (name: string, isDir: boolean) => {
    if (!window.confirm(`Delete "${name}"? This cannot be undone.`)) return;
    try {
      if (isDir) {
        await axios.delete(`/api/servers/${serverId}/files`, { data: { paths: [`/${name}`] } });
      } else {
        await axios.delete(`/api/servers/${serverId}/files`, { data: { path: `/${name}` } });
      }
      showMessage("success", `Deleted "${name}".`);
      await fetchWorlds();
    } catch (e: any) {
      showMessage("error", e.response?.data?.error || "Delete failed");
    }
  };

  const handleDownload = async (name: string) => {
    setDownloading(name);
    try {
      const res = await axios.post(`/api/servers/${serverId}/files/zip`, {
        dirPath: "/",
        fileNames: [name],
        outputName: `${name}.zip`
      });
      const link = document.createElement("a");
      link.href = `/api/servers/${serverId}/files/download/${encodeURIComponent(`${name}.zip`)}`;
      link.download = `${name}.zip`;
      link.click();
      showMessage("success", `Downloading "${name}.zip"...`);
    } catch (e: any) {
      showMessage("error", e.response?.data?.error || "Download failed");
    }
    setDownloading(null);
  };

  const worldItems = worlds.filter(w => w.isDirectory);
  const fileItems = worlds.filter(w => !w.isDirectory);

  return (
    <div className="h-full flex flex-col p-4 md:p-6 overflow-y-auto">
      {message && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          className={`mb-4 px-4 py-3 rounded-xl text-sm font-medium flex items-center gap-2 ${
            message.type === "success"
              ? "bg-emerald-500/10 border border-emerald-500/20 text-emerald-400"
              : "bg-red-500/10 border border-red-500/20 text-red-400"
          }`}
        >
          {message.type === "success" ? <Check size={16} /> : <X size={16} />}
          {message.text}
        </motion.div>
      )}

      <div className="mb-6 p-4 rounded-xl bg-gradient-to-br from-cyan-500/10 via-blue-500/10 to-purple-600/10 border border-cyan-500/20">
        <div className="flex items-center gap-3 mb-2">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center shadow-lg shadow-cyan-500/20">
            <Map className="w-5 h-5 text-white" />
          </div>
          <div>
            <h3 className="text-white font-bold text-lg">Worlds & Maps</h3>
            <p className="text-zinc-400 text-xs">Upload, download, and manage your Minecraft worlds</p>
          </div>
        </div>
      </div>

      <div className="flex items-center gap-3 mb-4 flex-wrap">
        <input
          type="file"
          ref={fileInputRef}
          accept=".zip"
          className="hidden"
          onChange={(e) => {
            if (e.target.files?.[0]) handleUpload(e.target.files[0]);
            if (fileInputRef.current) fileInputRef.current.value = "";
          }}
        />
        <button
          onClick={() => fileInputRef.current?.click()}
          disabled={uploading}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 text-white font-semibold text-sm hover:from-cyan-400 hover:to-blue-500 transition-all shadow-lg shadow-cyan-500/20 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {uploading ? (
            <>
              <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              Uploading {uploadProgress}%
            </>
          ) : (
            <>
              <Upload size={16} />
              Upload World (.zip)
            </>
          )}
        </button>
        <button
          onClick={fetchWorlds}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-zinc-300 font-medium text-sm transition-all border border-white/10"
        >
          <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M21 2v6h-6M3 12a9 9 0 0 1 15-6.7L21 8M3 22v-6h6M21 12a9 9 0 0 1-15 6.7L3 16" />
          </svg>
          Refresh
        </button>
      </div>

      {uploading && (
        <div className="mb-4 p-3 rounded-xl bg-white/5 border border-cyan-500/20">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-zinc-300">Uploading...</span>
            <span className="text-xs text-cyan-400">{uploadProgress}%</span>
          </div>
          <div className="w-full h-1.5 rounded-full bg-white/10 overflow-hidden">
            <div
              className="h-full rounded-full bg-gradient-to-r from-cyan-500 via-blue-500 to-purple-600 transition-all duration-300"
              style={{ width: `${uploadProgress}%` }}
            />
          </div>
        </div>
      )}

      {extracting && (
        <div className="mb-4 p-3 rounded-xl bg-purple-500/10 border border-purple-500/20 flex items-center gap-3">
          <div className="w-4 h-4 border-2 border-purple-500/30 border-t-purple-500 rounded-full animate-spin" />
          <span className="text-sm text-purple-300">Extracting {extracting}...</span>
        </div>
      )}

      <div className="flex-1 overflow-y-auto custom-scrollbar space-y-4">
        {loading ? (
          <div className="flex items-center justify-center h-32">
            <div className="w-8 h-8 border-2 border-cyan-500 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : worlds.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-48 text-zinc-500 rounded-xl border border-white/10 bg-black/20">
            <Globe className="w-12 h-12 mb-3 opacity-50" />
            <p className="text-sm font-medium">No worlds or maps found</p>
            <p className="text-xs mt-1">Upload a .zip file containing a Minecraft world</p>
          </div>
        ) : (
          <>
            {worldItems.length > 0 && (
              <div>
                <h4 className="text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-3 px-1">Worlds</h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {worldItems.map((world) => (
                    <div
                      key={world.name}
                      className="p-4 rounded-xl bg-gradient-to-br from-white/[0.03] to-white/[0.01] border border-white/10 hover:border-cyan-500/30 transition-all group"
                    >
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex items-center gap-3">
                          <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                            world.hasRegionData
                              ? "bg-gradient-to-br from-emerald-500/20 to-cyan-500/20"
                              : "bg-gradient-to-br from-zinc-500/20 to-zinc-600/20"
                          }`}>
                            {world.hasRegionData
                              ? <Globe className="w-5 h-5 text-emerald-400" />
                              : <Folder className="w-5 h-5 text-zinc-400" />
                            }
                          </div>
                          <div>
                            <p className="text-sm text-zinc-200 font-medium truncate max-w-[150px]">{world.name}</p>
                            <p className="text-xs text-zinc-500">
                              {world.fileCount} files &middot; {formatSize(world.size)}
                            </p>
                          </div>
                        </div>
                      </div>
                      {world.hasRegionData && (
                        <div className="mb-3">
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 text-[10px] font-medium border border-emerald-500/20">
                            <HardDrive size={10} />
                            World Data Detected
                          </span>
                        </div>
                      )}
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => handleDownload(world.name)}
                          disabled={downloading === world.name}
                          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-400 text-xs font-medium transition-all border border-cyan-500/20 disabled:opacity-50"
                        >
                          {downloading === world.name ? (
                            <div className="w-3 h-3 border-2 border-cyan-500/30 border-t-cyan-500 rounded-full animate-spin" />
                          ) : (
                            <Download size={12} />
                          )}
                          Download
                        </button>
                        <button
                          onClick={() => handleDelete(world.name, true)}
                          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-red-500/10 hover:bg-red-500/20 text-red-400 text-xs font-medium transition-all border border-red-500/20"
                        >
                          <Trash2 size={12} />
                          Delete
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {fileItems.length > 0 && (
              <div>
                <h4 className="text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-3 px-1 mt-4">Archives</h4>
                <div className="rounded-xl border border-white/10 overflow-hidden bg-black/20">
                  {fileItems.map((file) => (
                    <div
                      key={file.name}
                      className="flex items-center justify-between px-4 py-3 hover:bg-white/[0.03] transition-colors group border-b border-white/5 last:border-b-0"
                    >
                      <div className="flex items-center gap-3 min-w-0 flex-1">
                        <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-cyan-500/20 to-purple-500/20 flex items-center justify-center">
                          <FileArchive className="w-4 h-4 text-cyan-400" />
                        </div>
                        <div className="min-w-0">
                          <p className="text-sm text-zinc-200 truncate font-medium">{file.name}</p>
                          <p className="text-xs text-zinc-500">{formatSize(file.size)}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => handleDownload(file.name.replace(".zip", ""))}
                          className="p-2 rounded-lg bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-400 transition-colors"
                          title="Download"
                        >
                          <Download size={14} />
                        </button>
                        <button
                          onClick={() => handleDelete(file.name, false)}
                          className="p-2 rounded-lg bg-red-500/10 hover:bg-red-500/20 text-red-400 transition-colors"
                          title="Delete"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
