import { type QueryValueObject } from 'fauna';
import { type Collection, type Document_Update } from '../types';
import {
	transformDocValueToFaunaValue,
	transformToFaunaTime
} from './transformDocValueToFaunaValue';
import { removeInvalidQuotesFromFaunaString } from './utils';

export const docToFaunaUpdateDoc = <T_Update extends QueryValueObject>(
	fields: Document_Update<T_Update>,
	collection: Collection
) => {
	const faunaDocData: QueryValueObject = {};

	if (fields.ttl !== undefined) {
		faunaDocData.ttl = fields.ttl ? transformToFaunaTime(fields.ttl) : null;
	}

	Object.entries(collection?.fields || {}).forEach(([fieldName, fieldValue]) => {
		const value = fields[fieldName as keyof typeof fields];

		if (value !== undefined) {
			faunaDocData[fieldName] = transformDocValueToFaunaValue(value, fieldValue);
		}
	});

	return removeInvalidQuotesFromFaunaString(JSON.stringify(faunaDocData));
};
