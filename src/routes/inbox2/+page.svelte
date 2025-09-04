<script>
	import { onMount, tick } from "svelte"
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

	// Track focus state for preserving focus after reordering
	let focusedElement = null
	let focusedField = null

	// Move idea up or down in the list
	async function moveIdea(ideaId, direction) {
		// Store current focus information
		const activeElement = document.activeElement
		const isTitle = activeElement.tagName === "H4"
		const isDescription = activeElement.tagName === "P"

		if (isTitle || isDescription) {
			focusedElement = activeElement
			focusedField = isTitle ? "title" : "description"
		}

		let newPosition = -1

		ideas.update(current => {
			const currentIndex = current.findIndex(idea => idea.id === ideaId)
			if (currentIndex === -1) return current

			newPosition = direction === "up" ? currentIndex - 1 : currentIndex + 1

			// Check bounds
			if (newPosition < 0 || newPosition >= current.length) {
				focusedElement = null
				focusedField = null
				return current
			}

			// Swap positions
			const newArray = [...current]
			const temp = newArray[currentIndex]
			newArray[currentIndex] = newArray[newPosition]
			newArray[newPosition] = temp

			return newArray
		})

		// If we actually moved the item, save and restore focus
		if (newPosition !== -1) {
			saveIdeas()

			// Wait for DOM to update, then restore focus
			await tick()

			if (focusedElement && focusedField) {
				// Find the element at the new position
				const articles = document.querySelectorAll("article")
				if (articles[newPosition]) {
					const targetElement =
						focusedField === "title"
							? articles[newPosition].querySelector("h4")
							: articles[newPosition].querySelector("p")

					if (targetElement) {
						targetElement.focus()
						// Restore cursor position if possible
						const range = document.createRange()
						const selection = window.getSelection()
						range.selectNodeContents(targetElement)
						range.collapse(false) // Move cursor to end
						selection.removeAllRanges()
						selection.addRange(range)
					}
				}
			}

			// Reset focus tracking
			focusedElement = null
			focusedField = null
		}
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
