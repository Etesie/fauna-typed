import { type QueryValueObject } from 'fauna';
import { type Collection, type Document, type Document_Replace } from '../types';

export const toFaunaReplaceDoc = (
	doc: Document<QueryValueObject>,
	fields: Document_Replace<QueryValueObject>,
	collection: Collection
) => {
	const fauanDocData: QueryValueObject = {
		ttl: fields.ttl || null
	};

	Object.keys(collection?.fields || {}).forEach((fieldName) => {
		fauanDocData[fieldName] = fields[fieldName] || doc[fieldName] || null;
	});

	return fauanDocData;
};
