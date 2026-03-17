<script lang="ts">
	import { onMount, tick } from 'svelte';
	import MonthMiniCalendar from './MonthMiniCalendar.svelte';
	import { t } from '$lib/i18n/index.js';
	import type { Timeslot } from '$lib/types/poll.js';

	interface Props {
		selectedSlots: Timeslot[];
		onchange: (slots: Timeslot[]) => void;
	}

	let { selectedSlots, onchange }: Props = $props();

	const HOUR_START = 0;
	const HOUR_END = 24;
	const DEFAULT_SCROLL_HOUR = 7;
	const GRID = 15; // minutes
	const ROW_H = 16; // px per grid unit – compact
	const TOTAL_ROWS = ((HOUR_END - HOUR_START) * 60) / GRID;
	const MIN_SLOT_ROWS = 1;

	let weekStart = $state(getWeekStart(new Date()));
	let mobileDay = $state(0);
	let desktopGrid: HTMLDivElement | undefined = $state();
	let mobileGrid: HTMLDivElement | undefined = $state();

	onMount(async () => {
		await tick();
		const scrollTop = (DEFAULT_SCROLL_HOUR * 60 / GRID) * ROW_H;
		desktopGrid?.scrollTo({ top: scrollTop });
		mobileGrid?.scrollTo({ top: scrollTop });
	});

	type DragMode = 'none' | 'create' | 'move' | 'resize';
	let mode: DragMode = $state('none');
	let activeSlotKey: string | null = $state(null);
	let activeDayIndex: number | null = $state(null);
	let ghostTop = $state(0);
	let ghostHeight = $state(0);
	let didDrag = $state(false);

	// ── Helpers ──

	function getWeekStart(date: Date): Date {
		const d = new Date(date);
		d.setDate(d.getDate() - ((d.getDay() + 6) % 7));
		d.setHours(0, 0, 0, 0);
		return d;
	}

	function getWeekDays(start: Date): Date[] {
		return Array.from({ length: 7 }, (_, i) => {
			const d = new Date(start);
			d.setDate(d.getDate() + i);
			return d;
		});
	}

	function clampRow(row: number): number { return Math.max(0, Math.min(row, TOTAL_ROWS)); }
	function rowToMinutes(row: number): number { return row * GRID; }
	function minutesToRow(min: number): number { return min / GRID; }
	function dateToRow(d: Date): number { return minutesToRow((d.getHours() - HOUR_START) * 60 + d.getMinutes()); }

	function makeISO(day: Date, row: number): string {
		const d = new Date(day);
		const mins = rowToMinutes(row);
		d.setHours(HOUR_START + Math.floor(mins / 60), mins % 60, 0, 0);
		return d.toISOString();
	}

	function slotsForDay(day: Date): Timeslot[] {
		const ds = new Date(day); ds.setHours(0, 0, 0, 0);
		const de = new Date(day); de.setHours(23, 59, 59, 999);
		return selectedSlots.filter((s) => { const sd = new Date(s.start); return sd >= ds && sd <= de; });
	}

	// ── Layout overlapping slots ──

	interface LayoutSlot { slot: Timeslot; col: number; cols: number; top: number; height: number; }

	function layoutSlots(slots: Timeslot[]): LayoutSlot[] {
		if (!slots.length) return [];
		const sorted = [...slots].sort((a, b) => new Date(a.start).getTime() - new Date(b.start).getTime());
		const groups: { slot: Timeslot; col: number; end: number }[] = [];
		for (const slot of sorted) {
			const st = new Date(slot.start).getTime();
			const et = new Date(slot.end).getTime();
			let col = 0;
			while (groups.some((g) => g.col === col && g.end > st)) col++;
			groups.push({ slot, col, end: et });
		}
		const maxCol = groups.reduce((m, g) => Math.max(m, g.col), 0) + 1;
		return groups.map((g) => ({
			slot: g.slot, col: g.col, cols: maxCol,
			top: dateToRow(new Date(g.slot.start)) * ROW_H,
			height: (dateToRow(new Date(g.slot.end)) - dateToRow(new Date(g.slot.start))) * ROW_H
		}));
	}

	// ── Column ref lookup ──

	function getColumns(): NodeListOf<Element> | null { return document.querySelectorAll('[data-day-col]'); }

	function dayIndexFromPointer(x: number): number | null {
		const cols = getColumns();
		if (!cols) return null;
		for (let i = 0; i < cols.length; i++) {
			const r = cols[i].getBoundingClientRect();
			if (x >= r.left && x <= r.right) return i;
		}
		return null;
	}

	function colRect(dayIndex: number): DOMRect | null {
		const cols = getColumns();
		return cols?.[dayIndex]?.getBoundingClientRect() ?? null;
	}

	// ── Create by dragging on empty space ──

	function onColPointerDown(e: PointerEvent, dayIndex: number) {
		const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
		const y = e.clientY - rect.top;
		const row = clampRow(Math.floor(y / ROW_H));
		if ((e.target as HTMLElement).closest('[data-slot]')) return;
		mode = 'create';
		activeDayIndex = dayIndex;
		ghostTop = row * ROW_H;
		ghostHeight = ROW_H;
		didDrag = false;
		activeSlotKey = null;
		window.addEventListener('pointermove', onPointerMove);
		window.addEventListener('pointerup', onPointerUp);
	}

	// ── Move existing slot ──

	let moveOffsetRows = 0;

	function onSlotPointerDown(e: PointerEvent, slot: Timeslot, dayIndex: number) {
		e.stopPropagation();
		e.preventDefault();
		const rect = colRect(dayIndex);
		if (!rect) return;
		const y = e.clientY - rect.top;
		const slotRow = dateToRow(new Date(slot.start));
		moveOffsetRows = Math.floor(y / ROW_H) - slotRow;
		const slotRows = dateToRow(new Date(slot.end)) - slotRow;
		mode = 'move';
		activeSlotKey = slot.start;
		activeDayIndex = dayIndex;
		ghostTop = slotRow * ROW_H;
		ghostHeight = slotRows * ROW_H;
		didDrag = false;
		window.addEventListener('pointermove', onPointerMove);
		window.addEventListener('pointerup', onPointerUp);
	}

	// ── Resize slot ──

	function onResizePointerDown(e: PointerEvent, slot: Timeslot, dayIndex: number) {
		e.stopPropagation();
		e.preventDefault();
		mode = 'resize';
		activeSlotKey = slot.start;
		activeDayIndex = dayIndex;
		ghostTop = dateToRow(new Date(slot.start)) * ROW_H;
		ghostHeight = (dateToRow(new Date(slot.end)) - dateToRow(new Date(slot.start))) * ROW_H;
		didDrag = false;
		window.addEventListener('pointermove', onPointerMove);
		window.addEventListener('pointerup', onPointerUp);
	}

	// ── Shared pointer handlers ──

	function onPointerMove(e: PointerEvent) {
		didDrag = true;
		const newDay = dayIndexFromPointer(e.clientX);
		if (newDay !== null && mode === 'move') activeDayIndex = newDay;
		const di = activeDayIndex;
		if (di === null) return;
		const rect = colRect(di);
		if (!rect) return;
		const y = e.clientY - rect.top;

		if (mode === 'create') {
			const startRow = Math.floor(ghostTop / ROW_H);
			const currentRow = clampRow(Math.floor(y / ROW_H) + 1);
			ghostHeight = Math.max(MIN_SLOT_ROWS, currentRow - startRow) * ROW_H;
		} else if (mode === 'move') {
			const slotRows = Math.round(ghostHeight / ROW_H);
			const targetRow = clampRow(Math.floor(y / ROW_H) - moveOffsetRows);
			ghostTop = Math.max(0, Math.min(targetRow, TOTAL_ROWS - slotRows)) * ROW_H;
		} else if (mode === 'resize') {
			const startRow = Math.floor(ghostTop / ROW_H);
			const currentRow = clampRow(Math.floor(y / ROW_H) + 1);
			ghostHeight = Math.max(MIN_SLOT_ROWS, currentRow - startRow) * ROW_H;
		}
	}

	function onPointerUp() {
		window.removeEventListener('pointermove', onPointerMove);
		window.removeEventListener('pointerup', onPointerUp);
		if (activeDayIndex === null) { mode = 'none'; return; }
		const day = weekDays[activeDayIndex];
		const topRow = clampRow(Math.round(ghostTop / ROW_H));
		const rows = Math.max(MIN_SLOT_ROWS, Math.round(ghostHeight / ROW_H));

		if (mode === 'create') {
			if (!didDrag) {
				const endRow = Math.min(topRow + 4, TOTAL_ROWS);
				onchange([...selectedSlots, { start: makeISO(day, topRow), end: makeISO(day, endRow) }]);
			} else {
				onchange([...selectedSlots, { start: makeISO(day, topRow), end: makeISO(day, topRow + rows) }]);
			}
		} else if ((mode === 'move' || mode === 'resize') && activeSlotKey) {
			const newSlot: Timeslot = { start: makeISO(day, topRow), end: makeISO(day, topRow + rows) };
			onchange([...selectedSlots.filter((s) => s.start !== activeSlotKey), newSlot]);
		}

		mode = 'none';
		activeSlotKey = null;
		activeDayIndex = null;
	}

	// ── Remove ──

	function removeSlot(start: string) {
		onchange(selectedSlots.filter((s) => s.start !== start));
	}

	// ── Formatting ──

	function formatHour(h: number): string { return `${h.toString().padStart(2, '0')}:00`; }
	function formatDayHeader(d: Date): string { return d.toLocaleDateString('de-CH', { weekday: 'short', day: 'numeric' }); }
	function formatSlotTime(start: string, end: string): string {
		const s = new Date(start); const e = new Date(end);
		return `${s.toLocaleTimeString('de-CH', { hour: '2-digit', minute: '2-digit' })} – ${e.toLocaleTimeString('de-CH', { hour: '2-digit', minute: '2-digit' })}`;
	}
	function formatSlotLabel(start: string, end: string): string {
		const s = new Date(start); const e = new Date(end);
		const date = s.toLocaleDateString('de-CH', { weekday: 'short', day: 'numeric', month: 'short' });
		return `${date}, ${s.toLocaleTimeString('de-CH', { hour: '2-digit', minute: '2-digit' })} – ${e.toLocaleTimeString('de-CH', { hour: '2-digit', minute: '2-digit' })}`;
	}
	function getWeekLabel(start: Date): string {
		const end = new Date(start); end.setDate(end.getDate() + 6);
		const o: Intl.DateTimeFormatOptions = { day: 'numeric', month: 'short' };
		return `${start.toLocaleDateString('de-CH', o)} – ${end.toLocaleDateString('de-CH', o)}`;
	}
	function isToday(d: Date): boolean {
		const n = new Date();
		return d.getDate() === n.getDate() && d.getMonth() === n.getMonth() && d.getFullYear() === n.getFullYear();
	}

	let weekDays = $derived(getWeekDays(weekStart));
	let nextMonthDate = $derived(new Date(weekStart.getFullYear(), weekStart.getMonth() + 1, 1));
	let totalHeight = $derived(TOTAL_ROWS * ROW_H);
	let hours = $derived(Array.from({ length: HOUR_END - HOUR_START }, (_, i) => HOUR_START + i));
	let sortedSlots = $derived([...selectedSlots].sort((a, b) => new Date(a.start).getTime() - new Date(b.start).getTime()));
