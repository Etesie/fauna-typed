import { type QueryValueObject } from 'fauna';
import { type Collection, type Document_Replace } from '../types';
import {
	transformDocValueToFaunaValue,
	transformToFaunaTime
} from './transformDocValueToFaunaValue';
import { removeInvalidQuotesFromFaunaString } from './utils';

export const docToFaunaReplaceDoc = <T_Replace extends QueryValueObject>(
	fields: Document_Replace<T_Replace>,
	collection: Collection
) => {
	const faunaDocData: QueryValueObject = {
		ttl: fields.ttl ? transformToFaunaTime(fields.ttl) : null
	};

	Object.entries(collection?.fields || {}).forEach(([fieldName, fieldValue]) => {
		faunaDocData[fieldName] = transformDocValueToFaunaValue(fields[fieldName] || null, fieldValue);
	});

	return removeInvalidQuotesFromFaunaString(JSON.stringify(faunaDocData));
};
