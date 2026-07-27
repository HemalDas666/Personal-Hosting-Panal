import React, { useEffect, useState, useRef } from "react";
import axios from "axios";
import { Package, Upload, Trash2, Check, X, FileArchive, Image as ImageIcon, Link, ToggleLeft, ToggleRight } from "lucide-react";
import { motion } from "framer-motion";

const formatSize = (bytes: number) => {
  if (!bytes || bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + " " + sizes[i];
};

export default function ResourcePackManager({ serverId }: { serverId: string }) {
  const [packs, setPacks] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [currentPackUrl, setCurrentPackUrl] = useState("");
  const [requirePack, setRequirePack] = useState(false);
  const [packIcon, setPackIcon] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const fetchProps = async () => {
    setLoading(true);
    try {
      const res = await axios.get(`/api/servers/${serverId}/files?path=/`);
      const items = res.data.isFile ? [] : (res.data || []);
      const zipPacks = items.filter((f: any) => !f.isDirectory && f.name.endsWith(".zip"));
      setPacks(zipPacks);

      const iconFile = items.find((f: any) => f.name === "pack.png");
      if (iconFile) {
        setPackIcon(`/api/servers/${serverId}/files/raw/pack.png?t=${Date.now()}`);
      } else {
        setPackIcon(null);
      }
    } catch { setPacks([]); }

    try {
      const propsRes = await axios.get(`/api/servers/${serverId}/files?path=/server.properties`);
      if (propsRes.data.isFile && propsRes.data.content) {
        const c = propsRes.data.content;
        const urlMatch = c.match(/^resource-pack=(.*)$/m);
        if (urlMatch) setCurrentPackUrl(urlMatch[1].trim());
        const reqMatch = c.match(/^require-resource-pack=(.*)$/m);
        if (reqMatch) setRequirePack(reqMatch[1].trim() === "true");
      }
    } catch {}
    setLoading(false);
  };

  useEffect(() => {
    fetchProps();
  }, [serverId]);

  const showMessage = (type: "success" | "error", text: string) => {
    setMessage({ type, text });
    setTimeout(() => setMessage(null), 4000);
  };

  const handleUpload = async (file: File) => {
    if (!file.name.endsWith(".zip")) {
      showMessage("error", "Only .zip files are supported.");
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
      showMessage("success", `"${file.name}" uploaded.`);
      await fetchProps();
    } catch (e: any) {
      showMessage("error", e.response?.data?.error || "Upload failed");
    }
    setUploading(false);
    setUploadProgress(0);
  };

  const handleActivate = async (filename: string) => {
    try {
      const propsRes = await axios.get(`/api/servers/${serverId}/files?path=/server.properties`);
      let content = propsRes.data.isFile ? propsRes.data.content : "";
      const packUrl = `/api/servers/${serverId}/files/download/${encodeURIComponent(filename)}`;
      if (content.match(/^resource-pack=.*$/m)) {
        content = content.replace(/^resource-pack=.*$/m, `resource-pack=${packUrl}`);
      } else {
        content += `\nresource-pack=${packUrl}`;
      }
      await axios.post(`/api/servers/${serverId}/files/save`, {
        filePath: "/server.properties",
        content
      });
      setCurrentPackUrl(packUrl);
      showMessage("success", `Resource pack set to "${filename}". Restart server to apply.`);
    } catch (e: any) {
      showMessage("error", e.response?.data?.error || "Failed to set resource pack");
    }
  };

  const handleRemovePack = async () => {
    try {
      const propsRes = await axios.get(`/api/servers/${serverId}/files?path=/server.properties`);
      let content = propsRes.data.isFile ? propsRes.data.content : "";
      content = content.replace(/^resource-pack=.*$/m, "");
      content = content.replace(/^require-resource-pack=.*$/m, "");
      content = content.replace(/^\n+/, "");
      await axios.post(`/api/servers/${serverId}/files/save`, {
        filePath: "/server.properties",
        content
      });
      setCurrentPackUrl("");
      setRequirePack(false);
      showMessage("success", "Resource pack removed. Restart to apply.");
    } catch (e: any) {
      showMessage("error", "Failed to remove resource pack");
    }
  };

  const toggleRequire = async () => {
    try {
      const propsRes = await axios.get(`/api/servers/${serverId}/files?path=/server.properties`);
      let content = propsRes.data.isFile ? propsRes.data.content : "";
      const newVal = !requirePack;
      if (content.match(/^require-resource-pack=.*$/m)) {
        content = content.replace(/^require-resource-pack=.*$/m, `require-resource-pack=${newVal}`);
      } else {
        content += `\nrequire-resource-pack=${newVal}`;
      }
      await axios.post(`/api/servers/${serverId}/files/save`, {
        filePath: "/server.properties",
        content
      });
      setRequirePack(newVal);
      showMessage("success", `Require resource pack set to ${newVal}. Restart to apply.`);
    } catch (e: any) {
      showMessage("error", e.response?.data?.error || "Failed to toggle require pack");
    }
  };

  const handleDelete = async (name: string) => {
    if (!window.confirm(`Delete "${name}"?`)) return;
    try {
      await axios.delete(`/api/servers/${serverId}/files`, { data: { path: `/${name}` } });
      showMessage("success", `Deleted "${name}".`);
      await fetchProps();
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
            <Package className="w-5 h-5 text-white" />
          </div>
          <div>
            <h3 className="text-white font-bold text-lg">Resource Packs</h3>
            <p className="text-zinc-400 text-xs">Upload and manage Minecraft resource packs</p>
          </div>
        </div>
      </div>

      {currentPackUrl && (
        <div className="mb-4 p-4 rounded-xl bg-white/[0.03] border border-cyan-500/20">
          <div className="flex items-center gap-4 mb-3">
            <div className="w-12 h-12 rounded-xl bg-black/40 flex items-center justify-center overflow-hidden shrink-0 border border-white/10">
              {packIcon ? (
                <img src={packIcon} alt="Pack Icon" className="w-full h-full object-cover" onError={() => setPackIcon(null)} />
              ) : (
                <ImageIcon size={20} className="text-zinc-500" />
              )}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-white truncate">Active Resource Pack</p>
              <p className="text-xs text-zinc-400 font-mono truncate">{currentPackUrl}</p>
            </div>
            <button onClick={handleRemovePack} className="p-2 bg-red-500/10 hover:bg-red-500/20 text-red-400 rounded-lg transition-colors shrink-0" title="Remove Pack">
              <Trash2 size={14} />
            </button>
          </div>
          <button
            onClick={toggleRequire}
            className="flex items-center gap-3 w-full px-3 py-2.5 rounded-lg bg-white/[0.03] hover:bg-white/[0.06] border border-white/[0.06] transition-all"
          >
            {requirePack ? (
              <ToggleRight className="w-6 h-6 text-emerald-400" />
            ) : (
              <ToggleLeft className="w-6 h-6 text-zinc-500" />
            )}
            <div className="text-left">
              <p className="text-sm font-medium text-white">Require Resource Pack</p>
              <p className="text-xs text-zinc-500">
                {requirePack
                  ? "Players must accept the pack to join"
                  : "Players can choose to accept or decline"}
              </p>
            </div>
            <span className={`ml-auto text-xs font-medium px-2 py-0.5 rounded-full ${requirePack ? "bg-emerald-500/10 text-emerald-400" : "bg-zinc-500/10 text-zinc-400"}`}>
              {requirePack ? "ON" : "OFF"}
            </span>
          </button>
        </div>
      )}

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
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 text-white font-semibold text-sm hover:from-cyan-400 hover:to-blue-500 transition-all shadow-lg shadow-cyan-500/20 disabled:opacity-50"
        >
          {uploading ? (
            <>
              <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              Uploading {uploadProgress}%
            </>
          ) : (
            <>
              <Upload size={16} />
              Upload Pack (.zip)
            </>
          )}
        </button>
        <button onClick={fetchProps} className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-zinc-300 font-medium text-sm transition-all border border-white/10">
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
            <div className="h-full rounded-full bg-gradient-to-r from-cyan-500 via-blue-500 to-purple-600 transition-all duration-300" style={{ width: `${uploadProgress}%` }} />
          </div>
        </div>
      )}

      <div className="flex-1 rounded-xl border border-white/10 overflow-hidden bg-black/20">
        {loading ? (
          <div className="flex items-center justify-center h-32">
            <div className="w-8 h-8 border-2 border-cyan-500 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : packs.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-48 text-zinc-500">
            <Package className="w-12 h-12 mb-3 opacity-50" />
            <p className="text-sm font-medium">No resource packs found</p>
            <p className="text-xs mt-1">Upload a .zip resource pack to get started</p>
          </div>
        ) : (
          <div className="divide-y divide-white/5">
            {packs.map((pack) => (
              <div key={pack.name} className="flex items-center justify-between px-4 py-3 hover:bg-white/[0.03] transition-colors group">
                <div className="flex items-center gap-3 min-w-0 flex-1">
                  <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-cyan-500/20 to-purple-500/20 flex items-center justify-center">
                    <FileArchive className="w-4 h-4 text-cyan-400" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm text-zinc-200 truncate font-medium">{pack.name}</p>
                    <p className="text-xs text-zinc-500">{formatSize(pack.size || 0)}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                  {currentPackUrl.includes(encodeURIComponent(pack.name)) ? (
                    <span className="px-2 py-1 text-[10px] font-medium bg-emerald-500/10 text-emerald-400 rounded-md">ACTIVE</span>
                  ) : (
                    <button onClick={() => handleActivate(pack.name)} className="p-2 rounded-lg bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-400 transition-colors" title="Set as Active">
                      <Link size={14} />
                    </button>
                  )}
                  <button onClick={() => handleDelete(pack.name)} className="p-2 rounded-lg bg-red-500/10 hover:bg-red-500/20 text-red-400 transition-colors" title="Delete">
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
