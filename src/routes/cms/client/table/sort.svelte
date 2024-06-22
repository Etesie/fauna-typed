<script lang="ts">
	import { DropdownMenu, Combobox, type Selected } from 'bits-ui';
	import { Check, X } from 'lucide-svelte';
	import { tick } from 'svelte';
	import type { Sorter } from './sort';
	import { cn } from '$lib/util';

	type Props = {
		objectKeys: string[];
		sorter: Sorter[];
		class?: string;
	};

	let { objectKeys, sorter, class: className }: Props = $props();

	let keys: { value: string; label: string }[] = objectKeys.map((key) => {
		return { value: key, label: key };
	});

	let inputValue = $state('');
	let touchedInput = $state(false);
	let selectedSortings: Sorter[] = sorter;

	let filteredKeys = $derived(
		inputValue && touchedInput
			? keys.filter(
					(key) =>
						key.value.includes(inputValue.toLowerCase()) &&
						!selectedSortings.find((sort) => sort.key === key.value)
				)
			: keys.filter((key) => !selectedSortings.find((sort) => sort.key === key.value))
	);

	function handleAddSorter(selected: Selected<string> | undefined) {
		console.log('event', selected);
		if (selected) {
			console.log('event selected', selected);

			selectedSortings.push({ key: selected.value, direction: 'asc' }); // Assume default direction is 'asc'
		}
		// Reset the combobox selection
		tick().then(() => {
			inputValue = '';
		});
	}

	function handleRemoveSorter(key: string) {
		selectedSortings.splice(
			selectedSortings.findIndex((sort) => sort.key === key),
			1
		);
	}

	function handleChangeSorterDirection(selected: Selected<Sorter> | undefined) {
		if (selected) {
			const key = selected.value.key;
			const direction = selected.value.direction;

			const index = selectedSortings.findIndex((sort) => sort.key === key);
			if (index !== -1) {
				selectedSortings[index].direction = direction;
			}
		}
	}
</script>

<div class={cn('flex flex-col gap-4', className)}>
	{#each selectedSortings as selectedSort}
		<div class="flex items-center">
			<div>{selectedSort.key}</div>
			<button class="btn-icon" onclick={() => handleRemoveSorter(selectedSort.key)}>
				<X />
			</button>
			<Combobox.Root
				selected={{
					value: { key: selectedSort.key, direction: selectedSort.direction },
					label: selectedSort.direction
				}}
				onSelectedChange={handleChangeSorterDirection}
			>
				<Combobox.Input class="input" />
				<Combobox.Content class="variant-filled rounded-token space-y-1 px-4 py-2">
					{#each ['asc', 'desc'] as direction}
						<Combobox.Item
							value={{ key: selectedSort.key, direction: direction }}
							label={direction}
							class="rounded-token hover:variant-soft flex cursor-pointer select-none px-3 py-1 -outline-offset-[3px] hover:text-slate-50"
						>
							{direction}
							<Combobox.ItemIndicator class="ml-auto" asChild={false}>
								<Check />
							</Combobox.ItemIndicator>
						</Combobox.Item>
					{/each}
				</Combobox.Content>
			</Combobox.Root>
		</div>
	{/each}
	<Combobox.Root
		items={filteredKeys}
		bind:inputValue
		bind:touchedInput
		onSelectedChange={handleAddSorter}
	>
		<div class="relative">
			<Combobox.Input class="input" placeholder="Find a field" aria-label="Find a field" />
		</div>

		<Combobox.Content class="variant-filled rounded-token space-y-1 px-4 py-2" sideOffset={8}>
			{#each filteredKeys as key (key.value)}
				<Combobox.Item
					class="rounded-token hover:variant-soft cursor-pointer select-none py-1 pl-3 -outline-offset-[3px] hover:text-slate-50"
					value={key.value}
					label={key.label}
				>
					{key.label}
				</Combobox.Item>
			{:else}
				<span class=""> No results found </span>
			{/each}
		</Combobox.Content>
		<Combobox.HiddenInput name="selectedOption" />
	</Combobox.Root>
</div>
