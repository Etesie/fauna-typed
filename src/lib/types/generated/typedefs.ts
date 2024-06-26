import { type TimeStub, type DateStub, type DocumentReference } from 'fauna'

export type User = {
	firstName: string;
	lastName: string;
	birthdate: DateStub;
	account?: Account;
	age: number;
}

export type Account = {
	user: User;
	provider?: string;
	providerUserId?: string;
}

export type User_Create = {
	firstName: string;
	lastName: string;
	birthdate: DateStub;
	account?: Account | DocumentReference;
}
export type User_Replace = User_Create
export type User_Update = Partial<User_Create>

export type Account_Create = {
	user: User | DocumentReference;
	provider?: string;
	providerUserId?: string;
}
export type Account_Replace = Account_Create
export type Account_Update = Partial<Account_Create>