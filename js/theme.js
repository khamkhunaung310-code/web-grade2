const btn = document.querySelector('#theme-toggle');

btn.addEventListener('click', () => {
    const current = document.documentElement.dataset.theme;
    document.documentElement.dataset.theme =
        current === 'dark' ? 'light' : 'dark';
});