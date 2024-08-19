document.addEventListener('DOMContentLoaded', () => {
    const toggleButton = document.getElementById('skin-toggle');
    let currentSkin = localStorage.getItem('siteSkin') || document.documentElement.getAttribute('data-skin') || 'classic';
  
    // Set the initial skin and title
    document.documentElement.setAttribute('data-skin', currentSkin);
    updateTitle(currentSkin);
    updateButtonIcon(currentSkin);
  
    // Toggle function
    toggleButton.addEventListener('click', () => {
      currentSkin = currentSkin === 'classic' ? 'dark' : 'classic';
      localStorage.setItem('siteSkin', currentSkin);
      document.documentElement.setAttribute('data-skin', currentSkin);
      updateTitle(currentSkin);
      updateButtonIcon(currentSkin);
    });
  });
  
  // Function to update the site title and browser tab title based on skin
  function updateTitle(skin) {
    const siteTitleElement = document.querySelector('.site-title');
    const tabTitle = document.querySelector('title');
  
    if (skin === 'dark') {
      siteTitleElement.textContent = "welcome to the dark side!";
      tabTitle.textContent = "welcome to the dark side!";
    } else {
      siteTitleElement.textContent = "welcome to the sunny side!";
      tabTitle.textContent = "welcome to the sunny side!";
    }
  }
  
  // Function to update the button icon based on skin
  function updateButtonIcon(skin) {
    const toggleButton = document.getElementById('skin-toggle');
    
    if (skin === 'dark') {
      toggleButton.classList.add('dark');
    } else {
      toggleButton.classList.remove('dark');
    }
  }
  