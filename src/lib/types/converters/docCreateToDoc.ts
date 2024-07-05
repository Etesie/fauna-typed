import type { TypeMapping } from '$fauna-typed/types';
import type { Collection, Document_Create, NamedDocument } from '../types';
import { Module, TimeStub, type QueryValueObject } from 'fauna';

type EnforceQueryValueObjectExtension<T> = T extends QueryValueObject ? T : never;

export const docCreateToDoc = <K extends keyof TypeMapping>(
	doc: Document_Create<EnforceQueryValueObjectExtension<TypeMapping[K]['create']>>,
	definition: NamedDocument<Collection>
) => {
	let id: string;
	const ts: TimeStub = TimeStub.fromDate(new Date());
	const coll: Module = new Module(definition.name);
	if (doc.id) {
		id = doc.id;
	} else {
		id = 'TEMP_' + crypto.randomUUID();
	}

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

	const convertedDoc = { id, ts, coll, ...computed_fields, ...doc };
	return convertedDoc;
};
