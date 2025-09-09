#!/usr/bin/env node
import fs from 'fs/promises'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const ROOT = path.resolve(__dirname, '..')
const SRC_CONTENT = path.join(ROOT, 'src', 'content')
const PUBLIC_DIR = path.join(ROOT, 'public')
const PUBLIC_CONTENT = path.join(PUBLIC_DIR, 'content')
const INDEX_PATH = path.join(PUBLIC_DIR, 'vfs-index.json')

/**
 * Minimal YAML frontmatter parser (sufficient for simple key: value pairs and arrays)
 */
function parseFrontmatter(text) {
  const fmMatch = text.match(/^---\n([\s\S]*?)\n---/)
  if (!fmMatch) return {}
  const fm = fmMatch[1]
  const meta = {}
  for (const line of fm.split('\n')) {
    const i = line.indexOf(':')
    if (i === -1) continue
    const key = line.slice(0, i).trim()
    let value = line.slice(i + 1).trim()
    if (!key) continue
    if (value.startsWith('[') && value.endsWith(']')) {
      meta[key] = value
        .slice(1, -1)
        .split(',')
        .map((v) => v.trim().replace(/^['"]|['"]$/g, ''))
    } else {
      meta[key] = value.replace(/^['"]|['"]$/g, '')
    }
  }
  return meta
}

async function ensureDir(dir) {
  await fs.mkdir(dir, { recursive: true })
}

async function readDirRecursive(dir) {
  const entries = await fs.readdir(dir, { withFileTypes: true })
  const items = []
  for (const entry of entries) {
    const full = path.join(dir, entry.name)
    if (entry.isDirectory()) {
      items.push(...(await readDirRecursive(full)))
    } else {
      items.push(full)
    }
  }
  return items
}

function toUnix(p) {
  return p.split(path.sep).join('/')
}

function relFromSrc(fullPath) {
  return toUnix(path.relative(SRC_CONTENT, fullPath))
}

function vfsHtmlPath(rel) {
  return '/' + rel.replace(/\.md$/i, '.html')
}

function srcPublicUrl(rel) {
  return '/content/' + rel
}

function isContentFile(rel) {
  return /\.(md|html)$/i.test(rel)
}

function extractHtmlMeta(text) {
  const out = {}
  const metaDate = text.match(/<meta\s+name=["']wtss:date["']\s+content=["']([^"']+)["']\s*\/>/i)
  if (metaDate) out.date = metaDate[1]
  return out
}

async function build() {
  await ensureDir(PUBLIC_CONTENT)

  const files = (await readDirRecursive(SRC_CONTENT))
    .map((f) => ({ full: f, rel: relFromSrc(f) }))
    .filter(({ rel }) => isContentFile(rel))

  // Copy files to public/content and build index entries
  const entries = []
  for (const { full, rel } of files) {
    const dest = path.join(PUBLIC_CONTENT, rel)
    await ensureDir(path.dirname(dest))
    await fs.copyFile(full, dest)

    const raw = await fs.readFile(full, 'utf8')
    let metadata = {}
    if (/\.md$/i.test(rel)) metadata = parseFrontmatter(raw)
    else if (/\.html$/i.test(rel)) metadata = extractHtmlMeta(raw)

    entries.push({
      vfsPath: vfsHtmlPath(rel),
      srcUrl: srcPublicUrl(rel),
      kind: /\.md$/i.test(rel) ? 'md' : 'html',
      name: path.basename(rel).replace(/\.md$/i, '.html'),
      metadata,
    })
  }

  // Build tree from entries
  const root = { name: '/', type: 'dir', path: '/', children: {} }
  for (const e of entries) {
    const parts = e.vfsPath.split('/').filter(Boolean)
    let node = root
    let acc = ''
    for (let i = 0; i < parts.length; i++) {
      const part = parts[i]
      acc += '/' + part
      if (!node.children) node.children = {}
      if (!node.children[part]) {
        node.children[part] = {
          name: part,
          type: i === parts.length - 1 ? 'file' : 'dir',
          path: acc,
        }
        if (i !== parts.length - 1) node.children[part].children = {}
      }
      node = node.children[part]
    }
  }

  const index = {
    version: 1,
    generatedAt: new Date().toISOString(),
    entries,
    tree: root,
  }

  await fs.writeFile(INDEX_PATH, JSON.stringify(index, null, 2), 'utf8')
  console.log(`[vfs] index written: ${INDEX_PATH}`)
}

build().catch((err) => {
  console.error('[vfs] build failed:', err)
  process.exit(1)
})
