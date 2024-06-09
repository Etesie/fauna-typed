import { createUserStore } from './store-user.svelte';

const UserStore = createUserStore();

const User = UserStore.init();

export { User };
