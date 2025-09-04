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
				...current,
				{
					id: Date.now(),
					title: newIdea.title.trim(),
					description: newIdea.description.trim(),
					createdAt: new Date().toISOString(),
				},
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

	// Update idea in store
	function updateIdea(id, field, value) {
		ideas.update(current => current.map(idea => (idea.id === id ? { ...idea, [field]: value } : idea)))
		saveIdeas()
	}

	// Move idea up or down in the list
	function moveIdea(ideaId, direction) {
		ideas.update(current => {
			const currentIndex = current.findIndex(idea => idea.id === ideaId)
			if (currentIndex === -1) return current

			const newIndex = direction === "up" ? currentIndex - 1 : currentIndex + 1

			// Check bounds
			if (newIndex < 0 || newIndex >= current.length) return current

			// Swap positions
			const newArray = [...current]
			const temp = newArray[currentIndex]
			newArray[currentIndex] = newArray[newIndex]
			newArray[newIndex] = temp

			return newArray
		})
		saveIdeas()
	}

	// Handle contenteditable keydown events
	function handleContentEditableKeydown(event, ideaId, field) {
		if (event.key === "Enter") {
			event.preventDefault()
			const newValue = event.target.textContent.trim()
			updateIdea(ideaId, field, newValue)
			// Remove focus to indicate save is complete
			event.target.blur()
		} else if (event.key === "ArrowUp") {
			event.preventDefault()
			moveIdea(ideaId, "up")
		} else if (event.key === "ArrowDown") {
			event.preventDefault()
			moveIdea(ideaId, "down")
		}
	}

	// Handle contenteditable blur (when user clicks away)
	function handleContentEditableBlur(event, ideaId, field) {
		const newValue = event.target.textContent.trim()
		updateIdea(ideaId, field, newValue)
	}
</script>

<div class="page centred-col">
	<main class="panel">
		<!-- header -->
		<!-- <header>
			<h1>Key Ideas</h1>
		</header> -->

		<!-- ideas list -->
		{#if $ideas.length > 0}
			<section aria-labelledby="ideas-list-heading">
				<!-- <h2 id="ideas-list-heading">Saved Ideas ({$ideas.length})</h2> -->
				<div class="ideas-list">
					{#each $ideas as idea (idea.id)}
						<article class=" fill">
							<div class="row apart">
								<div class="col">
									<h4
										contenteditable="true"
										on:keydown={event => handleContentEditableKeydown(event, idea.id, "title")}
										on:blur={event => handleContentEditableBlur(event, idea.id, "title")}
									>
										{idea.title}
									</h4>

									{#if idea.description}
										<p
											class="faint-text"
											contenteditable="true"
											on:keydown={event =>
												handleContentEditableKeydown(event, idea.id, "description")}
											on:blur={event => handleContentEditableBlur(event, idea.id, "description")}
										>
											{idea.description}
										</p>
									{/if}
								</div>
								<button
									class="tiny-icon-button"
									on:click={() => removeIdea(idea.id)}
									aria-label="Remove idea"
									title="Remove idea"
								>
									✕
								</button>
							</div>

							<!-- <footer class="idea-meta">
								<small>
									Added {new Date(idea.createdAt).toLocaleDateString()}
								</small>
							</footer> -->
						</article>
					{/each}
				</div>
			</section>
		{:else}
			<section class="card">
				<p><em>No ideas yet. Add your first idea above!</em></p>
			</section>
		{/if}

		<!-- add idea -->

		<!-- <h2 id="add-idea-heading">Add New Idea</h2> -->
		<form on:submit={handleSubmit} class="stack">
			<!-- <label for="idea-title">Title</label> -->
			<input type="text" id="idea-title" bind:value={newIdea.title} placeholder="Enter idea title..." required />

			<!-- <label for="idea-description">Description</label> -->
			<textarea
				id="idea-description"
				bind:value={newIdea.description}
				placeholder="Describe your idea..."
				rows="3"
			></textarea>

			<button type="submit fill" class="blue button">Add Idea</button>
		</form>
	</main>
</div>

<style>
	/* Minimal additional styles for this specific component */
</style>
