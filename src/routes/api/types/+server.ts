import { createCollectionStore } from '$lib/stores/collection.svelte';
import type { RequestHandler } from '@sveltejs/kit';

import { generateTypes } from '$lib/types/generateTypes';

const Collection = createCollectionStore().init();

export const GET: RequestHandler = async () => {
	try {
		const schema = Collection.all().data;

		const res = generateTypes(schema);

		return new Response(JSON.stringify(res), {
			status: 200,
			headers: {
				'Content-Type': 'application/json'
			}
		});
	} catch (error) {
		return new Response(JSON.stringify({ message: 'Failed to generate types', error }), {
			status: 500,
			headers: {
				'Content-Type': 'application/json'
			}
		});
	}
};
