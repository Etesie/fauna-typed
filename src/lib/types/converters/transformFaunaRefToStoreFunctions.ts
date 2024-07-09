import type { Collection, DocumentStores, NamedDocument } from '../types';

const transformFaunaRefToStoreFunctions = (
	doc: any,
	definition: NamedDocument<Collection>,
	s: DocumentStores
) => {
	return Object.entries(doc).reduce((acc, [key, val]) => {
		if (val.id && val?.coll?.name) {
			return { ...acc, [key]: () => s[definition.name].byId(val.id) };
		} else if (Array.isArray(val) && val.length > 0 && val[0]?.id && val[0]?.coll?.name) {
			return {
				...acc,
				[key]: val.map((cur) => {
					return () => s[definition.name].byId(cur.id);
				})
			};
		} else {
			return { ...acc, [key]: val };
		}
	}, {});
};

export { transformFaunaRefToStoreFunctions };
