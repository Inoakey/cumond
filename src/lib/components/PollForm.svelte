<script lang="ts">
	import ExpirySelector from './ExpirySelector.svelte';
	import LinkDisplay from './LinkDisplay.svelte';
	import CalendarWeekView from './CalendarWeekView.svelte';
	import { generateEncryptionKey, exportKey, encrypt } from '$lib/crypto/encryption.js';
	import { generateAdminToken, hashAdminToken } from '$lib/crypto/adminToken.js';
	import { buildShareLink } from '$lib/crypto/keyManager.js';
	import { t } from '$lib/i18n/index.js';
	import type { Timeslot, ResponseVisibility } from '$lib/types/poll.js';

	let title = $state('');
	let location = $state('');
	let description = $state('');
	let expiryDays = $state(90);
	let timeslots: Timeslot[] = $state([]);
	let responseVisibility: ResponseVisibility = $state('all');

	let submitting = $state(false);
	let error = $state('');

	let result: { participantLink: string; adminLink: string } | null = $state(null);

	async function handleSubmit() {
		if (!title.trim()) {
			error = $t('poll.titleRequired');
			return;
		}
		if (timeslots.length === 0) {
			error = $t('poll.timeslotsRequired');
			return;
		}

		error = '';
		submitting = true;

		try {
			const key = await generateEncryptionKey();
			const keyString = await exportKey(key);
			const adminTokenPlain = generateAdminToken();
			const adminTokenHash = await hashAdminToken(adminTokenPlain);

			const pollData = {
				title: title.trim(),
				location: location.trim() || undefined,
				description: description.trim() || undefined,
				timeslots,
				responseVisibility
			};

			const encryptedData = await encrypt(key, pollData);

			const res = await fetch('/api/polls', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ encryptedData, adminTokenHash, expiryDays })
			});

			if (!res.ok) {
				const body = await res.json().catch(() => ({}));
				throw new Error(body.message || `Error ${res.status}`);
			}

			const { id: pollId } = await res.json();

			result = {
				participantLink: buildShareLink(pollId, keyString),
				adminLink: buildShareLink(pollId, keyString, adminTokenPlain)
			};
		} catch (e) {
			error = e instanceof Error ? e.message : 'Unknown error';
		} finally {
			submitting = false;
		}
	}
</script>

{#if result}
	<div class="space-y-6">
		<div>
			<h2 class="text-xl font-bold">{$t('poll.created')}</h2>
			<p class="mt-1 text-sm text-text-muted">{$t('poll.createdHint')}</p>
		</div>

		<LinkDisplay label={$t('link.participant')} link={result.participantLink} description={$t('link.participantDesc')} />
		<LinkDisplay label={$t('link.admin')} link={result.adminLink} description={$t('link.adminDesc')} />

		<button
			onclick={() => { result = null; title = ''; location = ''; description = ''; timeslots = []; responseVisibility = 'all'; }}
			class="text-sm text-accent underline-offset-2 hover:underline"
		>
			{$t('poll.newPoll')}
		</button>
	</div>
{:else}
	<form onsubmit={(e) => { e.preventDefault(); handleSubmit(); }} class="space-y-4">
		<div class="grid gap-3 sm:grid-cols-2">
			<div>
				<label for="title" class="mb-1 block text-xs font-medium">{$t('poll.title')} *</label>
				<input id="title" type="text" bind:value={title} placeholder={$t('poll.titlePlaceholder')} required
					class="w-full rounded-md border border-border bg-surface px-3 py-1.5 text-sm outline-none transition-colors focus:border-accent" />
			</div>
			<div>
				<label for="location" class="mb-1 block text-xs font-medium">{$t('poll.location')}</label>
				<input id="location" type="text" bind:value={location} placeholder={$t('poll.locationPlaceholder')}
					class="w-full rounded-md border border-border bg-surface px-3 py-1.5 text-sm outline-none transition-colors focus:border-accent" />
			</div>
		</div>

		<div>
			<label for="description" class="mb-1 block text-xs font-medium">{$t('poll.description')}</label>
			<textarea id="description" bind:value={description} placeholder={$t('poll.descriptionPlaceholder')} rows={2}
				class="w-full rounded-md border border-border bg-surface px-3 py-1.5 text-sm outline-none transition-colors focus:border-accent"></textarea>
		</div>

		<fieldset>
			<legend class="mb-1 text-xs font-medium">{$t('poll.timeslots')} *</legend>
			<CalendarWeekView selectedSlots={timeslots} onchange={(s) => (timeslots = s)} />
		</fieldset>

		<div class="grid gap-3 sm:grid-cols-2">
			<ExpirySelector value={expiryDays} onchange={(d) => (expiryDays = d)} />

			<fieldset class="space-y-1.5">
				<legend class="mb-1 text-xs font-medium">{$t('visibility.label')}</legend>
				<label class="flex cursor-pointer items-center gap-2 rounded-md border px-3 py-1.5 text-sm transition-colors {responseVisibility === 'all' ? 'border-accent bg-accent/5' : 'border-border'}">
					<input type="radio" name="visibility" value="all" bind:group={responseVisibility} class="sr-only" />
					<span class="font-medium">{$t('visibility.all')}</span>
				</label>
				<label class="flex cursor-pointer items-center gap-2 rounded-md border px-3 py-1.5 text-sm transition-colors {responseVisibility === 'own' ? 'border-accent bg-accent/5' : 'border-border'}">
					<input type="radio" name="visibility" value="own" bind:group={responseVisibility} class="sr-only" />
					<span class="font-medium">{$t('visibility.own')}</span>
				</label>
			</fieldset>
		</div>

		{#if error}
			<p class="text-sm text-primary">{error}</p>
		{/if}

		<button type="submit" disabled={submitting}
			class="w-full rounded-md bg-accent px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-accent/90 disabled:opacity-50">
			{submitting ? $t('poll.creating') : $t('poll.create')}
		</button>

		<p class="text-center text-xs text-text-muted">{$t('poll.encrypted')}</p>
	</form>
{/if}
