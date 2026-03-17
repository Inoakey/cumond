<script lang="ts">
	import type { PollData, PollResponse, TimeslotSelection } from '$lib/types/poll.js';
	import { encrypt } from '$lib/crypto/encryption.js';
	import { t } from '$lib/i18n/index.js';

	interface Props {
		pollData: PollData;
		encryptionKey: CryptoKey;
		pollId: string;
		onsubmitted?: (responseId: string) => void;
		editResponseId?: string | null;
		editData?: PollResponse | null;
	}

	let { pollData, encryptionKey, pollId, onsubmitted, editResponseId = null, editData = null }: Props = $props();

	let name = $state('');
	let selections: Map<number, 'yes' | 'maybe' | 'no'> = $state(new Map());
	let submitting = $state(false);
	let submitted = $state(false);
	let error = $state('');
	let isEditing = $state(false);
	let currentEditId: string | null = $state(null);

	// Watch for edit trigger from parent
	$effect(() => {
		if (editResponseId && editData) {
			name = editData.participantName;
			const map = new Map<number, 'yes' | 'maybe' | 'no'>();
			for (const sel of editData.selections) {
				if (sel.status !== 'no') map.set(sel.timeslotIndex, sel.status);
			}
			selections = map;
			isEditing = true;
			currentEditId = editResponseId;
			submitted = false;
		}
	});

	// Sort timeslots chronologically, keeping original indices
	let sortedTimeslots = $derived(
		pollData.timeslots
			.map((slot, i) => ({ slot, originalIndex: i }))
			.sort((a, b) => new Date(a.slot.start).getTime() - new Date(b.slot.start).getTime())
	);

	// Group by date
	interface DayGroup {
		dateKey: string;
		dateLabel: string;
		slots: { slot: typeof pollData.timeslots[0]; originalIndex: number; time: string }[];
	}

	let dayGroups = $derived.by((): DayGroup[] => {
		const groups: Map<string, DayGroup> = new Map();
		for (const { slot, originalIndex } of sortedTimeslots) {
			const s = new Date(slot.start);
			const e = new Date(slot.end);
			const dateKey = s.toISOString().slice(0, 10);
			const dateLabel = s.toLocaleDateString('de-CH', { weekday: 'short', day: '2-digit', month: '2-digit', year: 'numeric' });
			const time = `${s.toLocaleTimeString('de-CH', { hour: '2-digit', minute: '2-digit' })} – ${e.toLocaleTimeString('de-CH', { hour: '2-digit', minute: '2-digit' })}`;
			if (!groups.has(dateKey)) {
				groups.set(dateKey, { dateKey, dateLabel, slots: [] });
			}
			groups.get(dateKey)!.slots.push({ slot, originalIndex, time });
		}
		return [...groups.values()];
	});

	function toggleSelection(index: number) {
		const current = selections.get(index);
		// Cycle: unset → yes → maybe (notfalls) → no → unset
		const next = !current ? 'yes' : current === 'yes' ? 'maybe' : current === 'maybe' ? 'no' : undefined;
		const updated = new Map(selections);
		if (next) { updated.set(index, next); } else { updated.delete(index); }
		selections = updated;
	}

	const statusSymbol: Record<string, string> = { yes: '+', maybe: '~', no: '−' };

	const statusColor: Record<string, string> = {
		yes: 'bg-slot-free text-green-800 border-green-300',
		maybe: 'bg-slot-maybe text-yellow-800 border-yellow-300',
		no: 'bg-slot-busy text-red-800 border-red-300'
	};

	function cancelEdit() {
		isEditing = false;
		currentEditId = null;
		name = '';
		selections = new Map();
	}

	async function handleSubmit() {
		if (!name.trim()) { error = $t('participant.nameRequired'); return; }
		error = '';
		submitting = true;
		try {
			// If editing, delete the old response first
			if (isEditing && currentEditId) {
				await fetch(`/api/polls/${pollId}/responses/${currentEditId}`, { method: 'DELETE' });
			}

			// Auto-fill unselected slots as 'no'
			const responseSelections: TimeslotSelection[] = [];
			for (let i = 0; i < pollData.timeslots.length; i++) {
				const status = selections.get(i) ?? 'no';
				responseSelections.push({ timeslotIndex: i, status });
			}
			const encryptedData = await encrypt(encryptionKey, { participantName: name.trim(), selections: responseSelections });
			const res = await fetch(`/api/polls/${pollId}/responses`, {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ encryptedData })
			});
			if (!res.ok) {
				const body = await res.json().catch(() => ({}));
				throw new Error(body.message || `Error ${res.status}`);
			}
			const { id: responseId } = await res.json();
			submitted = true;
			isEditing = false;
			currentEditId = null;
			onsubmitted?.(responseId);
		} catch (e) {
			error = e instanceof Error ? e.message : 'Unknown error';
		} finally {
			submitting = false;
		}
	}
