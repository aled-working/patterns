<script>
	import { flip } from "svelte/animate"
	import { onMount } from "svelte"
	import { ideasDB } from "$lib/db.js"

	let ideas = $state([])
	let newTitle = $state("")
	let newDescription = $state("")
	let draggedIndex = $state(null)
	let isLoading = $state(true)
	let editingIndex = $state(null)
	let editValue = $state("")
	let editableRefs = $state({})

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

	// Save ideas to IndexedDB whenever ideas array changes
	$effect(() => {
		if (!isLoading && ideas.length >= 0) {
			ideasDB.saveIdeas(ideas).catch(error => {
				console.error("Failed to save ideas:", error)
			})
		}
	})

	// Focus the editable element when editing starts
	$effect(() => {
		if (editingIndex !== null) {
			// Use setTimeout to ensure the DOM is updated
			setTimeout(() => {
				const editableElement = editableRefs[editingIndex]
				if (editableElement) {
					editableElement.focus()
					// Place cursor at the end
					const range = document.createRange()
					const selection = window.getSelection()
					range.selectNodeContents(editableElement)
					range.collapse(false)
					selection.removeAllRanges()
					selection.addRange(range)
				}
			}, 10)
		}
	})

	function addIdea() {
		if (newTitle.trim()) {
			ideas = [
				...ideas,
				{
					title: newTitle.trim(),
					description: newDescription.trim(),
				},
			]
			newTitle = ""
			newDescription = ""
		}
	}

	function deleteIdea(index) {
		ideas = ideas.filter((_, i) => i !== index)
	}

	function handleKeydown(event) {
		if (event.key === "Enter" && !event.shiftKey) {
			addIdea()
		}
	}

	function handleDragStart(event, index) {
		draggedIndex = index
		event.dataTransfer.effectAllowed = "move"
		event.dataTransfer.setData("text/plain", index.toString())

		// Find the idea-item element (might be a child of the event target)
		let targetElement = event.target
		while (targetElement && !targetElement.classList.contains("idea-item")) {
			targetElement = targetElement.parentElement
		}

		if (targetElement) {
			targetElement.classList.add("dragging")
		}
	}

	function handleDragEnd(event) {
		// Find the idea-item element
		let targetElement = event.target
		while (targetElement && !targetElement.classList.contains("idea-item")) {
			targetElement = targetElement.parentElement
		}

		if (targetElement) {
			targetElement.classList.remove("dragging")
		}

		draggedIndex = null
	}

	function handleDragOver(event) {
		event.preventDefault()
		event.dataTransfer.dropEffect = "move"

		// Add visual feedback for drop zones
		let targetElement = event.currentTarget
		while (targetElement && !targetElement.classList.contains("idea-item")) {
			targetElement = targetElement.parentElement
		}

		if (targetElement && targetElement.classList.contains("idea-item")) {
			targetElement.style.backgroundColor = "rgba(0, 122, 204, 0.1)"
		}
	}

	function handleDragLeave(event) {
		let targetElement = event.currentTarget
		while (targetElement && !targetElement.classList.contains("idea-item")) {
			targetElement = targetElement.parentElement
		}

		if (targetElement && targetElement.classList.contains("idea-item")) {
			targetElement.style.backgroundColor = ""
		}
	}

	function handleDrop(event, dropIndex) {
		event.preventDefault()

		// Clear visual feedback
		let targetElement = event.currentTarget
		while (targetElement && !targetElement.classList.contains("idea-item")) {
			targetElement = targetElement.parentElement
		}

		if (targetElement && targetElement.classList.contains("idea-item")) {
			targetElement.style.backgroundColor = ""
		}

		const dragIndex = draggedIndex

		if (dragIndex !== null && dragIndex !== dropIndex) {
			const newIdeas = [...ideas]
			const [draggedItem] = newIdeas.splice(dragIndex, 1)
			newIdeas.splice(dropIndex, 0, draggedItem)
			ideas = newIdeas
		}
	}

	function handleContainerDragOver(event) {
		event.preventDefault()
		event.dataTransfer.dropEffect = "move"
	}

	function handleContainerDrop(event) {
		event.preventDefault()
		// If dropping on the container itself (empty space), don't do anything
	}

	function startEditing(index) {
		editingIndex = index
		editValue = { ...ideas[index] }
	}

	function saveEdit() {
		if (editingIndex !== null && editValue.title.trim()) {
			ideas[editingIndex] = {
				title: editValue.title.trim(),
				description: editValue.description.trim(),
			}
			ideas = [...ideas] // Trigger reactivity
		}
		editingIndex = null
		editValue = { title: "", description: "" }
	}

	function cancelEdit() {
		editingIndex = null
		editValue = { title: "", description: "" }
	}

	function handleEditKeydown(event, index) {
		if (event.key === "Enter" && !event.shiftKey) {
			event.preventDefault()
			saveEdit()
		} else if (event.key === "Escape") {
			event.preventDefault()
			cancelEdit()
		}
	}

	function handleEditBlur() {
		// Save on blur, but only if we're still editing this item
		if (editingIndex !== null && editValue.title.trim()) {
			ideas[editingIndex] = {
				title: editValue.title.trim(),
				description: editValue.description.trim(),
			}
			ideas = [...ideas] // Trigger reactivity
			editingIndex = null
			editValue = { title: "", description: "" }
		}
	}
</script>

