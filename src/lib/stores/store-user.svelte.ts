import { Page } from '../types/fauna';
import { User, type UserProperties, type UserPojo } from '../types/user';
import { browser } from '$app/environment';

const STORE_NAME = 'USER_STORE';

export type CreateUserStore = {
	init: () => UserStore;
};

export type UserStore = {
	all: () => Page<User>;
	create: (user: UserProperties) => User;

	/**
	 * Transforms an Array of User into a POJO that can be used in the DOM.
	 * @param users
	 * @returns
	 */
	toObjectArray: (users: User[]) => UserPojo[];
};

/**
 * Used to determine the current state of the store
 */
let users: User[] = $state<User[]>([]);

const upsertObject = (user: UserProperties): User => {
	const index = users.findIndex((u) => $state.is(u.id, user.id));

	const newUser = new User(user);
	if (index > -1) {
		users[index] = newUser;
	} else {
		users.push(newUser);
	}
	toLocalStorage();
	const updatedUser = users.find((u) => $state.is(u.id, newUser.id));
	if (!updatedUser) {
		throw new Error('User not found after upsert');
	}
	console.log('***current***\n', users);
	return updatedUser;
};

export const toLocalStorage = () => {
	if (browser) {
		localStorage.setItem(STORE_NAME, JSON.stringify(users));
	}
};

export const fromLocalStorage = () => {
	if (browser) {
		console.log('fromLocalStorage called');
		const storedData = localStorage.getItem(STORE_NAME);
		console.log('***storedData***\n', storedData);
		if (storedData) {
			try {
				const parsedUsers = JSON.parse(storedData) as UserProperties[];
				console.log('***parsedUsers***\n', parsedUsers);
				const newUsers = parsedUsers.map((parsedUser) => {
					const newUser = new User(parsedUser);
					console.log('***newUser***\n', newUser);
					return newUser;
				});
				users = newUsers; // Reassign the current array to the new user instances
				console.log('***current 2***\n', users);
			} catch (error) {
				console.error('Error parsing stored data:', error);
			}
		} else {
			console.log('No stored data found');
		}
	}
	// users.push(
	// 	new User({
	// 		id: 'TEMP_1',
	// 		firstName: 'John',
	// 		lastName: 'Doe',
	// 		ts: new Date().toISOString() // Assuming ts is required
	// 	})
	// );
	// console.log('Test user added:', users);
};

export const createUserStore = (): CreateUserStore => {
	const createStoreHandler = {
		get(target: any, prop: any, receiver: any): any {
			switch (prop) {
				case 'init':
					return () => {
						fromLocalStorage();
						return new Proxy(users, storeHandler);
					};
				default:
					return undefined;
			}
		}
	};

	const storeHandler = {
		get(target: any, prop: any, receiver: any): any {
			console.log('storeProp:', prop);

			switch (prop) {
				case 'all':
					return () => {
						const result: Page<User> = new Page(users, undefined);
						// fetchAllFromDB(result);
						return result;
					};

				case 'create':
					return (user: UserProperties) => {
						return upsertObject(user);
					};

				case 'toObjectArray':
					return (users: User[]) => {
						return users?.map((user) => user.toObject());
					};

				default:
					// This will handle all other cases, including 'then' for Promises
					return Reflect.get(target, prop, receiver);
			}
		}
	};

	return new Proxy({}, createStoreHandler) as unknown as CreateUserStore;
};
