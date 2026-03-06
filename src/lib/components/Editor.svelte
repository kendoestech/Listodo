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
	import { TextSize } from '$lib/extensions/text-size';
	import { TextDim } from '$lib/extensions/text-dim';

	import type { Filter } from './FilterBar.svelte';

	interface Props {
		content: string;
		onchange: (markdown: string) => void;
		filter?: Filter;
		editing?: boolean;
		oneditor?: (editor: Editor | null) => void;
		ontick?: () => void;
	}

	let { content, onchange, filter = 'all', editing = false, oneditor, ontick }: Props = $props();

	let element: HTMLDivElement;
	let editor = $state<Editor | null>(null);
	let editorRef: Editor | null = null; // non-reactive ref to avoid effect cycles
	let editingRef = false; // non-reactive ref for use in editor callbacks
	let updatingFromProp = false;

	function getMarkdown(e: Editor): string {
		return (e.storage as Record<string, any>).markdown.getMarkdown();
	}

	onMount(() => {
		editorRef = new Editor({
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
				}),
				TextSize,
				TextDim
			],
			content,
			editorProps: {
				attributes: {
					class: 'prose prose-sm max-w-none focus:outline-none min-h-[50vh] px-4 py-3'
				},
				handleKeyDown: () => !editingRef,
				handleKeyPress: () => !editingRef,
				handlePaste: () => !editingRef,
				handleDrop: () => !editingRef,
				handleDOMEvents: {
					beforeinput: (_view: unknown, event: Event) => {
						if (!editingRef) {
							event.preventDefault();
							return true;
						}
						return false;
					}
				}
			},
			onUpdate: ({ editor: e }) => {
				if (updatingFromProp) return;
				const md = getMarkdown(e);
				onchange(md);
			},
			onTransaction: () => {
				if (updatingFromProp) return;
				// Trigger Svelte reactivity for toolbar button states and filter counts
				editor = editorRef;
				ontick?.();
			}
		});
		editor = editorRef;
		oneditor?.(editor);
	});

	// Sync editing mode ref and editor CSS class
	$effect(() => {
		editingRef = editing;
		if (editorRef) {
			if (editing) {
				editorRef.view.dom.classList.add('is-editing');
			} else {
				editorRef.view.dom.classList.remove('is-editing');
			}
		}
	});

	// Update editor content when prop changes (e.g. switching files)
	$effect(() => {
		if (editorRef && content !== undefined) {
			const currentMd = getMarkdown(editorRef);
			if (content !== currentMd) {
				updatingFromProp = true;
				editorRef.commands.setContent(content);
				updatingFromProp = false;
			}
		}
	});

	onDestroy(() => {
		editorRef?.destroy();
	});
</script>

<div
	bind:this={element}
	class="overflow-hidden bg-white md:rounded-lg md:border md:border-gray-200"
	class:filter-incomplete={filter === 'incomplete'}
	class:filter-completed={filter === 'completed'}
></div>

<style>
	:global(.tiptap) {
		min-height: 50vh;
	}

	/* Hide cursor and prevent text selection when not editing */
	:global(.tiptap:not(.is-editing)) {
		caret-color: transparent;
	}

	/* Tighten prose-sm spacing — halve default margins */
	:global(.tiptap p) {
		margin-top: 0.5em;
		margin-bottom: 0.5em;
	}

	:global(.tiptap ul, .tiptap ol) {
		margin-top: 0.5em;
		margin-bottom: 0.5em;
	}

	:global(.tiptap li) {
		margin-top: 0;
		margin-bottom: 0;
	}

	:global(.tiptap h1, .tiptap h2, .tiptap h3) {
		margin-top: 0.75em;
		margin-bottom: 0.25em;
	}

	:global(.tiptap blockquote) {
		margin-top: 0.5em;
		margin-bottom: 0.5em;
	}

	/* Custom text size marks */
	:global(.tiptap .text-size-lg) {
		font-size: 1.25em;
		line-height: 1.4;
	}

	:global(.tiptap .text-size-sm) {
		font-size: 0.8em;
	}

	:global(.tiptap p:has(.text-size-sm)) {
		line-height: 1.2;
		margin-top: 0.25em;
		margin-bottom: 0.25em;
	}

	:global(.tiptap .text-dim) {
		color: rgba(0, 0, 0, 0.5);
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
		padding: 0;
	}

	:global(.tiptap ul[data-type='taskList'] li label) {
		display: flex;
		align-items: center;
		height: 1.75em;
	}

	:global(.tiptap ul[data-type='taskList'] li > div) {
		flex: 1;
		min-width: 0;
	}

	:global(.tiptap ul[data-type='taskList'] li > div > p:first-child) {
		margin-top: 0;
	}

	:global(.tiptap ul[data-type='taskList'] li label input[type='checkbox']) {
		width: 1.1rem;
		height: 1.1rem;
		cursor: pointer;
		accent-color: #2563eb;
	}

	:global(.tiptap ul[data-type='taskList'] li[data-checked='true'] > div) {
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
