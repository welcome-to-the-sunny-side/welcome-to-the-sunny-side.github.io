document.addEventListener('DOMContentLoaded', () => {
    const currentSkin = document.documentElement.getAttribute('data-skin') || 'classic';
    setTimeout(() => {
        applyThemeToUtterances(currentSkin);
    }, 1000); // 1-second delay
});

function applyThemeToUtterances(skin) {
    const utterancesFrame = document.querySelector('.utterances-frame');
    if (utterancesFrame) {
        updateUtterancesTheme(skin);
    } else {
        // If the iframe is not found, try again after a short delay
        setTimeout(() => {
            const retryFrame = document.querySelector('.utterances-frame');
            if (retryFrame) {
                updateUtterancesTheme(skin);
            } else {
                console.log('Utterances iframe still not found after retry');
            }
        }, 1000); // 1-second delay before retry
    }
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
        console.log('Utterances iframe not found during theme update'); // Optional: For debugging
    }
}
