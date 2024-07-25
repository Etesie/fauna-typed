import { DocumentReference, type QueryValue } from 'fauna';
import type { Field } from '../types';

const transformToFaunaReference = (value: DocumentReference | DocumentReference[]) => {
	if (Array.isArray(value)) {
		return value.map((val) => new DocumentReference({ coll: val.coll, id: val.id }));
	} else {
		return value.id && value?.coll?.name
			? new DocumentReference({ coll: value.coll, id: value.id })
			: null;
	}
};

export const transformDocValueToFaunaValue = (docValue: QueryValue, fieldValue: Field) => {
	let value = docValue;
	const isReferenceType = fieldValue.signature.includes('Ref<');

	if (isReferenceType) {
		value = value
			? transformToFaunaReference(value as DocumentReference | DocumentReference[])
			: null;
	}

	return value;
};
