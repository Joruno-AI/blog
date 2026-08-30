"use client";

import { Button, Input, Label, Modal, Separator, TextField } from "@heroui/react";
import CodeBlockLowlight from "@tiptap/extension-code-block-lowlight";
import Image from "@tiptap/extension-image";
import Link from "@tiptap/extension-link";
import Placeholder from "@tiptap/extension-placeholder";
import Underline from "@tiptap/extension-underline";
import { EditorContent, useEditor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import { Bold, Code2, ImageIcon, Italic, Link2, List, ListOrdered, Minus, Quote, Redo2, Strikethrough, UnderlineIcon, Undo2 } from "lucide-react";
import { common, createLowlight } from "lowlight";
import { useCallback, useEffect, useState } from "react";

import "highlight.js/styles/github-dark.css";

const lowlight = createLowlight(common);
interface RichTextEditorProps { value?: string; onChange?: (value: string) => void; placeholder?: string; }

export function RichTextEditor({ value, onChange, placeholder }: RichTextEditorProps) {
  const [linkOpen, setLinkOpen] = useState(false);
  const [linkUrl, setLinkUrl] = useState("");
  const [imageOpen, setImageOpen] = useState(false);
  const [imageUrl, setImageUrl] = useState("");
  const editor = useEditor({ immediatelyRender: false, extensions: [StarterKit.configure({ codeBlock: false, heading: { levels: [1, 2, 3, 4, 5, 6] } }), Placeholder.configure({ placeholder: placeholder || "开始编写内容…" }), Link.configure({ openOnClick: false, HTMLAttributes: { class: "text-blue-500 underline" } }), Image.configure({ HTMLAttributes: { class: "max-w-full rounded-lg" } }), Underline, CodeBlockLowlight.configure({ lowlight })], content: value || "", onUpdate: ({ editor: instance }) => onChange?.(instance.getHTML()), editorProps: { attributes: { class: "prose prose-sm dark:prose-invert max-w-none focus:outline-none min-h-[36rem] p-5" } } });
  useEffect(() => { if (editor && value !== undefined && value !== editor.getHTML()) editor.commands.setContent(value); }, [editor, value]);
  const setLink = useCallback(() => { if (!editor) return; if (linkUrl) editor.chain().focus().extendMarkRange("link").setLink({ href: linkUrl }).run(); else editor.chain().focus().extendMarkRange("link").unsetLink().run(); setLinkUrl(""); setLinkOpen(false); }, [editor, linkUrl]);
  const addImage = useCallback(() => { if (!editor || !imageUrl) return; editor.chain().focus().setImage({ src: imageUrl }).run(); setImageUrl(""); setImageOpen(false); }, [editor, imageUrl]);
  if (!editor) return <div className="min-h-[40rem] animate-pulse rounded-lg border bg-muted/30" />;

  const Tool = ({ label, active, onClick, children }: { label: string; active?: boolean; onClick: () => void; children: React.ReactNode }) => <Button aria-label={label} isIconOnly onPress={onClick} size="sm" variant={active ? "secondary" : "ghost"}>{children}</Button>;
  return <>
    <div className="flex min-h-[42rem] flex-col overflow-hidden rounded-lg border"><div className="flex flex-wrap items-center gap-1 border-b bg-muted/35 p-2"><Tool label="撤销" onClick={() => editor.chain().focus().undo().run()}><Undo2 className="size-4" /></Tool><Tool label="重做" onClick={() => editor.chain().focus().redo().run()}><Redo2 className="size-4" /></Tool><Separator orientation="vertical" className="mx-1 h-5" /><Tool label="粗体" active={editor.isActive("bold")} onClick={() => editor.chain().focus().toggleBold().run()}><Bold className="size-4" /></Tool><Tool label="斜体" active={editor.isActive("italic")} onClick={() => editor.chain().focus().toggleItalic().run()}><Italic className="size-4" /></Tool><Tool label="下划线" active={editor.isActive("underline")} onClick={() => editor.chain().focus().toggleUnderline().run()}><UnderlineIcon className="size-4" /></Tool><Tool label="删除线" active={editor.isActive("strike")} onClick={() => editor.chain().focus().toggleStrike().run()}><Strikethrough className="size-4" /></Tool><Separator orientation="vertical" className="mx-1 h-5" />{([1, 2, 3] as const).map((level) => <Tool key={level} label={`标题 ${level}`} active={editor.isActive("heading", { level })} onClick={() => editor.chain().focus().toggleHeading({ level }).run()}><span className="text-xs font-bold">H{level}</span></Tool>)}<Separator orientation="vertical" className="mx-1 h-5" /><Tool label="无序列表" active={editor.isActive("bulletList")} onClick={() => editor.chain().focus().toggleBulletList().run()}><List className="size-4" /></Tool><Tool label="有序列表" active={editor.isActive("orderedList")} onClick={() => editor.chain().focus().toggleOrderedList().run()}><ListOrdered className="size-4" /></Tool><Tool label="代码块" active={editor.isActive("codeBlock")} onClick={() => editor.chain().focus().toggleCodeBlock().run()}><Code2 className="size-4" /></Tool><Tool label="引用" active={editor.isActive("blockquote")} onClick={() => editor.chain().focus().toggleBlockquote().run()}><Quote className="size-4" /></Tool><Tool label="分割线" onClick={() => editor.chain().focus().setHorizontalRule().run()}><Minus className="size-4" /></Tool><Separator orientation="vertical" className="mx-1 h-5" /><Tool label="插入链接" active={editor.isActive("link")} onClick={() => { setLinkUrl(editor.getAttributes("link").href || ""); setLinkOpen(true); }}><Link2 className="size-4" /></Tool><Tool label="插入图片" onClick={() => setImageOpen(true)}><ImageIcon className="size-4" /></Tool></div><div className="flex-1 overflow-auto bg-background"><EditorContent editor={editor} className="h-full" /></div></div>
    <Modal.Backdrop isOpen={linkOpen} onOpenChange={setLinkOpen}><Modal.Container><Modal.Dialog className="sm:max-w-md"><Modal.CloseTrigger /><Modal.Header><Modal.Heading>插入链接</Modal.Heading></Modal.Header><Modal.Body><p className="text-muted mb-4 text-sm">为选中的文字设置链接；留空保存会移除链接。</p><TextField type="url" value={linkUrl} onChange={setLinkUrl}><Label>链接地址</Label><Input autoFocus onKeyDown={(event) => { if (event.key === "Enter") setLink(); }} placeholder="https://example.com" /></TextField></Modal.Body><Modal.Footer><Button onPress={() => setLinkOpen(false)} variant="tertiary">取消</Button><Button onPress={setLink}>确定</Button></Modal.Footer></Modal.Dialog></Modal.Container></Modal.Backdrop>
    <Modal.Backdrop isOpen={imageOpen} onOpenChange={setImageOpen}><Modal.Container><Modal.Dialog className="sm:max-w-md"><Modal.CloseTrigger /><Modal.Header><Modal.Heading>插入图片</Modal.Heading></Modal.Header><Modal.Body><p className="text-muted mb-4 text-sm">输入媒体库或外部图片的完整地址。</p><TextField type="url" value={imageUrl} onChange={setImageUrl}><Label>图片地址</Label><Input autoFocus onKeyDown={(event) => { if (event.key === "Enter") addImage(); }} placeholder="https://example.com/image.jpg" /></TextField></Modal.Body><Modal.Footer><Button onPress={() => setImageOpen(false)} variant="tertiary">取消</Button><Button isDisabled={!imageUrl} onPress={addImage}>插入图片</Button></Modal.Footer></Modal.Dialog></Modal.Container></Modal.Backdrop>
  </>;
}
