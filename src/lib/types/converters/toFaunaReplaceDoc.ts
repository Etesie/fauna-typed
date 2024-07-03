import { type QueryValueObject } from 'fauna';
import { type Collection, type Document_Create } from '../types';

export const toFaunaReplaceDoc = <T_Create extends QueryValueObject>(
	doc: Document_Create<T_Create>,
	collection: Collection
) => {
	const fauanDocData: { [key: string]: any } = {
		id: doc.id,
		ttl: doc.ttl || null
	};

	Object.entries(collection?.fields || {}).forEach(([fieldName, field]) => {
		fauanDocData[fieldName] = doc[fieldName] || null;
	});

	return fauanDocData;
};
