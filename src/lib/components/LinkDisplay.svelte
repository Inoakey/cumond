<script lang="ts">
	import { t } from '$lib/i18n/index.js';

	interface Props {
		label: string;
		link: string;
		description: string;
	}

	let { label, link, description }: Props = $props();
	let copied = $state(false);

	async function copyToClipboard() {
		try {
			await navigator.clipboard.writeText(link);
			copied = true;
			setTimeout(() => (copied = false), 2000);
		} catch {
			const input = document.createElement('input');
			input.value = link;
			document.body.appendChild(input);
			input.select();
			document.execCommand('copy');
			document.body.removeChild(input);
			copied = true;
			setTimeout(() => (copied = false), 2000);
		}
	}
</script>

<div class="rounded-lg border border-border bg-surface p-4">
	<div class="mb-1 text-sm font-medium">{label}</div>
	<p class="mb-3 text-xs text-text-muted">{description}</p>
	<div class="flex gap-2">
		<input
			type="text"
			readonly
			value={link}
			class="min-w-0 flex-1 rounded-md border border-border bg-bg px-3 py-2 font-mono text-xs"
		/>
		<button
			onclick={copyToClipboard}
			class="shrink-0 rounded-md px-4 py-2 text-sm font-medium transition-colors {copied
				? 'bg-success text-white'
				: 'bg-accent text-white hover:bg-accent/90'}"
		>
			{copied ? $t('link.copied') : $t('link.copy')}
		</button>
	</div>
</div>
