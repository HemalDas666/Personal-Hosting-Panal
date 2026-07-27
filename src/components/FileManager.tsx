import React, { useEffect, useState, useCallback, useRef } from "react";
import { LoadingOverlay } from "../components/LoadingOverlay";
import axios from "axios";
import { Folder, File, ArrowLeft, Upload, Trash2, Edit2, Save, Archive, Search, X, CheckSquare, Square, Download } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

const EXTENSIONS = [".txt", ".json", ".yml", ".yaml", ".properties", ".log", ".xml", ".toml", ".cfg", ".conf", ".ini", ".sh", ".bat", ".env", ".md"];

function highlightSyntax(code: string, fileName: string): React.ReactNode[] {
  const ext = fileName.split(".").pop()?.toLowerCase();
  const lines = code.split("\n");
  return lines.map((line, i) => {
    let tokens: React.ReactNode[] = [];
    if (ext === "json") {
      const parts = line.split(/(".*?"\s*:)/g);
      parts.forEach((part, j) => {
        if (part.match(/^".*?"\s*:$/)) {
          tokens.push(<span key={j} className="text-blue-300">{part}</span>);
        } else if (part.match(/^".*?"$/)) {
          tokens.push(<span key={j} className="text-emerald-300">{part}</span>);
        } else {
          const numParts = part.split(/(\b\d+\.?\d*\b)/g);
          numParts.forEach((np, k) => {
            if (/^\d+\.?\d*$/.test(np)) {
              tokens.push(<span key={`${j}-${k}`} className="text-amber-300">{np}</span>);
            } else {
              const boolParts = np.split(/\b(true|false|null)\b/g);
              boolParts.forEach((bp, l) => {
                if (/^(true|false|null)$/.test(bp)) {
                  tokens.push(<span key={`${j}-${k}-${l}`} className="text-purple-300">{bp}</span>);
                } else {
                  tokens.push(bp);
                }
              });
            }
          });
        }
      });
    } else if (ext === "yml" || ext === "yaml") {
      if (line.match(/^\s*#/)) {
        tokens.push(<span key={0} className="text-zinc-500 italic">{line}</span>);
      } else {
        const parts = line.split(/(:.*)/);
        parts.forEach((part, j) => {
          if (j === 0 && part.trim()) {
            tokens.push(<span key={j} className="text-cyan-300">{part}</span>);
          } else if (part.startsWith(":")) {
            const valParts = part.split(/(#.*)/);
            valParts.forEach((vp, k) => {
              if (vp.startsWith("#")) {
                tokens.push(<span key={`${j}-${k}`} className="text-zinc-500 italic">{vp}</span>);
              } else {
                const strMatch = vp.match(/(["'])(.*?)\1/);
                if (strMatch) {
                  const before = vp.substring(0, vp.indexOf(strMatch[0]));
                  if (before) tokens.push(<span key={`${j}-${k}-b`}>{before}</span>);
                  tokens.push(<span key={`${j}-${k}-s`} className="text-emerald-300">{strMatch[0]}</span>);
                  const after = vp.substring(vp.indexOf(strMatch[0]) + strMatch[0].length);
                  if (after) tokens.push(<span key={`${j}-${k}-a`}>{after}</span>);
                } else {
                  tokens.push(vp);
                }
              }
            });
          } else {
            tokens.push(part);
          }
        });
      }
    } else if (ext === "properties") {
      if (line.startsWith("#") || line.startsWith("!")) {
        tokens.push(<span key={0} className="text-zinc-500 italic">{line}</span>);
      } else if (line.includes("=")) {
        const eqIdx = line.indexOf("=");
        tokens.push(<span key={0} className="text-cyan-300">{line.substring(0, eqIdx)}</span>);
        tokens.push(<span key={1} className="text-zinc-500">=</span>);
        tokens.push(<span key={2} className="text-emerald-300">{line.substring(eqIdx + 1)}</span>);
      } else {
        tokens.push(line);
      }
    } else {
      tokens.push(line);
    }
    return <div key={i} className="whitespace-pre">{tokens}</div>;
  });
}

export default function FileManager({ serverId }: { serverId: string }) {
  const [files, setFiles] = useState<any[]>([]);
  const [path, setPath] = useState("/");
  const [editingFile, setEditingFile] = useState<string | null>(null);
  const [fileContent, setFileContent] = useState("");
  const [renamingFile, setRenamingFile] = useState<string | null>(null);
  const [newName, setNewName] = useState("");
  const [uploadProgress, setUploadProgress] = useState<number | null>(null);
  const [deletingFile, setDeletingFile] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedFiles, setSelectedFiles] = useState<Set<string>>(new Set());
  const [isUnzipping, setIsUnzipping] = useState(false);
  const [isZipping, setIsZipping] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [showFind, setShowFind] = useState(false);
  const [showReplace, setShowReplace] = useState(false);
  const [findText, setFindText] = useState("");
  const [replaceText, setReplaceText] = useState("");
  const [matchIndex, setMatchIndex] = useState(0);
  const [matchCount, setMatchCount] = useState(0);
  const editorRef = useRef<HTMLTextAreaElement>(null);
  const findInputRef = useRef<HTMLInputElement>(null);

  const getMatches = useCallback(() => {
    if (!findText || !fileContent) return [];
    const indices: number[] = [];
    const lowerContent = fileContent.toLowerCase();
    const lowerFind = findText.toLowerCase();
    let pos = 0;
    while (true) {
      const idx = lowerContent.indexOf(lowerFind, pos);
      if (idx === -1) break;
      indices.push(idx);
      pos = idx + lowerFind.length;
    }
    return indices;
  }, [findText, fileContent]);

  useEffect(() => {
    const m = getMatches();
    setMatchCount(m.length);
    if (matchIndex >= m.length) setMatchIndex(0);
  }, [getMatches, findText, fileContent]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (!editingFile) return;
      if (e.ctrlKey && e.key === "f") {
        e.preventDefault();
        setShowFind(true);
        setShowReplace(false);
        setTimeout(() => findInputRef.current?.focus(), 50);
      }
      if (e.ctrlKey && e.key === "h") {
        e.preventDefault();
        setShowFind(true);
        setShowReplace(true);
        setTimeout(() => findInputRef.current?.focus(), 50);
      }
      if (e.key === "Escape") {
        setShowFind(false);
        setShowReplace(false);
      }
      if (e.ctrlKey && e.key === "s") {
        e.preventDefault();
        saveFile();
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [editingFile]);

  const fetchFiles = async () => {
    try {
      const res = await axios.get(`/api/servers/${serverId}/files?path=${encodeURIComponent(path)}`);
      if (res.data.isFile) {
        setFileContent(res.data.content);
      } else {
        setFiles(res.data);
      }
    } catch (e) {
      setFiles([]);
    }
  };

  useEffect(() => {
    fetchFiles();
    setSelectedFiles(new Set());
    setSearchQuery("");
  }, [path, serverId]);

  const goUp = () => {
    if (editingFile) {
      setShowFind(false);
      setShowReplace(false);
      setEditingFile(null);
      return;
    }
    if (path === "/") return;
    const parts = path.split("/").filter(Boolean);
    parts.pop();
    setPath("/" + parts.join("/"));
  };

  const traverse = (dirName: string) => {
    setPath(path.endsWith("/") ? path + dirName : path + "/" + dirName);
  };

  const openFile = async (name: string) => {
    if (!EXTENSIONS.some(ext => name.toLowerCase().endsWith(ext))) {
      alert("Only text formats are supported for editing.");
      return;
    }
    const fullPath = path.endsWith("/") ? path + name : path + "/" + name;
    try {
      const res = await axios.get(`/api/servers/${serverId}/files?path=${encodeURIComponent(fullPath)}`);
      if (res.data.isFile) {
        setEditingFile(name);
        setFileContent(res.data.content);
        setShowFind(false);
        setShowReplace(false);
        setFindText("");
        setReplaceText("");
        setMatchIndex(0);
      }
    } catch (e) {
      alert("Failed to load file");
    }
  };

  const saveFile = async () => {
    setIsSaving(true);
    try {
      const fullPath = path.endsWith("/") ? path + editingFile : path + "/" + editingFile;
      await axios.post(`/api/servers/${serverId}/files/save`, {
        filePath: fullPath,
        content: fileContent
      });
    } catch(e) {
      console.error("Failed to save file.", e);
    } finally {
      setIsSaving(false);
    }
  };

  const handleFindNext = () => {
    const m = getMatches();
    if (m.length === 0) return;
    const next = (matchIndex + 1) % m.length;
    setMatchIndex(next);
    scrollToMatch(m[next]);
  };

  const handleFindPrev = () => {
    const m = getMatches();
    if (m.length === 0) return;
    const prev = (matchIndex - 1 + m.length) % m.length;
    setMatchIndex(prev);
    scrollToMatch(m[prev]);
  };

  const scrollToMatch = (idx: number) => {
    if (!editorRef.current) return;
    const textBefore = fileContent.substring(0, idx);
    const lines = textBefore.split("\n");
    const lineNum = lines.length;
    const lineHeight = 21;
    editorRef.current.scrollTop = Math.max(0, (lineNum - 5) * lineHeight);
    editorRef.current.focus();
  };

  const handleReplace = () => {
    const m = getMatches();
    if (m.length === 0 || matchIndex >= m.length) return;
    const idx = m[matchIndex];
    const newContent = fileContent.substring(0, idx) + replaceText + fileContent.substring(idx + findText.length);
    setFileContent(newContent);
    const newMatches = getMatches();
    if (newMatches.length === 0) {
      setMatchIndex(0);
    } else if (matchIndex >= newMatches.length) {
      setMatchIndex(newMatches.length - 1);
    }
  };

  const handleReplaceAll = () => {
    if (!findText) return;
    const escaped = findText.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const regex = new RegExp(escaped, "gi");
    setFileContent(fileContent.replace(regex, replaceText));
  };

  const deleteSelectedFiles = async () => {
    if (selectedFiles.size === 0) return;
    if (!window.confirm(`Are you sure you want to delete ${selectedFiles.size} items?`)) return;
    try {
      const p = path.endsWith("/") ? path : path + "/";
      const pathsToDelete = Array.from(selectedFiles).map(name => p + name);
      setDeletingFile("multiple");
      await axios.delete(`/api/servers/${serverId}/files`, {
        data: { paths: pathsToDelete }
      });
      setSelectedFiles(new Set());
      fetchFiles();
    } catch(e) {
      console.error("Failed to delete files", e);
      alert("Failed to delete files");
    } finally {
      setDeletingFile(null);
    }
  };

  const handleRenameSelected = () => {
    if (selectedFiles.size !== 1) return;
    const name = Array.from(selectedFiles)[0];
    setRenamingFile(name);
    setNewName(name);
  };

  const handleRename = async (oldName: string) => {
    if(!newName.trim() || newName === oldName) {
      setRenamingFile(null);
      return;
    }
    try {
      const p = path.endsWith("/") ? path : path + "/";
      await axios.post(`/api/servers/${serverId}/files/rename`, {
        oldPath: p + oldName,
        newPath: p + newName
      });
      setRenamingFile(null);
      fetchFiles();
    } catch(e) {
      console.error("Failed to rename", e);
    }
  };

  const handleUnzipSelected = async () => {
    if (selectedFiles.size !== 1) return;
    const name = Array.from(selectedFiles)[0];
    setIsUnzipping(true);
    try {
      const p = path.endsWith("/") ? path : path + "/";
      await axios.post(`/api/servers/${serverId}/files/unzip`, {
        path: p + name
      });
      setSelectedFiles(new Set());
      fetchFiles();
    } catch(e) {
      console.error("Failed to unzip", e);
    } finally {
      setIsUnzipping(false);
    }
  };

  const handleZipSelected = async () => {
    if (selectedFiles.size === 0) return;
    const outputName = prompt("Enter archive name:", "archive.zip");
    if (!outputName) return;
    setIsZipping(true);
    try {
      const p = path.endsWith("/") ? path : path + "/";
      await axios.post(`/api/servers/${serverId}/files/zip`, {
        dirPath: p,
        fileNames: Array.from(selectedFiles),
        outputName: outputName.endsWith(".zip") ? outputName : outputName + ".zip"
      });
      setSelectedFiles(new Set());
      fetchFiles();
    } catch (e) {
      console.error("Failed to zip files", e);
    } finally {
      setIsZipping(false);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return;
    const file = e.target.files[0];
    const formData = new FormData();
    formData.append("file", file);
    formData.append("path", path);
    try {
      setUploadProgress(0);
      await axios.post(`/api/servers/${serverId}/files/upload`, formData, {
        headers: { "Content-Type": "multipart/form-data" },
        onUploadProgress: (progressEvent) => {
          if (progressEvent.total) {
            const percentCompleted = Math.round((progressEvent.loaded * 100) / progressEvent.total);
            setUploadProgress(percentCompleted);
          }
        }
      });
      fetchFiles();
    } catch (err) {
      console.error("Upload failed", err);
    } finally {
      setUploadProgress(null);
      e.target.value = "";
    }
  };

  const toggleSelectAll = () => {
    if (selectedFiles.size === filteredFiles.length) {
      setSelectedFiles(new Set());
    } else {
      setSelectedFiles(new Set(filteredFiles.map(f => f.name)));
    }
  };

  const toggleSelectFile = (name: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const newSet = new Set(selectedFiles);
    if (newSet.has(name)) {
      newSet.delete(name);
    } else {
      newSet.add(name);
    }
    setSelectedFiles(newSet);
  };

  const filteredFiles = files.filter(f => f.name.toLowerCase().includes(searchQuery.toLowerCase()));

  const handleTextareaChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setFileContent(e.target.value);
  };

  const lineCount = fileContent.split("\n").length;
  const matches = getMatches();
  const currentMatchStart = matches.length > 0 ? matches[matchIndex] : -1;

  return (
    <div className="flex-1 flex flex-col overflow-hidden relative min-h-0 h-full w-full bg-transparent p-4 md:p-6">
      <div className="p-4 md:p-6 mb-6 flex flex-col sm:flex-row items-center justify-between bg-black/40 backdrop-blur-xl rounded-3xl border border-white/10 shrink-0 gap-4 shadow-[0_0_40px_-15px_rgba(0,0,0,0.5)] ring-1 ring-white/5">
        <div className="flex items-center justify-between w-full sm:w-auto">
          <div className="flex items-center space-x-3">
            <button onClick={goUp} disabled={path === "/" && !editingFile} className="p-2 bg-gray-800/60 hover:bg-gray-700/60 rounded-lg text-gray-300 disabled:opacity-50 transition-colors">
              <ArrowLeft size={18} />
            </button>
            <div className="font-mono text-sm font-bold text-white bg-black/60 px-4 py-2 rounded-xl border border-white/10 backdrop-blur-md shadow-inner max-w-[150px] sm:max-w-xs truncate tracking-tight">
              {editingFile ? `Editing: ${editingFile}` : path}
            </div>
          </div>
          <div className="flex sm:hidden items-center space-x-2">
            {!editingFile ? (
              <div className="relative">
                {uploadProgress !== null ? (
                  <div className="flex items-center justify-center w-8 h-8 bg-cyan-600/50 rounded-lg border border-cyan-500/50 text-white">
                    <div className="w-4 h-4 rounded-full border-2 border-cyan-200 border-t-transparent animate-spin"></div>
                  </div>
                ) : (
                  <label className="flex items-center justify-center w-8 h-8 bg-cyan-600/90 hover:bg-cyan-500/90 rounded-lg text-white transition-colors cursor-pointer">
                    <input type="file" onChange={handleFileUpload} className="hidden" />
                    <Upload size={16} />
                  </label>
                )}
              </div>
            ) : (
              <button disabled={isSaving} onClick={saveFile} className="flex items-center justify-center w-8 h-8 bg-blue-600 hover:bg-blue-500 rounded-lg text-white transition-colors disabled:opacity-50">
                {isSaving ? <div className="w-4 h-4 rounded-full border-2 border-white/50 border-t-white animate-spin"></div> : <Save size={16} />}
              </button>
            )}
          </div>
        </div>
        {!editingFile && (
          <div className="flex-1 w-full px-0 sm:px-4 order-last sm:order-none">
            <div className="relative w-full max-w-2xl mx-auto shadow-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
              <input
                type="text"
                placeholder="Search files..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="w-full bg-gray-900 border border-gray-600 rounded-full py-2.5 pl-10 pr-4 text-sm text-gray-200 focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 transition-all shadow-inner"
              />
            </div>
          </div>
        )}
        {!editingFile ? (
          <div className="relative hidden sm:block">
            {uploadProgress !== null ? (
              <div className="flex items-center space-x-2 px-4 py-2 bg-cyan-600/50 rounded-lg text-sm font-medium border border-cyan-500/50 text-white">
                <div className="w-4 h-4 rounded-full border-2 border-cyan-200 border-t-transparent animate-spin mr-1"></div>
                <span>{uploadProgress === 100 ? "Processing..." : `${uploadProgress}%`}</span>
              </div>
            ) : (
              <label className="flex items-center space-x-2 px-4 py-2.5 bg-cyan-600/90 hover:bg-cyan-500/90 rounded-full text-sm font-medium text-white transition-colors backdrop-blur-sm shadow-lg shadow-cyan-500/20 cursor-pointer">
                <input type="file" onChange={handleFileUpload} className="hidden" />
                <Upload size={16} /> <span>Upload</span>
              </label>
            )}
          </div>
        ) : (
          <div className="hidden sm:flex items-center space-x-2">
            <button onClick={() => { setShowFind(!showFind); setShowReplace(false); }} className={`p-2.5 rounded-lg text-sm font-medium transition-all border ${showFind ? 'bg-cyan-500/20 text-cyan-300 border-cyan-500/30' : 'bg-white/5 text-zinc-400 border-white/10 hover:bg-white/10'}`} title="Find (Ctrl+F)">
              <Search size={16} />
            </button>
            <button onClick={() => { setShowFind(true); setShowReplace(!showReplace); }} className={`p-2.5 rounded-lg text-sm font-medium transition-all border ${showReplace ? 'bg-purple-500/20 text-purple-300 border-purple-500/30' : 'bg-white/5 text-zinc-400 border-white/10 hover:bg-white/10'}`} title="Replace (Ctrl+H)">
              <Edit2 size={16} />
            </button>
            <button disabled={isSaving} onClick={saveFile} className="flex items-center space-x-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-500 rounded-full text-sm font-medium text-white transition-colors shadow-lg shadow-blue-500/20 disabled:opacity-50">
              {isSaving ? <div className="w-4 h-4 rounded-full border-2 border-white/50 border-t-white animate-spin"></div> : <Save size={16} />}
              <span>{isSaving ? "Saving..." : "Save"}</span>
            </button>
          </div>
        )}
      </div>

      <div className="flex-1 overflow-y-auto p-4 custom-scrollbar flex flex-col min-h-0 relative">
        <AnimatePresence mode="wait">
          {editingFile ? (
            <motion.div
              key="editor"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex-1 flex flex-col min-h-0"
            >
              {(showFind || showReplace) && (
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="mb-3 p-3 rounded-xl bg-gray-900/80 border border-gray-700/50 space-y-2"
                >
                  <div className="flex items-center gap-2">
                    <div className="relative flex-1">
                      <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" />
                      <input
                        ref={findInputRef}
                        type="text"
                        value={findText}
                        onChange={(e) => { setFindText(e.target.value); setMatchIndex(0); }}
                        onKeyDown={(e) => { if (e.key === "Enter") handleFindNext(); }}
                        placeholder="Find..."
                        className="w-full bg-gray-950 border border-gray-700 rounded-lg py-1.5 pl-9 pr-4 text-sm text-white focus:outline-none focus:border-cyan-500/50"
                      />
                    </div>
                    <span className="text-xs text-zinc-500 min-w-[60px] text-right">
                      {findText ? `${matchIndex + 1}/${matchCount}` : ""}
                    </span>
                    <button onClick={handleFindPrev} disabled={!findText || matchCount === 0} className="p-1.5 bg-gray-800 hover:bg-gray-700 rounded text-zinc-400 hover:text-white transition-colors disabled:opacity-30">
                      <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path d="M5 15l7-7 7 7"/></svg>
                    </button>
                    <button onClick={handleFindNext} disabled={!findText || matchCount === 0} className="p-1.5 bg-gray-800 hover:bg-gray-700 rounded text-zinc-400 hover:text-white transition-colors disabled:opacity-30">
                      <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path d="M19 9l-7 7-7-7"/></svg>
                    </button>
                    <button onClick={() => { setShowFind(false); setShowReplace(false); }} className="p-1.5 bg-gray-800 hover:bg-gray-700 rounded text-zinc-400 hover:text-white transition-colors">
                      <X size={14} />
                    </button>
                  </div>
                  {showReplace && (
                    <div className="flex items-center gap-2">
                      <div className="relative flex-1">
                        <Edit2 size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" />
                        <input
                          type="text"
                          value={replaceText}
                          onChange={(e) => setReplaceText(e.target.value)}
                          onKeyDown={(e) => { if (e.key === "Enter") handleReplace(); }}
                          placeholder="Replace with..."
                          className="w-full bg-gray-950 border border-gray-700 rounded-lg py-1.5 pl-9 pr-4 text-sm text-white focus:outline-none focus:border-purple-500/50"
                        />
                      </div>
                      <button onClick={handleReplace} disabled={!findText || matchCount === 0} className="px-2.5 py-1.5 bg-purple-600/80 hover:bg-purple-600 rounded-lg text-xs font-medium text-white transition-colors disabled:opacity-30">
                        Replace
                      </button>
                      <button onClick={handleReplaceAll} disabled={!findText} className="px-2.5 py-1.5 bg-purple-600/80 hover:bg-purple-600 rounded-lg text-xs font-medium text-white transition-colors disabled:opacity-30">
                        All
                      </button>
                    </div>
                  )}
                </motion.div>
              )}
              <div className="flex-1 flex min-h-0 relative">
                <div className="select-none text-right pr-3 py-4 text-gray-600 text-xs leading-[21px] font-mono border-r border-gray-800/50 mr-0 min-w-[3rem] overflow-hidden bg-gray-950/30">
                  {Array.from({ length: Math.max(lineCount, 1) }, (_, i) => (
                    <div key={i} className="pr-1">{i + 1}</div>
                  ))}
                </div>
                <div className="flex-1 relative">
                  <div className="absolute inset-0 p-4 text-gray-200 font-mono text-sm leading-[21px] whitespace-pre-wrap break-all pointer-events-none z-0 overflow-hidden">
                    {highlightSyntax(fileContent, editingFile || "")}
                  </div>
                  <textarea
                    ref={editorRef}
                    value={fileContent}
                    onChange={handleTextareaChange}
                    className="absolute inset-0 w-full h-full bg-transparent text-transparent caret-white font-mono text-sm leading-[21px] focus:outline-none resize-none custom-scrollbar min-h-0 p-4 z-10"
                    spellCheck={false}
                    onScroll={(e) => {
                      const lineGutter = e.currentTarget.parentElement?.previousElementSibling;
                      if (lineGutter) {
                        lineGutter.scrollTop = e.currentTarget.scrollTop;
                      }
                    }}
                  />
                </div>
              </div>
              <div className="mt-2 text-center">
                <span className="text-[10px] text-zinc-600 font-mono">
                  Ctrl+F Find &middot; Ctrl+H Replace &middot; Ctrl+S Save &middot; Esc Close
                </span>
              </div>
            </motion.div>
          ) : (
            <motion.div
              key="filelist"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex-1"
            >
              {filteredFiles.length > 0 && (
                <div className="flex items-center px-3 py-2 mb-2 border-b border-gray-700/50">
                  <button onClick={toggleSelectAll} className="text-gray-400 hover:text-white mr-4 transition-colors">
                    {selectedFiles.size === filteredFiles.length ? <CheckSquare size={18} className="text-cyan-400" /> : <Square size={18} />}
                  </button>
                  <span className="text-xs font-medium text-gray-400 uppercase tracking-wider">Name</span>
                </div>
              )}
              {filteredFiles.length === 0 && <p className="text-gray-400 text-sm text-center py-10">Directory is empty or no files match search.</p>}
              {filteredFiles.map(f => {
                const isSelected = selectedFiles.has(f.name);
                return (
                  <div
                    key={f.name}
                    onClick={(e) => toggleSelectFile(f.name, e)}
                    className={`flex items-center justify-between p-3 rounded-xl group transition-all cursor-pointer mb-1 border ${isSelected ? 'bg-cyan-500/10 border-cyan-500/30' : 'bg-gray-800/20 border-transparent hover:bg-gray-800/60 hover:border-gray-700/50'}`}
                  >
                    <div className="flex items-center space-x-4 flex-1 overflow-hidden">
                      <button onClick={(e) => toggleSelectFile(f.name, e)} className={`transition-colors shrink-0 ${isSelected ? 'text-cyan-400' : 'text-gray-500 group-hover:text-gray-400'}`}>
                        {isSelected ? <CheckSquare size={18} /> : <Square size={18} />}
                      </button>
                      <div className="flex items-center space-x-3 flex-1 overflow-hidden hover:opacity-80 transition-opacity" onClick={(e) => { e.stopPropagation(); f.isDirectory ? traverse(f.name) : openFile(f.name); }}>
                        {f.isDirectory ? <Folder className="text-blue-400 shrink-0" size={20} /> : <File className="text-gray-400 shrink-0" size={20} />}
                        {renamingFile === f.name ? (
                          <input
                            autoFocus
                            type="text"
                            value={newName}
                            onClick={e => e.stopPropagation()}
                            onChange={e => setNewName(e.target.value)}
                            onBlur={() => handleRename(f.name)}
                            onKeyDown={e => e.key === 'Enter' && handleRename(f.name)}
                            className="bg-gray-900/80 border border-gray-600 rounded px-2 py-1 text-sm text-white focus:outline-none focus:border-cyan-500/50 w-full"
                          />
                        ) : (
                          <span className="font-medium text-gray-200 text-sm truncate">{f.name}</span>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center space-x-2 md:space-x-4 pl-4 shrink-0">
                      {!f.isDirectory && <span className="hidden sm:block text-xs text-gray-400 w-16 text-right">{(f.size/1024).toFixed(1)} KB</span>}
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setRenamingFile(f.name);
                          setNewName(f.name);
                          setSelectedFiles(new Set());
                        }}
                        className="opacity-0 group-hover:opacity-100 p-1.5 bg-white/5 hover:bg-blue-500/20 rounded-lg text-zinc-400 hover:text-blue-400 transition-all"
                        title="Rename"
                      >
                        <Edit2 size={13} />
                      </button>
                    </div>
                  </div>
                );
              })}
            </motion.div>
          )}
        </AnimatePresence>

        <AnimatePresence>
          {selectedFiles.size > 0 && !editingFile && (
            <motion.div
              initial={{ opacity: 0, y: 50 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 50 }}
              className="absolute bottom-6 left-1/2 -translate-x-1/2 bg-gray-800/90 backdrop-blur-xl border border-gray-700/50 rounded-2xl shadow-2xl p-2 flex items-center space-x-2 z-10"
            >
              <span className="px-3 text-sm font-medium text-gray-300">
                {selectedFiles.size} selected
              </span>
              <div className="h-6 w-px bg-gray-700"></div>
              {selectedFiles.size === 1 && (
                <>
                  <button onClick={handleRenameSelected} className="p-2 text-gray-400 hover:text-blue-400 hover:bg-gray-700/50 rounded-lg transition-colors" title="Rename">
                    <Edit2 size={16} />
                  </button>
                  {(Array.from(selectedFiles)[0] as string).endsWith('.zip') && (
                    <button onClick={handleUnzipSelected} disabled={isUnzipping} className="p-2 text-gray-400 hover:text-cyan-400 hover:bg-gray-700/50 rounded-lg transition-colors disabled:opacity-50" title="Unzip">
                      {isUnzipping ? (
                        <div className="w-4 h-4 rounded-full border-2 border-cyan-500/50 border-t-cyan-500 animate-spin"></div>
                      ) : (
                        <Archive size={16} />
                      )}
                    </button>
                  )}
                </>
              )}
              <button onClick={handleZipSelected} disabled={isZipping} className="p-2 text-gray-400 hover:text-green-400 hover:bg-gray-700/50 rounded-lg transition-colors disabled:opacity-50" title="Zip Selected">
                {isZipping ? (
                  <div className="w-4 h-4 rounded-full border-2 border-green-500/50 border-t-green-500 animate-spin"></div>
                ) : (
                  <Download size={16} />
                )}
              </button>
              <button onClick={deleteSelectedFiles} disabled={deletingFile === "multiple"} className="p-2 text-gray-400 hover:text-red-400 hover:bg-gray-700/50 rounded-lg transition-colors disabled:opacity-50" title="Delete Selected">
                {deletingFile === "multiple" ? (
                  <div className="w-4 h-4 rounded-full border-2 border-red-500/50 border-t-red-500 animate-spin"></div>
                ) : (
                  <Trash2 size={16} />
                )}
              </button>
              <div className="h-6 w-px bg-gray-700"></div>
              <button onClick={() => setSelectedFiles(new Set())} className="p-2 text-gray-400 hover:text-gray-200 hover:bg-gray-700/50 rounded-lg transition-colors" title="Clear Selection">
                <X size={16} />
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
      {(isUnzipping || isZipping || isSaving) && <LoadingOverlay />}
    </div>
  );
}
