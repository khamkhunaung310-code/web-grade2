const sourceText = document.getElementById('source-text');
const targetText = document.getElementById('target-text');
const translateBtn = document.getElementById('translate-btn');
const swapBtn = document.getElementById('swap-btn');
const srcLangText = document.getElementById('src-lang-text');
const tgtLangText = document.getElementById('tgt-lang-text');
const charCount = document.querySelector('.char-count');
const copyBtn = document.getElementById('copy-btn');

let srcLang = 'ja';
let tgtLang = 'en';

// Swap Languages
swapBtn.addEventListener('click', () => {
    [srcLang, tgtLang] = [tgtLang, srcLang];
    srcLangText.innerText = srcLang === 'ja' ? 'Japanese' : 'English';
    tgtLangText.innerText = tgtLang === 'en' ? 'English' : 'Japanese';
    
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

    targetText.innerText = 'Translating...';
    targetText.classList.add('placeholder');
    translateBtn.disabled = true;
    translateBtn.innerText = 'Translating...';

    try {
        const response = await fetch(`https://api.mymemory.translated.net/get?q=${encodeURIComponent(text)}&langpair=${srcLang}|${tgtLang}`);
        const data = await response.json();

        if (data.responseData) {
            let translated = data.responseData.translatedText;
            
            // If the translation is in Romaji (like "gohan") and we want Japanese characters,
            // we try to find a match that contains actual Japanese characters.
            if (tgtLang === 'ja' && !/[\u3040-\u30ff\u4e00-\u9faf]/.test(translated)) {
                const matches = data.matches;
                if (matches) {
                    const jpMatch = matches.find(m => /[\u3040-\u30ff\u4e00-\u9faf]/.test(m.translation));
                    if (jpMatch) translated = jpMatch.translation;
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
