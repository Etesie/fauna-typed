<script lang="ts">
	import { X } from 'lucide-svelte';
	import { tick } from 'svelte';
	import Sort from './sort.svelte';
	import type { Ordering } from '$lib/stores/_shared/order';
	import type { Sorter } from './sort';
	import { type Document, type Document_Create, baseFields } from '$lib/types/types';
	import type { QueryValueObject } from 'fauna';
	import { s, asc, desc } from '$fauna-typed/stores';
	import { page } from '$app/stores';

	let collectionName: String = $derived($page.url.searchParams.get('coll'));

	const docFields = $derived(Object.entries(s[collectionName]?.definition?.fields || {}));
	const allFields = $derived([...Object.entries(baseFields), ...docFields]);

	const allKeys = $derived(allFields.map((field) => field[0] as keyof Document<QueryValueObject>));

	type StringifyProperties<T> = {
		[K in keyof T]: string;
	};

	type CollectionFilter = StringifyProperties<Document<QueryValueObject>>;

	const createEmptyFilter = (): CollectionFilter => {
		const filter: Partial<CollectionFilter> = {};
		allKeys.forEach((key) => {
			filter[key] = '';
		});
		return filter as CollectionFilter;
	};

	let filter = $state(createEmptyFilter());

	let sorter: Sorter[] = $state([]);

	const getWherePredicate = <T,>(
		allKeys: (keyof T)[],
		filter: Partial<Record<keyof T, string>>
	): { fqlString: string; predicateFunction: (item: T) => boolean } => {
		const fqlString = `(item) => {
			let filter = ${JSON.stringify(filter)};
			${JSON.stringify(allKeys)}.every((key) => {
				const filterValue = filter[key];
				if (filterValue isa String && filterValue.length > 0) {
					item[key] && item[key] isa String && item[key].includes(filterValue);
				}
				true; // If the filter is empty or not a string, ignore this filter
			});
		}`;

		const predicateFunction = (item: T) => {
			return allKeys.every((key) => {
				const filterValue = filter[key];
				if (typeof filterValue === 'string' && filterValue) {
					return item[key] && typeof item[key] === 'string' && item[key].includes(filterValue);
				}
				return true; // If the filter is empty or not a string, ignore this filter
			});
		};

		return { fqlString, predicateFunction };
	};

	// Create from sorter `Sorter[]` an array of `Ordering<UserClass>`
	const getSorters = (sorter: Sorter[]): Ordering<QueryValueObject>[] => {
		return sorter.map((sort) => {
			const key = sort.key as keyof QueryValueObject;
			const sorterFunction = sort.direction === 'asc' ? asc : desc;
			return sorterFunction((u: QueryValueObject) => u[key]);
		});
	};

	let docsPageFiltered = $derived.by(() => {
		const { fqlString, predicateFunction } = getWherePredicate(allKeys, filter);

		return s[collectionName]?.where(predicateFunction, fqlString)?.order(...getSorters(sorter));
	});

	let newDoc = $state<Document_Create<any>>({});

	async function createDoc() {
		console.log('New doc: ', newDoc);
		s[collectionName].create(newDoc);
		newDoc = {};

		await tick();
		const inputElement = document.getElementById('create-doc');
		if (inputElement) {
			inputElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
		}
	}

	function on_key_down(e: KeyboardEvent) {
		if (e.key === 'Enter') {
			createDoc();
		}
	}
</script>

<div class="flex flex-wrap justify-center gap-10 p-4">
	<div>
		<button class="btn preset-filled" onclick={() => s[collectionName].undo()}>Undo</button>
		<button class="btn preset-filled" onclick={() => s[collectionName].redo()}>Redo</button>
	</div>
	<div class="w-192 flex flex-col gap-10">
		<div class="flex flex-col gap-3">
			<h2 class="h2">{collectionName}</h2>
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
						{#each docsPageFiltered?.data || [] as doc, index}
							<tr>
								<td class="w-5">{index + 1}</td>
								{#each allKeys as key}
									<td> <input class="input" type="text" bind:value={doc[key]} name="key" /></td>
								{/each}
								<td>
									<button class="btn preset-filled" onclick={() => doc.update(doc)}>Update</button>
								</td>
								<td>
									<button class="btn-icon preset-tonal-error" onclick={() => doc.delete()}>
										<X />
									</button>
								</td>
							</tr>
						{/each}
						<tr id="create-doc">
							<td></td>
							{#each allKeys as key}
								{#if ['coll', 'ts'].includes(key)}
									<td></td>
								{:else}
									<td>
										<input
											class="input"
											name={key}
											type="text"
											bind:value={newDoc[key]}
											onkeydown={on_key_down}
										/>
									</td>
								{/if}
							{/each}
							<td>
								<button
									class="btn max-w-48 preset-filled"
									onclick={() => createDoc()}
									onkeydown={on_key_down}>Create Document</button
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
