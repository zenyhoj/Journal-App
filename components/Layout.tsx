import React from 'react';
import { LogOut, Book, Plus } from 'lucide-react';
import { Button } from './Button';

interface LayoutProps {
  children: React.ReactNode;
  user: { name: string; email: string } | null;
  onLogout: () => void;
  onNavigateHome: () => void;
  onNewEntry: () => void;
}

export const Layout: React.FC<LayoutProps> = ({ 
  children, 
  user, 
  onLogout, 
  onNavigateHome,
  onNewEntry
}) => {
  return (
    <div className="min-h-screen flex flex-col bg-slate-50 bg-pattern">
      <header className="sticky top-0 z-30 bg-white/80 backdrop-blur-xl border-b border-slate-200/60">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div 
            className="flex items-center gap-3 cursor-pointer group"
            onClick={onNavigateHome}
          >
            <div className="w-9 h-9 bg-gradient-to-br from-indigo-600 to-violet-600 rounded-xl flex items-center justify-center text-white shadow-lg shadow-indigo-500/20 group-hover:scale-105 transition-transform duration-300">
              <Book size={18} strokeWidth={2.5} />
            </div>
            <span className="font-bold text-xl text-slate-800 tracking-tight group-hover:text-indigo-600 transition-colors">Lumina</span>
          </div>

          {user && (
            <div className="flex items-center gap-2 sm:gap-4">
               <button 
                onClick={onNewEntry}
                className="hidden md:flex items-center gap-2 text-sm font-semibold text-indigo-600 hover:text-indigo-700 bg-indigo-50 hover:bg-indigo-100 px-4 py-2 rounded-full transition-all border border-indigo-100 hover:border-indigo-200"
              >
                <Plus size={18} />
                New Entry
              </button>

              <div className="h-6 w-px bg-slate-200 mx-2 hidden md:block"></div>

              <div className="flex items-center gap-3">
                <div className="hidden sm:flex flex-col items-end">
                  <span className="text-sm font-semibold text-slate-700 leading-none">{user.name}</span>
                  <span className="text-xs text-slate-400 mt-1">Free Plan</span>
                </div>
                <Button 
                  variant="ghost" 
                  onClick={onLogout} 
                  className="!p-2.5 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-full"
                  title="Logout"
                >
                  <LogOut size={18} />
                </Button>
              </div>
            </div>
          )}
        </div>
      </header>
      
      <main className="flex-1 w-full max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12">
        {children}
      </main>

      {/* Mobile FAB for new entry */}
      {user && (
        <button
          onClick={onNewEntry}
          className="md:hidden fixed bottom-6 right-6 w-14 h-14 bg-indigo-600 text-white rounded-full shadow-xl shadow-indigo-600/30 flex items-center justify-center hover:bg-indigo-700 active:scale-95 transition-all z-40"
        >
          <Plus size={28} />
        </button>
      )}
    </div>
  );
};