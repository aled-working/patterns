<script>
	import { onMount } from "svelte"
	import { writable } from "svelte/store"

	// Store for ideas list
	let ideas = writable([])

	// Form data
	let newIdea = {
		title: "",
		description: "",
	}

	// Load ideas from API on mount
	onMount(async () => {
		try {
			const response = await fetch("/api/ideas")
			if (response.ok) {
				const data = await response.json()
				ideas.set(data)
			}
		} catch (error) {
			console.log("No existing ideas file found, starting fresh")
		}
	})

	// Save ideas to JSON file via API
	async function saveIdeas() {
		const currentIdeas = $ideas
		try {
			const response = await fetch("/api/ideas", {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
				},
				body: JSON.stringify(currentIdeas, null, 2),
			})

			if (!response.ok) {
				throw new Error("Failed to save ideas")
			}
		} catch (error) {
			console.error("Error saving ideas:", error)
			// Fallback: use localStorage
			localStorage.setItem("ideas-list", JSON.stringify(currentIdeas))
		}
	}

	// Add new idea
	function addIdea() {
		if (newIdea.title.trim()) {
			ideas.update(current => [
				{
					id: Date.now(),
					title: newIdea.title.trim(),
					description: newIdea.description.trim(),
					createdAt: new Date().toISOString(),
				},
				...current,
			])

			// Clear form
			newIdea.title = ""
			newIdea.description = ""

			// Save to file
			saveIdeas()
		}
	}

	// Remove idea
	function removeIdea(id) {
		ideas.update(current => current.filter(idea => idea.id !== id))
		saveIdeas()
	}

	// Handle form submission
	function handleSubmit(event) {
		event.preventDefault()
		addIdea()
	}
</script>

<div class="page centred-col">
	<main class="panel">
		<header>
			<h1>Ideas Inbox</h1>
			<p>Add and manage your article ideas</p>
		</header>

		<section class="card" aria-labelledby="add-idea-heading">
			<h2 id="add-idea-heading">Add New Idea</h2>
			<form on:submit={handleSubmit} class="stack">
				<div>
					<label for="idea-title">Title</label>
					<input
						type="text"
						id="idea-title"
						bind:value={newIdea.title}
						placeholder="Enter idea title..."
						required
					/>
				</div>

				<div>
					<label for="idea-description">Description</label>
					<textarea
						id="idea-description"
						bind:value={newIdea.description}
						placeholder="Describe your idea..."
						rows="3"
					></textarea>
				</div>

				<button type="submit" class="btn">Add Idea</button>
			</form>
		</section>

		{#if $ideas.length > 0}
			<section aria-labelledby="ideas-list-heading">
				<h2 id="ideas-list-heading">Saved Ideas ({$ideas.length})</h2>
				<div class="ideas-list">
					{#each $ideas as idea (idea.id)}
						<article class="card idea-item">
							<header>
								<h3>{idea.title}</h3>
								<button
									class="tiny-icon-button"
									on:click={() => removeIdea(idea.id)}
									aria-label="Remove idea"
									title="Remove idea"
								>
									✕
								</button>
							</header>

							{#if idea.description}
								<p>{idea.description}</p>
							{/if}

							<footer class="idea-meta">
								<small>
									Added {new Date(idea.createdAt).toLocaleDateString()}
								</small>
							</footer>
						</article>
					{/each}
				</div>
			</section>
		{:else}
			<section class="card">
				<p><em>No ideas yet. Add your first idea above!</em></p>
			</section>
		{/if}
	</main>
</div>

<style>
	/* Minimal additional styles for this specific component */
	.ideas-list {
		display: flex;
		flex-direction: column;
		gap: 1rem;
	}

	.idea-item {
		position: relative;
	}

	.idea-item header {
		display: flex;
		justify-content: space-between;
		align-items: flex-start;
		margin-bottom: 0.5rem;
	}

	.idea-item h3 {
		margin: 0;
		flex: 1;
		margin-right: 1rem;
	}

	.idea-meta {
		margin-top: 1rem;
		opacity: 0.7;
	}

	label {
		display: block;
		margin-bottom: 0.5rem;
		font-weight: bold;
	}
</style>
