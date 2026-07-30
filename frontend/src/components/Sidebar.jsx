import React from 'react';

const Sidebar = () => {
  return (
    <aside className="w-64 h-screen bg-slate-900 text-white flex flex-col border-r border-slate-700">
      <div className="h-16 flex items-center justify-center border-b border-slate-700">
        <h1 className="text-xl font-bold tracking-wider text-blue-400">SPR-NOTE</h1>
      </div>

      <nav className="flex-1 p-4 space-y-2">
        <button className="w-full flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg transition-colors">
          <span>📝</span>
          <span className="ml-3 font-medium">All Notes</span>
        </button>
        <button className="w-full flex items-center px-4 py-2 hover:bg-slate-800 text-slate-300 rounded-lg transition-colors">
          <span>⭐</span>
          <span className="ml-3 font-medium">Favorites</span>
        </button>
        <button className="w-full flex items-center px-4 py-2 hover:bg-slate-800 text-slate-300 rounded-lg transition-colors">
          <span>⚙️</span>
          <span className="ml-3 font-medium">Settings</span>
        </button>
      </nav>
    </aside>
  );
};

export default Sidebar;