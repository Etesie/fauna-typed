import type { QueryValueObject } from 'fauna';
import { TEMP_ID_PREFIX, type Collection, type Document, type Document_Create } from '../types';

export const toFaunaDoc = <T extends QueryValueObject, T_FaunaCreate extends QueryValueObject>(
	doc: Document<T>,
	collection: Collection
): Document_Create<T_FaunaCreate> => {
	const fauanDocData: QueryValueObject = {};

	if (!doc.id?.startsWith(TEMP_ID_PREFIX)) {
		fauanDocData.id = doc.id;
	}

	Object.keys(collection?.fields || {}).forEach((fieldName) => {
		if (doc[fieldName] !== undefined) {
			fauanDocData[fieldName] = doc[fieldName];
		}
	});

	return fauanDocData as Document_Create<T_FaunaCreate>;
};