<div class="page col">
	<main>
		<div class="ideas-list col gap" ondragover={handleContainerDragOver} ondrop={handleContainerDrop}>
			{#if isLoading}
				<div class="loading">Loading ideas...</div>
			{:else if ideas.length === 0}
				<div class="empty-state">No ideas yet. Add your first core idea above!</div>
			{:else}
				{#each ideas as idea, index (idea)}
					<div
						class="idea-item card"
						animate:flip={{ duration: 300 }}
						draggable={editingIndex !== index}
						ondragstart={e => handleDragStart(e, index)}
						ondragend={handleDragEnd}
						ondragover={handleDragOver}
						ondragleave={handleDragLeave}
						ondrop={e => handleDrop(e, index)}
					>
						<div class="row">
							<span class="drag-handle">⋮⋮</span>
							{#if editingIndex === index}
								<div class="idea-content editing">
									<input
										type="text"
										class="edit-title"
										placeholder="Title"
										bind:value={editValue.title}
										onkeydown={e => handleEditKeydown(e, index)}
									/>
									<textarea
										class="edit-description"
										placeholder="Description"
										bind:value={editValue.description}
										onkeydown={e => handleEditKeydown(e, index)}
									></textarea>
								</div>
							{:else}
								<div class="idea-content" onclick={() => startEditing(index)}>
									<h4 class="idea-title">{idea.title}</h4>
									{#if idea.description}
										<p class="idea-description">{idea.description}</p>
									{/if}
								</div>
							{/if}
							<button
								class="delete-button"
								onclick={() => deleteIdea(index)}
								ondragstart={e => e.preventDefault()}>×</button
							>
						</div>
					</div>
				{/each}
			{/if}
		</div>
	</main>

	<footer>
		<div class="input-section col">
			<input
				type="text"
				bind:value={newTitle}
				placeholder="Enter idea title..."
				onkeydown={handleKeydown}
				class="idea-input title-input"
			/>
			<textarea
				bind:value={newDescription}
				placeholder="Enter idea description..."
				onkeydown={handleKeydown}
				class="idea-input description-input"
				rows="3"
			></textarea>
			<button onclick={addIdea} class="add-button green">Add Idea</button>
		</div>
	</footer>
</div>

<style>
	.idea-input {
		border: 2px solid #ddd;
		transition: border-color 0.2s;
		field-sizing: content;
		border-radius: 4px;
		padding: 0.5rem;
		font-size: 1rem;
	}

	.title-input {
		flex: 1;
		margin-bottom: 0.5rem;
	}

	.description-input {
		flex: 1;
		resize: vertical;
		min-height: 60px;
		margin-bottom: 0.5rem;
		font-family: inherit;
	}

	.idea-input:focus {
		outline: none;
		border-color: var(--Blue);
	}

	.ideas-list {
		display: flex;
		flex-direction: column;
		gap: 0.5rem;
	}

	.idea-item {
		transition: all 0.2s ease;
	}

	.idea-item:hover {
		box-shadow: 0 4px 8px rgba(0, 0, 0, 0.15);
	}

	.idea-item:active {
		cursor: grabbing;
	}

	.idea-item[draggable="true"]:hover .drag-handle {
		color: var(--Blue);
	}

	.idea-item.dragging {
		opacity: 0.5;
		transform: rotate(2deg);
	}

	.drag-handle {
		margin-right: 0.75rem;
		color: #999;
		cursor: grab;
		font-size: 1.2rem;
		user-select: none;
		transition: color 0.2s ease;
		padding: 0.25rem;
		border-radius: 4px;
	}

	.drag-handle:hover {
		color: var(--Blue);
		background: rgba(0, 122, 204, 0.1);
	}

	.drag-handle:active {
		cursor: grabbing;
	}

	.idea-item.dragging .drag-handle {
		color: var(--Blue);
	}

	.idea-content {
		flex: 1;
		cursor: pointer;
		padding: 0.25rem;
		border-radius: 4px;
		transition: background-color 0.2s ease;
	}

	.idea-title {
		margin: 0 0 0.25rem 0;
		font-size: 1.1rem;
		font-weight: 600;
		line-height: 1.3;
	}

	.idea-description {
		margin: 0;
		font-size: 0.95rem;
		line-height: 1.4;
		color: #555;
	}

	.idea-content.editing {
		cursor: auto;
		background: rgba(0, 122, 204, 0.05);
		border: 1px solid var(--Blue);
		padding: 0.75rem;
	}

	.edit-title {
		width: 100%;
		border: 1px solid #ccc;
		border-radius: 4px;
		padding: 0.5rem;
		margin-bottom: 0.5rem;
		font-size: 1rem;
		font-weight: 600;
	}

	.edit-description {
		width: 100%;
		border: 1px solid #ccc;
		border-radius: 4px;
		padding: 0.5rem;
		font-size: 0.95rem;
		font-family: inherit;
		resize: vertical;
		min-height: 80px;
	}

	.idea-content:hover {
		background: rgba(0, 122, 204, 0.05);
	}

	.delete-button {
		cursor: pointer;
		transition: all 0.2s ease;
		pointer-events: auto;
	}

	.delete-button:hover {
		background: #ff3742;
	}

	/* Prevent delete button from interfering with drag */
	.idea-item.dragging .delete-button {
		pointer-events: none;
	}

	.loading {
		text-align: center;
		padding: 2rem;
		color: #666;
		font-style: italic;
	}

	.empty-state {
		text-align: center;
		padding: 2rem;
		color: #999;
		font-style: italic;
		background: #f9f9f9;
		border: 2px dashed #ddd;
		border-radius: 8px;
	}
</style>
