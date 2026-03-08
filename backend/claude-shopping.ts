import Anthropic from '@anthropic-ai/sdk';

const client = new Anthropic();

interface SearchRequest {
	storeUrl: string;
	storeName: string;
	fields: string[];
	items: string[];
}

interface ItemResult {
	item: string;
	[key: string]: string;
}

function buildReportResultsTool(fields: string[]): Anthropic.Tool {
	const fieldProperties: Record<string, { type: string; description: string }> = {
		item: {
			type: 'string',
			description: 'The original item name from the shopping list that this result matches'
		}
	};

	for (const field of fields) {
		fieldProperties[field] = {
			type: 'string',
			description: `The ${field} for this item. Return empty string if not found.`
		};
	}

	return {
		name: 'report_results',
		description:
			'Report the search results for all shopping list items. Call this once with all results after searching.',
		input_schema: {
			type: 'object' as const,
			properties: {
				results: {
					type: 'array',
					items: {
						type: 'object',
						properties: fieldProperties,
						required: ['item', ...fields]
					}
				}
			},
			required: ['results']
		}
	};
}

export async function searchShoppingList(request: SearchRequest): Promise<ItemResult[]> {
	const { storeUrl, storeName, fields, items } = request;

	const reportResultsTool = buildReportResultsTool(fields);

	const itemList = items.map((item, i) => `${i + 1}. ${item}`).join('\n');
	const fieldList = fields.join(', ');

	const response = await client.messages.create({
		model: 'claude-haiku-4-5-20251001',
		max_tokens: 4096,
		tools: [
			{ type: 'web_search_20250305', name: 'web_search', max_uses: 30 },
			reportResultsTool
		],
		system: `You are a shopping assistant. You search store websites to find product information for items on a shopping list.

Instructions:
- Search the store website (${storeName}: ${storeUrl}) for each item on the list
- For each item, find: ${fieldList}
- For prices, include the dollar sign (e.g., "$3.49")
- For sale prices, if the item is on sale include the original price with strikethrough and "SALE" (e.g., "~~$4.29~~ SALE $3.49")
- If you cannot find information for a field, return an empty string
- After searching, call the report_results tool with ALL items at once
- Match each result back to the original item name from the list`,
		messages: [
			{
				role: 'user',
				content: `Search ${storeName} (${storeUrl}) for the following shopping list items and report the results:\n\n${itemList}\n\nFor each item, find these fields: ${fieldList}\n\nSearch the store website, then call report_results with all findings.`
			}
		]
	});

	// Extract the report_results tool call from the response
	for (const block of response.content) {
		if (block.type === 'tool_use' && block.name === 'report_results') {
			const input = block.input as { results: ItemResult[] };
			return input.results;
		}
	}

	// If Claude didn't call report_results, check if there are nested tool results
	// (web search happens first, then Claude calls report_results in a follow-up)
	// We need to continue the conversation if Claude used web_search but hasn't reported yet
	if (response.stop_reason === 'tool_use') {
		const toolUseBlocks = response.content.filter(
			(b): b is Anthropic.ToolUseBlock => b.type === 'tool_use'
		);

		// If only web_search was called, we need to loop until report_results is called
		const messages: Anthropic.MessageParam[] = [
			{
				role: 'user',
				content: `Search ${storeName} (${storeUrl}) for the following shopping list items and report the results:\n\n${itemList}\n\nFor each item, find these fields: ${fieldList}\n\nSearch the store website, then call report_results with all findings.`
			},
			{ role: 'assistant', content: response.content },
			{
				role: 'user',
				content: toolUseBlocks.map((block) => ({
					type: 'tool_result' as const,
					tool_use_id: block.id,
					content: block.name === 'web_search' ? 'Search completed.' : 'OK'
				}))
			}
		];

		// Continue conversation until we get report_results (max 10 rounds)
		for (let i = 0; i < 10; i++) {
			const followUp = await client.messages.create({
				model: 'claude-haiku-4-5-20251001',
				max_tokens: 4096,
				tools: [
					{ type: 'web_search_20250305', name: 'web_search', max_uses: 30 },
					reportResultsTool
				],
				system: `You are a shopping assistant. You search store websites to find product information for items on a shopping list.

Instructions:
- Search the store website (${storeName}: ${storeUrl}) for each item on the list
- For each item, find: ${fieldList}
- For prices, include the dollar sign (e.g., "$3.49")
- For sale prices, if the item is on sale include the original price with strikethrough and "SALE" (e.g., "~~$4.29~~ SALE $3.49")
- If you cannot find information for a field, return an empty string
- After searching, call the report_results tool with ALL items at once
- Match each result back to the original item name from the list`,
				messages
			});

			// Check for report_results in this response
			for (const block of followUp.content) {
				if (block.type === 'tool_use' && block.name === 'report_results') {
					const input = block.input as { results: ItemResult[] };
					return input.results;
				}
			}

			if (followUp.stop_reason !== 'tool_use') {
				break;
			}

			// Add this round to conversation and continue
			const newToolBlocks = followUp.content.filter(
				(b): b is Anthropic.ToolUseBlock => b.type === 'tool_use'
			);

			messages.push({ role: 'assistant', content: followUp.content });
			messages.push({
				role: 'user',
				content: newToolBlocks.map((block) => ({
					type: 'tool_result' as const,
					tool_use_id: block.id,
					content: block.name === 'web_search' ? 'Search completed.' : 'OK'
				}))
			});
		}
	}

	throw new Error('Claude did not return shopping results');
}
