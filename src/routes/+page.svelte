<script lang="ts">
	import { User } from '$lib/stores';
	import { type UserProperties } from '$lib/types/user';
	import { tick } from 'svelte';

	let users = $state(User.all());

	const u_user: UserProperties = $state({
		firstName: '',
		lastName: ''
	});

	async function createUser() {
		console.log('New user: ', u_user);
		User.create(u_user);
		u_user.firstName = '';
		u_user.lastName = '';

		await tick();
		const inputElement = document.getElementById('create-user');
		if (inputElement) {
			inputElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
		}
	}

	function on_key_down(e: KeyboardEvent) {
		if (e.key === 'Enter') {
			createUser();
		}
	}
</script>

<div class="flex flex-wrap justify-center gap-10 p-4">
	<div class="w-192 flex flex-col gap-10">
		<div class="flex flex-col gap-3">
			<h2 class="h2">Users</h2>
			<div class="table-container space-y-4">
				<table class="table w-full table-auto">
					<thead>
						<tr>
							<th></th>
							<th class="flex flex-col"> First Name </th>
							<th> Last Name </th>
							<th></th>
							<th></th>
						</tr>
					</thead>
					<tbody>
						{#each users.data as user, index}
							<tr>
								<td class="w-5">{index + 1}</td>
								<td>
									<input
										class="input"
										type="text"
										bind:value={user.firstName}
										name="firstName"
									/></td
								>
								<td>
									<input class="input" type="text" bind:value={user.lastName} name="lastName" /></td
								>
							</tr>
						{/each}
						<tr id="create-user">
							<td></td>
							<td>
								<input
									class="input"
									name="firstName"
									type="text"
									bind:value={u_user.firstName}
									onkeydown={on_key_down}
								/></td
							>
							<td>
								<input
									class="input"
									name="lastName"
									type="text"
									bind:value={u_user.lastName}
									onkeydown={on_key_down}
								/>
							</td>
							<td>
								<button
									class="btn max-w-48 preset-filled"
									onclick={() => createUser()}
									onkeydown={on_key_down}>Create User</button
								>
							</td>
						</tr>
					</tbody>
				</table>
			</div>
		</div>
	</div>
</div>
