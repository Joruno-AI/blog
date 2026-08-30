"use client";

import dynamic from "next/dynamic";

export type RichTextEditorProps = {
  value?: string;
  onChange?: (value: string) => void;
  placeholder?: string;
};

const BrowserRichTextEditor = dynamic(
  () => import("./rich-text-editor-impl").then((module) => module.RichTextEditor),
  {
    ssr: false,
    loading: () => <div className="min-h-[40rem] animate-pulse rounded-lg border bg-muted/30" aria-label="正在加载文章编辑器" />,
  },
);

// Tiptap and Lowlight are browser-only editor dependencies. Splitting them at
// this boundary keeps the complete editing experience in static client chunks
// without adding ProseMirror grammars to the Worker handler.
export function RichTextEditor(props: RichTextEditorProps) {
  return <BrowserRichTextEditor {...props} />;
}
