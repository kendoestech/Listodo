import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import { searchShoppingList } from './claude-shopping.js';

const app = express();
const port = parseInt(process.env.PORT || '3001', 10);
const allowedOrigin = process.env.ALLOWED_ORIGIN || 'http://localhost:5173';

app.use(cors({ origin: allowedOrigin }));
app.use(express.json());

app.post('/api/shopping/search', async (req, res) => {
	const { storeUrl, storeName, fields, items } = req.body;

	if (!storeUrl || !storeName || !Array.isArray(fields) || !Array.isArray(items)) {
		res.status(400).json({ error: 'Missing required fields: storeUrl, storeName, fields, items' });
		return;
	}

	if (items.length === 0) {
		res.json({ results: [] });
		return;
	}

	try {
		const results = await searchShoppingList({ storeUrl, storeName, fields, items });
		res.json({ results });
	} catch (error) {
		console.error('Shopping search error:', error);
		res.status(500).json({
			error: error instanceof Error ? error.message : 'Search failed'
		});
	}
});

app.listen(port, () => {
	console.log(`Listodo backend running on http://localhost:${port}`);
});
