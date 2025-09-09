export interface FsNode {
  name: string
  type: 'file' | 'dir'
  path: string
  children?: Record<string, FsNode>
}

export interface VfsIndexEntry {
  vfsPath: string
  srcUrl: string
  kind: 'md' | 'html'
  name: string
  metadata?: Record<string, any>
}

interface VfsIndexDoc {
  version: number
  generatedAt: string
  entries: VfsIndexEntry[]
  tree: FsNode
}

export class VirtualFileSystem {
  private root: FsNode
  private entriesByPath: Record<string, VfsIndexEntry> = {}
  private contentCache = new Map<string, { content: string; kind: 'md' | 'html'; metadata?: Record<string, any> }>()

  constructor() {
    this.root = { name: '/', type: 'dir', path: '/', children: {} }
  }

  async initialize() {
    // Load prebuilt index generated at build time (scripts/build-vfs-index.mjs)
    const res = await fetch('/vfs-index.json')
    if (!res.ok) throw new Error(`Failed to load VFS index: ${res.status}`)
    const doc = (await res.json()) as VfsIndexDoc

    // Build entries map and tree
    this.root = doc.tree
    for (const e of doc.entries) {
      this.entriesByPath[e.vfsPath] = e
    }
  }

  getNode(path: string): FsNode | null {
    if (path === '/' || path === '') return this.root
    
    const parts = path.split('/').filter(Boolean)
    let current = this.root

    for (const part of parts) {
      if (!current.children || !current.children[part]) return null
      current = current.children[part]
    }

    return current
  }

  listDirectory(path: string): string[] | null {
    const node = this.getNode(path)
    if (!node || node.type !== 'dir' || !node.children) return null

    const dirs: string[] = []
    const files: string[] = []

    for (const [name, child] of Object.entries(node.children)) {
      if (child.type === 'dir') {
        dirs.push(name)
      } else {
        files.push(name)
      }
    }

    return [...dirs.sort(), ...files.sort()]
  }

  isFile(path: string): boolean {
    const node = this.getNode(path)
    return !!node && node.type === 'file'
  }

  isDirectory(path: string): boolean {
    const node = this.getNode(path)
    return !!node && node.type === 'dir'
  }

  getEntry(vfsPath: string): VfsIndexEntry | undefined {
    return this.entriesByPath[vfsPath]
  }

  async getFile(vfsPath: string): Promise<{ content: string; kind: 'md' | 'html'; metadata?: Record<string, any> } | null> {
    const cached = this.contentCache.get(vfsPath)
    if (cached) return cached

    const entry = this.getEntry(vfsPath)
    if (!entry) return null

    const res = await fetch(entry.srcUrl)
    if (!res.ok) throw new Error(`Failed to fetch ${entry.srcUrl}: ${res.status}`)
    const content = await res.text()

    const record = { content, kind: entry.kind, metadata: entry.metadata }
    this.contentCache.set(vfsPath, record)
    return record
  }

  resolvePath(currentPath: string[], input: string): string[] | null {
    if (input === '/') return []
    
    const isAbsolute = input.startsWith('/')
    const parts = input.split('/').filter(Boolean)
    const stack = isAbsolute ? [] : [...currentPath]

    for (const part of parts) {
      if (part === '..') {
        stack.pop()
      } else if (part !== '.') {
        stack.push(part)
      }
    }

    // Verify path exists
    const node = this.getNode('/' + stack.join('/'))
    if (!node) return null

    return stack
  }
}
