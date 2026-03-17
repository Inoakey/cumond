<script lang="ts">
	import { t } from '$lib/i18n/index.js';

	interface Props {
		value: number;
		onchange: (days: number) => void;
	}

	let { value = 90, onchange }: Props = $props();
</script>

<fieldset class="space-y-1.5">
	<legend class="mb-1 text-xs font-medium">{$t('expiry.label')}</legend>
	<label
		class="flex cursor-pointer items-center gap-2 rounded-md border px-3 py-1.5 text-sm transition-colors {value === 90 ? 'border-accent bg-accent/5 text-accent' : 'border-border'}"
	>
		<input type="radio" name="expiry" value={90} checked={value === 90} onchange={() => onchange(90)} class="sr-only" />
		{$t('expiry.days90')}
	</label>
	<label
		class="flex cursor-pointer items-center gap-2 rounded-md border px-3 py-1.5 text-sm transition-colors {value === 365 ? 'border-accent bg-accent/5 text-accent' : 'border-border'}"
	>
		<input type="radio" name="expiry" value={365} checked={value === 365} onchange={() => onchange(365)} class="sr-only" />
		{$t('expiry.days365')}
	</label>
</fieldset>
