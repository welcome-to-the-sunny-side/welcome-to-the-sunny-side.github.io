import MarkdownIt from 'markdown-it'
import hljs from 'highlight.js'

export class ContentRenderer {
  private md: MarkdownIt
  private container: HTMLElement

  constructor() {
    this.container = document.getElementById('content-container')!
    this.setupMarkdown()
  }

  private setupMarkdown() {
    this.md = new MarkdownIt({
      html: true,
      linkify: true,
      typographer: true,
      highlight: (str, lang) => {
        if (lang && hljs.getLanguage(lang)) {
          try {
            return hljs.highlight(str, { language: lang }).value
          } catch (__) {}
        }
        return ''
      }
    })
  }

  async render(content: string, vfsPath: string, kind: 'md' | 'html', metadata?: Record<string, any>) {
    if (kind === 'html') {
      // Raw HTML: render as-is and execute inline scripts
      this.container.innerHTML = `
        <div class="max-w-4xl mx-auto">
          ${content}
        </div>
      `
      this.executeInlineScripts(this.container)
      await this.typesetMath()
      // Try to set title from <title> or metadata
      const titleMatch = content.match(/<title>([\s\S]*?)<\/title>/i)
      const title = (titleMatch && titleMatch[1]) || metadata?.title
      if (title) document.title = `${title} - Welcome to the Sunny Side`
      return
    }

    // Markdown path
    const { frontmatter, body } = this.parseFrontmatter(content)
    const protectedBody = this.protectMathExpressions(body)
    let html = this.md.render(protectedBody)
    html = this.restoreMathExpressions(html)

    if (frontmatter.layout === 'blog') {
      this.renderBlogPost(frontmatter, html)
    } else if (frontmatter.layout === 'home') {
      this.renderHomePage(frontmatter, html)
    } else {
      this.renderGenericPage(frontmatter, html)
    }

    await this.typesetMath()
    if (frontmatter.title) {
      document.title = `${frontmatter.title} - Welcome to the Sunny Side`
    }
  }

  private parseFrontmatter(content: string) {
    const frontmatterMatch = content.match(/^---\n([\s\S]*?)\n---\n([\s\S]*)$/)
    
    if (!frontmatterMatch) {
      return { frontmatter: {}, body: content }
    }

    const frontmatterText = frontmatterMatch[1]
    const body = frontmatterMatch[2]
    const frontmatter: any = {}

    // Simple YAML parser
    const lines = frontmatterText.split('\n')
    for (const line of lines) {
      const colonIndex = line.indexOf(':')
      if (colonIndex === -1) continue

      const key = line.slice(0, colonIndex).trim()
      const value = line.slice(colonIndex + 1).trim()

      if (key === 'tags' && value.startsWith('[')) {
        frontmatter[key] = value.slice(1, -1).split(',').map(t => t.trim().replace(/['"]/g, ''))
      } else {
        frontmatter[key] = value.replace(/['"]/g, '')
      }
    }

    return { frontmatter, body }
  }

  private protectMathExpressions(content: string): string {
    const mathExpressions: string[] = []
    let protectedContent = content

    // Protect display math $$...$$
    protectedContent = protectedContent.replace(/\$\$([\s\S]*?)\$\$/g, (match) => {
      const index = mathExpressions.length
      mathExpressions.push(match)
      return `__MATH_DISPLAY_${index}__`
    })

    // Protect inline math $...$
    protectedContent = protectedContent.replace(/\$([^$\n]+?)\$/g, (match) => {
      const index = mathExpressions.length
      mathExpressions.push(match)
      return `__MATH_INLINE_${index}__`
    })

    // Protect LaTeX \[...\] and \(...\)
    protectedContent = protectedContent.replace(/\\\[([\s\S]*?)\\\]/g, (match) => {
      const index = mathExpressions.length
      mathExpressions.push(match)
      return `__MATH_DISPLAY_${index}__`
    })

    protectedContent = protectedContent.replace(/\\\(([\s\S]*?)\\\)/g, (match) => {
      const index = mathExpressions.length
      mathExpressions.push(match)
      return `__MATH_INLINE_${index}__`
    })

    // Store expressions for restoration
    ;(this as any)._mathExpressions = mathExpressions
    return protectedContent
  }

  private restoreMathExpressions(html: string): string {
    const mathExpressions = (this as any)._mathExpressions || []
    
    return html.replace(/__MATH_(DISPLAY|INLINE)_(\d+)__/g, (match, _type, index) => {
      return mathExpressions[parseInt(index)] || match
    })
  }

  private renderBlogPost(frontmatter: any, html: string) {
    const tagsHtml = frontmatter.tags 
      ? frontmatter.tags.map((tag: string) => 
          `<a href="#" class="blog-tag">${tag}</a>`
        ).join('')
      : ''

    this.container.innerHTML = `
      <article class="blog-post">
        <header class="blog-header">
          <h1 class="blog-title">${frontmatter.title || 'Untitled'}</h1>
          <div class="blog-meta">
            ${frontmatter.date ? `<time>${frontmatter.date}</time>` : ''}
            ${frontmatter.tags ? `<div class="blog-tags mt-2">${tagsHtml}</div>` : ''}
          </div>
        </header>
        <div class="prose prose-invert max-w-none prose-sm">
          ${html}
        </div>
      </article>
    `
  }

  private renderHomePage(frontmatter: any, html: string) {
    // Check for background images
    const backgroundStyle = this.getBackgroundStyle(frontmatter)
    
    this.container.innerHTML = `
      <div class="min-h-screen relative" ${backgroundStyle ? `style="${backgroundStyle}"` : ''}>
        <div class="prose prose-invert max-w-none prose-sm relative z-10 bg-bg/80 backdrop-blur-sm rounded-lg p-8">
          ${html}
        </div>
      </div>
    `
  }

  private renderGenericPage(frontmatter: any, html: string) {
    this.container.innerHTML = `
      <div class="max-w-4xl mx-auto">
        ${frontmatter.title ? `<h1 class="text-4xl font-bold text-accent mb-6">${frontmatter.title}</h1>` : ''}
        <div class="prose prose-invert max-w-none prose-sm">
          ${html}
        </div>
      </div>
    `
  }

  private getBackgroundStyle(frontmatter: any): string | null {
    const isMobile = window.innerWidth < 768
    const imageUrl = isMobile ? frontmatter.backgroundImageMobile : frontmatter.backgroundImagePC
    
    if (!imageUrl) return null
    
    return `background-image: url('${imageUrl}'); background-size: cover; background-position: center; background-attachment: fixed;`
  }

  private executeInlineScripts(root: HTMLElement) {
    const scripts = Array.from(root.querySelectorAll('script'))
    for (const oldScript of scripts) {
      const newScript = document.createElement('script')
      for (const attr of Array.from(oldScript.attributes)) {
        newScript.setAttribute(attr.name, attr.value)
      }
      newScript.textContent = oldScript.textContent
      oldScript.parentElement?.replaceChild(newScript, oldScript)
    }
  }

  private async typesetMath() {
    const MJ = (window as any).MathJax
    if (MJ?.typesetPromise) {
      try { await MJ.typesetPromise([this.container]) } catch {}
    }
  }
}
