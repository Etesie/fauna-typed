import type {
	Collection,
	Document,
	Document_Create,
	DocumentStores,
	NamedDocument
} from '../types';
import { Module, TimeStub, type QueryValueObject } from 'fauna';
import { getDefaultComputedValue } from './getDefaultComputedValue';
import { transformFaunaRefToStoreFunctions } from './transformFaunaRefToStoreFunctions';

export const docCreateToDoc = <T extends QueryValueObject, T_Create extends QueryValueObject>(
	doc: Document_Create<T_Create>,
	definition: NamedDocument<Collection>,
	s: DocumentStores
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
			return { ...acc, [key]: getDefaultComputedValue(field.signature) };
		},
		{}
	);
	const documentFieldsWithoutReference = transformFaunaRefToStoreFunctions(doc, definition, s);

	return { id, ts, coll, ...documentFieldsWithoutReference, ...computed_fields } as Document<T>;
};
