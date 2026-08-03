const Header = () => {
  return (
    <header className="h-16 theme-bg-sub border-b theme-border flex items-center justify-between px-6">
      <div className="flex-1 max-w-lg">
        <input
          type="text"
          placeholder="Search notes..."
          className="w-full theme-bg-surface theme-text-primary text-sm px-4 py-2 rounded-lg border theme-border focus:outline-none focus:border-[var(--accent-main)]/50 transition-colors"
        />
      </div>

      <div className="flex items-center space-x-4 ml-4">
        <button className="theme-text-secondary hover:theme-text-primary text-xs font-semibold">Sync</button>
        <div className="w-8 h-8 theme-bg-accent rounded-full flex items-center justify-center theme-accent-text font-bold cursor-pointer">
          U
        </div>
      </div>
    </header>
  );
};

export default Header;