import { VirtualFileSystem } from './vfs'
import { ContentRenderer } from './content'

export class Terminal {
  private vfs: VirtualFileSystem
  private contentRenderer: ContentRenderer
  private currentPath: string[] = []
  private history: string[] = []
  private historyIndex = -1
  private pathHistory: string[][] = []
  private outputElement: HTMLElement
  private currentInput = ''
  private cursorPosition = 0
  private isActive = false

  constructor(vfs: VirtualFileSystem, contentRenderer: ContentRenderer) {
    this.vfs = vfs
    this.contentRenderer = contentRenderer
    this.outputElement = document.getElementById('terminal-output')!
  }

  initialize() {
    this.setupEventListeners()
    this.printWelcome()
    this.showPrompt()
  }

  private setupEventListeners() {
    document.addEventListener('keydown', (e) => {
      if (!this.isActive) return
      
      switch (e.key) {
        case 'Enter':
          this.handleCommand()
          e.preventDefault()
          break
        case 'ArrowUp':
          this.navigateHistory(-1)
          e.preventDefault()
          break
        case 'ArrowDown':
          this.navigateHistory(1)
          e.preventDefault()
          break
        case 'ArrowLeft':
          if (this.cursorPosition > 0) {
            this.cursorPosition--
            this.updateCurrentLine()
          }
          e.preventDefault()
          break
        case 'ArrowRight':
          if (this.cursorPosition < this.currentInput.length) {
            this.cursorPosition++
            this.updateCurrentLine()
          }
          e.preventDefault()
          break
        case 'Backspace':
          if (this.cursorPosition > 0) {
            this.currentInput = this.currentInput.slice(0, this.cursorPosition - 1) + 
                               this.currentInput.slice(this.cursorPosition)
            this.cursorPosition--
            this.updateCurrentLine()
          }
          e.preventDefault()
          break
        case 'Delete':
          if (this.cursorPosition < this.currentInput.length) {
            this.currentInput = this.currentInput.slice(0, this.cursorPosition) + 
                               this.currentInput.slice(this.cursorPosition + 1)
            this.updateCurrentLine()
          }
          e.preventDefault()
          break
        case 'Home':
          this.cursorPosition = 0
          this.updateCurrentLine()
          e.preventDefault()
          break
        case 'End':
          this.cursorPosition = this.currentInput.length
          this.updateCurrentLine()
          e.preventDefault()
          break
        case 'Tab':
          this.handleAutocomplete()
          e.preventDefault()
          break
        default:
          if (e.key.length === 1 && !e.ctrlKey && !e.metaKey) {
            this.currentInput = this.currentInput.slice(0, this.cursorPosition) + 
                               e.key + 
                               this.currentInput.slice(this.cursorPosition)
            this.cursorPosition++
            this.updateCurrentLine()
            e.preventDefault()
          }
          break
      }
    })

    // Focus terminal when clicking anywhere in terminal area
    this.outputElement.addEventListener('click', () => {
      this.focus()
    })
  }

  private handleCommand() {
    const input = this.currentInput.trim()
    
    // Complete the current line (remove cursor, make it permanent)
    this.completeCurrentLine()
    
    if (input) {
      // Add to history
      this.history.push(input)
      this.historyIndex = this.history.length

      // Parse and execute command
      const [command, ...args] = input.split(/\s+/)
      this.executeCommand(command, args)
    }

    // Reset input and show new prompt
    this.currentInput = ''
    this.cursorPosition = 0
    this.showPrompt()
  }

  private executeCommand(command: string, args: string[]) {
    switch (command.toLowerCase()) {
      case 'ls':
        this.listDirectory(args)
        break
      case 'cd':
        this.changeDirectory(args[0] || '/')
        break
      case 'open':
        this.openFile(args[0])
        break
      case 'pop':
        this.popDirectory()
        break
      case 'clear':
        this.clearOutput()
        break
      case 'help':
        this.showHelp()
        break
      case 'pwd':
        this.printWorkingDirectory()
        break
      default:
        this.addOutput(`<span class="text-red-400">Command not found: ${command}</span>`)
        this.addOutput(`Type <span class="text-terminal-yellow">help</span> for available commands.`)
    }
  }

