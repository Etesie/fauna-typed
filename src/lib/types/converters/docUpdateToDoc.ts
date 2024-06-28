import type { QueryValueObject } from "fauna"
import type { Document_UpdateT } from "../default/types"

export const docUpdateToDoc = <T_Update extends QueryValueObject>(doc: any, updatedFields: Document_UpdateT<T_Update>) => {
  const convertedDoc = Object.assign(doc, updatedFields)
  return convertedDoc
}