/**
 * Node 25 defines its own `localStorage` global. It shadows the one jsdom
 * installs on the window, and unless node is started with a valid
 * `--localstorage-file` it is an object carrying none of the Storage methods --
 * so any test touching storage dies on `localStorage.clear is not a function`
 * rather than on anything to do with the code under test.
 *
 * Installing a working in-memory Storage puts the jsdom environment back to
 * behaving like a browser. It is per-test-file, matching how a page starts.
 */
class MemoryStorage implements Storage {
  #entries = new Map<string, string>();

  get length(): number {
    return this.#entries.size;
  }

  clear(): void {
    this.#entries.clear();
  }

  getItem(key: string): string | null {
    return this.#entries.get(String(key)) ?? null;
  }

  key(index: number): string | null {
    return [...this.#entries.keys()][index] ?? null;
  }

  removeItem(key: string): void {
    this.#entries.delete(String(key));
  }

  setItem(key: string, value: string): void {
    this.#entries.set(String(key), String(value));
  }
}

for (const target of [globalThis, globalThis.window].filter(Boolean)) {
  Object.defineProperty(target, 'localStorage', {
    value: new MemoryStorage(),
    configurable: true,
    writable: true,
  });
}

/**
 * Astro's generated image modules announce themselves through a global that
 * the build sets up: reading `.src` on an imported image runs
 * `globalThis.astroAsset.referencedImages.add(...)`. The container used for
 * render tests creates `astroAsset` without that Set, so the call throws.
 * Seeding it lets pages that link to an image render under test.
 */
const withAssets = globalThis as typeof globalThis & {
  astroAsset?: { referencedImages?: Set<string> };
};
withAssets.astroAsset ??= {};
withAssets.astroAsset.referencedImages ??= new Set<string>();
