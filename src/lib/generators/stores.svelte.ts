import { createCollectionStore } from '$lib/stores/collection.svelte';
import { createDocumentStore } from '$lib/stores/document.svelte';
import type { DocumentStores } from '$lib/types/types';

let collections = $state(createCollectionStore().all().data);
