document.addEventListener('DOMContentLoaded', () => {
    const currentSkin = document.documentElement.getAttribute('data-skin') || 'classic';
    waitForUtterancesIframe(currentSkin);
});

function waitForUtterancesIframe(skin) {
    const utterancesContainer = document.getElementById('utterances');

    // Create a MutationObserver to watch for changes in the utterancesContainer
    const observer = new MutationObserver(() => {
        const utterancesFrame = document.querySelector('.utterances-frame');
        if (utterancesFrame) {
            updateUtterancesTheme(skin);
            observer.disconnect(); // Stop observing once the iframe is found
        }
    });

    // Start observing the utterancesContainer for child additions
    observer.observe(utterancesContainer, { childList: true });
}

function updateUtterancesTheme(skin) {
    const utterancesFrame = document.querySelector('.utterances-frame');
    const theme = skin === 'dark' ? 'github-dark' : 'github-light';

    if (utterancesFrame) {
        console.log('Updating Utterances theme to:', theme); // Optional: For debugging
        const message = {
            type: 'set-theme',
            theme: theme
        };
        utterancesFrame.contentWindow.postMessage(message, 'https://utteranc.es');
    } else {
        console.log('Utterances iframe not found'); // Optional: For debugging
    }
}
