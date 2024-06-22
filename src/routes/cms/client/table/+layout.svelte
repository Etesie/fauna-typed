<script lang="ts">
	import { page } from '$app/stores';
	import { Tabs } from '@skeletonlabs/skeleton-svelte';
	import { goto } from '$app/navigation';

	let group = $state($page.url.searchParams.get('coll'));
	let { children } = $props();

	function handleTabClick(tabName: string) {
		const url = new URL(window.location.href);
		url.searchParams.set('coll', tabName);
		goto(url.toString());
	}
</script>

<Tabs>
	{#snippet list()}
		<Tabs.Control bind:group name="User" onclick={() => handleTabClick('User')}>User</Tabs.Control>
		<Tabs.Control bind:group name="Account" onclick={() => handleTabClick('Account')}
			>Account</Tabs.Control
		>
	{/snippet}
</Tabs>
{@render children()}
