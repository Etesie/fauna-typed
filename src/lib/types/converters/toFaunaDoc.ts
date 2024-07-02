import type { QueryValueObject } from 'fauna';
import type { Collection, Document_Create } from '../types';

export const toFaunaDoc = <T_Create extends QueryValueObject>(
	doc: Document_Create<T_Create>,
	definition: Collection
) => {
	const fauanDocData: { [key: string]: any } = {};

	if (!doc.id?.startsWith('TEMP_')) {
		fauanDocData.id = doc.id;
	}

	Object.entries(definition?.fields || {}).forEach(([fieldName, field]) => {
		if (doc[fieldName] !== undefined) {
			fauanDocData[fieldName] = doc[fieldName];
		}
	});

	return fauanDocData;
};
