import type { QueryValueObject } from "fauna";
import type { Document_ReplaceT } from "../default/types";

export const docReplaceToDoc = <T_Replace extends QueryValueObject>(doc: any, updatedFields: Document_ReplaceT<T_Replace>) => {
  Object.assign(doc, updatedFields);
  Object.keys(doc).forEach((key) => {
    if (!(key in updatedFields)) {
      if (key !== 'id' && key !== 'ts' && key !== 'coll') {
        delete doc[key];
      }
    }
  });

  return doc
}