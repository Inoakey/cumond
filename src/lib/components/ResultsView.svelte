<script lang="ts">
	import type { PollData, PollResponse } from '$lib/types/poll.js';
	import ResponseList from './ResponseList.svelte';
	import { t } from '$lib/i18n/index.js';

	interface Props {
		pollData: PollData;
		responses: PollResponse[];
		responseIds?: string[];
		ondelete?: (responseId: string) => void;
	}

	let { pollData, responses, responseIds = [], ondelete }: Props = $props();

	interface SlotScore {
		index: number;
		start: string;
		end: string;
		yes: number;
		maybe: number;
		no: number;
		score: number;
	}

	let rankedSlots = $derived.by(() => {
		const slots: SlotScore[] = pollData.timeslots.map((slot, i) => {
			let yes = 0, maybe = 0, no = 0;
			for (const r of responses) {
				const sel = r.selections.find((s) => s.timeslotIndex === i);
				if (sel?.status === 'yes') yes++;
				else if (sel?.status === 'maybe') maybe++;
				else if (sel?.status === 'no') no++;
			}
			return { index: i, start: slot.start, end: slot.end, yes, maybe, no, score: yes * 2 + maybe };
		});
		return slots.sort((a, b) => b.score - a.score);
	});

	let bestScore = $derived(rankedSlots.length > 0 ? rankedSlots[0].score : 0);

	function formatDate(start: string): string {
		const s = new Date(start);
		return s.toLocaleDateString('de-CH', { weekday: 'short', day: '2-digit', month: '2-digit', year: 'numeric' });
	}

	function formatTime(start: string, end: string): string {
		const s = new Date(start);
		const e = new Date(end);
		return `${s.toLocaleTimeString('de-CH', { hour: '2-digit', minute: '2-digit' })} – ${e.toLocaleTimeString('de-CH', { hour: '2-digit', minute: '2-digit' })}`;
	}
</script>

<div class="space-y-8">
	{#if rankedSlots.length > 0 && responses.length > 0}
		<div>
			<h2 class="mb-3 text-sm font-medium">{$t('admin.bestSlots')}</h2>
			<div class="space-y-2">
				{#each rankedSlots.slice(0, 5) as slot}
					{@const isBest = slot.score === bestScore && bestScore > 0}
					<div class="flex items-center justify-between rounded-lg border px-4 py-2.5 {isBest ? 'border-success/40 bg-slot-free' : 'border-border'}">
						<div class="text-sm">
							{#if isBest}<span class="mr-2 text-xs font-bold text-success">{$t('admin.best')}</span>{/if}
							<span class="font-medium">{formatDate(slot.start)}</span>
							<span class="ml-2 text-text-muted">{formatTime(slot.start, slot.end)}</span>
						</div>
						<div class="flex gap-3 text-xs">
							<span class="text-green-700">{slot.yes} {$t('status.yes')}</span>
							<span class="text-yellow-700">{slot.maybe} {$t('status.maybe')}</span>
							<span class="text-red-700">{slot.no} {$t('status.no')}</span>
						</div>
					</div>
				{/each}
			</div>
		</div>
	{/if}

	{#if responses.length > 0}
		<div>
			<h2 class="mb-3 text-sm font-medium">{$t('admin.allResponses', { n: responses.length })}</h2>
			<ResponseList {pollData} {responses} {responseIds} {ondelete} />
		</div>
	{:else}
		<p class="text-sm text-text-muted">{$t('admin.noResponses')}</p>
	{/if}
</div>
