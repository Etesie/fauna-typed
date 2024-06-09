import { Document, type DocumentPojo, type DocumentProperties } from './fauna';

const COLL_NAME = 'User';

/**
 * User without Functions
 */
type UserBaseProperties = {
	[K in keyof User as User[K] extends Function ? never : K]: User[K];
};
export type UserProperties = Omit<UserBaseProperties, 'account' | 'id' | 'ts'> & DocumentProperties;

export class User extends Document {
	firstName!: string;
	lastName!: string;

	constructor(doc: UserProperties) {
		super(doc);
		// Assign the document properties to the instance
		const { id, ts, ttl, coll, ...remainingProps } = doc;
		Object.assign(this, remainingProps);
		this.coll = COLL_NAME;
	}

	toObject(): UserPojo {
		const userPojo: UserPojo = {
			id: this.id,
			coll: this.coll,
			ts: this.ts,
			ttl: this.ttl,
			firstName: this.firstName,
			lastName: this.lastName
		};

		return userPojo;
	}
}

/**
 * TODO: Eventually we can get rid also from UserPojo if we ensure, that UserProperties has only PoJo Objects
 */
export type UserPojo = DocumentPojo & {
	firstName?: string;
	lastName?: string;
};
