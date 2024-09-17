<script lang="ts">
	import type { PageData } from './$types';
	import { s } from '$fauna-typed/stores';

	// console.log(`client/test/+page.svelte `, s.MasterChapter.definition);
	// console.log(s.Collection.all());
	console.log(`cient/tables/+page.svelte MasterChapter.definition: `, s.MasterChapter.definition);
	let data = s.MasterChapter.all().data;

	// export let data: PageData;
</script>

<button>Hello {s.MasterChapter.definition}</button>

{#each data as item}
	<div>{item.name}</div>
{/each}
