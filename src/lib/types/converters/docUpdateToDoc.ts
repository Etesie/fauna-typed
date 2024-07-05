import type { TypeMapping } from '$fauna-typed/types';
import type { Collection, Document_Update, Functions, NamedDocument } from '../types';
import { type QueryValueObject } from 'fauna';

type EnforceQueryValueObjectExtension<T> = T extends QueryValueObject ? T : never;

export const docUpdateToDoc = <K extends keyof TypeMapping>(
	doc: Functions<
		EnforceQueryValueObjectExtension<TypeMapping[K]['main']>,
		EnforceQueryValueObjectExtension<TypeMapping[K]['replace']>,
		EnforceQueryValueObjectExtension<TypeMapping[K]['update']>
	>,
	updatedFields: Document_Update<EnforceQueryValueObjectExtension<TypeMapping[K]['update']>>,
	definition: NamedDocument<Collection>
) => {
	Object.assign(doc, updatedFields);
	Object.keys(doc).forEach((key) => {
		if (!(key in updatedFields)) {
			if (key !== 'ts') {
				delete doc[key];
			}
		}
	});

	const computed_fields = Object.entries(definition.computed_fields || {}).reduce(
		(acc, [key, field]) => {
			if (field.signature === 'Number') {
				return { ...acc, [key]: 0 };
			} else {
				return { ...acc, [key]: '' };
			}
		},
		{}
	);

	return { ...doc, ...computed_fields };
};
