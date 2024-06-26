export type Field = {
	[key: string]: {
		signature: string;
		[key: string]: string;
	};
};

export type Schema = {
	data: {
		name: string;
		fields: Field;
		computed_fields?: Field;
	}[];
};

const schema: Schema = {
	data: [
		{
			name: 'User',
			fields: {
				firstName: {
					signature: 'String'
				},
				lastName: {
					signature: 'String'
				},
				birthdate: {
					signature: 'Date'
				},
				account: {
					signature: 'Ref<Account>?'
				}
			},
			computed_fields: {
				age: {
					body: '(doc) => (Date.today().difference(doc.birthday) / 365)',
					signature: 'Number'
				}
			}
		},
		{
			name: 'Account',
			fields: {
				user: {
					signature: 'Ref<User>'
				},
				provider: {
					signature: 'String?'
				},
				providerUserId: {
					signature: 'String?'
				}
			}
		}
	]
};

export const fetchSchema = async () => {
	const data = await schema.data;
	return data;
};
