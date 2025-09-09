export interface Skin {
  name: string
  displayName: string
  colors: {
    bg: string
    surface: string
    surfaceAlt: string
    accent: string
    accentSubtle: string
    warning: string
    text: string
    textMuted: string
    terminalGreen: string
    terminalYellow: string
  }
}

export const skins: Record<string, Skin> = {
  dark: {
    name: 'dark',
    displayName: 'Dark',
    colors: {
      bg: '#0d0d0d',
      surface: '#1a1a1a',
      surfaceAlt: '#161616',
      accent: '#64ffda',
      accentSubtle: '#264d48',
      warning: '#ffb454',
      text: '#e0e0e0',
      textMuted: '#9e9e9e',
      terminalGreen: '#64ffda',
      terminalYellow: '#ffe678'
    }
  },
  sunny: {
    name: 'sunny',
    displayName: 'Sunny',
    colors: {
      bg: '#fefefe',
      surface: '#f8f8f8',
      surfaceAlt: '#f0f0f0',
      accent: '#2563eb',
      accentSubtle: '#dbeafe',
      warning: '#f59e0b',
      text: '#1f2937',
      textMuted: '#6b7280',
      terminalGreen: '#059669',
      terminalYellow: '#d97706'
    }
  }
}

export class SkinManager {
  private currentSkin: string = 'dark'

  initialize() {
    // Load saved skin from localStorage
    const saved = localStorage.getItem('wtss-skin')
    if (saved && skins[saved]) {
      this.currentSkin = saved
    }

    this.applySkin(this.currentSkin)
    this.setupEventListeners()
  }

  private setupEventListeners() {
    document.addEventListener('skin-change', (e: any) => {
      const skinName = e.detail.skin
      this.changeSkin(skinName)
    })
  }

  changeSkin(skinName: string) {
    if (!skins[skinName]) {
      console.warn(`Skin "${skinName}" not found`)
      return false
    }

    this.currentSkin = skinName
    localStorage.setItem('wtss-skin', skinName)
    this.applySkin(skinName)
    
    // Notify terminal of successful change
    const event = new CustomEvent('skin-changed', { 
      detail: { skin: skinName, success: true } 
    })
    document.dispatchEvent(event)
    
    return true
  }

  private applySkin(skinName: string) {
    const skin = skins[skinName]
    if (!skin) return

    const root = document.documentElement
    
    // Apply CSS custom properties
    Object.entries(skin.colors).forEach(([key, value]) => {
      const cssVar = `--color-${key.replace(/([A-Z])/g, '-$1').toLowerCase()}`
      root.style.setProperty(cssVar, value)
    })

    // Update HTML class for dark/light mode
    if (skinName === 'sunny') {
      document.documentElement.classList.remove('dark')
      document.documentElement.classList.add('light')
    } else {
      document.documentElement.classList.remove('light')
      document.documentElement.classList.add('dark')
    }

    // Update Tailwind classes dynamically
    this.updateTailwindClasses(skinName)
  }

  private updateTailwindClasses(skinName: string) {
    const body = document.body
    const terminalPane = document.getElementById('terminal-pane')
    const contentPane = document.getElementById('content-pane')

    if (skinName === 'sunny') {
      // Light theme classes
      body.className = body.className
        .replace('bg-bg', 'bg-white')
        .replace('text-text', 'text-gray-900')
      
      if (terminalPane) {
        terminalPane.className = terminalPane.className
          .replace('bg-surface', 'bg-gray-50')
          .replace('border-zinc-700', 'border-gray-300')
      }

      if (contentPane) {
        contentPane.className = contentPane.className
          .replace('bg-bg', 'bg-white')
      }

      // Update prose classes
      const proseElements = document.querySelectorAll('.prose')
      proseElements.forEach(el => {
        el.classList.remove('prose-invert')
        el.classList.add('prose-gray')
      })
    } else {
      // Dark theme classes
      body.className = body.className
        .replace('bg-white', 'bg-bg')
        .replace('text-gray-900', 'text-text')
      
      if (terminalPane) {
        terminalPane.className = terminalPane.className
          .replace('bg-gray-50', 'bg-surface')
          .replace('border-gray-300', 'border-zinc-700')
      }

      if (contentPane) {
        contentPane.className = contentPane.className
          .replace('bg-white', 'bg-bg')
      }

      // Update prose classes
      const proseElements = document.querySelectorAll('.prose')
      proseElements.forEach(el => {
        el.classList.remove('prose-gray')
        el.classList.add('prose-invert')
      })
    }
  }

  getCurrentSkin(): string {
    return this.currentSkin
  }

  getSkins(): Record<string, Skin> {
    return skins
  }
}
