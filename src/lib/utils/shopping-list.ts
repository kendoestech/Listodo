/** Formatting marks used by Tiptap extensions — not data fields */
const FORMAT_MARKS = new Set(['lg', '/lg', 'sm', '/sm', 'dim', '/dim']);

export interface ShoppingListMeta {
	store: string;
	storeName: string;
	template: string;
	fields: string[];
	rawFrontmatter: string;
	body: string;
}

/**
 * Parse YAML-style frontmatter from a markdown document.
 * Returns metadata + body (markdown without frontmatter), or null if not a shopping list.
 */
export function parseShoppingListMeta(markdown: string): ShoppingListMeta | null {
	// Normalize CRLF to LF so frontmatter regex works on Windows/Drive content
	const normalized = markdown.replace(/\r\n/g, '\n');
	const match = normalized.match(/^---\n([\s\S]*?)\n---\n?([\s\S]*)$/);
	if (!match) return null;

	const frontmatterBlock = match[1];
	const body = match[2];

	// Simple YAML key-value parser (supports multi-line with | )
	const meta: Record<string, string> = {};
	let currentKey = '';
	let multiLineValue = '';
	let inMultiLine = false;

	for (const line of frontmatterBlock.split('\n')) {
		if (inMultiLine) {
			// Multi-line values are indented with at least 2 spaces
			if (line.match(/^ {2}/)) {
				multiLineValue += (multiLineValue ? '\n' : '') + line.replace(/^ {2}/, '');
				continue;
			} else {
				meta[currentKey] = multiLineValue;
				inMultiLine = false;
				multiLineValue = '';
			}
		}

		const kvMatch = line.match(/^(\S+):\s*(.*)$/);
		if (kvMatch) {
			currentKey = kvMatch[1];
			const value = kvMatch[2].trim();
			if (value === '|') {
				inMultiLine = true;
				multiLineValue = '';
			} else {
				meta[currentKey] = value;
			}
		}
	}
	if (inMultiLine) {
		meta[currentKey] = multiLineValue;
	}

	if (meta['type'] !== 'shopping-list') return null;

	const store = meta['store'] || '';
	const storeName = meta['store-name'] || '';
	const template = meta['template'] || '';
	const fields = extractFieldNames(template);

	return {
		store,
		storeName,
		template,
		fields,
		rawFrontmatter: `---\n${frontmatterBlock}\n---\n`,
		body
	};
}

/**
 * Extract data field names from a template string.
 * Filters out formatting marks like {lg}, {/lg}, {dim}, etc.
 */
export function extractFieldNames(template: string): string[] {
	const matches = template.matchAll(/\{([^}]+)\}/g);
	const fields = new Set<string>();
	for (const m of matches) {
		const name = m[1];
		if (!FORMAT_MARKS.has(name)) {
			fields.add(name);
		}
	}
	return [...fields];
}

/**
 * Extract item names from checkbox lines in markdown.
 * For enriched items (multi-line template format), extracts the base item name
 * from the `item` field in the result, or falls back to the first line text.
 */
export function extractItems(markdown: string): string[] {
	const items: string[] = [];
	const lines = markdown.split('\n');

	for (const line of lines) {
		const match = line.match(/^- \[[ x]\] (.+)/);
		if (match) {
			// Strip any formatting marks to get the plain text
			let text = match[1];
			// Remove trailing backslash (line continuation)
			text = text.replace(/\\$/, '').trim();
			// Strip formatting marks
			text = text.replace(/\{\/?(lg|sm|dim)\}/g, '').trim();
			if (text) {
				items.push(text);
			}
		}
	}

	return items;
}

/**
 * Fill a template with field values from a result object.
 * Empty fields get replaced with "—" or omitted.
 */
export function applyTemplate(
	template: string,
	result: Record<string, string>,
	checked: boolean
): string {
	let output = template;

	// Replace field placeholders with values
	for (const [field, value] of Object.entries(result)) {
		if (field === 'item') continue;
		output = output.replaceAll(`{${field}}`, value || '');
	}

	// Set checkbox state
	output = output.replace('- [ ]', checked ? '- [x]' : '- [ ]');

	// Clean up empty fields — remove lines that are only formatting marks and whitespace
	output = output
		.split('\n')
		.filter((line) => {
			// Keep lines that have content beyond formatting marks and whitespace
			const stripped = line.replace(/\{\/?(lg|sm|dim)\}/g, '').trim();
			// Keep the checkbox line always, and any line with real content
			return line.match(/^- \[[ x]\]/) || stripped.length > 0;
		})
		.join('\n');

	return output;
}

/**
 * Update markdown document by replacing checkbox items with template-formatted results.
 */
export function updateItemsWithResults(
	markdown: string,
	template: string,
	results: Array<Record<string, string>>
): string {
	const lines = markdown.split('\n');
	const outputLines: string[] = [];
	let i = 0;

	while (i < lines.length) {
		const checkboxMatch = lines[i].match(/^- \[( |x)\] /);
		if (!checkboxMatch) {
			outputLines.push(lines[i]);
			i++;
			continue;
		}

		const checked = checkboxMatch[1] === 'x';

		// Extract the item name from this checkbox line
		let itemText = lines[i].replace(/^- \[[ x]\] /, '');
		itemText = itemText.replace(/\\$/, '').trim();
		itemText = itemText.replace(/\{\/?(lg|sm|dim)\}/g, '').trim();

		// Skip continuation lines (indented lines after a checkbox with backslash)
		i++;
		while (i < lines.length && lines[i].match(/^ {2,}/) && !lines[i].match(/^- /)) {
			i++;
		}

		// Find matching result (case-insensitive partial match)
		const match = results.find(
			(r) =>
				r.item &&
				(r.item.toLowerCase().includes(itemText.toLowerCase()) ||
					itemText.toLowerCase().includes(r.item.toLowerCase()))
		);

		if (match) {
			outputLines.push(applyTemplate(template, match, checked));
		} else {
			// No match — keep original item as simple checkbox
			outputLines.push(`- [${checked ? 'x' : ' '}] ${itemText}`);
		}
	}

	return outputLines.join('\n');
}

/**
 * Restore a full document by prepending frontmatter to body.
 */
export function restoreDocument(frontmatter: string, body: string): string {
	return frontmatter + body;
}

/**
 * Strip enriched template data from items, returning them to plain item names.
 * Used before re-searching to get clean item names.
 */
export function stripEnrichment(markdown: string): string {
	const lines = markdown.split('\n');
	const outputLines: string[] = [];
	let i = 0;

	while (i < lines.length) {
		const checkboxMatch = lines[i].match(/^- \[( |x)\] /);
		if (!checkboxMatch) {
			outputLines.push(lines[i]);
			i++;
			continue;
		}

		const checked = checkboxMatch[1] === 'x';

		// Extract plain text from the first line
		let itemText = lines[i].replace(/^- \[[ x]\] /, '');
		itemText = itemText.replace(/\\$/, '').trim();
		itemText = itemText.replace(/\{\/?(lg|sm|dim)\}/g, '').trim();

		// Skip continuation lines
		i++;
		while (i < lines.length && lines[i].match(/^ {2,}/) && !lines[i].match(/^- /)) {
			i++;
		}

		outputLines.push(`- [${checked ? 'x' : ' '}] ${itemText}`);
	}

	return outputLines.join('\n');
}
