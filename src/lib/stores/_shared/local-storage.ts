import { browser } from '$app/environment';
import type { DocumentT, FunctionsT } from '$lib/types/NEW/types';
import type { QueryValueObject } from 'fauna';

const set = <T extends QueryValueObject>(key: string, current: DocumentT<T>[]) => {
	if (browser) {
		localStorage.setItem(key, JSON.stringify(current));
	}
};

const get = <T extends QueryValueObject>(key: string) => {
	if (browser) {
		const storedData = localStorage.getItem(key);
		if (storedData) {
			try {
				const parsedDocuments = JSON.parse(storedData) as FunctionsT<DocumentT<T>>[];
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
