import React, { useState, useEffect, useMemo } from 'react';
import axios from 'axios';
import { Sparkles, Copy, Check, Trash2, ArrowRight } from 'lucide-react';
import * as diff from 'diff';
import { Toaster, toast } from 'react-hot-toast';

// Update this to your backend URL
const API_BASE_URL = 'http://localhost:5000/api';

// Component to visualize grammar changes
const DiffViewer = ({ oldText, newText }) => {
  // Memoize changes to prevent unnecessary calculations on every re-render
  const changes = useMemo(() => diff.diffWords(oldText, newText), [oldText, newText]);
  
  return (
    <div className="p-8 bg-black/20 rounded-3xl border border-zinc-800 leading-relaxed text-xl shadow-inner">
      {changes.map((part, index) => (
        <span 
          key={index} 
          className={
            part.added ? 'bg-emerald-500/20 text-emerald-400 px-1 rounded-md mx-0.5' :
            part.removed ? 'bg-rose-500/20 text-rose-400 line-through px-1 rounded-md mx-0.5 opacity-50' : 
            'text-zinc-300'
          }
        >
          {part.value}
        </span>
      ))}
    </div>
  );
};

function App() {
  const [text, setText] = useState('');
  const [result, setResult] = useState('');
  const [lastProcessedText, setLastProcessedText] = useState('');
  const [tone, setTone] = useState('professional');
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const [history, setHistory] = useState([]);

  const tones = ['professional', 'casual', 'academic', 'friendly'];

  const fetchHistory = async () => {
    try {
      const res = await axios.get(`${API_BASE_URL}/history`);
      setHistory(res.data);
    } catch (err) {
      console.error("Backend Connection Error:", err.message);
      // Silent fail for background fetch, or show a subtle warning
    }
  };

  useEffect(() => { 
    fetchHistory(); 
  }, []);

  const handleCorrect = async () => {
    if (!text.trim()) return;
    setLoading(true);
    try {
      const response = await axios.post(`${API_BASE_URL}/correct`, { 
        sentence: text, 
        tone 
      });
      
      setResult(response.data.correctedText);
      setLastProcessedText(text);
      fetchHistory(); // Refresh history after new entry
      toast.success('Writing Refined');
    } catch (err) {
      toast.error(err.response?.data?.message || "AI Server Offline");
    } finally {
      setLoading(false);
    }
  };

  const handleClearHistory = async () => {
    if (history.length === 0) return;
    
    // User confirmation before clearing data
    if (!window.confirm("Are you sure you want to clear all archived records?")) return;
    
    try {
      // Ensure the backend has a DELETE route for /api/history
      await axios.delete(`${API_BASE_URL}/history`);
      setHistory([]); 
      toast.success('Archive cleared', { icon: '🗑️' });
    } catch (err) {
      console.error("Delete Error:", err);
      toast.error("Failed to clear history. Check backend route.");
    }
  };

  const copyToClipboard = () => {
    if (!result) return;
    navigator.clipboard.writeText(result);
    setCopied(true);
    toast.success('Copied to clipboard');
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="min-h-screen bg-[#09090b] py-12 px-6 font-sans text-zinc-100">
      <Toaster 
        position="bottom-right" 
        toastOptions={{
          style: {
            background: '#18181b',
            color: '#fff',
            border: '1px solid #27272a',
          },
        }} 
      />
      
      <div className="max-w-6xl mx-auto">
        <header className="mb-16 flex flex-col items-center gap-4 text-center">
          <div className="flex items-center gap-2 px-4 py-1.5 bg-zinc-900 rounded-full border border-zinc-800">
            <Sparkles size={14} className="text-indigo-400" />
            <span className="text-[11px] font-bold uppercase tracking-widest text-zinc-500">
              Local Intelligence • MERN Stack
            </span>
          </div>
          <h1 className="text-5xl font-black text-white">
            Grammarly<span className="text-indigo-500">.</span>
          </h1>
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-[300px_1fr] gap-12">
          {/* Sidebar - History */}
          <aside className="space-y-6 lg:sticky lg:top-12 h-fit">
            <div className="flex items-center justify-between px-2">
              <h3 className="font-bold text-zinc-500 uppercase text-[10px] tracking-widest">Recent Archive</h3>
              <button 
                onClick={handleClearHistory} 
                className="p-1.5 hover:bg-rose-500/10 hover:text-rose-400 text-zinc-600 rounded-lg transition-colors"
                title="Clear History"
              >
                <Trash2 size={16} />
              </button>
            </div>
            
            <div className="space-y-4 max-h-[600px] overflow-y-auto pr-2 custom-scrollbar">
              {history.length === 0 ? (
                <div className="p-10 border border-zinc-800 rounded-3xl text-center text-zinc-600 text-xs italic bg-zinc-900/30">
                  No records yet
                </div>
              ) : (
                history.map((item) => (
                  <div key={item._id} className="p-5 bg-zinc-900 rounded-2xl border border-zinc-800/50 hover:border-zinc-700 transition-all shadow-lg group">
                    <span className="text-[9px] font-bold text-indigo-300 bg-indigo-500/10 px-2 py-0.5 rounded-md uppercase mb-2 block w-fit">
                      {item.tone}
                    </span>
                    <p className="text-[11px] text-zinc-500 line-through truncate mb-1 italic opacity-60">
                      {item.originalText}
                    </p>
                    <p className="text-sm text-zinc-300 font-medium leading-relaxed">
                      {item.correctedText}
                    </p>
                  </div>
                ))
              )}
            </div>
          </aside>

          {/* Main Content - Editor */}
          <main className="space-y-8">
            <div className="bg-zinc-900 rounded-[2.5rem] border border-zinc-800 overflow-hidden shadow-2xl focus-within:border-indigo-500/50 transition-all">
              <textarea
                className="w-full h-72 p-10 text-xl bg-transparent outline-none resize-none placeholder:text-zinc-700 text-zinc-200"
                value={text}
                onChange={(e) => setText(e.target.value)}
                placeholder="Paste your draft here..."
              />
              
              <div className="bg-black/20 p-6 px-10 border-t border-zinc-800/50 flex flex-col sm:flex-row justify-between items-center gap-6">
                <div className="flex bg-zinc-950 p-1 rounded-2xl border border-zinc-800">
                  {tones.map((t) => (
                    <button 
                      key={t} 
                      onClick={() => setTone(t)} 
                      className={`px-5 py-2 rounded-xl text-xs font-bold transition-all ${
                        tone === t ? 'bg-zinc-800 text-indigo-400' : 'text-zinc-500 hover:text-zinc-300'
                      }`}
                    >
                      {t.charAt(0).toUpperCase() + t.slice(1)}
                    </button>
                  ))}
                </div>
                
                <button 
                  onClick={handleCorrect} 
                  disabled={loading || !text.trim()} 
                  className={`px-10 py-4 rounded-2xl font-bold text-sm flex items-center gap-3 transition-all ${
                    loading || !text.trim() 
                      ? "bg-zinc-800 text-zinc-600 cursor-not-allowed" 
                      : "bg-white text-black hover:bg-zinc-200 active:scale-95"
                  }`}
                >
                  {loading ? "Processing..." : "Improve Writing"}
                  {!loading && <ArrowRight size={16} />}
                </button>
              </div>
            </div>

            {/* Analysis Result */}
            {result && (
              <div className="bg-zinc-900 p-10 rounded-[2.5rem] border border-zinc-800 shadow-2xl animate-in fade-in slide-in-from-bottom-5">
                <div className="flex justify-between items-center mb-10">
                  <div className="flex items-center gap-2 text-zinc-500">
                    <div className="w-2 h-2 rounded-full bg-indigo-500 animate-pulse shadow-lg" />
                    <span className="text-[10px] font-black uppercase tracking-widest">Comparison Analysis</span>
                  </div>
                  <button 
                    onClick={copyToClipboard} 
                    className="p-3 bg-zinc-800 hover:bg-zinc-700 rounded-2xl transition-all text-zinc-400 hover:text-white"
                  >
                    {copied ? <Check className="text-emerald-400" size={20} /> : <Copy size={20} />}
                  </button>
                </div>

                <DiffViewer oldText={lastProcessedText} newText={result} />

                <div className="mt-10 pt-8 border-t border-zinc-800/50">
                   <p className="text-white text-2xl font-semibold leading-relaxed">
                     {result}
                   </p>
                   <div className="flex items-center gap-3 mt-6">
                     <p className="text-zinc-600 text-[10px] uppercase font-bold tracking-widest">
                       Tone Output: <span className="text-indigo-400">{tone}</span>
                     </p>
                   </div>
                </div>
              </div>
            )}
          </main>
        </div>
      </div>
    </div>
  );
}

export default App;