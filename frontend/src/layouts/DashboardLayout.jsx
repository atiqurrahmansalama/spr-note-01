import React from 'react';
import Sidebar from '../components/Sidebar';
import Header from '../components/Header';

const DashboardLayout = ({ children }) => {
  return (
    <div className="flex h-screen bg-slate-900 overflow-hidden text-slate-200">
      {/* Sidebar Component */}
      <Sidebar />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col h-screen">
        {/* Header Component */}
        <Header />
        
        {/* Dynamic Content (যেখানে আসল নোটগুলো দেখাবে) */}
        <main className="flex-1 overflow-y-auto p-6">
          {children}
        </main>
      </div>
    </div>
  );
};

export default DashboardLayout;