import React, { useState, useEffect, useRef } from 'react';
import { Layout } from './components/Layout';
import { Button } from './components/Button';
import { Input } from './components/Input';
import { StorageService } from './services/storageService';
import { GeminiService } from './services/geminiService';
import { supabase } from './services/supabaseClient';
import { User, JournalEntry, ViewState } from './types';
import { 
  Calendar, 
  Clock, 
  Trash2, 
  Edit2, 
  Sparkles, 
  Search, 
  Tag, 
  ChevronRight,
  Smile,
  Meh,
  Frown,
  Book,
  ArrowLeft,
  PenLine,
  Loader2,
  MailWarning,
  HelpCircle,
  AlertCircle
} from 'lucide-react';

// Helper for safe UUID generation across all environments
function generateUUID() {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    var r = Math.random() * 16 | 0, v = c == 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}

const App = () => {
  // --- State ---
  const [user, setUser] = useState<User | null>(null);
  const [isInitializing, setIsInitializing] = useState(true); // New loading state for initial session check
  const [view, setView] = useState<ViewState>('LOGIN');
  const [entries, setEntries] = useState<JournalEntry[]>([]);
  const [currentEntry, setCurrentEntry] = useState<JournalEntry | null>(null);
  const [loading, setLoading] = useState(false);
  const [dataLoading, setDataLoading] = useState(false);
  const [aiLoading, setAiLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  
  // Auth Troubleshooting State
  const [authError, setAuthError] = useState<string | null>(null);
  const [showHelp, setShowHelp] = useState(false);

  // Form States
  const [authForm, setAuthForm] = useState({ email: '', password: '', name: '' });
  const [entryForm, setEntryForm] = useState({ title: '', content: '' });
  
  // Refs
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // --- Effects ---

  // 1. Initial Session Check & Listener
  useEffect(() => {
    const initSession = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (session?.user) {
          console.log("Session found:", session.user.email);
          syncUser(session.user);
        } else {
          setIsInitializing(false);
        }
      } catch (err) {
        console.error("Session check failed", err);
        setIsInitializing(false);
      }
    };

    initSession();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      console.log("Auth Event:", event);
      if (event === 'SIGNED_IN' && session?.user) {
        syncUser(session.user);
      } else if (event === 'SIGNED_OUT') {
        setUser(null);
        setView('LOGIN');
        setEntries([]);
        setIsInitializing(false);
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  // 2. Sync User Helper
  const syncUser = (authUser: any) => {
    const mappedUser: User = {
      id: authUser.id,
      email: authUser.email || '',
      name: authUser.user_metadata?.full_name || 'User'
    };
    setUser(mappedUser);
    setView('DASHBOARD');
    setIsInitializing(false);
    loadEntries();
  };

  // 3. Auto-resize textarea effect
  useEffect(() => {
    if ((view === 'CREATE_ENTRY' || view === 'EDIT_ENTRY') && textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`;
    }
  }, [entryForm.content, view]);

  const loadEntries = async () => {
    setDataLoading(true);
    try {
      const loaded = await StorageService.getEntries();
      setEntries(loaded);
    } catch (error) {
      console.error("Failed to load entries", error);
    } finally {
      setDataLoading(false);
    }
  };

  // --- Handlers: Auth ---

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setAuthError(null);
    
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: authForm.email,
        password: authForm.password,
      });

      if (error) throw error;

      if (data.session && data.user) {
        // Success! Force update state immediately (don't wait for event listener)
        syncUser(data.user);
      } else {
        // Edge case: Credentials correct, but no session returned (usually email not confirmed)
        throw new Error("Login successful but session missing. Please check if your email is confirmed.");
      }
    } catch (error: any) {
      console.error("Login Error:", error);
      let msg = error.message || 'Login failed';
      
      if (msg.includes("Email not confirmed")) {
        msg = "Email not verified. If you just disabled verification in settings, you must create a NEW account or delete the old user in Supabase.";
      } else if (msg.includes("Invalid login credentials")) {
        msg = "Incorrect email or password.";
      }
      
      setAuthError(msg);
      setShowHelp(true);
    } finally {
      setLoading(false);
    }
  };

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setAuthError(null);

    try {
      const { data, error } = await supabase.auth.signUp({
        email: authForm.email,
        password: authForm.password,
        options: {
          data: {
            full_name: authForm.name,
          },
        },
      });

      if (error) throw error;

      if (data.session && data.user) {
        // Session created immediately (Confirm Email is OFF)
        syncUser(data.user);
        alert("Account created! Logging you in...");
      } else if (data.user && !data.session) {
        // User created, but waiting for confirmation (Confirm Email is ON)
        setAuthError("Account created, but Email Confirmation is required. Please check your inbox or disable 'Confirm Email' in Supabase settings.");
        setShowHelp(true);
      }
    } catch (error: any) {
      setAuthError(error.message || 'Signup failed');
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    await StorageService.logout();
    // State updates handled by onAuthStateChange listener
  };

  // --- Handlers: Entry CRUD ---
  
  const handleSaveEntry = async () => {
    if (!user || !entryForm.title.trim() || !entryForm.content.trim()) return;
    setLoading(true);

    const now = Date.now();
    const entryToSave: JournalEntry = {
      id: currentEntry ? currentEntry.id : generateUUID(),
      userId: user.id,
      title: entryForm.title,
      content: entryForm.content,
      createdAt: currentEntry ? currentEntry.createdAt : now,
      updatedAt: now,
      tags: currentEntry?.tags || [],
      sentiment: currentEntry?.sentiment,
      aiSummary: currentEntry?.aiSummary
    };

    try {
      const savedEntry = await StorageService.saveEntry(entryToSave);
      await loadEntries();
      setView('VIEW_ENTRY');
      setCurrentEntry(savedEntry);
    } catch (error: any) {
      alert(`Error saving: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteEntry = async (id: string) => {
    if (confirm('Are you sure you want to delete this entry?')) {
      try {
        await StorageService.deleteEntry(id);
        await loadEntries();
        setView('DASHBOARD');
      } catch (error: any) {
        alert("Failed to delete entry");
      }
    }
  };

  const startCreate = () => {
    setEntryForm({ title: '', content: '' });
    setCurrentEntry(null);
    setView('CREATE_ENTRY');
  };

  const startEdit = (entry: JournalEntry) => {
    setEntryForm({ title: entry.title, content: entry.content });
    setCurrentEntry(entry);
    setView('EDIT_ENTRY');
  };

  const viewEntry = (entry: JournalEntry) => {
    setCurrentEntry(entry);
    setView('VIEW_ENTRY');
  };

  // --- Gemini AI Handler ---
  const handleAnalyze = async () => {
    if (!currentEntry) return;
    setAiLoading(true);
    try {
      const analysis = await GeminiService.analyzeEntry(currentEntry.content);
      
      const updatedEntry: JournalEntry = {
        ...currentEntry,
        sentiment: analysis.sentiment,
        tags: analysis.tags,
        aiSummary: analysis.summary
      };

      await StorageService.saveEntry(updatedEntry);
      setCurrentEntry(updatedEntry);
      await loadEntries();
    } catch (err) {
      alert("AI Analysis failed. Please check your API key or try again later.");
    } finally {
      setAiLoading(false);
    }
  };

  // --- Filtering ---
  const filteredEntries = entries.filter(e => 
    e.title.toLowerCase().includes(searchTerm.toLowerCase()) || 
    e.content.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // --- Render Helpers ---
  const SentimentBadge = ({ sentiment }: { sentiment: string }) => {
    const config = {
      positive: { color: 'text-emerald-700 bg-emerald-50 border-emerald-100', icon: Smile },
      neutral: { color: 'text-indigo-700 bg-indigo-50 border-indigo-100', icon: Meh },
      negative: { color: 'text-rose-700 bg-rose-50 border-rose-100', icon: Frown }
    };
    const style = config[sentiment as keyof typeof config] || config.neutral;
    const Icon = style.icon;

    return (
      <span className={`px-2.5 py-1 rounded-full text-xs font-semibold flex items-center gap-1.5 border ${style.color}`}>
        <Icon size={12} strokeWidth={2.5} />
        <span className="capitalize">{sentiment}</span>
      </span>
    );
  };

  // --- Views ---

  // 1. Loading Splash Screen
  if (isInitializing) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50">
        <Loader2 className="w-12 h-12 text-indigo-600 animate-spin mb-4" />
        <p className="text-slate-500 font-medium">Connecting to Lumina...</p>
      </div>
    );
  }

  // 2. Auth Screens
  if (view === 'LOGIN' || view === 'SIGNUP') {
    const isLogin = view === 'LOGIN';
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 bg-pattern px-4 py-12 animate-fade-in">
        <div className="bg-white p-8 sm:p-10 rounded-3xl shadow-xl shadow-slate-200/50 w-full max-w-md border border-white">
          <div className="text-center mb-8">
            <div className="w-14 h-14 bg-gradient-to-tr from-indigo-600 to-violet-600 rounded-2xl mx-auto flex items-center justify-center text-white mb-6 shadow-lg shadow-indigo-500/30 transform rotate-3">
              <Book size={28} strokeWidth={2.5} />
            </div>
            <h1 className="text-3xl font-bold text-slate-900 tracking-tight">Welcome to Lumina</h1>
            <p className="text-slate-500 mt-3 font-medium">Your intelligent space for reflection.</p>
          </div>
          
          <form onSubmit={isLogin ? handleLogin : handleSignup} className="space-y-4">
            {!isLogin && (
              <Input 
                label="Full Name" 
                placeholder="Jane Doe" 
                value={authForm.name}
                onChange={e => setAuthForm({...authForm, name: e.target.value})}
                required
              />
            )}
            <Input 
              label="Email Address" 
              type="email" 
              placeholder="you@example.com" 
              value={authForm.email}
              onChange={e => setAuthForm({...authForm, email: e.target.value})}
              required
            />
            <Input 
              label="Password" 
              type="password" 
              placeholder="••••••••" 
              value={authForm.password}
              onChange={e => setAuthForm({...authForm, password: e.target.value})}
              required
            />
            
            {authError && (
              <div className="p-3 bg-red-50 text-red-700 text-sm rounded-lg border border-red-100 flex items-start gap-2">
                <AlertCircle size={16} className="shrink-0 mt-0.5" />
                <span>{authError}</span>
              </div>
            )}

            <div className="pt-2">
              <Button 
                type="submit" 
                variant="gradient"
                className="w-full text-lg h-12" 
                isLoading={loading}
              >
                {isLogin ? 'Sign In' : 'Create Account'}
              </Button>
            </div>
          </form>

          {/* Help Toggle */}
          <div className="mt-4 flex justify-end">
            <button 
              type="button"
              onClick={() => setShowHelp(!showHelp)}
              className="text-xs text-slate-400 hover:text-indigo-600 flex items-center gap-1 transition-colors"
            >
              <HelpCircle size={12} /> Trouble logging in?
            </button>
          </div>

          {/* Expanded Help Section */}
          {showHelp && (
            <div className="mt-4 p-4 bg-slate-50 rounded-xl border border-slate-200 text-sm text-slate-600 space-y-2">
              <p className="font-semibold text-slate-800">Why isn't it working?</p>
              <ul className="list-disc pl-4 space-y-1">
                <li>
                  <span className="font-medium text-slate-800">Email Confirmation:</span> By default, Supabase requires you to click a link in your email. 
                </li>
                <li>
                  <span className="font-medium text-slate-800">Stuck Account:</span> If you disabled confirmation <em>after</em> creating an account, that old account is still stuck. <strong className="text-indigo-600">Please sign up with a NEW email address.</strong>
                </li>
              </ul>
            </div>
          )}
          
          <div className="mt-8 text-center text-sm text-slate-500">
            {isLogin ? "New to Lumina? " : "Already have an account? "}
            <button 
              onClick={() => {
                setView(isLogin ? 'SIGNUP' : 'LOGIN');
                setAuthForm({ email: '', password: '', name: '' });
                setAuthError(null);
                setShowHelp(false);
              }}
              className="font-bold text-indigo-600 hover:text-indigo-700 hover:underline transition-all"
            >
              {isLogin ? 'Create account' : 'Log in'}
            </button>
          </div>
        </div>
      </div>
    );
  }

  // 3. Main Dashboard & Editor
  return (
    <Layout 
      user={user} 
      onLogout={handleLogout} 
      onNavigateHome={() => setView('DASHBOARD')}
      onNewEntry={startCreate}
    >
      {view === 'DASHBOARD' && (
        <div className="space-y-8 animate-fade-in">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6">
            <div>
              <h1 className="text-3xl font-bold text-slate-900 tracking-tight mb-1">Your Journal</h1>
              <p className="text-slate-500 font-medium">Capture your thoughts, ideas, and memories.</p>
            </div>
            <div className="relative group">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-indigo-500 transition-colors" size={20} />
              <input 
                type="text" 
                placeholder="Search entries..." 
                className="pl-11 pr-5 py-3 rounded-2xl bg-white border border-slate-200 focus:ring-4 focus:ring-indigo-100 focus:border-indigo-500 focus:outline-none w-full sm:w-72 shadow-sm transition-all text-sm font-medium"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
          </div>

          {dataLoading ? (
             <div className="py-24 flex justify-center items-center">
               <Loader2 className="w-10 h-10 text-indigo-500 animate-spin" />
             </div>
          ) : filteredEntries.length === 0 ? (
            <div className="text-center py-24 bg-white rounded-3xl border-2 border-dashed border-slate-200">
              <div className="w-20 h-20 bg-indigo-50 rounded-full flex items-center justify-center mx-auto mb-6 shadow-sm">
                <PenLine className="text-indigo-400" size={32} />
              </div>
              <h3 className="text-xl font-bold text-slate-900 mb-2">
                {searchTerm ? 'No matches found' : 'Start your journal'}
              </h3>
              <p className="text-slate-500 mb-8 max-w-sm mx-auto">
                {searchTerm ? 'Try adjusting your search terms.' : 'Your personal space for reflection is empty. Create your first entry today.'}
              </p>
              {!searchTerm && (
                <Button onClick={startCreate} variant="gradient" icon={<Edit2 size={18} />}>
                  Write First Entry
                </Button>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredEntries.map(entry => (
                <div 
                  key={entry.id}
                  onClick={() => viewEntry(entry)}
                  className="group bg-white p-6 rounded-2xl shadow-[0_2px_8px_rgba(0,0,0,0.04)] hover:shadow-[0_12px_24px_rgba(0,0,0,0.08)] border border-slate-100 hover:border-indigo-100 transition-all duration-300 cursor-pointer flex flex-col h-full transform hover:-translate-y-1"
                >
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-2 text-xs font-semibold text-slate-400 uppercase tracking-wider">
                      <Calendar size={14} />
                      {new Date(entry.createdAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                    </div>
                    {entry.sentiment && <SentimentBadge sentiment={entry.sentiment} />}
                  </div>
                  
                  <h3 className="text-xl font-bold text-slate-800 mb-3 line-clamp-2 group-hover:text-indigo-600 transition-colors">
                    {entry.title}
                  </h3>
                  
                  <p className="text-slate-600 text-sm line-clamp-4 mb-6 flex-1 leading-relaxed">
                    {entry.content}
                  </p>

                  <div className="pt-4 border-t border-slate-50 flex items-center justify-between mt-auto">
                    <div className="flex gap-2 overflow-hidden">
                       {entry.tags?.slice(0, 2).map(tag => (
                         <span key={tag} className="text-xs font-medium bg-slate-100 text-slate-600 px-2.5 py-1 rounded-md">#{tag}</span>
                       ))}
                    </div>
                    <span className="w-8 h-8 rounded-full bg-indigo-50 text-indigo-600 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all transform scale-90 group-hover:scale-100">
                      <ChevronRight size={18} />
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {(view === 'CREATE_ENTRY' || view === 'EDIT_ENTRY') && (
        <div className="max-w-3xl mx-auto animate-fade-in">
          <div className="bg-white rounded-3xl shadow-xl shadow-slate-200/50 border border-white overflow-hidden">
            <div className="p-8 sm:p-10">
              <div className="mb-8 flex items-center justify-between">
                <Button variant="ghost" onClick={() => setView('DASHBOARD')} className="!pl-2">
                   <ArrowLeft className="mr-2 h-4 w-4" /> Back
                </Button>
                <span className="text-xs font-semibold uppercase tracking-widest text-slate-400">
                  {view === 'CREATE_ENTRY' ? 'New Entry' : 'Edit Mode'}
                </span>
              </div>
              
              <div className="space-y-4">
                <input
                  type="text"
                  placeholder="Title your thoughts..."
                  className="w-full text-xl font-bold text-slate-900 placeholder-slate-300 border-none focus:ring-0 p-0 bg-transparent"
                  value={entryForm.title}
                  onChange={e => setEntryForm({...entryForm, title: e.target.value})}
                  autoFocus
                />
                
                <textarea
                  ref={textareaRef}
                  placeholder="What's on your mind today?"
                  className="w-full min-h-[120px] overflow-hidden resize-none text-base text-slate-600 placeholder-slate-300 border-none focus:ring-0 p-0 leading-relaxed bg-transparent"
                  value={entryForm.content}
                  onChange={e => setEntryForm({...entryForm, content: e.target.value})}
                />
              </div>
            </div>
            
            <div className="bg-slate-50/80 backdrop-blur px-8 py-5 flex justify-between items-center border-t border-slate-100">
               <span className="text-sm font-medium text-slate-400">
                 {entryForm.content.length} characters
               </span>
               <div className="flex gap-3">
                 {view === 'EDIT_ENTRY' && currentEntry && (
                   <Button variant="danger" onClick={() => handleDeleteEntry(currentEntry.id)}>
                     Delete
                   </Button>
                 )}
                 <Button onClick={handleSaveEntry} isLoading={loading} variant="gradient">
                   Save Entry
                 </Button>
               </div>
            </div>
          </div>
        </div>
      )}

      {view === 'VIEW_ENTRY' && currentEntry && (
        <div className="max-w-3xl mx-auto space-y-6 animate-fade-in">
          <Button variant="ghost" onClick={() => setView('DASHBOARD')} className="!pl-0 hover:bg-transparent text-slate-500 hover:text-indigo-600">
            <ArrowLeft className="mr-2 h-4 w-4" /> Back to Journal
          </Button>

          <div className="bg-white rounded-3xl shadow-xl shadow-slate-200/50 border border-white p-8 sm:p-12 relative overflow-hidden">
            {/* Top decorative gradient line */}
            <div className="absolute top-0 left-0 w-full h-1.5 bg-gradient-to-r from-indigo-500 via-purple-500 to-indigo-500 opacity-80"></div>

            <div className="flex items-start justify-between mb-8">
              <div className="space-y-4">
                <h4 className="text-xl font-bold text-slate-900 leading-tight">{currentEntry.title}</h4>
                <div className="flex flex-wrap items-center gap-4 text-sm font-medium text-slate-400">
                  <span className="flex items-center gap-1.5">
                    <Calendar size={15} className="text-indigo-500" />
                    {new Date(currentEntry.createdAt).toLocaleDateString(undefined, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
                  </span>
                  <span className="w-1 h-1 rounded-full bg-slate-300"></span>
                  <span className="flex items-center gap-1.5">
                    <Clock size={15} />
                    {new Date(currentEntry.createdAt).toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
              </div>
              <div className="flex gap-2">
                <Button variant="secondary" onClick={() => startEdit(currentEntry)} className="!p-2.5">
                  <Edit2 size={18} />
                </Button>
                <Button variant="danger" className="!p-2.5 bg-white" onClick={() => handleDeleteEntry(currentEntry.id)}>
                  <Trash2 size={18} />
                </Button>
              </div>
            </div>

            <div className="prose prose-lg max-w-none text-slate-600 leading-8 whitespace-pre-wrap mb-10">
              {currentEntry.content}
            </div>

            {/* AI Analysis Section */}
            {(currentEntry.aiSummary || currentEntry.sentiment) ? (
               <div className="bg-gradient-to-br from-indigo-50 to-violet-50 rounded-2xl p-6 sm:p-8 border border-indigo-100/50">
                 <div className="flex items-center gap-2 mb-5">
                   <div className="p-2 bg-white rounded-lg shadow-sm">
                     <Sparkles className="text-indigo-600" size={20} />
                   </div>
                   <h3 className="font-bold text-indigo-900 text-lg">AI Insights</h3>
                 </div>
                 
                 <div className="flex flex-wrap gap-3 mb-6">
                    {currentEntry.sentiment && (
                      <div className="bg-white px-4 py-2 rounded-xl shadow-sm text-sm font-semibold text-slate-700 flex items-center gap-2 border border-slate-100">
                        Sentiment: 
                        <span className={`${
                          currentEntry.sentiment === 'positive' ? 'text-emerald-600' : 
                          currentEntry.sentiment === 'negative' ? 'text-rose-600' : 'text-indigo-600'
                        } capitalize`}>
                          {currentEntry.sentiment}
                        </span>
                      </div>
                    )}
                    {currentEntry.tags && currentEntry.tags.map(tag => (
                      <div key={tag} className="bg-white px-4 py-2 rounded-xl shadow-sm text-sm font-semibold text-slate-600 flex items-center gap-2 border border-slate-100">
                        <Tag size={14} className="text-indigo-400" />
                        {tag}
                      </div>
                    ))}
                 </div>
                 
                 {currentEntry.aiSummary && (
                   <div className="relative pl-4 border-l-4 border-indigo-200">
                     <p className="text-indigo-900/80 italic font-medium">
                       "{currentEntry.aiSummary}"
                     </p>
                   </div>
                 )}
               </div>
            ) : (
              <div className="bg-slate-50 rounded-2xl p-6 border border-slate-100 mt-8">
                 <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div>
                      <h4 className="font-bold text-slate-800 flex items-center gap-2">
                        <Sparkles size={16} className="text-indigo-500" />
                        Unlock deeper insights
                      </h4>
                      <p className="text-sm text-slate-500 mt-1">Analyze this entry to reveal sentiment patterns and key topics.</p>
                    </div>
                    <Button 
                      onClick={handleAnalyze} 
                      isLoading={aiLoading} 
                      variant="gradient"
                      icon={<Sparkles size={16} />} 
                      className="shadow-indigo-200"
                    >
                      Analyze Entry
                    </Button>
                 </div>
              </div>
            )}

          </div>
        </div>
      )}
    </Layout>
  );
};

export default App;