import { type TimeStub, type DateStub, type DocumentReference } from 'fauna';

export type User = {
	firstName: string;
	lastName: string;
	birthdate: DateStub;
	account?: Account;
	age: number;
};

export type Account = {
	user: User;
	provider?: string;
	providerUserId?: string;
};