</script>

{#if submitted}
	<div class="rounded-lg border border-success/30 bg-slot-free p-6 text-center">
		<h2 class="text-lg font-bold">{$t('participant.thanks', { name })}</h2>
		<p class="mt-2 text-sm text-text-muted">{$t('participant.saved')}</p>
		<button onclick={() => { submitted = false; name = ''; selections = new Map(); }}
			class="mt-4 text-sm text-accent underline-offset-2 hover:underline">
			{$t('participant.another')}
		</button>
	</div>
{:else}
	<form onsubmit={(e) => { e.preventDefault(); handleSubmit(); }} class="space-y-5">
		{#if isEditing}
			<div class="flex items-center justify-between rounded-md border border-accent/30 bg-accent/5 px-4 py-2">
				<p class="text-sm"><span class="font-medium">{$t('participant.editing')}</span></p>
				<button type="button" onclick={cancelEdit} class="text-xs text-text-muted hover:underline">{$t('admin.cancel')}</button>
			</div>
		{/if}

		<div>
			<label for="participant-name" class="mb-1 block text-sm font-medium">{$t('participant.name')} *</label>
			<input id="participant-name" type="text" bind:value={name} placeholder={$t('participant.namePlaceholder')} required
				class="w-full rounded-md border border-border bg-surface px-3 py-2 text-sm outline-none transition-colors focus:border-accent" />
		</div>

		<div>
			<p class="mb-2 text-sm font-medium">{$t('participant.chooseAvailability')}</p>
			<p class="mb-3 text-xs text-text-muted">{$t('participant.chooseHint')}</p>
			<div class="space-y-4">
				{#each dayGroups as group}
					<div>
						<p class="mb-1.5 text-xs font-semibold text-text-muted">{group.dateLabel}</p>
						<div class="flex flex-wrap gap-2">
							{#each group.slots as { originalIndex, time }}
								{@const status = selections.get(originalIndex)}
								<button type="button" onclick={() => toggleSelection(originalIndex)}
									title={status ? $t(`status.${status}`) : ''}
									class="rounded-lg border px-4 py-2 text-center text-sm transition-colors {status ? statusColor[status] : 'border-border hover:bg-border/20'}">
									<span class="font-medium">{time}</span>
									{#if status}
										<span class="ml-2 text-base font-bold leading-none">{statusSymbol[status]}</span>
									{/if}
								</button>
							{/each}
						</div>
					</div>
				{/each}
			</div>
		</div>

		{#if error}
			<p class="text-sm text-primary">{error}</p>
		{/if}

		<button type="submit" disabled={submitting}
			class="w-full rounded-md bg-accent px-4 py-3 text-sm font-medium text-white transition-colors hover:bg-accent/90 disabled:opacity-50">
			{submitting ? $t('participant.submitting') : isEditing ? $t('participant.update') : $t('participant.submit')}
		</button>

		<p class="text-center text-xs text-text-muted">{$t('participant.encryptedNote')}</p>
	</form>
{/if}
