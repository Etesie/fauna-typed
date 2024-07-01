<script>
	import '../app.css';

	const createTypes = async () => {
		try {
			const res = await fetch('/api/types');
			const parsedRes = await res.json();

			console.log({ parsedRes });
		} catch (error) {
			console.log('Error in createTypes:', error);
		}
	};
</script>

<button class="btn bg-amber-400" on:click={createTypes}>Create Types</button>
<slot></slot>

<style></style>
