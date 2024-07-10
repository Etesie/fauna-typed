import { Client, fql } from 'fauna';
// import { FAUNA_ADMIN_KEY } from '$env/static/private';
import { PUBLIC_FAUNA_ADMIN_KEY } from '$env/static/public';

/**
 * TODO: Initialize client
 * - set API secret
 *
 */

const client = new Client({
	// secret: FAUNA_ADMIN_KEY
	secret: PUBLIC_FAUNA_ADMIN_KEY
	// secret: ''
});

// Get a unique string-encoded 64-bit integer as string that is unique across all Fauna databases.
const newId = async (): Promise<string> => {
	try {
		const { data } = await client.query<string>(fql`newId()`);
		return data;
	} catch (error) {
		console.error(error);
		throw error;
	}
};

export { client, newId, fql };
