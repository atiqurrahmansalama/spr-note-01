import React from 'react';

const Header = () => {
  return (
    <header className="h-16 bg-slate-800 border-b border-slate-700 flex items-center justify-between px-6">
      <div className="flex-1 max-w-lg">
        <input 
          type="text" 
          placeholder="Search notes..." 
          className="w-full bg-slate-900 text-white text-sm px-4 py-2 rounded-lg border border-slate-700 focus:outline-none focus:border-blue-500"
        />
      </div>

      <div className="flex items-center space-x-4 ml-4">
        <button className="text-slate-300 hover:text-white">☁️ Sync</button>
        <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center text-white font-bold cursor-pointer">
          U
        </div>
      </div>
    </header>
  );
};

export default Header;