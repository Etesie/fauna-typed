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
		const signature = definition.fields?.[key as keyof NamedDocument<Collection>]?.signature;

		if (signature?.startsWith('Ref<')) {
			return { ...acc, [key]: () => s[definition.name].byId(val.id) };
		} else if (signature?.startsWith('Array<Ref<') && Array.isArray(val)) {
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
