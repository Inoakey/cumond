<script lang="ts">
	import '../app.css';
	import { onMount } from 'svelte';
	import { initLocale, t } from '$lib/i18n/index.js';
	import LanguageSwitcher from '$lib/components/LanguageSwitcher.svelte';

	let { children } = $props();

	onMount(() => {
		initLocale();
	});
</script>

<div class="flex min-h-screen flex-col">
	<header class="flex items-center justify-between px-4 py-3">
		<a href="/" class="flex items-center gap-2">
			<img src="/cumond-logo-icon-transparent.png" alt="Cumond" class="h-8 w-8" />
		</a>
		<LanguageSwitcher />
	</header>
	<div class="flex-1">
		{@render children()}
	</div>
	<footer class="px-4 py-4 text-center text-xs text-text-muted">
		<a href="/privacy" class="underline-offset-2 hover:underline">{$t('privacy.link')}</a>
	</footer>
</div>
