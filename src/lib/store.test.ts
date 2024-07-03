import { expect, it, test } from 'vitest';
import { User } from '../fauna-typed/stores';
import { fromLocalStorage, toLocalStorage } from './stores/document.svelte';

/**
 * @vitest-environment jsdom
 */

/**
 * Create User store and store it to local storage, retrieve it and compare the Outcome of the User store before and after
 */
test('rehydrates the store object correctly', () => {
	User.create({ firstName: 'John', lastName: 'Doe' });
	const userBeforeHydration = User.all().data;
	console.log('***userBeforeHydration***\n', userBeforeHydration);

	toLocalStorage();
	fromLocalStorage();

	const userAfterHydration = User.all().data;
	console.log('***userAfterHydration***\n', userAfterHydration);

	expect(userBeforeHydration).toEqual(userAfterHydration);
});
