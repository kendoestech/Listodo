import { Mark, mergeAttributes } from '@tiptap/core';
import type MarkdownIt from 'markdown-it';
import type StateInline from 'markdown-it/lib/rules_inline/state_inline.mjs';

const SIZES = {
	lg: { open: '{lg}', close: '{/lg}' },
	sm: { open: '{sm}', close: '{/sm}' }
} as const;

type TextSize = keyof typeof SIZES;

declare module '@tiptap/core' {
	interface Commands<ReturnType> {
		textSize: {
			setTextSize: (size: TextSize) => ReturnType;
			unsetTextSize: () => ReturnType;
			toggleTextSize: (size: TextSize) => ReturnType;
		};
	}
}

function textSizePlugin(md: MarkdownIt) {
	md.inline.ruler.push('text_size', (state: StateInline, silent: boolean): boolean => {
		const src = state.src;
		const pos = state.pos;

		if (src.charCodeAt(pos) !== 0x7b /* { */) return false;

		const openMatch = src.slice(pos).match(/^\{(lg|sm)\}/);
		if (!openMatch) return false;

		const size = openMatch[1];
		const closeTag = `{/${size}}`;
		const openLen = openMatch[0].length;
		const closeIdx = src.indexOf(closeTag, pos + openLen);
		if (closeIdx === -1) return false;

		if (!silent) {
			const tokenOpen = state.push('text_size_open', 'span', 1);
			tokenOpen.meta = { size };
			tokenOpen.markup = openMatch[0];

			const contentEnd = closeIdx;
			const oldMax = state.posMax;
			state.pos = pos + openLen;
			state.posMax = contentEnd;
			state.md.inline.tokenize(state);
			state.posMax = oldMax;

			const tokenClose = state.push('text_size_close', 'span', -1);
			tokenClose.markup = closeTag;
		}

		state.pos = closeIdx + closeTag.length;
		return true;
	});

	md.renderer.rules['text_size_open'] = (tokens, idx) => {
		const size = tokens[idx].meta.size;
		return `<span data-size="${size}" class="text-size-${size}">`;
	};
	md.renderer.rules['text_size_close'] = () => '</span>';
}

export const TextSize = Mark.create({
	name: 'textSize',

	addAttributes() {
		return {
			size: {
				default: 'lg',
				parseHTML: (element: HTMLElement) => element.getAttribute('data-size') || 'lg',
				renderHTML: (attributes) => ({
					'data-size': attributes.size,
					class: `text-size-${attributes.size}`
				})
			}
		};
	},

	parseHTML() {
		return [
			{ tag: 'span[data-size="lg"]', attrs: { size: 'lg' } },
			{ tag: 'span[data-size="sm"]', attrs: { size: 'sm' } }
		];
	},

	renderHTML({ HTMLAttributes }) {
		return ['span', mergeAttributes(HTMLAttributes), 0];
	},

	addCommands() {
		return {
			setTextSize:
				(size: TextSize) =>
				({ commands }) =>
					commands.setMark(this.name, { size }),
			unsetTextSize:
				() =>
				({ commands }) =>
					commands.unsetMark(this.name),
			toggleTextSize:
				(size: TextSize) =>
				({ commands, editor }) => {
					if (editor.isActive(this.name, { size })) {
						return commands.unsetMark(this.name);
					}
					return commands.setMark(this.name, { size });
				}
		};
	},

	addStorage() {
		return {
			markdown: {
				serialize: {
					open(_state: unknown, mark: { attrs: { size: TextSize } }) {
						return SIZES[mark.attrs.size]?.open ?? '';
					},
					close(_state: unknown, mark: { attrs: { size: TextSize } }) {
						return SIZES[mark.attrs.size]?.close ?? '';
					},
					mixable: false,
					expelEnclosingWhitespace: true
				},
				parse: {
					setup(md: MarkdownIt) {
						textSizePlugin(md);
					}
				}
			}
		};
	}
});