  private listDirectory(args: string[]) {
    const hasDateFlag = args.includes('-d') || args.includes('-v')
    const path = '/' + this.currentPath.join('/')
    const items = this.vfs.listDirectory(path)

    if (!items) {
      this.addOutput(`<span class="text-red-400">Cannot list directory: ${path}</span>`)
      return
    }

    if (items.length === 0) {
      this.addOutput('Directory is empty.')
      return
    }

    let ordered = items
    if (hasDateFlag) {
      const dirs: string[] = []
      const files: { name: string; date?: string }[] = []
      for (const item of items) {
        const itemPath = path === '/' ? `/${item}` : `${path}/${item}`
        const node = this.vfs.getNode(itemPath)
        if (!node) continue
        if (node.type === 'dir') dirs.push(item)
        else {
          const entry = this.vfs.getEntry(itemPath)
          files.push({ name: item, date: entry?.metadata?.date })
        }
      }
      dirs.sort()
      files.sort((a, b) => {
        const ad = a.date ? Date.parse(a.date) : 0
        const bd = b.date ? Date.parse(b.date) : 0
        return bd - ad
      })
      ordered = [...dirs, ...files.map(f => f.name)]
    }

    for (const item of ordered) {
      const itemPath = path === '/' ? `/${item}` : `${path}/${item}`
      const node = this.vfs.getNode(itemPath)
      if (!node) continue

      let output = ''
      if (node.type === 'dir') {
        output = `<span class="text-white">${item}/</span>`
      } else {
        output = `<span class="text-terminal-yellow">${item}</span>`
        if (hasDateFlag) {
          const entry = this.vfs.getEntry(itemPath)
          const date = entry?.metadata?.date
          if (date) {
            output += ` <span class="text-gray-500">(${date})</span>`
          }
        }
      }

      this.addOutput(output)
    }
  }

  private changeDirectory(path?: string) {
    if (!path) {
      this.currentPath = []
      return
    }

    const newPath = this.vfs.resolvePath(this.currentPath, path)
    if (!newPath) {
      this.addOutput(`<span class="text-red-400">Directory not found: ${path}</span>`)
      return
    }

    if (!this.vfs.isDirectory('/' + newPath.join('/'))) {
      this.addOutput(`<span class="text-red-400">Not a directory: ${path}</span>`)
      return
    }

    this.pathHistory.push([...this.currentPath])
    this.currentPath = newPath
  }

  private async openFile(filename?: string) {
    if (!filename) {
      this.addOutput(`<span class="text-red-400">Usage: open &lt;filename&gt;</span>`)
      return
    }

    const filePath = this.vfs.resolvePath(this.currentPath, filename)
    if (!filePath) {
      this.addOutput(`<span class="text-red-400">File not found: ${filename}</span>`)
      return
    }

    const fullPath = '/' + filePath.join('/')
    if (!this.vfs.isFile(fullPath)) {
      this.addOutput(`<span class="text-red-400">Not a file: ${filename}</span>`)
      return
    }

    try {
      const file = await this.vfs.getFile(fullPath)
      if (file) {
        await this.contentRenderer.render(file.content, fullPath, file.kind, file.metadata)
        this.addOutput(`<span class="text-green-400">Opened: ${fullPath}</span>`)
      } else {
        this.addOutput(`<span class="text-red-400">Could not read file: ${filename}</span>`)
      }
    } catch (error) {
      this.addOutput(`<span class="text-red-400">Error opening file: ${error}</span>`)
    }
  }

  private popDirectory() {
    if (this.pathHistory.length === 0) {
      this.addOutput(`<span class="text-yellow-400">No previous directory in history</span>`)
      return
    }

    this.currentPath = this.pathHistory.pop()!
  }

  private clearOutput() {
    this.outputElement.innerHTML = ''
  }

  private showHelp() {
    const commands = [
      { cmd: 'ls', desc: 'List directory contents' },
      { cmd: 'ls -d/-v', desc: 'List with dates' },
      { cmd: 'cd &lt;dir&gt;', desc: 'Change directory' },
      { cmd: 'open &lt;file&gt;', desc: 'Open file' },
      { cmd: 'pop', desc: 'Return to previous directory' },
      { cmd: 'pwd', desc: 'Print working directory' },
      { cmd: 'clear', desc: 'Clear terminal output' },
      { cmd: 'help', desc: 'Show this help' }
    ]

    this.addOutput('<span class="text-terminal-green font-bold">Available Commands:</span>')
    this.addOutput('')

    for (const { cmd, desc } of commands) {
      this.addOutput(`  <span class="text-terminal-yellow">${cmd.padEnd(12)}</span> ${desc}`)
    }

    this.addOutput('')
    this.addOutput('<span class="text-gray-400">Keyboard shortcuts:</span>')
    this.addOutput('  <span class="text-terminal-yellow">Tab</span>         Autocomplete')
    this.addOutput('  <span class="text-terminal-yellow">↑/↓</span>         Command history')
    this.addOutput('  <span class="text-terminal-yellow">←/→</span>         Move cursor')
    this.addOutput('  <span class="text-terminal-yellow">Home/End</span>    Start/end of line')
    this.addOutput('  <span class="text-terminal-yellow">j/k/h/l</span>     Scroll content (vim-style)')
    this.addOutput('  <span class="text-terminal-yellow">Shift+←</span>     Focus terminal')
    this.addOutput('  <span class="text-terminal-yellow">Shift+↑</span>     Focus content')
  }

