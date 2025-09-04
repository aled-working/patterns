<script>
	import { onMount } from "svelte"
	import { ideasDB } from "$lib/db.js"

	let ideas = $state([])
	let isLoading = $state(true)

	// Load ideas from IndexedDB on component mount
	onMount(async () => {
		try {
			ideas = await ideasDB.getAllIdeas()
		} catch (error) {
			console.error("Failed to load ideas:", error)
		} finally {
			isLoading = false
		}
	})
</script>

<div class="page middle">
	<div class="panel">
		{#if isLoading}
			<p>Loading ideas...</p>
		{:else if ideas.length === 0}
			<p>No ideas found in inbox.</p>
		{:else}
			{#each ideas as idea}
				<div class="idea-item">
					<h4>{idea.title}</h4>
					{#if idea.description}
						<p>{idea.description}</p>
					{/if}
				</div>
			{/each}
		{/if}
	</div>
</div>

<style>
	.idea-item {
		margin-bottom: 1.5rem;
		padding: 1rem;
		border: 1px solid #e0e0e0;
		border-radius: 8px;
		background: #fafafa;
	}

	.idea-item h4 {
		margin: 0 0 0.5rem 0;
		font-size: 1.2rem;
		font-weight: 600;
		line-height: 1.3;
	}

	.idea-item p {
		margin: 0;
		font-size: 1rem;
		line-height: 1.5;
		color: #555;
	}
</style>
