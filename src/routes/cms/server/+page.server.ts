import type { Actions, PageServerLoad } from './$types';

import { stores as s } from '$fauna-typed/stores';

export const load = (async () => {
	/**
	 * Get all Users with pagination cursor
	 */
	const usersNonStringified = s.User.all().data;
	const users = JSON.parse(JSON.stringify(usersNonStringified));
	return { users };
}) satisfies PageServerLoad;

export const actions = {
	create: async (event) => {
		const data = await event.request.formData();
		const name = data.get('name');

		s.User.create({ firstName: name as string, lastName: name as string });
	},
	update: async (event) => {
		const data = await event.request.formData();
		const name = data.get('name') as string;
		const id = data.get('id') as string;

		s.User.byId(id).update({ firstName: name });
	}
} satisfies Actions;
