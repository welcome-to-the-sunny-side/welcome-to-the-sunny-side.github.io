// The browser's copy of the virtual file system. build.js bundles the tree
// (directories are objects, files are 0) and the frontmatter dates in as
// VFS_TREE and VFS_DATES; see src/build/vfs.js.
/* global VFS_TREE, VFS_DATES */
const TREE = VFS_TREE;
export const DATES = VFS_DATES;

function getNode(path) {
  let node = TREE;
  for (const part of path.split('/').filter(Boolean)) {
    if (typeof node !== 'object' || !(part in node)) return null;
    node = node[part];
  }
  return node;
}

/** Names in a directory, dirs first, each group sorted; null if not a directory. */
export function list(path) {
  const node = getNode(path);
  if (typeof node !== 'object' || node === null) return null;
  const names = Object.keys(node);
  const dirs = names.filter((n) => typeof node[n] === 'object').sort();
  const files = names.filter((n) => typeof node[n] !== 'object').sort();
  return [...dirs, ...files];
}

export const isFile = (path) => getNode(path) === 0;
export const isDir = (path) => typeof getNode(path) === 'object' && getNode(path) !== null;

/** Resolve `input` against `cwd` (an array of path segments); null if it doesn't exist. */
export function resolvePath(cwd, input) {
  if (input === '/') return [];
  const stack = input.startsWith('/') ? [] : [...cwd];
  for (const part of input.split('/').filter(Boolean)) {
    if (part === '..') stack.pop();
    else if (part !== '.') stack.push(part);
  }
  return getNode('/' + stack.join('/')) === null ? null : stack;
}

/** Whether a URL path is a page of the site (a VFS file or a directory's index.html). */
export function isPage(path) {
  if (path === '/') return true;
  if (isFile(path)) return true;
  return path.endsWith('/index.html') && isDir(path.slice(0, -'index.html'.length));
}