  private printWorkingDirectory() {
    const path = '/' + this.currentPath.join('/')
    this.addOutput(path)
  }


  private navigateHistory(direction: number) {
    if (this.history.length === 0) return

    this.historyIndex += direction
    this.historyIndex = Math.max(-1, Math.min(this.history.length - 1, this.historyIndex))

    if (this.historyIndex === -1) {
      this.currentInput = ''
    } else {
      this.currentInput = this.history[this.historyIndex]
    }
    
    this.cursorPosition = this.currentInput.length
    this.updateCurrentLine()
  }

  private handleAutocomplete() {
    const parts = this.currentInput.split(/\s+/)
    const command = parts[0]
    const currentArg = parts[parts.length - 1] || ''

    if (parts.length === 1) {
      // Complete command
      const commands = ['ls', 'cd', 'open', 'pop', 'clear', 'help', 'pwd']
      const matches = commands.filter(cmd => cmd.startsWith(currentArg))
      if (matches.length === 1) {
        this.currentInput = matches[0] + ' '
        this.cursorPosition = this.currentInput.length
        this.updateCurrentLine()
      }
    } else if (command === 'cd' || command === 'open') {
      // Complete file/directory names
      const path = '/' + this.currentPath.join('/')
      const items = this.vfs.listDirectory(path)
      if (items) {
        const matches = items.filter(item => item.startsWith(currentArg))
        if (matches.length === 1) {
          parts[parts.length - 1] = matches[0]
          this.currentInput = parts.join(' ')
          this.cursorPosition = this.currentInput.length
          this.updateCurrentLine()
        }
      }
    }
  }

  private showPrompt() {
    const path = this.currentPath.length === 0 ? '~' : this.currentPath.join('/')
    const promptText = `<span class="text-terminal-green">${path}$</span> `
    
    // Add new prompt line
    const line = document.createElement('div')
    line.innerHTML = promptText
    line.classList.add('terminal-line', 'current-line')
    this.outputElement.appendChild(line)
    
    this.isActive = true
    document.body.dataset.terminalActive = 'true'
    this.updateCurrentLine()
    this.scrollToBottom()
  }


  private addOutput(html: string) {
    const line = document.createElement('div')
    line.innerHTML = html
    line.classList.add('terminal-line')
    
    // Insert before current prompt line if it exists
    const currentLine = this.outputElement.querySelector('.current-line')
    if (currentLine) {
      this.outputElement.insertBefore(line, currentLine)
    } else {
      this.outputElement.appendChild(line)
    }
    
    this.scrollToBottom()
  }

  private printWelcome() {
    this.addOutput('<span class="text-terminal-green font-bold">Welcome to the Sunny Side Terminal</span>')
    this.addOutput('')
    this.addOutput('Type <span class="text-terminal-yellow">help</span> for available commands.')
    this.addOutput('Type <span class="text-terminal-yellow">ls</span> to see available content.')
    this.addOutput('')
  }

  focus() {
    this.isActive = true
    document.body.dataset.terminalActive = 'true'
    this.updateCurrentLine()
  }

  private updateCurrentLine() {
    const currentLine = this.outputElement.querySelector('.current-line')
    if (!currentLine) return

    const path = this.currentPath.length === 0 ? '~' : this.currentPath.join('/')
    const promptText = `<span class="text-terminal-green">${path}$</span> `
    
    // Build the line with cursor
    const beforeCursor = this.currentInput.slice(0, this.cursorPosition)
    const atCursor = this.currentInput[this.cursorPosition] || ' '
    const afterCursor = this.currentInput.slice(this.cursorPosition + 1)
    
    const cursor = this.isActive ? 
      `<span class="bg-terminal-green text-bg animate-cursor-blink">${atCursor}</span>` :
      atCursor
    
    currentLine.innerHTML = promptText + beforeCursor + cursor + afterCursor
  }

  private completeCurrentLine() {
    const currentLine = this.outputElement.querySelector('.current-line')
    if (!currentLine) return

    const path = this.currentPath.length === 0 ? '~' : this.currentPath.join('/')
    const promptText = `<span class="text-terminal-green">${path}$</span> `
    
    currentLine.innerHTML = promptText + this.currentInput
    currentLine.classList.remove('current-line')
    this.isActive = false
    document.body.dataset.terminalActive = 'false'
  }

  private scrollToBottom() {
    this.outputElement.scrollTop = this.outputElement.scrollHeight
  }
}
