<script lang="ts">
	import { stores as s, asc, desc } from '$lib/stores';
	// import { User, type UserProperties } from '$lib/types/user';
	import { X } from 'lucide-svelte';
	import { tick } from 'svelte';
	import Sort from './sort.svelte';
	import type { Ordering } from '$lib/stores/_shared/order';
	import type { Sorter } from './sort';
	import { page } from '$app/stores';
	import type { DocumentT, Document_CreateT, User, User_Create } from '$lib/types/NEW/types';
	import { DateStub, DocumentReference, Module, TimeStub } from 'fauna';

	let collectionName = $derived($page.params.collection);

	// To get the keys from User
	const user = {
		id: '',
		ts: TimeStub.fromDate(new Date()),
		coll: new Module('User'),
		ttl: TimeStub.fromDate(new Date()),
		firstName: '',
		lastName: '',
		birthdate: DateStub.fromDate(new Date('1990-01-01')),
		account: new DocumentReference({ coll: 'Account', id: '1' }),
		age: 0
	} as DocumentT<User_Create>;
	const allKeys = Object.keys(user) as Array<keyof DocumentT<User>>;

	const readonlyKeys: Array<keyof DocumentT<User>> = ['coll', 'ts'];
	const writableKeys = allKeys.filter((key) => !readonlyKeys.includes(key));

	type StringifyProperties<T> = {
		[K in keyof T]: string;
	};

	type CollectionFilter = StringifyProperties<DocumentT<User>>;

	const createEmptyFilter = (): CollectionFilter => {
		const filter: Partial<CollectionFilter> = {};
		allKeys.forEach((key) => {
			filter[key] = '';
		});
		return filter as CollectionFilter;
	};

	let filter = $state(createEmptyFilter());

	let sorter: Sorter[] = $state([]);

	// Create from sorter `Sorter[]` an array of `Ordering<UserClass>`
	function getSorters(sorter: Sorter[]): Ordering<User>[] {
		return sorter.map((sort) => {
			const key = sort.key as keyof User;
			const sorterFunction = sort.direction === 'asc' ? asc : desc;
			return sorterFunction((u: User) => u[key]);
		});
	}

	let usersPageFiltered = $derived(
		s.User.where(
			(u) => u.firstName.includes(filter.firstName) && u.lastName.includes(filter.lastName)
		).order(...getSorters(sorter))
	);

	const newUser = $state<Document_CreateT<User_Create>>({
		firstName: '',
		lastName: '',
		birthdate: DateStub.fromDate(new Date('1990-01-01')),
		account: new DocumentReference({ coll: 'Account', id: '1' })
	});

	async function createUser() {
		console.log('New user: ', newUser);
		s.User.create(newUser);
		newUser.firstName = '';
		newUser.lastName = '';

		await tick();
		const inputElement = document.getElementById('create-user');
		if (inputElement) {
			inputElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
		}
	}

	function on_key_down(e: KeyboardEvent) {
		if (e.key === 'Enter') {
			createUser();
		}
	}
</script>

<div class="flex flex-wrap justify-center gap-10 p-4">
	<div>
		<button class="btn preset-filled" onclick={() => s.User.undo()}>Undo</button>
		<button class="btn preset-filled" onclick={() => s.User.redo()}>Redo</button>
	</div>
	<div class="w-192 flex flex-col gap-10">
		<div class="flex flex-col gap-3">
			<h2 class="h2">{collectionName.charAt(0).toUpperCase() + collectionName.slice(1)}</h2>
			<div class="table-container space-y-4">
				<table class="table w-full table-auto">
					<thead>
						<tr>
							<th></th>
							{#each allKeys as key}
								<th>
									{key}
									<input class="input" type="text" name="filter-{key}" bind:value={filter[key]} />
								</th>
							{/each}
							<th></th>
							<th></th>
						</tr>
					</thead>
					<tbody>
						{#each usersPageFiltered.data as user, index}
							<tr>
								<td class="w-5">{index + 1}</td>
								{#each allKeys as key}
									<td> <input class="input" type="text" bind:value={user[key]} name="key" /></td>
								{/each}
								<td>
									<button class="btn preset-filled" onclick={() => user.update(user)}>Update</button
									>
								</td>
								<td>
									<button class="btn-icon preset-tonal-error" onclick={() => user.delete()}>
										<X />
									</button>
								</td>
							</tr>
						{/each}
						<tr id="create-user">
							<td></td>
							<td>
								<input
									class="input"
									name="firstName"
									type="text"
									bind:value={newUser.firstName}
									onkeydown={on_key_down}
								/></td
							>
							<td>
								<input
									class="input"
									name="lastName"
									type="text"
									bind:value={newUser.lastName}
									onkeydown={on_key_down}
								/>
							</td>
							<td>
								<button
									class="btn max-w-48 preset-filled"
									onclick={() => createUser()}
									onkeydown={on_key_down}>Create User</button
								>
							</td>
						</tr>
					</tbody>
				</table>
			</div>
		</div>
	</div>
	<div><h3 class="h3">Sort</h3></div>
	<Sort objectKeys={allKeys} {sorter} class="w-80" />
</div>
