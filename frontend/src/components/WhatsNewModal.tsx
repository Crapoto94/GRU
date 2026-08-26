import { useState } from "react";
import { X, ChevronDown, ChevronRight, Info } from "lucide-react";
import { getChangelog, getCurrentVersion, formatVersion } from "../services/version";

interface WhatsNewProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function WhatsNewModal({ isOpen, onClose }: WhatsNewProps) {
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});

  if (!isOpen) return null;

  const changelog = getChangelog();
  const current = getCurrentVersion();

  const toggle = (v: string) => {
    setExpanded((prev) => ({ ...prev, [v]: !prev[v] }));
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div className="bg-white rounded-xl shadow-xl max-w-3xl w-full max-h-[85vh] flex flex-col" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 sticky top-0 bg-white z-10 rounded-t-xl">
          <div className="flex items-center gap-3">
            <Info className="text-ville-primary" size={24} />
            <div>
              <h2 className="text-lg font-bold text-ville-dark">Nouveautes</h2>
              <p className="text-sm text-gray-500">Version actuelle : {formatVersion(current.version)} ({current.date})</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-lg transition">
            <X size={20} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {changelog.map((entry) => (
            <div key={entry.version} className="border border-gray-200 rounded-xl overflow-hidden">
              <button
                onClick={() => toggle(entry.version)}
                className="w-full px-5 py-4 bg-gray-50 hover:bg-gray-100 transition flex items-center justify-between text-left"
              >
                <div className="flex items-center gap-3">
                  <span className={`text-sm font-medium ${entry.version === current.version ? "text-ville-primary" : "text-ville-dark"}`}>
                    {formatVersion(entry.version)}
                  </span>
                  <span className="text-xs text-gray-500 px-2 py-0.5 bg-gray-100 rounded">{entry.date}</span>
                  {entry.version === current.version && (
                    <span className="text-xs text-green-700 bg-green-50 px-2 py-0.5 rounded">Actuelle</span>
                  )}
                </div>
                {expanded[entry.version] ? <ChevronDown size={18} className="text-gray-400" /> : <ChevronRight size={18} className="text-gray-400" />}
              </button>

              {expanded[entry.version] && (
                <div className="px-5 pb-5 pt-2 animate-slide-down">
                  <ul className="space-y-2 text-sm text-gray-700 pl-5 list-disc">
                    {entry.features.map((f, i) => (
                      <li key={i} className="leading-relaxed">{f}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          ))}
        </div>

        <div className="px-6 py-4 border-t border-gray-200 bg-gray-50 rounded-b-xl flex justify-end">
          <button onClick={onClose} className="px-5 py-2 bg-ville-primary text-white rounded-lg hover:bg-blue-700 transition text-sm">
            Fermer
          </button>
        </div>
      </div>
    </div>
  );
}