import Module from "module";
import type { Definition, Document_CreateT } from "../default/types";
import { TimeStub, type QueryValueObject } from 'fauna'

export const docCreateToDoc = <
  T_Create extends QueryValueObject,
>(doc: Document_CreateT<T_Create>, definition: Definition, collectionName: string) => {
  let id: string;
  const ts: TimeStub = TimeStub.fromDate(new Date());
  const coll: Module = new Module(collectionName);
  if (doc.id) {
    id = doc.id;
  } else {
    id = 'TEMP_' + crypto.randomUUID();
  }

  const computed_fields = Object.entries(definition.computed_fields).reduce((acc, [key, field]) => {
    if (field.signature === 'Number') {
      return { ...acc, [key]: 0 }
    } else {
      return { ...acc, [key]: '' }
    }
  }, {})

  const convertedDoc = { id, ts, coll, ...computed_fields, ...doc }
  return convertedDoc
}