import { json } from '@sveltejs/kit';
import { writeFileSync, readFileSync, existsSync } from 'fs';
import { join } from 'path';

const IDEAS_FILE_PATH = join(process.cwd(), 'static', 'ideas-list.json');

export async function GET() {
	try {
		// Check if file exists, if not return empty array
		if (!existsSync(IDEAS_FILE_PATH)) {
			return json([]);
		}

		// Read and parse the JSON file
		const fileContent = readFileSync(IDEAS_FILE_PATH, 'utf-8');
		const ideas = JSON.parse(fileContent);

		return json(ideas);
	} catch (error) {
		console.error('Error reading ideas file:', error);
		return json({ error: 'Failed to read ideas' }, { status: 500 });
	}
}

export async function POST({ request }) {
	try {
		const ideas = await request.json();

		// Validate the data structure
		if (!Array.isArray(ideas)) {
			return json({ error: 'Invalid data format' }, { status: 400 });
		}

		// Write to file
		writeFileSync(IDEAS_FILE_PATH, JSON.stringify(ideas, null, 2), 'utf-8');

		return json({ success: true });
	} catch (error) {
		console.error('Error saving ideas file:', error);
		return json({ error: 'Failed to save ideas' }, { status: 500 });
	}
}
