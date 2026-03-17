<script lang="ts">
	import { t } from '$lib/i18n/index.js';
</script>

<svelte:head>
	<title>{$t('privacy.title')} – Cumond</title>
</svelte:head>

<main class="mx-auto max-w-6xl px-4 py-8">
	<a href="/" class="mb-6 inline-block"><img src="/cumond-logo-wordmark.png" alt="Cumond" class="h-8" /></a>

	<h1 class="mb-6 text-2xl font-bold">{$t('privacy.title')}</h1>
	<p class="mb-8 text-sm text-text-muted">{$t('privacy.intro')}</p>

	<div class="space-y-6 text-sm leading-relaxed">
		<section>
			<h2 class="mb-1 font-semibold">{$t('privacy.responsibleTitle')}</h2>
			<p class="text-text-muted">{$t('privacy.responsibleText')}</p>
			<p class="mt-1 text-text-muted">
				Sandro Ineichen<br />
				Dorfstrasse 8a<br />
				9507 Stettfurt TG<br />
				cumond@pm.me
			</p>
		</section>

		<section>
			<h2 class="mb-1 font-semibold">{$t('privacy.principleTitle')}</h2>
			<p>{$t('privacy.principleText')}</p>
		</section>

		<section>
			<h2 class="mb-1 font-semibold">{$t('privacy.dataTitle')}</h2>
			<ul class="ml-4 list-disc space-y-2">
				<li>{$t('privacy.dataEncrypted')}</li>
				<li>{$t('privacy.dataHashes')}</li>
				<li>{$t('privacy.dataServer')}</li>
			</ul>
			<p class="mt-2 font-medium">{$t('privacy.dataNone')}</p>
		</section>

		<section>
			<h2 class="mb-1 font-semibold">{$t('privacy.hostingTitle')}</h2>
			<p>{$t('privacy.hostingText')}</p>
		</section>

		<section>
			<h2 class="mb-1 font-semibold">{$t('privacy.retentionTitle')}</h2>
			<p>{$t('privacy.retentionText')}</p>
		</section>

		<section>
			<h2 class="mb-1 font-semibold">{$t('privacy.rightsTitle')}</h2>
			<p>{$t('privacy.rightsText')}</p>
		</section>

		<section>
			<h2 class="mb-1 font-semibold">{$t('privacy.opensourceTitle')}</h2>
			<p>{$t('privacy.opensourceText')}</p>
			<p class="mt-1">
				<a href="https://github.com/Inoakey/cumond" target="_blank" rel="noopener noreferrer" class="text-accent underline hover:no-underline">github.com/Inoakey/cumond</a>
			</p>
		</section>

		<section>
			<h2 class="mb-1 font-semibold">{$t('privacy.contactTitle')}</h2>
			<p class="text-text-muted">{$t('privacy.contactText')}</p>
			<p class="mt-1 text-text-muted">cumond@pm.me</p>
		</section>

		<p class="pt-4 text-xs text-text-muted">{$t('privacy.updatedAt')}</p>
	</div>
</main>
