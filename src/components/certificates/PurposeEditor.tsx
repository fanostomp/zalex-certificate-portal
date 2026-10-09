import { useEditor, useEditorState, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import { useEffect, useId, useImperativeHandle, type Ref } from 'react';
import { getPurposeCharacterCount } from './purposeText';

type PurposeEditorProps = {
  value: string;
  onChange: (html: string) => void;
  onBlur: () => void;
  inputRef: Ref<{ focus: () => void }>;
  disabled?: boolean;
  error?: string;
};

export default function PurposeEditor({
  value, onChange, onBlur, inputRef, disabled = false, error,
}: PurposeEditorProps) {
  const id = useId();
  const labelId = `${id}-label`;
  const counterId = `${id}-counter`;
  const errorId = `${id}-error`;
  const editor = useEditor({
    extensions: [StarterKit],
    content: value,
    onUpdate: ({ editor }) => onChange(editor.getHTML()),
    onBlur: () => onBlur(),
    editorProps: {
      attributes: {
        role: 'textbox',
        'aria-labelledby': labelId,
        'aria-multiline': 'true',
        'aria-required': 'true',
        'aria-disabled': String(disabled),
        'aria-invalid': String(Boolean(error)),
        'aria-describedby': error ? `${counterId} ${errorId}` : counterId,
        class: 'min-h-36 px-4 py-3 text-sm leading-7 text-slate-900 outline-none',
      },
    },
  });

  const formatting = useEditorState({
    editor,
    selector: ({ editor }) => ({
      bold: editor?.isActive('bold') ?? false,
      italic: editor?.isActive('italic') ?? false,
    }),
  });

  // RHF expects a focusable ref; the actual input is Tiptap's editable surface.
  useImperativeHandle(inputRef, () => ({
    focus: () => { editor?.commands.focus(); },
  }), [editor]);

  useEffect(() => {
    editor?.setEditable(!disabled, false);
  }, [editor, disabled]);

  useEffect(() => {
    if (editor && editor.getHTML() !== value) {
      editor.commands.setContent(value, { emitUpdate: false });
    }
  }, [editor, value]);

  const toolbarButtonClass = (active: boolean) =>
    `rounded-lg px-3.5 py-2 text-sm font-semibold transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600 disabled:opacity-50 ${
      active ? 'bg-indigo-100 text-indigo-800 shadow-sm' : 'text-slate-700 hover:bg-white hover:text-indigo-800'
    }`;

  return (
    <div className="mt-6">
      <p id={labelId} className="mb-2 text-sm font-medium text-slate-700">Purpose</p>
      <div className="overflow-hidden rounded-xl border border-slate-200 bg-slate-50/50 shadow-sm transition-all focus-within:border-indigo-500 focus-within:bg-white focus-within:ring-4 focus-within:ring-indigo-100">
        <fieldset disabled={disabled} className="flex gap-2 border-b border-slate-200 bg-slate-100/60 p-2">
          <legend className="sr-only">Purpose formatting</legend>
          <button
            type="button"
            disabled={!editor || disabled}
            aria-label="Bold"
            aria-pressed={formatting?.bold ?? false}
            onClick={() => editor?.chain().focus().toggleBold().run()}
            className={`${toolbarButtonClass(formatting?.bold ?? false)} font-bold`}
          >B</button>
          <button
            type="button"
            disabled={!editor || disabled}
            aria-label="Italic"
            aria-pressed={formatting?.italic ?? false}
            onClick={() => editor?.chain().focus().toggleItalic().run()}
            className={`${toolbarButtonClass(formatting?.italic ?? false)} italic`}
          >I</button>
        </fieldset>
        <EditorContent editor={editor} />
      </div>
      <p id={counterId} className="mt-2 text-xs text-slate-500">
        {getPurposeCharacterCount(value)} visible characters. Minimum 50 characters.
      </p>
      {error && (
        <p id={errorId} role="alert" className="mt-2 text-sm text-red-600">{error}</p>
      )}
    </div>
  );
}
