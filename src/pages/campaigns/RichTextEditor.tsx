import { useRef, useCallback, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import {
  Bold, Italic, Underline, AlignLeft, AlignCenter, AlignRight,
  List, ListOrdered, Link2, Strikethrough, Type
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface RichTextEditorProps {
  value: string;
  onChange: (html: string) => void;
  placeholder?: string;
  className?: string;
}

const FONT_SIZES = ['12px', '14px', '16px', '18px', '20px', '24px'];
const COLORS = ['#000000', '#374151', '#EF4444', '#F59E0B', '#10B981', '#3B82F6', '#8B5CF6', '#EC4899'];

function ToolbarButton({ title, onClick, active, children }: {
  title: string; onClick: () => void; active?: boolean; children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      title={title}
      onMouseDown={e => { e.preventDefault(); onClick(); }}
      className={cn(
        'h-7 w-7 flex items-center justify-center rounded text-sm transition-colors',
        active ? 'bg-primary/15 text-primary' : 'hover:bg-muted text-muted-foreground hover:text-foreground'
      )}
    >
      {children}
    </button>
  );
}

export function RichTextEditor({ value, onChange, placeholder = 'Write your email body...', className }: RichTextEditorProps) {
  const editorRef = useRef<HTMLDivElement>(null);
  const isInternalUpdate = useRef(false);

  useEffect(() => {
    if (editorRef.current && !isInternalUpdate.current) {
      if (editorRef.current.innerHTML !== value) {
        editorRef.current.innerHTML = value;
      }
    }
    isInternalUpdate.current = false;
  }, [value]);

  const exec = useCallback((cmd: string, val?: string) => {
    document.execCommand(cmd, false, val);
    editorRef.current?.focus();
    const html = editorRef.current?.innerHTML || '';
    isInternalUpdate.current = true;
    onChange(html);
  }, [onChange]);

  const handleInput = useCallback(() => {
    isInternalUpdate.current = true;
    onChange(editorRef.current?.innerHTML || '');
  }, [onChange]);

  const insertLink = () => {
    const url = prompt('Enter URL:', 'https://');
    if (url) exec('createLink', url);
  };

  const setColor = (color: string) => exec('foreColor', color);
  const setFontSize = (size: string) => {
    const sel = window.getSelection();
    if (!sel || sel.rangeCount === 0) return;
    const range = sel.getRangeAt(0);
    const span = document.createElement('span');
    span.style.fontSize = size;
    span.appendChild(range.extractContents());
    range.insertNode(span);
    onChange(editorRef.current?.innerHTML || '');
  };

  return (
    <div className={cn('border rounded-xl overflow-hidden bg-background', className)}>
      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-0.5 p-2 border-b bg-muted/30">
        <ToolbarButton title="Bold" onClick={() => exec('bold')}><Bold className="w-3.5 h-3.5" /></ToolbarButton>
        <ToolbarButton title="Italic" onClick={() => exec('italic')}><Italic className="w-3.5 h-3.5" /></ToolbarButton>
        <ToolbarButton title="Underline" onClick={() => exec('underline')}><Underline className="w-3.5 h-3.5" /></ToolbarButton>
        <ToolbarButton title="Strikethrough" onClick={() => exec('strikeThrough')}><Strikethrough className="w-3.5 h-3.5" /></ToolbarButton>

        <div className="w-px h-5 bg-border mx-1" />

        <ToolbarButton title="Align Left" onClick={() => exec('justifyLeft')}><AlignLeft className="w-3.5 h-3.5" /></ToolbarButton>
        <ToolbarButton title="Align Center" onClick={() => exec('justifyCenter')}><AlignCenter className="w-3.5 h-3.5" /></ToolbarButton>
        <ToolbarButton title="Align Right" onClick={() => exec('justifyRight')}><AlignRight className="w-3.5 h-3.5" /></ToolbarButton>

        <div className="w-px h-5 bg-border mx-1" />

        <ToolbarButton title="Bullet List" onClick={() => exec('insertUnorderedList')}><List className="w-3.5 h-3.5" /></ToolbarButton>
        <ToolbarButton title="Numbered List" onClick={() => exec('insertOrderedList')}><ListOrdered className="w-3.5 h-3.5" /></ToolbarButton>
        <ToolbarButton title="Insert Link" onClick={insertLink}><Link2 className="w-3.5 h-3.5" /></ToolbarButton>

        <div className="w-px h-5 bg-border mx-1" />

        {/* Font sizes */}
        <div className="flex items-center gap-1">
          <Type className="w-3.5 h-3.5 text-muted-foreground" />
          <select
            className="text-xs bg-transparent border-none outline-none cursor-pointer text-foreground"
            defaultValue=""
            onChange={e => { if (e.target.value) setFontSize(e.target.value); e.target.value = ''; }}
          >
            <option value="" disabled>Size</option>
            {FONT_SIZES.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>

        <div className="w-px h-5 bg-border mx-1" />

        {/* Colors */}
        <div className="flex items-center gap-1">
          {COLORS.map(c => (
            <button
              key={c}
              type="button"
              title={`Text color: ${c}`}
              onMouseDown={e => { e.preventDefault(); setColor(c); }}
              className="w-4 h-4 rounded-full border border-border/50 hover:scale-110 transition-transform"
              style={{ backgroundColor: c }}
            />
          ))}
        </div>
      </div>

      {/* Editable area */}
      <div
        ref={editorRef}
        contentEditable
        suppressContentEditableWarning
        onInput={handleInput}
        data-placeholder={placeholder}
        className={cn(
          'min-h-[200px] p-4 text-sm outline-none prose prose-sm max-w-none dark:prose-invert',
          'empty:before:content-[attr(data-placeholder)] empty:before:text-muted-foreground empty:before:pointer-events-none'
        )}
        style={{ lineHeight: 1.6 }}
      />
    </div>
  );
}
