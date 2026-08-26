import { useEffect, useState } from "react";
import { X } from "lucide-react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

interface HelpModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function HelpModal({ isOpen, onClose }: HelpModalProps) {
  const [content, setContent] = useState<string>("");

  useEffect(() => {
    if (isOpen) {
      fetch("/julto-aide.md")
        .then((res) => res.text())
        .then((text) => setContent(text))
        .catch(() => setContent("# Aide non disponible\n\nImpossible de charger le fichier d'aide."));
    }
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
      <div className="bg-white rounded-xl shadow-xl max-w-4xl w-full max-h-[85vh] flex flex-col">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 sticky top-0 bg-white rounded-t-xl">
          <h2 className="text-xl font-bold text-ville-dark">Aide JULTO</h2>
          <button onClick={onClose} className="p-1 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100 transition">
            <X size={20} />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto px-6 py-4">
          <div className="prose prose-sm max-w-none text-gray-700">
            <ReactMarkdown
              remarkPlugins={[remarkGfm]}
              components={{
                h1: ({ children }) => <h1 className="text-2xl font-bold text-ville-dark mb-4 mt-6 pb-2 border-b border-gray-200">{children}</h1>,
                h2: ({ children }) => <h2 className="text-xl font-semibold text-ville-dark mb-3 mt-6">{children}</h2>,
                h3: ({ children }) => <h3 className="text-lg font-medium text-gray-800 mb-2 mt-4">{children}</h3>,
                p: ({ children }) => <p className="mb-3 leading-relaxed">{children}</p>,
                ul: ({ children }) => <ul className="list-disc list-inside mb-3 space-y-1">{children}</ul>,
                ol: ({ children }) => <ol className="list-decimal list-inside mb-3 space-y-1">{children}</ol>,
                li: ({ children }) => <li className="ml-4">{children}</li>,
                code: ({ children }) => <code className="bg-gray-100 px-1.5 py-0.5 rounded text-sm font-mono text-ville-primary">{children}</code>,
                pre: ({ children }) => <pre className="bg-gray-900 text-gray-100 p-4 rounded-lg overflow-x-auto mb-4 text-sm">{children}</pre>,
                blockquote: ({ children }) => <blockquote className="border-l-4 border-ville-primary pl-4 italic text-gray-600 my-4">{children}</blockquote>,
                table: ({ children }) => (
                  <div className="overflow-x-auto mb-4 rounded-lg border border-gray-200">
                    <table className="min-w-full text-sm">
                      {children}
                    </table>
                  </div>
                ),
                thead: ({ children }) => <thead className="bg-gray-50">{children}</thead>,
                tbody: ({ children }) => <tbody className="divide-y divide-gray-100">{children}</tbody>,
                th: ({ children }) => <th className="px-4 py-3 text-left font-semibold text-gray-700 border-b border-gray-200 bg-gray-50 whitespace-nowrap">{children}</th>,
                td: ({ children }) => <td className="px-4 py-3 border-b border-gray-100 text-gray-700">{children}</td>,
                tr: ({ children }) => <tr className="hover:bg-gray-50">{children}</tr>,
                strong: ({ children }) => <strong className="font-semibold">{children}</strong>,
                em: ({ children }) => <em className="italic">{children}</em>,
                hr: () => <hr className="my-6 border-gray-200" />,
              }}
            >
              {content}
            </ReactMarkdown>
          </div>
        </div>
        <div className="px-6 py-4 border-t border-gray-200 bg-gray-50 rounded-b-xl">
          <button onClick={onClose} className="w-full bg-ville-primary text-white py-2 rounded-lg hover:bg-blue-700 transition font-medium">
            Fermer
          </button>
        </div>
      </div>
    </div>
  );
}