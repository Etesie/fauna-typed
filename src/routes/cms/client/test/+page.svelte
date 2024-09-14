<script lang="ts">
	import type { PageData } from './$types';
	import { s } from '$fauna-typed/stores';

	const Consequence = s.Consequence;
	// const Consequence = s.Consequence;
	// console.log(`client/test/+page.svelte `, s.MasterChapter.definition);
	// console.log(s.Collection.all());
	console.log(`cient/tables/+page.svelte Consequence.definition: `, Consequence.definition);
	// console.log(s.Event.definition);
	// console.log(s.MasterAnswer.definition);
	// console.log(s.MasterChapter.definition);
	// console.log(s.MasterQuestion.definition);

	// export let data: PageData;
</script>

<button>Hello {Consequence.definition}</button>
