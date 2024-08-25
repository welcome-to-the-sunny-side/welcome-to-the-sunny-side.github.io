document.addEventListener('DOMContentLoaded', () => {
    const currentSkin = document.documentElement.getAttribute('data-skin') || 'classic';
    updateUtterancesTheme(currentSkin);
});

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
