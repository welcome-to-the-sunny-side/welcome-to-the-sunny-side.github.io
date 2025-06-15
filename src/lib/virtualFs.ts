export interface FsNode {
  name: string;
  type: 'file' | 'dir';
  children?: Record<string, FsNode>;
  path: string; // full path starting with '/'
}

// Dynamically generate the virtual file system tree from src/content

// Utility to build a tree from a list of file paths
function buildVirtualFsTree(paths: string[]): FsNode {
  const root: FsNode = { name: '/', type: 'dir', path: '/', children: {} };
  for (const filePath of paths) {
    // Remove ./ for FS pathing
    const relPath = filePath.replace(/^\.\/?/, '');
    const parts = relPath.split('/');
    let node = root;
    let fsPath = '';
    for (let i = 0; i < parts.length; i++) {
      const part = parts[i];
      fsPath += '/' + part;
      const isFile = part.includes('.');
      if (!node.children) node.children = {};
      if (!node.children[part]) {
        node.children[part] = {
          name: part,
          type: isFile ? 'file' : 'dir',
          path: fsPath,
        };
        if (!isFile) node.children[part].children = {};
      }
      node = node.children[part];
    }
  }
  return root;
}

// Use Vite's import.meta.glob to enumerate all markdown and html files in src/content
const contentFiles = Object.keys(
  import.meta.glob('/src/content/**/*.{md,html}', { query: '?raw', import: 'default', eager: false })
);

let _virtualFs: FsNode | null = null;
export function getVirtualFs(): FsNode {
  if (_virtualFs) return _virtualFs;
  // Remove leading /src/content/ for virtual FS root
  // Convert markdown source paths (foo.md) to virtual paths ending with .html so
// users interact with rendered filenames (e.g. foo.html)
const relPaths = contentFiles.map(f =>
  // If source is markdown, map extension to .html, otherwise keep .html as-is
  f.replace(/^\/src\/content\//, '').replace(/\.md$/, '.html')
);
  _virtualFs = buildVirtualFsTree(relPaths);
  return _virtualFs;
}


function getNode(path: string): FsNode | null {
  const parts = path.split('/').filter(Boolean);
  let node: FsNode = getVirtualFs();
  for (const part of parts) {
    if (!node.children || !node.children[part]) return null;
    node = node.children[part];
  }
  return node;
}

export function list(path: string): string[] | null {
  const node = getNode(path);
  if (!node || node.type !== 'dir' || !node.children) return null;
  const dirs: string[] = [];
  const files: string[] = [];
  for (const [name, child] of Object.entries(node.children)) {
    if (child.type === 'dir') {
      dirs.push(name);
    } else {
      files.push(name);
    }
  }
  dirs.sort();
  files.sort();
  return [...dirs, ...files];
}

export function isFile(path: string): boolean {
  const node = getNode(path);
  return !!node && node.type === 'file';
}

export function isDir(path: string): boolean {
  const node = getNode(path);
  return !!node && node.type === 'dir';
}

export function resolvePath(cwd: string[], input: string): string[] | null {
  if (input === '/') return [];
  const isAbs = input.startsWith('/');
  const parts = input.split('/').filter(Boolean);
  const stack = isAbs ? [] : [...cwd];
  for (const part of parts) {
    if (part === '..') {
      stack.pop();
    } else if (part !== '.') {
      stack.push(part);
    }
  }
  // Verify path exists
  const node = getNode('/' + stack.join('/'));
  if (!node) return null;
  return stack;
}
