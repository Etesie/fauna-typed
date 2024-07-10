import type { Collection, DocumentStores, NamedDocument } from '../types';

/**
 * Transforms Fauna reference objects into functions that can be used to retrieve the referenced document from the store.
 *
 * @param {any} doc - The object to be transformed.
 * @param {NamedDocument<Collection>} definition - The definition of the named object.
 * @param {DocumentStores} s - The document stores object.
 * @return {Object} - The transformed object, with any reference objects replaced by functions that retrieve the referenced document from the store.
 */
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
