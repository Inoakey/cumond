<script lang="ts">
	interface Props {
		currentDate: Date;
		selectedWeekStart: Date;
		onweekselect: (weekStart: Date) => void;
	}

	let { currentDate, selectedWeekStart, onweekselect }: Props = $props();

	let viewMonth = $state(currentDate.getMonth());
	let viewYear = $state(currentDate.getFullYear());

	const dayLabels = ['Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa', 'So'];

	function getMonthName(month: number, year: number): string {
		return new Date(year, month).toLocaleDateString('de-CH', { month: 'long', year: 'numeric' });
	}

	function getWeeksOfMonth(year: number, month: number): (Date | null)[][] {
		const weeks: (Date | null)[][] = [];
		const firstDay = new Date(year, month, 1);
		// Monday = 0, Sunday = 6
		let dayOfWeek = (firstDay.getDay() + 6) % 7;
		const daysInMonth = new Date(year, month + 1, 0).getDate();

		let week: (Date | null)[] = new Array(dayOfWeek).fill(null);

		for (let d = 1; d <= daysInMonth; d++) {
			week.push(new Date(year, month, d));
			if (week.length === 7) {
				weeks.push(week);
				week = [];
			}
		}
		if (week.length > 0) {
			while (week.length < 7) week.push(null);
			weeks.push(week);
		}
		return weeks;
	}

	function getWeekStart(date: Date): Date {
		const d = new Date(date);
		const day = (d.getDay() + 6) % 7; // Monday=0
		d.setDate(d.getDate() - day);
		d.setHours(0, 0, 0, 0);
		return d;
	}

	function isSameWeek(a: Date, b: Date): boolean {
		const wa = getWeekStart(a);
		const wb = getWeekStart(b);
		return wa.getTime() === wb.getTime();
	}

	function isToday(date: Date): boolean {
		const now = new Date();
		return date.getDate() === now.getDate() &&
			date.getMonth() === now.getMonth() &&
			date.getFullYear() === now.getFullYear();
	}

	function prevMonth() {
		if (viewMonth === 0) { viewMonth = 11; viewYear--; }
		else viewMonth--;
	}

	function nextMonth() {
		if (viewMonth === 11) { viewMonth = 0; viewYear++; }
		else viewMonth++;
	}

	let weeks = $derived(getWeeksOfMonth(viewYear, viewMonth));
</script>

<div class="select-none text-sm">
	<div class="mb-2 flex items-center justify-between">
		<button type="button" onclick={prevMonth} class="rounded p-1 hover:bg-border/50" aria-label="Vorheriger Monat">&lsaquo;</button>
		<span class="text-xs font-medium">{getMonthName(viewMonth, viewYear)}</span>
		<button type="button" onclick={nextMonth} class="rounded p-1 hover:bg-border/50" aria-label="Nächster Monat">&rsaquo;</button>
	</div>

	<div class="grid grid-cols-7 gap-0 text-center text-xs text-text-muted">
		{#each dayLabels as label}
			<div class="py-1">{label}</div>
		{/each}
	</div>

	{#each weeks as week}
		<div
			class="grid cursor-pointer grid-cols-7 gap-0 text-center text-xs transition-colors hover:bg-accent/5 {week.some(d => d && isSameWeek(d, selectedWeekStart)) ? 'bg-accent/10 rounded' : ''}"
			onclick={() => {
				const firstDay = week.find(d => d !== null);
				if (firstDay) onweekselect(getWeekStart(firstDay));
			}}
			role="button"
			tabindex="0"
			onkeydown={(e) => { if (e.key === 'Enter' || e.key === ' ') { const firstDay = week.find(d => d !== null); if (firstDay) onweekselect(getWeekStart(firstDay)); }}}
		>
			{#each week as day}
				<div class="py-1 {day && isToday(day) ? 'font-bold text-accent' : ''} {day ? '' : 'text-transparent'}">
					{day ? day.getDate() : '.'}
				</div>
			{/each}
		</div>
	{/each}
</div>
