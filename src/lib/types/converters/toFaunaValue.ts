import { createFaunaReference } from '$lib/util';
import type { QueryValue } from 'fauna';

const checkReferenceType = (value: string | string[]) => {
	if (Array.isArray(value)) {
		return value[0]?.includes?.('.byId(');
	} else if (typeof value === 'string') {
		return value.includes('.byId(');
	}

	return false;
};

const toFaunaReference = (value: string | string[]) => {
	if (typeof value === 'string') {
		const refStr = value.split('() =>')[1].trim();
		return createFaunaReference(refStr);
	} else {
		return value.map((val) => {
			const refStr = val.split('() =>')[1].trim();
			return createFaunaReference(refStr);
		});
	}
};

export const toFaunaValue = (fieldValue: QueryValue) => {
	const isArrayType = Array.isArray(fieldValue);
	const isStringType = typeof fieldValue === 'string';
	let value = fieldValue;

	if (isArrayType || isStringType) {
		const isReferenceType = checkReferenceType(fieldValue as string | string[]);

		if (isReferenceType) {
			value = toFaunaReference(fieldValue as string | string[]);
		}
	}

	return value;
};
