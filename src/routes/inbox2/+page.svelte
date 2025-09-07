<script>
	import { onMount, tick } from 'svelte';
	import { writable } from 'svelte/store';

	// Constants for better maintainability
	const ELEMENT_TYPES = {
		TITLE: 'H4',
		DESCRIPTION: 'P',
	};

	const FIELDS = {
		TITLE: 'title',
		DESCRIPTION: 'description',
	};

	// Store for ideas list
	let ideas = writable([]);

	// Form data
	let newIdea = {
		title: '',
		description: '',
	};

	// Focus management utility
	let focusState = { element: null, field: null };

	function saveFocus(element) {
		const tagName = element?.tagName;
		focusState = {
			element,
			field:
				tagName === ELEMENT_TYPES.TITLE
					? FIELDS.TITLE
					: tagName === ELEMENT_TYPES.DESCRIPTION
						? FIELDS.DESCRIPTION
						: null,
		};
	}

	async function restoreFocus(position) {
		if (!focusState.element || !focusState.field) return;

		await tick();

		const articles = document.querySelectorAll('article');
		const targetArticle = articles[position];
		if (!targetArticle) return;

		const selector = focusState.field === FIELDS.TITLE ? 'h4' : 'p';
		const targetElement = targetArticle.querySelector(selector);

		if (targetElement) {
			targetElement.focus();
			// Position cursor at end
			const range = document.createRange();
			const selection = window.getSelection();
			range.selectNodeContents(targetElement);
			range.collapse(false);
			selection.removeAllRanges();
			selection.addRange(range);
		}

		focusState = { element: null, field: null };
	}

	// API utilities
	async function loadIdeas() {
		try {
			const response = await fetch('/api/ideas');
			if (response.ok) {
				const data = await response.json();
				ideas.set(data);
			}
		} catch (error) {
			console.log('No existing ideas file found, starting fresh');
		}
	}

	async function saveIdeas() {
		const currentIdeas = $ideas;
		try {
			const response = await fetch('/api/ideas', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify(currentIdeas, null, 2),
			});

			if (!response.ok) throw new Error('Failed to save ideas');
		} catch (error) {
			console.error('Error saving ideas:', error);
			localStorage.setItem('ideas-list', JSON.stringify(currentIdeas));
		}
	}

	// CRUD operations
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
			]);

			// Clear form
			newIdea.title = '';
			newIdea.description = '';

			saveIdeas();
		}
	}

	function removeIdea(id) {
		ideas.update(current => current.filter(idea => idea.id !== id));
		saveIdeas();
	}

	function updateIdea(id, field, value) {
		ideas.update(current => current.map(idea => (idea.id === id ? { ...idea, [field]: value } : idea)));
		saveIdeas();
	}

	// Reordering with focus preservation
	async function moveIdea(ideaId, direction) {
		saveFocus(document.activeElement);

		let newPosition = -1;

		ideas.update(current => {
			const currentIndex = current.findIndex(idea => idea.id === ideaId);
			if (currentIndex === -1) return current;

			newPosition = direction === 'up' ? currentIndex - 1 : currentIndex + 1;

			// Check bounds
			if (newPosition < 0 || newPosition >= current.length) {
				focusState = { element: null, field: null };
				return current;
			}

			// Swap positions
			const newArray = [...current];
			const temp = newArray[currentIndex];
			[newArray[currentIndex], newArray[newPosition]] = [newArray[newPosition], newArray[currentIndex]];

			return newArray;
		});

		if (newPosition !== -1) {
			saveIdeas();
			await restoreFocus(newPosition);
		}
	}

	// Unified contenteditable handler
	function handleEditableKeydown(event, ideaId, field) {
		const { key, target } = event;

		switch (key) {
			case 'Enter':
				event.preventDefault();
				updateIdea(ideaId, field, target.textContent.trim());
				target.blur();
				break;
			case 'Tab':
				event.preventDefault();
				// Save current edit first
				updateIdea(ideaId, field, target.textContent.trim());

				if (field === 'title') {
					// Move to description of the same idea
					const article = target.closest('article');
					const description = article.querySelector('.idea-description');
					if (description) {
						description.focus();
						// Position cursor at end
						const range = document.createRange();
						const selection = window.getSelection();
						range.selectNodeContents(description);
						range.collapse(false);
						selection.removeAllRanges();
						selection.addRange(range);
					}
				} else if (field === 'description') {
					// Jump to new idea form
					const titleInput = document.getElementById('idea-title');
					if (titleInput) {
						titleInput.focus();
					}
				}
				break;
			case 'ArrowUp':
				event.preventDefault();
				moveIdea(ideaId, 'up');
				break;
			case 'ArrowDown':
				event.preventDefault();
				moveIdea(ideaId, 'down');
				break;
		}
	}

	function handleEditableBlur(event, ideaId, field) {
		updateIdea(ideaId, field, event.target.textContent.trim());
	}

	// Event handlers
	function handleSubmit(event) {
		event.preventDefault();
		addIdea();
	}

	// Global keyboard navigation
	function handleGlobalKeydown(event) {
		// If TAB is pressed and no element has focus (or focus is on body/document)
		if (
			event.key === 'Tab' &&
			(document.activeElement === document.body || document.activeElement === document.documentElement)
		) {
			event.preventDefault();
			const titleInput = document.getElementById('idea-title');
			if (titleInput) {
				titleInput.focus();
			}
		}
	}

	// Initialize
	onMount(() => {
		loadIdeas();
		// Add global keyboard listener
		document.addEventListener('keydown', handleGlobalKeydown);
	});

	// Cleanup
	import { onDestroy } from 'svelte';
	onDestroy(() => {
		document.removeEventListener('keydown', handleGlobalKeydown);
	});
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
										class="idea-title"
										contenteditable="true"
										on:keydown={event => handleEditableKeydown(event, idea.id, 'title')}
										on:blur={event => handleEditableBlur(event, idea.id, 'title')}
									>
										{idea.title}
									</h4>

									{#if idea.description}
										<p
											class="faint-text idea-description"
											contenteditable="true"
											on:keydown={event => handleEditableKeydown(event, idea.id, 'description')}
											on:blur={event => handleEditableBlur(event, idea.id, 'description')}
										>
											{idea.description}
										</p>
									{/if}
								</div>
								<button
									class="white tiny-icon-button remove-idea hide-until-hover"
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
		<form on:submit={handleSubmit} class="stack new-idea">
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
	.panel {
		padding-right: 1rem;
	}
	/* Minimal additional styles for this specific component */
	.hide-until-hover {
		opacity: 0;
		transition: opacity 0.2s;
	}
	article:hover .remove-idea {
		opacity: 1;
	}
</style>
