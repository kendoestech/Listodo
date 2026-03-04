import { Mark } from '@tiptap/core';
import type MarkdownIt from 'markdown-it';
import type StateInline from 'markdown-it/lib/rules_inline/state_inline.mjs';

declare module '@tiptap/core' {
	interface Commands<ReturnType> {
		textDim: {
			toggleTextDim: () => ReturnType;
		};
	}
}

function textDimPlugin(md: MarkdownIt) {
	md.inline.ruler.push('text_dim', (state: StateInline, silent: boolean): boolean => {
		const src = state.src;
		const pos = state.pos;

		if (src.charCodeAt(pos) !== 0x7b /* { */) return false;

		const openTag = '{dim}';
		const closeTag = '{/dim}';

		if (src.slice(pos, pos + openTag.length) !== openTag) return false;

		const closeIdx = src.indexOf(closeTag, pos + openTag.length);
		if (closeIdx === -1) return false;

		if (!silent) {
			const tokenOpen = state.push('text_dim_open', 'span', 1);
			tokenOpen.markup = openTag;

			const oldMax = state.posMax;
			state.pos = pos + openTag.length;
			state.posMax = closeIdx;
			state.md.inline.tokenize(state);
			state.posMax = oldMax;

			const tokenClose = state.push('text_dim_close', 'span', -1);
			tokenClose.markup = closeTag;
		}

		state.pos = closeIdx + closeTag.length;
		return true;
	});

	md.renderer.rules['text_dim_open'] = () => '<span class="text-dim">';
	md.renderer.rules['text_dim_close'] = () => '</span>';
}

export const TextDim = Mark.create({
	name: 'textDim',

	parseHTML() {
		return [{ tag: 'span.text-dim' }];
	},

	renderHTML() {
		return ['span', { class: 'text-dim' }, 0];
	},

	addCommands() {
		return {
			toggleTextDim:
				() =>
				({ commands, editor }) => {
					if (editor.isActive(this.name)) {
						return commands.unsetMark(this.name);
					}
					return commands.setMark(this.name);
				}
		};
	},

	addStorage() {
		return {
			markdown: {
				serialize: {
					open: '{dim}',
					close: '{/dim}',
					mixable: false,
					expelEnclosingWhitespace: true
				},
				parse: {
					setup(md: MarkdownIt) {
						textDimPlugin(md);
					}
				}
			}
		};
	}
});
