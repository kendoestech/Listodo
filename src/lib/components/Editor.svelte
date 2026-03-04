<script lang="ts">
	import { onMount, onDestroy } from 'svelte';
	import { Editor } from '@tiptap/core';
	import StarterKit from '@tiptap/starter-kit';
	import TaskList from '@tiptap/extension-task-list';
	import TaskItem from '@tiptap/extension-task-item';
	import Link from '@tiptap/extension-link';
	import Image from '@tiptap/extension-image';
	import { Table } from '@tiptap/extension-table';
	import TableRow from '@tiptap/extension-table-row';
	import TableHeader from '@tiptap/extension-table-header';
	import TableCell from '@tiptap/extension-table-cell';
	import CodeBlock from '@tiptap/extension-code-block';
	import Placeholder from '@tiptap/extension-placeholder';
	import { Markdown } from 'tiptap-markdown';
	import Toolbar from './Toolbar.svelte';

	import type { Filter } from './FilterBar.svelte';

	interface Props {
		content: string;
		onchange: (markdown: string) => void;
		filter?: Filter;
		oneditor?: (editor: Editor | null) => void;
		ontick?: () => void;
	}

	let { content, onchange, filter = 'all', oneditor, ontick }: Props = $props();

	let element: HTMLDivElement;
	let editor = $state<Editor | null>(null);
	let updatingFromProp = false;

	function getMarkdown(e: Editor): string {
		return (e.storage as Record<string, any>).markdown.getMarkdown();
	}

	onMount(() => {
		editor = new Editor({
			element,
			extensions: [
				StarterKit.configure({
					codeBlock: false
				}),
				TaskList,
				TaskItem.configure({ nested: true }),
				Link.configure({
					openOnClick: false,
					HTMLAttributes: { class: 'text-blue-600 underline' }
				}),
				Image,
				Table.configure({ resizable: false }),
				TableRow,
				TableHeader,
				TableCell,
				CodeBlock,
				Placeholder.configure({
					placeholder: 'Start writing your todo list...'
				}),
				Markdown.configure({
					html: false,
					transformPastedText: true,
					transformCopiedText: true
				})
			],
			content,
			editorProps: {
				attributes: {
					class: 'prose prose-sm max-w-none focus:outline-none min-h-[50vh] px-4 py-3'
				}
			},
			onUpdate: ({ editor: e }) => {
				if (updatingFromProp) return;
				const md = getMarkdown(e);
				onchange(md);
			},
			onTransaction: () => {
				// Trigger Svelte reactivity for toolbar button states and filter counts
				editor = editor;
				oneditor?.(editor);
				ontick?.();
			}
		});
		oneditor?.(editor);
	});

	// Update editor content when prop changes (e.g. switching files)
	$effect(() => {
		if (editor && content !== undefined) {
			const currentMd = getMarkdown(editor);
			if (content !== currentMd) {
				updatingFromProp = true;
				editor.commands.setContent(content);
				updatingFromProp = false;
			}
		}
	});

	onDestroy(() => {
		editor?.destroy();
	});
</script>

<div class="flex flex-col overflow-hidden rounded-lg border border-gray-200 bg-white">
	<Toolbar {editor} />
	<div
		bind:this={element}
		class="flex-1 overflow-y-auto"
		class:filter-incomplete={filter === 'incomplete'}
		class:filter-completed={filter === 'completed'}
	></div>
</div>

<style>
	:global(.tiptap) {
		min-height: 50vh;
	}

	:global(.tiptap p.is-editor-empty:first-child::before) {
		color: #adb5bd;
		content: attr(data-placeholder);
		float: left;
		height: 0;
		pointer-events: none;
	}

	/* Task list styling */
	:global(.tiptap ul[data-type='taskList']) {
		list-style: none;
		padding-left: 0;
	}

	:global(.tiptap ul[data-type='taskList'] li) {
		display: flex;
		align-items: flex-start;
		gap: 0.5rem;
		padding: 0.25rem 0;
	}

	:global(.tiptap ul[data-type='taskList'] li label) {
		display: flex;
		align-items: center;
	}

	:global(.tiptap ul[data-type='taskList'] li label input[type='checkbox']) {
		width: 1.1rem;
		height: 1.1rem;
		cursor: pointer;
		accent-color: #2563eb;
	}

	:global(.tiptap ul[data-type='taskList'] li[data-checked='true'] > div > p) {
		text-decoration: line-through;
		color: #9ca3af;
	}

	/* Code block styling */
	:global(.tiptap pre) {
		background-color: #1e1e1e;
		color: #d4d4d4;
		border-radius: 0.5rem;
		padding: 1rem;
		overflow-x: auto;
	}

	:global(.tiptap pre code) {
		font-family: 'Fira Code', 'Consolas', monospace;
		font-size: 0.875rem;
	}

	/* Table styling */
	:global(.tiptap table) {
		border-collapse: collapse;
		width: 100%;
		margin: 1rem 0;
	}

	:global(.tiptap th),
	:global(.tiptap td) {
		border: 1px solid #d1d5db;
		padding: 0.5rem 0.75rem;
		text-align: left;
	}

	:global(.tiptap th) {
		background-color: #f3f4f6;
		font-weight: 600;
	}

	/* Blockquote styling */
	:global(.tiptap blockquote) {
		border-left: 3px solid #d1d5db;
		padding-left: 1rem;
		color: #6b7280;
	}

	/* Image styling */
	:global(.tiptap img) {
		max-width: 100%;
		height: auto;
		border-radius: 0.375rem;
	}

	/* Filter: hide completed tasks when showing incomplete only */
	:global(.filter-incomplete .tiptap ul[data-type='taskList'] li[data-checked='true']) {
		display: none;
	}

	/* Filter: hide incomplete tasks when showing completed only */
	:global(.filter-completed .tiptap ul[data-type='taskList'] li[data-checked='false']) {
		display: none;
	}
</style>
