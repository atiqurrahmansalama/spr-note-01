export default function ProfileOptionGroup({ title, children }) {
  return (
    <div className="space-y-2">
      {title && (
        <h2 className="text-xs font-bold uppercase tracking-wider theme-accent px-1 font-mono">
          {title}
        </h2>
      )}
      <div className="theme-bg-surface border theme-border rounded-2xl overflow-hidden divide-y border-white/[0.06] divide-white/[0.06] shadow-lg">
        {children}
      </div>
    </div>
  );
}
