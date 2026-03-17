<script lang="ts">
	import { onMount } from 'svelte';
	import { page } from '$app/state';
	import { importKey, decrypt } from '$lib/crypto/encryption.js';
	import { extractKeyFromHash } from '$lib/crypto/keyManager.js';
	import { hashAdminToken } from '$lib/crypto/adminToken.js';
	import { buildShareLink } from '$lib/crypto/keyManager.js';
	import ResultsView from '$lib/components/ResultsView.svelte';
	import LinkDisplay from '$lib/components/LinkDisplay.svelte';
	import { t } from '$lib/i18n/index.js';
	import type { PollData, PollResponse } from '$lib/types/poll.js';

	interface IdentifiedResponse { id: string; data: PollResponse; }

	let pollData: PollData | null = $state(null);
	let identifiedResponses: IdentifiedResponse[] = $state([]);
	let encryptionKey: CryptoKey | null = $state(null);
	let keyString: string | null = $state(null);
	let adminTokenHash: string | null = $state(null);
	let error = $state('');
	let loading = $state(true);
	let deleting = $state(false);
	let deleted = $state(false);
	let showDeleteConfirm = $state(false);

	let responses = $derived(identifiedResponses.map((r) => r.data));
	let responseIds = $derived(identifiedResponses.map((r) => r.id));
	let participantLink = $derived(keyString ? buildShareLink(page.params.id!, keyString) : '');

	onMount(async () => {
		try {
			const hashData = extractKeyFromHash();
			if (!hashData?.key || !hashData.adminToken) { error = $t('admin.invalidLink'); loading = false; return; }
			keyString = hashData.key;
			const key = await importKey(hashData.key);
			encryptionKey = key;
			adminTokenHash = await hashAdminToken(hashData.adminToken);

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

	async function deleteResponse(responseId: string) {
		if (!adminTokenHash) return;
		try {
			const res = await fetch(`/api/polls/${page.params.id}/responses/${responseId}`, {
				method: 'DELETE',
				headers: { 'x-admin-token-hash': adminTokenHash }
			});
			if (!res.ok) { const body = await res.json().catch(() => ({})); throw new Error(body.message || `Error ${res.status}`); }
			await loadResponses();
		} catch (e) {
			error = e instanceof Error ? e.message : 'Error';
		}
	}

	async function deletePoll() {
		if (!adminTokenHash) return;
		deleting = true;
		try {
			const res = await fetch(`/api/polls/${page.params.id}`, { method: 'DELETE', headers: { 'x-admin-token-hash': adminTokenHash } });
			if (!res.ok) { const body = await res.json().catch(() => ({})); throw new Error(body.message || `Error ${res.status}`); }
			deleted = true;
		} catch (e) { error = e instanceof Error ? e.message : 'Error'; } finally { deleting = false; }
	}
</script>

<svelte:head>
	<title>{pollData ? `${$t('admin.view')}: ${pollData.title}` : $t('admin.view')} – Cumond</title>
</svelte:head>

<main class="mx-auto max-w-6xl px-4 py-8">
	<a href="/" class="mb-8 inline-block"><img src="/cumond-logo-wordmark.png" alt="Cumond" class="h-8" /></a>

	{#if loading}
		<p class="text-sm text-text-muted">{$t('admin.loading')}</p>
	{:else if deleted}
		<div class="rounded-lg border border-border bg-surface p-8 text-center">
			<h1 class="text-xl font-bold">{$t('admin.deleted')}</h1>
			<p class="mt-2 text-sm text-text-muted">{$t('admin.deletedHint')}</p>
			<a href="/" class="mt-4 inline-block text-sm text-accent underline-offset-2 hover:underline">{$t('poll.newPoll')}</a>
		</div>
	{:else if error}
		<div class="rounded-lg border border-primary/20 bg-slot-busy p-6">
			<h1 class="text-lg font-bold">{$t('error')}</h1>
			<p class="mt-2 text-sm">{error}</p>
		</div>
	{:else if pollData}
		<div class="space-y-8">
			<div>
				<div class="mb-1 text-xs font-medium uppercase tracking-wide text-text-muted">{$t('admin.view')}</div>
				<h1 class="text-2xl font-bold">{pollData.title}</h1>
				{#if pollData.location}<p class="mt-1 text-sm text-text-muted">{pollData.location}</p>{/if}
				{#if pollData.description}<p class="mt-2 text-sm">{pollData.description}</p>{/if}
				<div class="mt-2 flex flex-wrap gap-3 text-xs text-text-muted">
					<span>{$t('admin.timeslots', { n: pollData.timeslots.length })}</span>
					<span>{$t('visibility.label')}: {pollData.responseVisibility === 'all' ? $t('admin.visibilityAll') : $t('admin.visibilityOwn')}</span>
				</div>
			</div>

			<LinkDisplay label={$t('link.participant')} link={participantLink} description={$t('link.participantDesc')} />

			<ResultsView {pollData} {responses} {responseIds} ondelete={deleteResponse} />

			<button onclick={loadResponses} class="rounded-md border border-border px-4 py-2 text-sm transition-colors hover:bg-border/30">
				{$t('admin.refresh')}
			</button>

			<div class="border-t border-border pt-6">
				{#if showDeleteConfirm}
					<div class="rounded-lg border border-primary/30 bg-slot-busy p-4">
						<p class="text-sm font-medium">{$t('admin.deleteConfirm')}</p>
						<p class="mt-1 text-xs text-text-muted">{$t('admin.deleteHint')}</p>
						<div class="mt-3 flex gap-3">
							<button onclick={deletePoll} disabled={deleting}
								class="rounded-md bg-primary px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-primary/90 disabled:opacity-50">
								{deleting ? $t('admin.deleting') : $t('admin.deleteForever')}
							</button>
							<button onclick={() => (showDeleteConfirm = false)}
								class="rounded-md border border-border px-4 py-2 text-sm transition-colors hover:bg-border/30">
								{$t('admin.cancel')}
							</button>
						</div>
					</div>
				{:else}
					<button onclick={() => (showDeleteConfirm = true)} class="text-sm text-primary underline-offset-2 hover:underline">
						{$t('admin.delete')}
					</button>
				{/if}
			</div>
		</div>
	{/if}
</main>
