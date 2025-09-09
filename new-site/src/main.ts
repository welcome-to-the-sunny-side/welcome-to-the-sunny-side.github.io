import './styles/main.css'
import { VirtualFileSystem } from './lib/vfs'
import { Terminal } from './lib/terminal'
import { ContentRenderer } from './lib/content'

class App {
  private vfs: VirtualFileSystem
  private terminal: Terminal
  private contentRenderer: ContentRenderer

  constructor() {
    this.vfs = new VirtualFileSystem()
    this.contentRenderer = new ContentRenderer()
    this.terminal = new Terminal(this.vfs, this.contentRenderer)
    
    this.init()
  }

  private async init() {
    // Initialize VFS
    await this.vfs.initialize()
    
    // Initialize terminal
    this.terminal.initialize()
    
    // Load initial content (home page)
    await this.loadInitialContent()
    
    // Set up keyboard shortcuts
    this.setupKeyboardShortcuts()
  }

  private async loadInitialContent() {
    try {
      // Try to load home.md, fallback to a default welcome message
      const homeFile = await this.vfs.getFile('/home.html')
      if (homeFile) {
        await this.contentRenderer.render(homeFile.content, '/home.html', homeFile.kind, homeFile.metadata)
      } else {
        this.showWelcomeMessage()
      }
    } catch (error) {
      console.warn('Could not load home content:', error)
      this.showWelcomeMessage()
    }
  }

  private showWelcomeMessage() {
    const container = document.getElementById('content-container')!
    container.innerHTML = `
      <div class="prose prose-invert max-w-none prose-sm">
        <div class="text-center py-12">
          <h1 class="text-4xl font-bold text-accent mb-4">Welcome to the Sunny Side</h1>
          <p class="text-text-muted mb-6">A blazing fast terminal-driven blog</p>
          <p class="text-sm text-text-muted">
            Use the terminal on the right to navigate:<br>
            <code class="text-terminal-yellow">ls</code> - list files<br>
            <code class="text-terminal-yellow">cd &lt;dir&gt;</code> - change directory<br>
            <code class="text-terminal-yellow">open &lt;file&gt;</code> - open file<br>
            <code class="text-terminal-yellow">help</code> - show all commands
          </p>
        </div>
      </div>
    `
  }

  private setupKeyboardShortcuts() {
    document.addEventListener('keydown', (e) => {
      // Vim-style navigation when terminal is not focused
      const terminalActive = document.body.dataset.terminalActive === 'true'
      if (!terminalActive) {
        const contentPane = document.getElementById('content-pane')!
        const step = 60
        
        switch (e.key) {
          case 'j':
            contentPane.scrollBy({ top: 2 * step, behavior: 'smooth' })
            e.preventDefault()
            break
          case 'k':
            contentPane.scrollBy({ top: -2 * step, behavior: 'smooth' })
            e.preventDefault()
            break
          case 'h':
            contentPane.scrollBy({ left: -step, behavior: 'smooth' })
            e.preventDefault()
            break
          case 'l':
            contentPane.scrollBy({ left: step, behavior: 'smooth' })
            e.preventDefault()
            break
        }
      }
      
      // Terminal focus shortcut
      if (e.shiftKey && e.key === 'ArrowLeft') {
        this.terminal.focus()
        e.preventDefault()
      }
    })
  }
}

// Initialize app when DOM is loaded
new App()
