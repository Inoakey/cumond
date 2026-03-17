<script lang="ts">
	import PollForm from '$lib/components/PollForm.svelte';
	import { t } from '$lib/i18n/index.js';
</script>

<svelte:head>
	<title>{$t('app.name')} – {$t('app.tagline')}</title>
</svelte:head>

<main class="mx-auto max-w-6xl px-4 py-6">
	<header class="mb-6">
		<img src="/cumond-logo-wordmark.png" alt="Cumond" class="h-10" />
		<p class="mt-1 text-sm text-text-muted">{$t('app.tagline')}</p>
	</header>

	<PollForm />
</main>
