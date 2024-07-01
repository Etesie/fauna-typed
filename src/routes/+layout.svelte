<script>
	import '../app.css';

	// TODO: Move this to src\lib\stores\index.ts
	const createTypes = async () => {
		try {
			const res = await fetch('/api/types');
			const generatedTypesRes = await res.json();

			console.log({ generatedTypesRes });
		} catch (error) {
			console.log('Error in createTypes:', error);
		}
	};

	$effect(() => {
		createTypes();
	});
</script>

<slot></slot>

<style></style>
