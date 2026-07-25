import React, { useEffect, useState, useRef } from "react";
import axios from "axios";
import { Map, Upload, Trash2, FileArchive, Download, Globe, Check, X, Folder } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { LoadingOverlay } from "./LoadingOverlay";

const MAP_EXTENSIONS = [".zip", ".world", ".schematic", ".schem", ".mcworld", ".mctemplate"];
const isMapFile = (name: string) => MAP_EXTENSIONS.some(ext => name.toLowerCase().endsWith(ext));
const isZipFile = (name: string) => name.toLowerCase().endsWith(".zip");

const formatSize = (bytes: number) => {
  if (!bytes || bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + " " + sizes[i];
};

export default function MapsManager({ serverId }: { serverId: string }) {
  const [files, setFiles] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [extracting, setExtracting] = useState<string | null>(null);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const fetchMaps = async () => {
    setLoading(true);
    try {
      const res = await axios.get(`/api/servers/${serverId}/files?path=/`);
      if (res.data.isFile) {
        setFiles([]);
      } else {
        const mapFiles = (res.data || []).filter((f: any) => !f.isDirectory || isMapFile(f.name));
        setFiles(mapFiles);
      }
    } catch {
      setFiles([]);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchMaps();
  }, [serverId]);

  const showMessage = (type: "success" | "error", text: string) => {
    setMessage({ type, text });
    setTimeout(() => setMessage(null), 4000);
  };

  const handleUpload = async (file: File) => {
    if (!isZipFile(file.name)) {
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

      showMessage("success", `Map "${file.name}" uploaded and extracted successfully.`);
      await fetchMaps();
    } catch (e: any) {
      showMessage("error", e.response?.data?.error || e.message || "Upload failed");
    }
    setUploading(false);
    setUploadProgress(0);
  };

  const handleDelete = async (name: string) => {
    try {
      await axios.delete(`/api/servers/${serverId}/files`, { data: { path: `/${name}` } });
      showMessage("success", `Deleted "${name}".`);
      await fetchMaps();
    } catch (e: any) {
      showMessage("error", e.response?.data?.error || "Delete failed");
    }
  };

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
            <h3 className="text-white font-bold text-lg">Maps</h3>
            <p className="text-zinc-400 text-xs">Upload and manage your game world maps</p>
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
              Upload Map (.zip)
            </>
          )}
        </button>
        <button
          onClick={fetchMaps}
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

      <div className="flex-1 rounded-xl border border-white/10 overflow-hidden bg-black/20">
        {loading ? (
          <div className="flex items-center justify-center h-32">
            <div className="w-8 h-8 border-2 border-cyan-500 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : files.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-48 text-zinc-500">
            <Map className="w-12 h-12 mb-3 opacity-50" />
            <p className="text-sm font-medium">No maps found</p>
            <p className="text-xs mt-1">Upload a .zip map file to get started</p>
          </div>
        ) : (
          <div className="divide-y divide-white/5">
            {files.map((file) => (
              <div
                key={file.name}
                className="flex items-center justify-between px-4 py-3 hover:bg-white/[0.03] transition-colors group"
              >
                <div className="flex items-center gap-3 min-w-0 flex-1">
                  <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${
                    isZipFile(file.name)
                      ? "bg-gradient-to-br from-cyan-500/20 to-blue-500/20"
                      : "bg-gradient-to-br from-purple-500/20 to-emerald-500/20"
                  }`}>
                    {isZipFile(file.name)
                      ? <FileArchive className="w-4 h-4 text-cyan-400" />
                      : <Folder className="w-4 h-4 text-purple-400" />
                    }
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm text-zinc-200 truncate font-medium">{file.name}</p>
                    <p className="text-xs text-zinc-500">
                      {isZipFile(file.name) ? "Archive" : "Directory"} &middot; {formatSize(file.size || 0)}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button
                    onClick={() => handleDelete(file.name)}
                    className="p-2 rounded-lg bg-red-500/10 hover:bg-red-500/20 text-red-400 transition-colors"
                    title="Delete"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
