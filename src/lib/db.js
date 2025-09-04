// IndexedDB utility for storing book core ideas

class IdeasDB {
	constructor() {
		this.dbName = "BookIdeasDB"
		this.version = 1
		this.storeName = "ideas"
		this.db = null
	}

	async init() {
		return new Promise((resolve, reject) => {
			const request = indexedDB.open(this.dbName, this.version)

			request.onerror = () => reject(request.error)
			request.onsuccess = () => {
				this.db = request.result
				resolve(this.db)
			}

			request.onupgradeneeded = event => {
				const db = event.target.result
				if (!db.objectStoreNames.contains(this.storeName)) {
					db.createObjectStore(this.storeName, { keyPath: "id", autoIncrement: true })
				}
			}
		})
	}

	async getAllIdeas() {
		if (!this.db) await this.init()

		return new Promise((resolve, reject) => {
			const transaction = this.db.transaction([this.storeName], "readonly")
			const store = transaction.objectStore(this.storeName)
			const request = store.getAll()

			request.onsuccess = () => {
				// Sort by id in descending order (newest first)
				const ideas = request.result
					.sort((a, b) => b.id - a.id)
					.map(item => ({
						title: item.title || item.text || "",
						description: item.description || "",
					}))
				resolve(ideas)
			}

			request.onerror = () => reject(request.error)
		})
	}

	async saveIdeas(ideas) {
		if (!this.db) await this.init()

		return new Promise((resolve, reject) => {
			const transaction = this.db.transaction([this.storeName], "readwrite")
			const store = transaction.objectStore(this.storeName)

			// Clear existing data
			const clearRequest = store.clear()

			clearRequest.onsuccess = () => {
				// Add all ideas with timestamps
				let completed = 0
				const total = ideas.length

				if (total === 0) {
					resolve()
					return
				}

				ideas.forEach((idea, index) => {
					const request = store.add({
						title: typeof idea === "string" ? idea : idea.title,
						description: typeof idea === "string" ? "" : idea.description,
						timestamp: Date.now(),
						id: total - index, // Reverse order so newest has highest ID
					})

					request.onsuccess = () => {
						completed++
						if (completed === total) {
							resolve()
						}
					}

					request.onerror = () => reject(request.error)
				})
			}

			clearRequest.onerror = () => reject(clearRequest.error)
		})
	}
}

export const ideasDB = new IdeasDB()
