import { DocumentReference, type QueryValue } from 'fauna';
import type { Field } from '../types';

const transformToFaunaReference = (
	referencedCollName: string,
	value: DocumentReference | DocumentReference[] | string
) => {
	let referenceValue = value;

	if (typeof value === 'string') {
		if (Array.isArray(JSON.parse(value))) {
			referenceValue = JSON.parse(value);
		}
	}

	if (Array.isArray(referenceValue)) {
		return referenceValue.map((val) => {
			if (val instanceof DocumentReference) {
				return `${referencedCollName}.byId('${val.id}')`;
			} else {
				return `${referencedCollName}.byId('${val}')`;
			}
		});
	} else if (referenceValue instanceof DocumentReference) {
		return `${referencedCollName}.byId('${referenceValue.id}')`;
	}

	return `${referencedCollName}.byId('${referenceValue}')`;
};

export const removeQuotesFromByIdReference = (str: string): string => {
	return str.replaceAll(/"([a-zA-Z]+\.byId\('[0-9]+'\))"/g, '$1');
};

export const transformDocValueToFaunaValue = (docValue: QueryValue, fieldValue: Field) => {
	let value = docValue;
	const isReferenceType = fieldValue.signature.includes('Ref<');

	if (isReferenceType) {
		const referencedCollName = fieldValue.signature.split('Ref<')[1].split('>')[0];
		value = value
			? transformToFaunaReference(
					referencedCollName,
					value as DocumentReference | DocumentReference[]
				)
			: null;
	}

	return value;
};
