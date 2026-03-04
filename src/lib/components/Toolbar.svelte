<script lang="ts">
	import type { Editor } from '@tiptap/core';

	interface Props {
		editor: Editor | null;
	}

	let { editor }: Props = $props();

	function cmd(callback: (e: Editor) => void) {
		return (event: MouseEvent) => {
			event.preventDefault();
			if (editor) callback(editor);
		};
	}

	function addLink() {
		if (!editor) return;
		const url = prompt('Enter URL:');
		if (url) {
			editor.chain().focus().setLink({ href: url }).run();
		}
	}

	function addImage() {
		if (!editor) return;
		const url = prompt('Enter image URL:');
		if (url) {
			editor.chain().focus().setImage({ src: url }).run();
		}
	}

	function prevent(e: MouseEvent) {
		e.preventDefault();
	}
</script>

{#if editor}
	<div class="flex items-center gap-0.5 overflow-x-auto border-b border-gray-200 bg-gray-50 px-2 py-1.5">
		<!-- Inline formatting -->
		<button onmousedown={cmd((e) => e.chain().focus().toggleBold().run())}
			class="rounded px-2 py-1 text-sm font-medium transition-colors"
			class:bg-blue-100={editor.isActive('bold')} class:text-blue-700={editor.isActive('bold')}
			class:text-gray-600={!editor.isActive('bold')} class:hover:bg-gray-200={!editor.isActive('bold')}
			title="Bold">B</button>
		<button onmousedown={cmd((e) => e.chain().focus().toggleItalic().run())}
			class="rounded px-2 py-1 text-sm font-medium italic transition-colors"
			class:bg-blue-100={editor.isActive('italic')} class:text-blue-700={editor.isActive('italic')}
			class:text-gray-600={!editor.isActive('italic')} class:hover:bg-gray-200={!editor.isActive('italic')}
			title="Italic">I</button>
		<button onmousedown={cmd((e) => e.chain().focus().toggleStrike().run())}
			class="rounded px-2 py-1 text-sm font-medium line-through transition-colors"
			class:bg-blue-100={editor.isActive('strike')} class:text-blue-700={editor.isActive('strike')}
			class:text-gray-600={!editor.isActive('strike')} class:hover:bg-gray-200={!editor.isActive('strike')}
			title="Strikethrough">S</button>
		<button onmousedown={cmd((e) => e.chain().focus().toggleCode().run())}
			class="rounded px-2 py-1 text-sm font-medium transition-colors"
			class:bg-blue-100={editor.isActive('code')} class:text-blue-700={editor.isActive('code')}
			class:text-gray-600={!editor.isActive('code')} class:hover:bg-gray-200={!editor.isActive('code')}
			title="Inline Code">&lt;&gt;</button>

		<span class="mx-1 h-5 w-px shrink-0 bg-gray-300"></span>

		<!-- Text size & dim -->
		<button onmousedown={cmd((e) => e.chain().focus().toggleTextSize('lg').run())}
			class="rounded px-1.5 py-1 text-sm font-medium transition-colors"
			class:bg-blue-100={editor.isActive('textSize', { size: 'lg' })} class:text-blue-700={editor.isActive('textSize', { size: 'lg' })}
			class:text-gray-600={!editor.isActive('textSize', { size: 'lg' })} class:hover:bg-gray-200={!editor.isActive('textSize', { size: 'lg' })}
			title="Large Text"><span style="font-size: 1.15em;">A</span></button>
		<button onmousedown={cmd((e) => e.chain().focus().toggleTextSize('sm').run())}
			class="rounded px-1.5 py-1 text-sm font-medium transition-colors"
			class:bg-blue-100={editor.isActive('textSize', { size: 'sm' })} class:text-blue-700={editor.isActive('textSize', { size: 'sm' })}
			class:text-gray-600={!editor.isActive('textSize', { size: 'sm' })} class:hover:bg-gray-200={!editor.isActive('textSize', { size: 'sm' })}
			title="Small Text"><span style="font-size: 0.75em;">A</span></button>
		<button onmousedown={cmd((e) => e.chain().focus().toggleTextDim().run())}
			class="rounded px-1.5 py-1 text-sm font-medium transition-colors"
			class:bg-blue-100={editor.isActive('textDim')} class:text-blue-700={editor.isActive('textDim')}
			class:text-gray-600={!editor.isActive('textDim')} class:hover:bg-gray-200={!editor.isActive('textDim')}
			title="Dim Text"><span style="opacity: 0.5;">A</span></button>

		<span class="mx-1 h-5 w-px shrink-0 bg-gray-300"></span>

		<!-- Headings -->
		<button onmousedown={cmd((e) => e.chain().focus().toggleHeading({ level: 1 }).run())}
			class="rounded px-2 py-1 text-xs font-bold transition-colors"
			class:bg-blue-100={editor.isActive('heading', { level: 1 })} class:text-blue-700={editor.isActive('heading', { level: 1 })}
			class:text-gray-600={!editor.isActive('heading', { level: 1 })} class:hover:bg-gray-200={!editor.isActive('heading', { level: 1 })}
			title="Heading 1">H1</button>
		<button onmousedown={cmd((e) => e.chain().focus().toggleHeading({ level: 2 }).run())}
			class="rounded px-2 py-1 text-xs font-bold transition-colors"
			class:bg-blue-100={editor.isActive('heading', { level: 2 })} class:text-blue-700={editor.isActive('heading', { level: 2 })}
			class:text-gray-600={!editor.isActive('heading', { level: 2 })} class:hover:bg-gray-200={!editor.isActive('heading', { level: 2 })}
			title="Heading 2">H2</button>
		<button onmousedown={cmd((e) => e.chain().focus().toggleHeading({ level: 3 }).run())}
			class="rounded px-2 py-1 text-xs font-bold transition-colors"
			class:bg-blue-100={editor.isActive('heading', { level: 3 })} class:text-blue-700={editor.isActive('heading', { level: 3 })}
			class:text-gray-600={!editor.isActive('heading', { level: 3 })} class:hover:bg-gray-200={!editor.isActive('heading', { level: 3 })}
			title="Heading 3">H3</button>

		<span class="mx-1 h-5 w-px shrink-0 bg-gray-300"></span>

		<!-- Lists -->
		<button onmousedown={cmd((e) => e.chain().focus().toggleBulletList().run())}
			class="rounded px-2 py-1 text-sm transition-colors"
			class:bg-blue-100={editor.isActive('bulletList')} class:text-blue-700={editor.isActive('bulletList')}
			class:text-gray-600={!editor.isActive('bulletList')} class:hover:bg-gray-200={!editor.isActive('bulletList')}
			title="Bullet List">•</button>
		<button onmousedown={cmd((e) => e.chain().focus().toggleOrderedList().run())}
			class="rounded px-2 py-1 text-sm transition-colors"
			class:bg-blue-100={editor.isActive('orderedList')} class:text-blue-700={editor.isActive('orderedList')}
			class:text-gray-600={!editor.isActive('orderedList')} class:hover:bg-gray-200={!editor.isActive('orderedList')}
			title="Ordered List">1.</button>
		<button onmousedown={cmd((e) => e.chain().focus().toggleTaskList().run())}
			class="rounded px-2 py-1 text-sm transition-colors"
			class:bg-blue-100={editor.isActive('taskList')} class:text-blue-700={editor.isActive('taskList')}
			class:text-gray-600={!editor.isActive('taskList')} class:hover:bg-gray-200={!editor.isActive('taskList')}
			title="Task List">☑</button>

		<span class="mx-1 h-5 w-px shrink-0 bg-gray-300"></span>

		<!-- Block elements -->
		<button onmousedown={cmd((e) => e.chain().focus().toggleCodeBlock().run())}
			class="rounded px-2 py-1 text-sm transition-colors"
			class:bg-blue-100={editor.isActive('codeBlock')} class:text-blue-700={editor.isActive('codeBlock')}
			class:text-gray-600={!editor.isActive('codeBlock')} class:hover:bg-gray-200={!editor.isActive('codeBlock')}
			title="Code Block">{"{ }"}</button>
		<button onmousedown={cmd((e) => e.chain().focus().toggleBlockquote().run())}
			class="rounded px-2 py-1 text-sm transition-colors"
			class:bg-blue-100={editor.isActive('blockquote')} class:text-blue-700={editor.isActive('blockquote')}
			class:text-gray-600={!editor.isActive('blockquote')} class:hover:bg-gray-200={!editor.isActive('blockquote')}
			title="Blockquote">"</button>
		<button onmousedown={cmd((e) => e.chain().focus().setHorizontalRule().run())}
			class="rounded px-2 py-1 text-sm text-gray-600 transition-colors hover:bg-gray-200"
			title="Horizontal Rule">—</button>

		<span class="mx-1 h-5 w-px shrink-0 bg-gray-300"></span>

		<!-- Link & Image -->
		<button onmousedown={prevent} onclick={addLink}
			class="rounded px-2 py-1 text-sm text-gray-600 hover:bg-gray-200"
			class:bg-blue-100={editor.isActive('link')} class:text-blue-700={editor.isActive('link')}
			title="Add Link">🔗</button>
		<button onmousedown={prevent} onclick={addImage}
			class="rounded px-2 py-1 text-sm text-gray-600 hover:bg-gray-200"
			title="Add Image">🖼</button>

		<span class="mx-1 h-5 w-px shrink-0 bg-gray-300"></span>

		<!-- Undo/Redo -->
		<button onmousedown={cmd((e) => e.chain().focus().undo().run())}
			disabled={!editor.can().undo()}
			class="rounded px-2 py-1 text-sm text-gray-600 hover:bg-gray-200 disabled:opacity-30"
			title="Undo">↩</button>
		<button onmousedown={cmd((e) => e.chain().focus().redo().run())}
			disabled={!editor.can().redo()}
			class="rounded px-2 py-1 text-sm text-gray-600 hover:bg-gray-200 disabled:opacity-30"
			title="Redo">↪</button>
	</div>
{/if}
