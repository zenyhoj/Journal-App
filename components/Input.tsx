import React from 'react';

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label: string;
  error?: string;
}

export const Input: React.FC<InputProps> = ({ label, error, className = '', ...props }) => {
  return (
    <div className="w-full mb-5">
      <label className="block text-sm font-semibold text-slate-700 mb-1.5 ml-1">
        {label}
      </label>
      <input
        className={`w-full px-4 py-2.5 rounded-xl border bg-white transition-all duration-200 
        placeholder:text-slate-400
        ${error 
          ? 'border-red-300 focus:border-red-500 focus:ring-red-100' 
          : 'border-slate-200 hover:border-slate-300 focus:border-indigo-500 focus:ring-indigo-100'
        } 
        focus:ring-4 focus:outline-none ${className}`}
        {...props}
      />
      {error && <p className="mt-1.5 ml-1 text-xs text-red-500 font-medium">{error}</p>}
    </div>
  );
};