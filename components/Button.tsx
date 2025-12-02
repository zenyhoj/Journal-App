import React from 'react';
import { Loader2 } from 'lucide-react';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost' | 'gradient';
  isLoading?: boolean;
  icon?: React.ReactNode;
}

export const Button: React.FC<ButtonProps> = ({ 
  children, 
  variant = 'primary', 
  isLoading, 
  icon,
  className = '', 
  disabled,
  ...props 
}) => {
  const baseStyles = "flex items-center justify-center px-5 py-2.5 rounded-xl font-medium transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-1 disabled:opacity-50 disabled:cursor-not-allowed text-sm active:scale-[0.98]";
  
  const variants = {
    primary: "bg-indigo-600 hover:bg-indigo-700 text-white shadow-md shadow-indigo-200 hover:shadow-lg hover:shadow-indigo-200/50 focus:ring-indigo-500 border border-transparent",
    gradient: "bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-700 hover:to-violet-700 text-white shadow-md shadow-indigo-200 hover:shadow-lg hover:shadow-indigo-200/50 focus:ring-indigo-500 border border-transparent",
    secondary: "bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 shadow-sm hover:shadow focus:ring-slate-200",
    danger: "bg-white hover:bg-red-50 text-red-600 border border-red-100 hover:border-red-200 shadow-sm focus:ring-red-500",
    ghost: "bg-transparent hover:bg-slate-100 text-slate-600 hover:text-slate-900 border border-transparent"
  };

  return (
    <button 
      className={`${baseStyles} ${variants[variant]} ${className}`}
      disabled={disabled || isLoading}
      {...props}
    >
      {isLoading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
      {!isLoading && icon && <span className="mr-2">{icon}</span>}
      {children}
    </button>
  );
};