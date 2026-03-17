<script lang="ts">
	import type { PollData, PollResponse } from '$lib/types/poll.js';
	import { t } from '$lib/i18n/index.js';

	interface IdentifiedResponse {
		id?: string;
		data: PollResponse;
	}

	interface Props {
		pollData: PollData;
		responses: PollResponse[];
		responseIds?: string[];
		ondelete?: (responseId: string) => void;
		onedit?: (responseId: string, data: PollResponse) => void;
		ownResponseIds?: Set<string>;
	}

	let { pollData, responses, responseIds = [], ondelete, onedit, ownResponseIds }: Props = $props();

	// Sort timeslots chronologically, keep original indices
	let sortedTimeslots = $derived(
		pollData.timeslots
			.map((slot, i) => ({ slot, originalIndex: i }))
			.sort((a, b) => new Date(a.slot.start).getTime() - new Date(b.slot.start).getTime())
	);

	// Group by date for colspan header
	interface DateGroup {
		dateLabel: string;
		count: number;
	}

	let dateGroups = $derived.by((): DateGroup[] => {
		const groups: DateGroup[] = [];
		let lastKey = '';
		for (const { slot } of sortedTimeslots) {
			const s = new Date(slot.start);
			const dateKey = s.toISOString().slice(0, 10);
			if (dateKey === lastKey) {
				groups[groups.length - 1].count++;
			} else {
				const dateLabel = s.toLocaleDateString('de-CH', { weekday: 'short', day: '2-digit', month: '2-digit', year: 'numeric' });
				groups.push({ dateLabel, count: 1 });
				lastKey = dateKey;
			}
		}
		return groups;
	});

	function formatTimeFrom(start: string): string {
		return new Date(start).toLocaleTimeString('de-CH', { hour: '2-digit', minute: '2-digit' });
	}

	function formatTimeTo(end: string): string {
		return new Date(end).toLocaleTimeString('de-CH', { hour: '2-digit', minute: '2-digit' });
	}

	const statusColor: Record<string, string> = {
		yes: 'bg-slot-free text-green-800',
		maybe: 'bg-slot-maybe text-yellow-800',
		no: 'bg-slot-busy text-red-800'
	};

	const statusSymbol: Record<string, string> = { yes: '+', maybe: '~', no: '−' };

	function getStatus(response: PollResponse, slotIndex: number): string {
		return response.selections.find((s) => s.timeslotIndex === slotIndex)?.status ?? 'no';
	}
</script>

{#if responses.length === 0}
	<p class="text-sm text-text-muted">{$t('admin.noResponses')}</p>
{:else}
	<div class="overflow-x-auto">
		<table class="w-full text-sm">
			<thead>
				<!-- Row 1: Date (grouped with colspan) -->
				<tr>
					<th rowspan="4" class="sticky left-0 z-10 bg-surface px-3 py-1 text-left font-medium">{$t('participant.name')}</th>
					{#if ondelete || onedit}<th rowspan="4"></th>{/if}
					{#each dateGroups as group}
						<th colspan={group.count} class="border-l border-border px-2 py-1 text-center text-xs font-semibold">
							{group.dateLabel}
						</th>
					{/each}
				</tr>
				<!-- Row 2: Time from -->
				<tr>
					{#each sortedTimeslots as { slot }}
						<th class="border-l border-border px-2 pb-0 pt-1 text-center text-[11px] font-normal text-text-muted">
							{formatTimeFrom(slot.start)}
						</th>
					{/each}
				</tr>
				<!-- Row 3: separator -->
				<tr>
					{#each sortedTimeslots as _}
						<th class="border-l border-border px-2 py-0 text-center text-[10px] leading-none text-text-muted/50">–</th>
					{/each}
				</tr>
				<!-- Row 4: Time to -->
				<tr>
					{#each sortedTimeslots as { slot }}
						<th class="border-l border-border px-2 pb-1 pt-0 text-center text-[11px] font-normal text-text-muted">
							{formatTimeTo(slot.end)}
						</th>
					{/each}
				</tr>
			</thead>
			<tbody>
				{#each responses as response, ri}
					{@const rid = responseIds[ri]}
					{@const canEdit = onedit && rid && ownResponseIds?.has(rid)}
					{@const canDelete = ondelete && rid}
					<tr class="border-t border-border">
						<td class="sticky left-0 z-10 bg-surface px-3 py-2 font-medium">{response.participantName}</td>
						{#if ondelete || onedit}
							<td class="px-1 py-2 text-center whitespace-nowrap">
								{#if canEdit}
									<button type="button" onclick={() => onedit!(rid, response)}
										class="text-xs text-accent hover:underline" title="Bearbeiten">&#9998;</button>
								{/if}
								{#if canDelete}
									<button type="button" onclick={() => ondelete!(rid)}
										class="text-xs text-primary hover:underline ml-1" title="Löschen">&#x2715;</button>
								{/if}
							</td>
						{/if}
						{#each sortedTimeslots as { originalIndex }}
							{@const status = getStatus(response, originalIndex)}
							<td class="border-l border-border px-2 py-2 text-center">
								<span class="inline-flex h-6 w-6 items-center justify-center rounded-full text-xs font-bold {statusColor[status]}"
									title={$t(`status.${status}`)}>
									{statusSymbol[status]}
								</span>
							</td>
						{/each}
					</tr>
				{/each}
			</tbody>
		</table>
	</div>
{/if}
