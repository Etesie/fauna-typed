import type { Document, Functions } from '$lib/types/default/types';
import type { QueryValueObject } from 'fauna';

const isBrowser = () => typeof window !== 'undefined';

const set = <T extends QueryValueObject>(key: string, current: Document<T>[]) => {
	if (isBrowser()) {
		localStorage.setItem(key, JSON.stringify(current));
	}
};

const get = <
	T extends QueryValueObject,
	T_Replace extends QueryValueObject,
	T_Update extends QueryValueObject
>(
	key: string
) => {
	if (isBrowser()) {
		const storedData = localStorage.getItem(key);
		if (storedData) {
			try {
				const parsedDocuments = JSON.parse(storedData) as Functions<
					Document<T>,
					T_Replace,
					T_Update
				>[];
				// TODO: We proably need to deserialize the document before storing it
				return parsedDocuments;
			} catch (error) {
				console.error('Error parsing stored data:', error);
			}
		} else {
			console.log('No stored data found');
		}
	}
};

export const storage = {
	set,
	get
};
