<script lang="ts">
	import { page } from '$app/stores';
	import { Tabs } from '@skeletonlabs/skeleton-svelte';
	import { goto } from '$app/navigation';
	import { s } from '$fauna-typed/stores';

	let allCollections = $state(s.Collection.all().data);

	let group = $state($page.url.searchParams.get('coll'));
	if (!group) {
		const url = new URL(window.location.href);
		group = allCollections[0].name;
		url.searchParams.set('coll', allCollections[0].name);
	}

	let { children } = $props();

	function handleTabClick(tabName: string) {
		const url = new URL(window.location.href);
		url.searchParams.set('coll', tabName);
		goto(url.toString());
	}
</script>

<Tabs>
	{#snippet list()}
		{#each allCollections as collection}
			<Tabs.Control
				bind:group
				name={collection.name}
				onclick={() => handleTabClick(collection.name)}
			>
				{collection.name}
			</Tabs.Control>
		{/each}
	{/snippet}
</Tabs>
{@render children()}
