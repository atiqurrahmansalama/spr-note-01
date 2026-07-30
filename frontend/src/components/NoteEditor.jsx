import React from 'react';

const NoteEditor = ({ activeNote, onNoteUpdate }) => {
  
  // শিরোনাম পরিবর্তন হ্যান্ডলার
  const handleTitleChange = (e) => {
    onNoteUpdate({ ...activeNote, title: e.target.value });
  };

  // কন্টেন্ট পরিবর্তন হ্যান্ডলার
  const handleContentChange = (e) => {
    onNoteUpdate({ ...activeNote, content: e.target.value });
  };

  return (
    <div className="flex-1 flex flex-col h-full bg-slate-900">
      <div className="h-14 border-b border-slate-700 flex items-center justify-between px-6">
        <div className="space-x-4 text-slate-400 flex items-center">
          <button className="hover:text-white font-bold px-2">B</button>
          <button className="hover:text-white italic px-2">I</button>
          <button className="hover:text-white underline px-2">U</button>
        </div>
        <button className="bg-blue-600 hover:bg-blue-700 text-white text-sm px-4 py-1.5 rounded transition-colors">
          Save
        </button>
      </div>

      <div className="flex-1 p-8 flex flex-col">
        <input 
          type="text" 
          placeholder="Note Title..." 
          className="text-3xl font-bold bg-transparent text-white border-none outline-none mb-6 placeholder-slate-600 focus:ring-0"
          value={activeNote.title}
          onChange={handleTitleChange}
        />
        <textarea 
          placeholder="Write your note here..." 
          className="flex-1 w-full bg-transparent text-slate-300 border-none outline-none resize-none placeholder-slate-600 text-lg leading-relaxed focus:ring-0"
          value={activeNote.content}
          onChange={handleContentChange}
        ></textarea>
      </div>
    </div>
  );
};

export default NoteEditor;