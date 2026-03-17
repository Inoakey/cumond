<script lang="ts">
	import { onMount } from 'svelte';
	import { page } from '$app/state';
	import { importKey, decrypt } from '$lib/crypto/encryption.js';
	import { extractKeyFromHash } from '$lib/crypto/keyManager.js';
	import ParticipantForm from '$lib/components/ParticipantForm.svelte';
	import ResponseList from '$lib/components/ResponseList.svelte';
	import { t } from '$lib/i18n/index.js';
	import type { PollData, PollResponse } from '$lib/types/poll.js';

	interface IdentifiedResponse { id: string; data: PollResponse; }

	let pollData: PollData | null = $state(null);
	let identifiedResponses: IdentifiedResponse[] = $state([]);
	let encryptionKey: CryptoKey | null = $state(null);
	let error = $state('');
	let loading = $state(true);
	let ownResponseIds: Set<string> = $state(new Set());

	// Edit mode: pre-fill form with existing response
	let editingResponseId: string | null = $state(null);
	let editingData: PollResponse | null = $state(null);

	let visibleIdentified = $derived.by(() => {
		if (!pollData || pollData.responseVisibility === 'all') return identifiedResponses;
		return identifiedResponses.filter((r) => ownResponseIds.has(r.id));
	});

	let visibleResponses = $derived(visibleIdentified.map((r) => r.data));
	let visibleResponseIds = $derived(visibleIdentified.map((r) => r.id));
	let totalResponseCount = $derived(identifiedResponses.length);

	function handleResponseSubmitted(responseId: string) {
		ownResponseIds = new Set([...ownResponseIds, responseId]);
		editingResponseId = null;
		editingData = null;
		loadResponses();
	}

	function handleEdit(responseId: string, data: PollResponse) {
		editingResponseId = responseId;
		editingData = data;
	}

	async function loadResponses() {
		if (!encryptionKey) return;
		const respRes = await fetch(`/api/polls/${page.params.id}/responses`);
		if (respRes.ok) {
			const raw = await respRes.json();
			const decrypted: IdentifiedResponse[] = [];
			for (const r of raw) {
				try { decrypted.push({ id: r.id, data: (await decrypt(encryptionKey, r.encryptedData)) as PollResponse }); } catch { /* skip */ }
			}
			identifiedResponses = decrypted;
		}
	}

	onMount(async () => {
		try {
			const hashData = extractKeyFromHash();
			if (!hashData?.key) { error = $t('poll.noKey'); loading = false; return; }
			const key = await importKey(hashData.key);
			encryptionKey = key;

			const res = await fetch(`/api/polls/${page.params.id}`);
			if (res.status === 404) { error = $t('poll.notFound'); loading = false; return; }
			if (!res.ok) throw new Error(`Error ${res.status}`);

			const { encryptedData } = await res.json();
			pollData = (await decrypt(key, encryptedData)) as PollData;
			await loadResponses();
		} catch (e) {
			error = e instanceof Error ? e.message : 'Error';
		} finally { loading = false; }
	});
</script>

<svelte:head>
	<title>{pollData ? pollData.title : $t('poll.title')} – Cumond</title>
</svelte:head>

<main class="mx-auto max-w-6xl px-4 py-8">
	<a href="/" class="mb-8 inline-block"><img src="/cumond-logo-wordmark.png" alt="Cumond" class="h-8" /></a>

	{#if loading}
		<p class="text-sm text-text-muted">{$t('poll.loading')}</p>
	{:else if error}
		<div class="rounded-lg border border-primary/20 bg-slot-busy p-6">
			<h1 class="text-lg font-bold">{$t('error')}</h1>
			<p class="mt-2 text-sm">{error}</p>
		</div>
	{:else if pollData && encryptionKey}
		<div class="space-y-8">
			<div>
				<h1 class="text-2xl font-bold">{pollData.title}</h1>
				{#if pollData.location}<p class="mt-1 text-sm text-text-muted">{pollData.location}</p>{/if}
				{#if pollData.description}<p class="mt-2 text-sm">{pollData.description}</p>{/if}
			</div>

			{#if pollData.responseVisibility === 'own'}
				<div>
					<p class="mb-3 text-xs text-text-muted">
						{$t('participant.responsesHidden', { n: totalResponseCount })}
					</p>
					{#if visibleResponses.length > 0}
						<ResponseList {pollData} responses={visibleResponses} responseIds={visibleResponseIds} {ownResponseIds} onedit={handleEdit} />
					{/if}
				</div>
			{:else if visibleResponses.length > 0}
				<div>
					<h2 class="mb-3 text-sm font-medium text-text-muted">{$t('participant.responses', { n: totalResponseCount })}</h2>
					<ResponseList {pollData} responses={visibleResponses} responseIds={visibleResponseIds} {ownResponseIds} onedit={handleEdit} />
				</div>
			{/if}

			<div>
				<h2 class="mb-3 text-sm font-medium text-text-muted">{$t('participant.yourAnswer')}</h2>
				<ParticipantForm {pollData} {encryptionKey} pollId={page.params.id!}
					onsubmitted={handleResponseSubmitted}
					editResponseId={editingResponseId}
					editData={editingData} />
			</div>
		</div>
	{/if}
</main>