</script>

<!-- 3-column layout: mini-cals | week grid | slot list -->
<div class="flex gap-3">
	<!-- Left: Mini Calendars (desktop only) -->
	<div class="hidden w-40 shrink-0 xl:block">
		<MonthMiniCalendar currentDate={new Date()} selectedWeekStart={weekStart} onweekselect={(ws) => (weekStart = ws)} />
		<div class="mt-3">
			<MonthMiniCalendar currentDate={nextMonthDate} selectedWeekStart={weekStart} onweekselect={(ws) => (weekStart = ws)} />
		</div>
	</div>

	<!-- Center: Week grid -->
	<div class="min-w-0 flex-1">
		<!-- Week nav -->
		<div class="mb-2 flex items-center justify-between">
			<button type="button" onclick={() => { const d = new Date(weekStart); d.setDate(d.getDate() - 7); weekStart = d; }} class="rounded border border-border px-2 py-0.5 text-xs hover:bg-border/30">&lsaquo;</button>
			<span class="text-xs font-medium">{getWeekLabel(weekStart)}</span>
			<button type="button" onclick={() => { const d = new Date(weekStart); d.setDate(d.getDate() + 7); weekStart = d; }} class="rounded border border-border px-2 py-0.5 text-xs hover:bg-border/30">&rsaquo;</button>
		</div>

		<!-- Mobile day selector -->
		<div class="mb-2 flex gap-1 overflow-x-auto lg:hidden">
			{#each weekDays as day, i}
				<button type="button" onclick={() => (mobileDay = i)}
					class="shrink-0 rounded px-2 py-0.5 text-xs transition-colors {mobileDay === i ? 'bg-accent text-white' : 'border border-border'} {isToday(day) ? 'font-bold' : ''}">
					{formatDayHeader(day)}
				</button>
			{/each}
		</div>

		<!-- Desktop week grid -->
		<div class="hidden select-none lg:block">
			<div class="grid border-b border-border" style="grid-template-columns: 2.5rem repeat(7, 1fr);">
				<div></div>
				{#each weekDays as day}
					<div class="pb-0.5 text-center text-[10px] font-medium {isToday(day) ? 'text-accent' : 'text-text-muted'}">{formatDayHeader(day)}</div>
				{/each}
			</div>

			<div bind:this={desktopGrid} class="grid overflow-y-auto" style="grid-template-columns: 2.5rem repeat(7, 1fr); max-height: 450px;">
				<!-- Hour labels -->
				<div class="relative" style="height: {totalHeight}px;">
					{#each hours as hour}
						<div class="absolute left-0 w-full pr-1 text-right text-[10px] text-text-muted"
							style="top: {((hour - HOUR_START) * 60 / GRID) * ROW_H}px; line-height: {ROW_H}px;">
							{formatHour(hour)}
						</div>
					{/each}
				</div>

				<!-- Day columns -->
				{#each weekDays as day, dayIndex}
					<div
						class="relative border-l border-border"
						style="height: {totalHeight}px;"
						data-day-col
						onpointerdown={(e) => onColPointerDown(e, dayIndex)}
						role="button"
						tabindex="-1"
					>
						{#each Array(TOTAL_ROWS) as _, row}
							<div class="absolute left-0 w-full {row % 4 === 0 ? 'border-t border-border' : 'border-t border-border/30'}"
								style="top: {row * ROW_H}px; height: {ROW_H}px;"></div>
						{/each}

						{#each layoutSlots(slotsForDay(day)) as ls}
							{@const hiding = activeSlotKey === ls.slot.start && mode !== 'none'}
							<div
								data-slot
								class="group absolute rounded border border-green-600/40 bg-slot-free px-0.5 text-[10px] select-none {hiding ? 'opacity-30' : 'hover:shadow-md'}"
								style="
									top: {ls.top}px; height: {Math.max(ls.height - 1, ROW_H - 1)}px;
									left: {(ls.col / ls.cols) * 100}%; width: {(1 / ls.cols) * 100 - 4}%; margin-left: 2%;
									z-index: 10; cursor: grab;
								"
								onpointerdown={(e) => onSlotPointerDown(e, ls.slot, dayIndex)}
							>
								<div class="truncate font-medium leading-tight">
									{formatSlotTime(ls.slot.start, ls.slot.end)}
								</div>
								<!-- Delete button -->
								<button
									type="button"
									class="absolute -right-1 -top-1 hidden h-4 w-4 items-center justify-center rounded-full bg-primary text-[9px] font-bold leading-none text-white shadow group-hover:flex"
									onpointerdown={(e) => e.stopPropagation()}
									onclick={(e) => { e.stopPropagation(); removeSlot(ls.slot.start); }}
									aria-label="Entfernen"
								>&#x2715;</button>
								<!-- Resize handle -->
								<div class="absolute bottom-0 left-0 w-full cursor-s-resize" style="height: 5px;"
									onpointerdown={(e) => onResizePointerDown(e, ls.slot, dayIndex)}></div>
							</div>
						{/each}

						{#if mode !== 'none' && activeDayIndex === dayIndex}
							<div class="pointer-events-none absolute left-1 right-1 rounded border-2 border-dashed border-accent/60 bg-accent/10"
								style="top: {ghostTop}px; height: {ghostHeight}px; z-index: 20;"></div>
						{/if}
					</div>
				{/each}
			</div>
		</div>

		<!-- Mobile single day -->
		<div class="select-none lg:hidden">
			<div bind:this={mobileGrid} class="grid overflow-y-auto" style="grid-template-columns: 2.5rem 1fr; max-height: 400px;">
				<div class="relative" style="height: {totalHeight}px;">
					{#each hours as hour}
						<div class="absolute left-0 w-full pr-1 text-right text-[10px] text-text-muted"
							style="top: {((hour - HOUR_START) * 60 / GRID) * ROW_H}px; line-height: {ROW_H}px;">
							{formatHour(hour)}
						</div>
					{/each}
				</div>
				<div
					class="relative border-l border-border"
					style="height: {totalHeight}px;"
					data-day-col
					onpointerdown={(e) => onColPointerDown(e, mobileDay)}
					role="button"
					tabindex="-1"
				>
					{#each Array(TOTAL_ROWS) as _, row}
						<div class="absolute left-0 w-full {row % 4 === 0 ? 'border-t border-border' : 'border-t border-border/30'}"
							style="top: {row * ROW_H}px; height: {ROW_H}px;"></div>
					{/each}

					{#each layoutSlots(slotsForDay(weekDays[mobileDay])) as ls}
						<div
							data-slot
							class="group absolute rounded border border-green-600/40 bg-slot-free px-0.5 text-[10px] select-none hover:shadow-md"
							style="
								top: {ls.top}px; height: {Math.max(ls.height - 1, ROW_H - 1)}px;
								left: {(ls.col / ls.cols) * 100}%; width: {(1 / ls.cols) * 100 - 4}%; margin-left: 2%;
								z-index: 10; cursor: grab;
							"
							onpointerdown={(e) => onSlotPointerDown(e, ls.slot, mobileDay)}
						>
							<div class="truncate font-medium leading-tight">
								{formatSlotTime(ls.slot.start, ls.slot.end)}
							</div>
							<button
								type="button"
								class="absolute -right-1 -top-1 hidden h-4 w-4 items-center justify-center rounded-full bg-primary text-[9px] font-bold leading-none text-white shadow group-hover:flex"
								onpointerdown={(e) => e.stopPropagation()}
								onclick={(e) => { e.stopPropagation(); removeSlot(ls.slot.start); }}
								aria-label="Entfernen"
							>&#x2715;</button>
							<div class="absolute bottom-0 left-0 w-full cursor-s-resize" style="height: 5px;"
								onpointerdown={(e) => onResizePointerDown(e, ls.slot, mobileDay)}></div>
						</div>
					{/each}

					{#if mode !== 'none' && activeDayIndex === mobileDay}
						<div class="pointer-events-none absolute left-1 right-1 rounded border-2 border-dashed border-accent/60 bg-accent/10"
							style="top: {ghostTop}px; height: {ghostHeight}px; z-index: 20;"></div>
					{/if}
				</div>
			</div>
		</div>

		<p class="mt-1 text-[10px] text-text-muted">Klicken &amp; ziehen um Slots zu erstellen. Verschieben oder am Rand resizen.</p>
	</div>

	<!-- Right: Slot list (desktop only) -->
	<div class="hidden w-52 shrink-0 xl:block">
		<p class="mb-1 text-xs font-medium text-text-muted">{$t('poll.timeslotsCount', { n: selectedSlots.length })}</p>
		{#if sortedSlots.length > 0}
			<ul class="max-h-[480px] space-y-1 overflow-y-auto">
				{#each sortedSlots as slot}
					<li class="flex items-start justify-between rounded border border-border bg-surface px-2 py-1 text-[11px] leading-tight">
						<span>{formatSlotLabel(slot.start, slot.end)}</span>
						<button type="button" onclick={() => removeSlot(slot.start)} class="ml-1 shrink-0 text-text-muted hover:text-primary" aria-label="Entfernen">&#x2715;</button>
					</li>
				{/each}
			</ul>
		{:else}
			<p class="text-[11px] text-text-muted">Noch keine Slots gewählt.</p>
		{/if}
	</div>
</div>

<!-- Mobile slot list (below calendar on small screens) -->
<div class="mt-2 xl:hidden">
	{#if selectedSlots.length > 0}
		<p class="mb-1 text-xs text-text-muted">{$t('poll.timeslotsCount', { n: selectedSlots.length })}</p>
		<ul class="space-y-1">
			{#each sortedSlots as slot}
				<li class="flex items-center justify-between rounded border border-border bg-surface px-2 py-1 text-xs">
					<span>{formatSlotLabel(slot.start, slot.end)}</span>
					<button type="button" onclick={() => removeSlot(slot.start)} class="ml-1 text-text-muted hover:text-primary" aria-label="Entfernen">&#x2715;</button>
				</li>
			{/each}
		</ul>
	{:else}
		<p class="text-xs text-text-muted">{$t('poll.timeslotsCount', { n: 0 })}</p>
	{/if}
</div>
