import { type QueryValueObject } from 'fauna';
import { type Collection, type Document, type Document_Replace } from '../types';

export const toFaunaReplaceDoc = <
	T extends QueryValueObject,
	T_FaunaReplace extends QueryValueObject
>(
	doc: Document<T>,
	collection: Collection
): Document_Replace<T_FaunaReplace> => {
	const fauanDocData: QueryValueObject = {
		ttl: doc.ttl || null
	};

	Object.keys(collection?.fields || {}).forEach((fieldName) => {
		fauanDocData[fieldName] = doc[fieldName] || null;
	});

	return fauanDocData as Document_Replace<T_FaunaReplace>;
};
