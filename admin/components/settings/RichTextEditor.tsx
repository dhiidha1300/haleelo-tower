'use client';

import { useEffect, useRef, useState } from 'react';

interface Props {
  value: string;
  onChange: (html: string) => void;
  variables?: string[];
}

const TOOLS: { cmd: string; arg?: string; label: string; title: string }[] = [
  { cmd: 'bold', label: 'B', title: 'Bold' },
  { cmd: 'italic', label: 'I', title: 'Italic' },
  { cmd: 'formatBlock', arg: 'H2', label: 'H2', title: 'Heading' },
  { cmd: 'formatBlock', arg: 'P', label: '¶', title: 'Paragraph' },
  { cmd: 'insertUnorderedList', label: '• List', title: 'Bullet list' },
  { cmd: 'insertOrderedList', label: '1. List', title: 'Numbered list' },
];

export function RichTextEditor({ value, onChange, variables = [] }: Props) {
  const ref = useRef<HTMLDivElement>(null);
  const [mode, setMode] = useState<'visual' | 'html'>('visual');

  // Sync external value into the editor without clobbering the caret while typing.
  useEffect(() => {
    if (mode === 'visual' && ref.current && ref.current.innerHTML !== value) {
      ref.current.innerHTML = value;
    }
  }, [value, mode]);

  const exec = (cmd: string, arg?: string) => {
    document.execCommand(cmd, false, arg);
    if (ref.current) onChange(ref.current.innerHTML);
  };

  const insertText = (text: string) => {
    ref.current?.focus();
    document.execCommand('insertText', false, text);
    if (ref.current) onChange(ref.current.innerHTML);
  };

  const addLink = () => {
    const url = prompt('Link URL (or a {{variable}}):');
    if (url) exec('createLink', url);
  };

  return (
    <div className="border border-gray-300 rounded-lg overflow-hidden">
      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-1 bg-gray-50 border-b border-gray-200 px-2 py-1.5">
        {TOOLS.map(t => (
          <button key={t.label + (t.arg ?? '')} type="button" title={t.title}
            onMouseDown={e => { e.preventDefault(); exec(t.cmd, t.arg); }}
            className="px-2 py-1 text-xs font-semibold text-gray-600 hover:bg-gray-200 rounded">{t.label}</button>
        ))}
        <button type="button" title="Link" onMouseDown={e => { e.preventDefault(); addLink(); }}
          className="px-2 py-1 text-xs font-semibold text-gray-600 hover:bg-gray-200 rounded">🔗</button>
        <div className="flex-1" />
        <button type="button" onClick={() => setMode(m => m === 'visual' ? 'html' : 'visual')}
          className="px-2 py-1 text-xs font-medium text-[#1B2D4F] hover:bg-gray-200 rounded">
          {mode === 'visual' ? '</> HTML' : '👁 Visual'}
        </button>
      </div>

      {/* Variable chips */}
      {variables.length > 0 && (
        <div className="flex flex-wrap gap-1.5 px-2 py-2 bg-amber-50 border-b border-amber-100">
          <span className="text-[11px] text-amber-700 font-medium self-center mr-1">Insert:</span>
          {variables.map(v => (
            <button key={v} type="button" onMouseDown={e => { e.preventDefault(); insertText(`{{${v}}}`); }}
              className="text-[11px] font-mono bg-white border border-amber-200 text-amber-800 px-2 py-0.5 rounded hover:bg-amber-100">
              {`{{${v}}}`}
            </button>
          ))}
        </div>
      )}

      {/* Body */}
      {mode === 'visual' ? (
        <div ref={ref} contentEditable suppressContentEditableWarning
          onInput={() => ref.current && onChange(ref.current.innerHTML)}
          className="min-h-[260px] max-h-[420px] overflow-y-auto px-4 py-3 text-sm focus:outline-none prose prose-sm max-w-none"
          style={{ lineHeight: 1.6 }} />
      ) : (
        <textarea value={value} onChange={e => onChange(e.target.value)}
          className="w-full min-h-[260px] px-4 py-3 text-xs font-mono focus:outline-none resize-y" />
      )}
    </div>
  );
}
