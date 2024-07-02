import type { QueryValueObject } from 'fauna';
import { TEMP_ID_PREFIX, type Collection, type Document_Create } from '../types';

export const toFaunaDoc = <T_Create extends QueryValueObject>(
	doc: Document_Create<T_Create>,
	collection: Collection
) => {
	const fauanDocData: { [key: string]: any } = {};

	if (!doc.id?.startsWith(TEMP_ID_PREFIX)) {
		fauanDocData.id = doc.id;
	}

	Object.entries(collection?.fields || {}).forEach(([fieldName, field]) => {
		if (doc[fieldName] !== undefined) {
			fauanDocData[fieldName] = doc[fieldName];
		}
	});

	return fauanDocData;
};
