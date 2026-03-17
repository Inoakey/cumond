<script lang="ts">
	import { locale, setLocale, availableLocales, type Locale } from '$lib/i18n/index.js';
</script>

<div class="flex gap-1">
	{#each availableLocales as loc}
		<button
			onclick={() => setLocale(loc.code)}
			class="rounded px-2 py-1 text-xs font-medium transition-colors {$locale === loc.code ? 'bg-accent text-white' : 'text-text-muted hover:text-text'}"
			aria-label={loc.label}
			aria-current={$locale === loc.code ? 'true' : undefined}
		>
			{loc.label}
		</button>
	{/each}
</div>
