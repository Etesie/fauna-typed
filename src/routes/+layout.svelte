<script>
	import { onMount } from 'svelte';
	import '../app.css';

	// TODO: Move this to src\lib\stores\index.ts
	const createTypes = async () => {
		try {
			const res = await fetch('/api/types');
			const genetatedTypesRes = await res.json();

			console.log({ genetatedTypesRes });
		} catch (error) {
			console.log('Error in createTypes:', error);
		}
	};

	onMount(() => {
		createTypes();
	});
</script>

<slot></slot>

<style></style>
