const sourceText = document.getElementById('source-text');
const targetText = document.getElementById('target-text');
const translateBtn = document.getElementById('translate-btn');
const swapBtn = document.getElementById('swap-btn');
const srcLangSelect = document.getElementById('src-lang-select');
const tgtLangSelect = document.getElementById('tgt-lang-select');
const charCount = document.querySelector('.char-count');
const copyBtn = document.getElementById('copy-btn');

// Swap Languages
swapBtn.addEventListener('click', () => {
    const tempLang = srcLangSelect.value;
    srcLangSelect.value = tgtLangSelect.value;
    tgtLangSelect.value = tempLang;

    // Swap text content as well
    const tempText = sourceText.value;
    sourceText.value = targetText.innerText === 'Translation will appear here...' ? '' : targetText.innerText;
    if (tempText) {
        translateText();
    } else {
        targetText.innerText = 'Translation will appear here...';
        targetText.classList.add('placeholder');
    }
});

// Character Count
sourceText.addEventListener('input', () => {
    const length = sourceText.value.length;
    charCount.innerText = `${length} / 500`;
    if (length > 500) {
        sourceText.value = sourceText.value.substring(0, 500);
    }
});

// Translate Function
async function translateText() {
    const text = sourceText.value.trim();
    if (!text) return;

    const srcLang = srcLangSelect.value;
    const tgtLang = tgtLangSelect.value;

    targetText.innerText = 'Translating...';
    targetText.classList.add('placeholder');
    translateBtn.disabled = true;
    translateBtn.innerText = 'Translating...';

    try {
        const response = await fetch(`https://api.mymemory.translated.net/get?q=${encodeURIComponent(text)}&langpair=${srcLang}|${tgtLang}`);
        const data = await response.json();

        if (data.responseData) {
            let translated = data.responseData.translatedText;

            // Special fix for Japanese characters
            if (tgtLang === 'ja' && !/[\u3040-\u30ff\u4e00-\u9faf]/.test(translated)) {
                const matches = data.matches;
                if (matches) {
                    const jpMatch = matches.find(m => /[\u3040-\u30ff\u4e00-\u9faf]/.test(m.translation));
                    if (jpMatch) translated = jpMatch.translation;
                }
            }

            // Special fix for Chinese characters (zh)
            if (tgtLang === 'zh' && !/[\u4e00-\u9fa5]/.test(translated)) {
                const matches = data.matches;
                if (matches) {
                    const zhMatch = matches.find(m => /[\u4e00-\u9fa5]/.test(m.translation));
                    if (zhMatch) translated = zhMatch.translation;
                }
            }

            targetText.innerText = translated;
            targetText.classList.remove('placeholder');
        } else {
            targetText.innerText = 'Error: Could not translate.';
        }
    } catch (error) {
        console.error('Translation error:', error);
        targetText.innerText = 'Error: Connection failed.';
    } finally {
        translateBtn.disabled = false;
        translateBtn.innerText = 'Translate Now';
    }
}

translateBtn.addEventListener('click', translateText);

// Copy to Clipboard
copyBtn.addEventListener('click', () => {
    const text = targetText.innerText;
    if (text && text !== 'Translation will appear here...' && text !== 'Translating...') {
        navigator.clipboard.writeText(text).then(() => {
            const icon = copyBtn.querySelector('i');
            icon.classList.replace('far', 'fas');
            icon.classList.replace('fa-copy', 'fa-check');
            setTimeout(() => {
                icon.classList.replace('fas', 'far');
                icon.classList.replace('fa-check', 'fa-copy');
            }, 2000);
        });
    }
});
