<script lang="ts">
	import type { PageData } from './$types';
	import { s } from '$fauna-typed/stores';

	// export let data: PageData;
</script>

<h1>Collection</h1>
{#each s.Collection.all().data as item}
	<div>{item.name}</div>
{/each}

<h1>Functions</h1>
{#each s.Function.all().data as item}
	<div>{item.name}</div>
{/each}
