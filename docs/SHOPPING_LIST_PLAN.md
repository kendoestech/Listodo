# AI Shopping List — Proof of Concept

## Context

Add an AI-powered shopping list feature to Listodo. When a markdown document contains a special shopping list header block (store URL, item template), the app shows an AI button that uses Claude's web search to find matching products, prices, and availability on the store's website — working with **any store** (Kroger, Target, Sam's Club, etc.) rather than locking into store-specific APIs.

This is a **proof of concept** focused on: detect shopping list → search store website for items → update the document with results.

## Architecture

```
Browser (SvelteKit SPA)              Separate Backend (Node.js)
  │                                    │
  │  1. Parse frontmatter template     │
  │     → extract field names          │
  │       ["name","sku","aisle",...]   │
  │                                    │
  │  POST /api/shopping/search         │
  │  { storeUrl, storeName,       ───► │  2. Build report_results tool schema
  │    fields: ["name","sku",...],      │     from field names
  │    items: ["Milk, 1 gal", ...] }   │
  │                                    │  3. Call Claude API with:
  │                                    │     - web_search (searches store site)
  │                                    │     - report_results (dynamic schema)
  │                                    │
  │  ◄─── { results: [{          ◄─── │  4. Extract tool call JSON
  │    name: "Kroger Whole Milk...",   │
  │    sku: "0011110000125",           │
  │    aisle: "Dairy",                 │
  │    price: "$3.49",                 │
  │    salePrice: "~~$4.29~~ SALE" }   │
  │  ]}                                │
  │                                    │
  │  5. Fill template with results     │
  │     → update markdown & save       │
```

- **No store-specific APIs** — Claude web search provides flexibility for any store
- **Separate Node.js backend** — keeps the Anthropic API key secure server-side
- **Structured outputs** — Claude returns guaranteed-valid JSON via tool use schema
- **Cost**: ~$0.08–$0.12 per 20-item list (Claude batches searches efficiently)

## Key Research Findings

### Claude API
- **Cannot embed API key in browser** — anyone can extract it from client-side JS and rack up charges
- **Requires a backend proxy** — separate Node.js server holds the key securely
- **Web search tool**: $10/1,000 searches (~$0.01 per search), works with any website
- **Web fetch tool**: Free (only standard token costs), good for parsing specific URLs
- **Structured outputs (tool use)**: Define a JSON schema as a "tool" — Claude is forced to return valid JSON matching that schema. More reliable than asking for JSON in a text response. This is how we get structured product data back from Claude.
- **Model recommendation**: Haiku 4.5 for cost efficiency ($1/$5 per M input/output tokens)
- **CORS**: Anthropic API supports browser CORS via `anthropic-dangerous-direct-browser-access` header, but this is NOT recommended for production with a shared key

### Cost Model
- Claude's web search is **per-search, not per-item** — Claude autonomously decides how many searches to make
- A single API call with 20 items might only need 8-12 web searches (Claude can find multiple items per search)
- **Estimated cost per 20-item list**: ~$0.08–$0.12 (web search dominates; token costs negligible)
- Cost varies by store website structure — well-organized sites need fewer searches

### Kroger API (for future store-specific integration)
- **Free developer API** at developer.kroger.com with product search, pricing, cart management
- **Does NOT expose aisle/shelf location data**
- **Requires backend** (OAuth2, no browser CORS)
- **Cart API**: Can add items by UPC, 5,000 calls/day limit, requires user OAuth2 login
- **Cannot read existing cart** — only add items

### Decision: Claude Web Search Over Store APIs
Using Claude's web search tool instead of store-specific APIs because:
- Works with **any store** (Kroger, Target, Sam's Club, Walmart, etc.)
- No need to integrate separate APIs per store
- More flexible — can find sale info, weekly ads, etc.
- Trade-off: slightly higher cost per query, less structured data

## Shopping List Document Format

A markdown file is recognized as a shopping list when it starts with a YAML-style frontmatter block. The frontmatter includes a **template** that defines the markdown layout for each item, using `{fieldName}` placeholders and Tiptap custom marks for formatting.

### Frontmatter

```markdown
---
type: shopping-list
store: https://www.kroger.com
store-name: Kroger
template: |
  - [ ] {lg}{name}{/lg}\
    {dim}{sm}{sku}{/sm}{/dim}\
    {dim}{aisle}{/dim} {price} {salePrice}
---
```

**Frontmatter fields:**
- `type` — must be `shopping-list` to activate AI features
- `store` — base URL of the store website (used by Claude for web search)
- `store-name` — display name of the store
- `template` — multi-line markdown template defining item layout (YAML `|` for literal block)

### Template Syntax

**Placeholders** — `{fieldName}` maps to a field in the Claude JSON response:
- `{name}` — product name (e.g., "Kroger Vitamin D Whole Milk, 1 Gallon")
- `{sku}` — store SKU or UPC
- `{aisle}` — aisle/location info (e.g., "Aisle 5, Shelf 3" or "Dairy")
- `{price}` — current price (e.g., "$3.49")
- `{salePrice}` — sale price if on sale, empty otherwise

**Formatting marks** — Tiptap custom marks wrap placeholders or literal text:
- `{lg}...{/lg}` — large text (TextSize extension)
- `{sm}...{/sm}` — small text (TextSize extension)
- `{dim}...{/dim}` — dimmed text (TextDim extension)

**Line continuations** — `\` at end of line creates a soft break within the same list item (standard markdown)

### Example: Before AI Processing

User writes simple item names:

```markdown
---
type: shopping-list
store: https://www.kroger.com
store-name: Kroger
template: |
  - [ ] {lg}{name}{/lg}\
    {dim}{sm}{sku}{/sm}{/dim}\
    {dim}{aisle}{/dim} {price} {salePrice}
---

# Grocery List

- [ ] Milk, 1 gallon whole
- [ ] Bananas, organic
- [ ] Cheerios cereal
```

### Example: After AI Processing

Items are replaced with the template format, populated with data from Claude:

```markdown
- [ ] {lg}Kroger Vitamin D Whole Milk, 1 Gallon{/lg}\
  {dim}{sm}SKU: 0011110000125{/sm}{/dim}\
  {dim}Aisle: Dairy{/dim} $3.49 ~~$4.29~~ SALE

- [ ] {lg}Organic Bananas, bunch{/lg}\
  {dim}{sm}SKU: 0000000094011{/sm}{/dim}\
  {dim}Aisle: Produce{/dim} $0.79/lb

- [ ] {lg}General Mills Cheerios, 18oz{/lg}\
  {dim}{sm}SKU: 0016000275607{/sm}{/dim}\
  {dim}Aisle: Cereal{/dim} $4.99
```

### How the Template Drives the System

1. **Frontend** parses the template to extract field names → `["name", "sku", "aisle", "price", "salePrice"]`
2. **Backend** dynamically builds the Claude `report_results` tool schema from those field names — each becomes a property in the JSON schema
3. **Claude** searches the store website and returns structured JSON with exactly those fields
4. **Frontend** takes each result and fills in the template, replacing `{name}` with the actual product name, etc.
5. **Empty fields** — if Claude can't find aisle info, `{aisle}` is left blank or replaced with "—"

This means the template is the single source of truth for both the data schema and the display format.

## Implementation Plan (Proof of Concept)

### Phase 1: Backend — Claude Shopping Search Service

**New project: `listodo-backend/`** (separate repo or monorepo subfolder)

1. **Express/Fastify server** with a single endpoint:
   - `POST /api/shopping/search`
   - Request body: `{ storeUrl: string, storeName: string, fields: string[], items: string[] }`

2. **Claude API call** with two tools enabled:
   - **`web_search`** (built-in) — Claude uses this to search the store's website
   - **`report_results`** (custom tool with **dynamic** JSON schema) — built at runtime from the `fields` array

   The backend dynamically constructs the `report_results` tool schema from the fields:
   ```typescript
   // fields = ["name", "sku", "aisle", "price", "salePrice"]
   // → generates a schema where each field is a string property
   const properties = Object.fromEntries(
     fields.map(f => [f, { type: "string", description: `The ${f} for this item` }])
   );
   ```

   Example generated schema for the template above:
   ```json
   {
     "results": [
       {
         "item": "Milk, 1 gallon whole",
         "name": "Kroger Vitamin D Whole Milk, 1 Gallon",
         "sku": "0011110000125",
         "aisle": "Dairy",
         "price": "$3.49",
         "salePrice": "~~$4.29~~ SALE"
       }
     ]
   }
   ```

   The `item` field is always included (maps results back to input items). All other fields come from the template.

   **Why structured tool output instead of plain text JSON:**
   - Claude is **forced** to return valid JSON matching the schema — no parsing errors
   - The backend doesn't need to extract JSON from a text response
   - Fields are predictable — the frontend always knows what to expect
   - Claude can't accidentally alter markdown or add commentary in the response

3. **System prompt** instructs Claude to:
   - Search the store website for all items in a single session
   - Find current prices, sale prices, and product names
   - Match each search result back to the original item from the list
   - Call `report_results` with the findings

4. **Backend processing:**
   - Extracts the `report_results` tool call from Claude's response
   - Returns the structured JSON array to the frontend
   - Frontend handles merging results back into the markdown document

5. **CORS config**: Allow requests from the Listodo frontend origin

6. **Environment**: `ANTHROPIC_API_KEY` stored in server env vars only

### Phase 2: Frontend — Shopping List Detection & Template Engine

**File: `src/lib/utils/shopping-list.ts`** (new)

1. `parseShoppingListMeta(markdown: string)` — parse frontmatter, return `{ type, store, storeName, template, fields }` or `null` if not a shopping list
2. `extractFieldNames(template: string)` — extract `{fieldName}` placeholders from template → `["name", "sku", "aisle", "price", "salePrice"]`
3. `extractItems(markdown: string)` — extract the first text of each checkbox item (the original item name the user typed)
4. `applyTemplate(template: string, result: Record<string, string>)` — fill a template with one result's field values, omitting or replacing empty fields with "—"
5. `updateItemsWithResults(markdown: string, template: string, results[])` — for each checkbox item, find its matching result by `item` field and replace the item text with the filled template

### Phase 3: Frontend — AI Button & UI

**File: `src/routes/+page.svelte`** and a new **`src/lib/components/ShoppingActions.svelte`**

1. Detect shopping list from document content (call `parseShoppingListMeta`)
2. When detected, show an AI action button (sparkle/wand icon) in the toolbar area
3. Button opens a dropdown/menu with options:
   - "Search for prices" — sends items to backend, updates document with results
4. Show loading state while backend processes
5. On response, call `updateItemsWithResults()` and push updated markdown back through `saveFile()`

### Phase 4: Future (not in POC)

- "Add to cart" via store-specific APIs (Kroger, etc.)
- Login credential storage for store accounts
- Aisle/location lookup via web search
- Price comparison across multiple stores
- Sale alerts / weekly ad matching

## Files to Create/Modify

### New files:
- `listodo-backend/` — new backend project (Express + Claude SDK)
  - `server.ts` — Express server with `/api/shopping/search`
  - `claude-shopping.ts` — Claude API call with web search tool
  - `package.json`, `.env.example`, etc.
- `src/lib/utils/shopping-list.ts` — frontmatter parsing, item extraction, result merging
- `src/lib/components/ShoppingActions.svelte` — AI button + dropdown UI

### Modified files:
- `src/routes/+page.svelte` — detect shopping list, render ShoppingActions component
- `.env` / `.env.example` — add `PUBLIC_BACKEND_URL`

## Verification

1. Create a test markdown file in Listodo with the shopping list frontmatter pointing at kroger.com
2. Add a few grocery items as checkboxes
3. Click the AI button → "Search for prices"
4. Verify items get updated with price information from Kroger's website
5. Test with a different store URL (e.g., target.com) to confirm store-agnostic behavior
6. Verify the updated markdown saves correctly to Google Drive
