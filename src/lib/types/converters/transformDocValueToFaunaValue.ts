import { DateStub, DocumentReference, TimeStub, type QueryValue } from 'fauna';
import type { Field } from '../types';
import { isValidJSON } from '$lib/util';

const transformToFaunaReference = (
	referencedCollName: string,
	value: DocumentReference | DocumentReference[] | string
) => {
	let referenceValue = value;

	if (typeof value === 'string') {
		if (isValidJSON(value) && Array.isArray(JSON?.parse(value))) {
			referenceValue = JSON.parse(value);
		}
	}

	if (Array.isArray(referenceValue)) {
		return referenceValue.map((val) => {
			if (val instanceof DocumentReference) {
				return `${referencedCollName}.byId('${val.id}')`;
			}

			return `${referencedCollName}.byId('${val}')`;
		});
	} else if (referenceValue instanceof DocumentReference) {
		return `${referencedCollName}.byId('${referenceValue.id}')`;
	}

	return `${referencedCollName}.byId('${referenceValue}')`;
};

export const transformToFaunaDate = (date: DateStub | DateStub[] | string) => {
	let dateValue = date;

	if (typeof date === 'string') {
		if (isValidJSON(date) && Array.isArray(JSON?.parse(date))) {
			dateValue = JSON.parse(date);
		}
	}

	if (Array.isArray(dateValue)) {
		return dateValue.map((val) => {
			if (val instanceof DateStub) {
				return `Date('${val.dateString}')`;
			}

			return `Date('${DateStub.fromDate(new Date(val)).dateString}')`;
		});
	} else if (dateValue instanceof DateStub) {
		return `Date('${dateValue.dateString}')`;
	}

	return `Date('${DateStub.fromDate(new Date(dateValue)).dateString}')`;
};

export const transformToFaunaTime = (time: TimeStub | TimeStub[] | string) => {
	let timeValue = time;

	if (typeof time === 'string') {
		if (isValidJSON(time) && Array.isArray(JSON?.parse(time))) {
			timeValue = JSON.parse(time);
		}
	}

	if (Array.isArray(timeValue)) {
		return timeValue.map((val) => {
			if (val instanceof TimeStub) {
				return `Time('${val.isoString}')`;
			}

			return `Time('${TimeStub.fromDate(new Date(val)).isoString}')`;
		});
	} else if (timeValue instanceof TimeStub) {
		return `Time('${timeValue.isoString}')`;
	}

	return `Time('${TimeStub.fromDate(new Date(timeValue)).isoString}')`;
};

export const transformDocValueToFaunaValue = (docValue: QueryValue, fieldValue: Field) => {
	switch (true) {
		// Handle Reference types
		case fieldValue.signature.includes('Ref<'): {
			const referencedCollName = fieldValue.signature.split('Ref<')[1].split('>')[0];

			return docValue
				? transformToFaunaReference(
						referencedCollName,
						docValue as DocumentReference | DocumentReference[]
					)
				: null;
		}

		// Handle Time types
		case fieldValue.signature.includes('Time'):
			return docValue ? transformToFaunaTime(docValue as TimeStub) : null;

		// Handle Date types
		case fieldValue.signature.includes('Date'):
			return docValue ? transformToFaunaDate(docValue as DateStub) : null;

		default:
			return docValue;
	}
};
