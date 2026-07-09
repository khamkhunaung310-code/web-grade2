(function () {
    const MODEL = "claude-sonnet-5";
    const STORAGE_KEY = "hotseat_api_key";
    const MAX_QUESTIONS = 20;

    const setupScreen = document.getElementById('setupScreen');
    const gameScreen = document.getElementById('gameScreen');
    const topActions = document.getElementById('topActions');
    const apiKeyInput = document.getElementById('apiKey');
    const rememberKey = document.getElementById('rememberKey');
    const categorySelect = document.getElementById('category');
    const beginBtn = document.getElementById('beginBtn');
    const setupError = document.getElementById('setupError');

    const briefingEl = document.getElementById('briefing');
    const transcriptEl = document.getElementById('transcript');
    const loadingEl = document.getElementById('loadingIndicator');
    const gameErrorEl = document.getElementById('gameError');
    const endBanner = document.getElementById('endBanner');
    const endMessage = document.getElementById('endMessage');
    const inputRow = document.getElementById('inputRow');
    const playerInput = document.getElementById('playerInput');
    const submitBtn = document.getElementById('submitBtn');
    const gaugeSvg = document.getElementById('gaugeSvg');
    const gaugeCaption = document.getElementById('gaugeCaption');
    const questionCountEl = document.getElementById('questionCount');
    const counterFill = document.getElementById('counterFill');
    const newCaseBtn = document.getElementById('newCaseBtn');
    const changeKeyBtn = document.getElementById('changeKeyBtn');

    let apiKey = null;
    let secretWord = null;
    let category = null;
    let history = [];
    let questionsUsed = 0;
    let gameOver = false;

    try {
        const saved = localStorage.getItem(STORAGE_KEY);
        if (saved) { apiKeyInput.value = saved; rememberKey.checked = true; }
    } catch (e) { }

    beginBtn.addEventListener('click', beginCase);
    newCaseBtn.addEventListener('click', resetToSetup);
    changeKeyBtn.addEventListener('click', resetToSetup);
    submitBtn.addEventListener('click', handleSubmit);
    playerInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') { e.preventDefault(); handleSubmit(); }
    });

    drawGauge(0);

    function resetToSetup() {
        gameScreen.style.display = 'none';
        topActions.style.display = 'none';
        setupScreen.style.display = 'block';
        history = []; questionsUsed = 0; gameOver = false; secretWord = null;
        transcriptEl.innerHTML = '';
        setupError.style.display = 'none';
        endBanner.style.display = 'none';
        updateCounter();
    }

    function showSetupError(msg) { setupError.textContent = msg; setupError.style.display = 'block'; }
    function showGameError(msg) { gameErrorEl.textContent = msg; gameErrorEl.style.display = 'block'; }

    async function beginCase() {
        const key = apiKeyInput.value.trim();
        if (!key) { showSetupError('Enter your Anthropic API key to begin.'); return; }
        apiKey = key;
        try {
            if (rememberKey.checked) { localStorage.setItem(STORAGE_KEY, key); }
            else { localStorage.removeItem(STORAGE_KEY); }
        } catch (e) { }

        category = categorySelect.value;
        setupError.style.display = 'none';
        setupScreen.style.display = 'none';
        gameScreen.style.display = 'grid';
        topActions.style.display = 'flex';
        transcriptEl.innerHTML = '';
        endBanner.style.display = 'none';
        gameErrorEl.style.display = 'none';
        history = []; questionsUsed = 0; gameOver = false;
        updateCounter();
        drawGauge(0);
        gaugeCaption.textContent = '— awaiting first question —';

        briefingEl.textContent = 'Booking the witness…';
        loadingEl.style.display = 'flex';
        inputRow.style.display = 'none';

        try {
            const pick = await callJudge({
                system: `You are the Case Master for Hot Seat, a twenty-questions guessing game. Secretly select one single, concrete, guessable noun within this category: ${category}. It should be specific enough to be guessable in 20 yes/no questions, not too obscure, not a proper name unless the category calls for it.

Respond with ONLY a single JSON object, no markdown fences, no commentary:
{"secretWord": "the word, lowercase", "briefing": "one or two sentences of hardboiled noir flavor text setting the scene for an interrogation, written to the player, that gives NO hints about the word itself"}`,
                messages: [{ role: "user", content: "Pick the word and open the case." }]
            });
            secretWord = (pick.secretWord || '').trim().toLowerCase();
            briefingEl.textContent = pick.briefing || 'The witness sits across the table, saying nothing.';
        } catch (err) {
            briefingEl.textContent = '';
            showGameError('Could not open the case: ' + err.message);
            loadingEl.style.display = 'none';
            inputRow.style.display = 'flex';
            return;
        }

        loadingEl.style.display = 'none';
        inputRow.style.display = 'flex';
        playerInput.focus();
    }

    async function handleSubmit() {
        if (gameOver) return;
        const text = playerInput.value.trim();
        if (!text) return;
        if (questionsUsed >= MAX_QUESTIONS) return;

        gameErrorEl.style.display = 'none';
        playerInput.value = '';
        submitBtn.disabled = true;
        loadingEl.style.display = 'flex';

        const judgeSystem = `You are the Case Master judging Hot Seat, a twenty-questions guessing game. The secret word is "${secretWord}" (category: ${category}). NEVER reveal the secret word unless the player has just guessed it exactly correctly (accounting for obvious synonyms or singular/plural).

For each player message, decide:
- If it reads as an attempt to guess the exact secret word: judge correctness. If correct, set isCorrectGuess true and write a short triumphant noir "case closed" note that reveals the word. If wrong, set isCorrectGuess false and give a dismissive noir reply, WITHOUT revealing the word.
- Otherwise, treat it as a yes/no question about the word. Answer strictly with one of: "Yes.", "No.", "Sometimes.", or "That's not a yes-or-no question." Stay accurate and consistent with the secret word and with everything asked before.

Also produce a "heat" integer 0-100: how close this question/guess is to the secret word's identity (0 = ice cold/irrelevant, 100 = dead on). Judge this honestly based on semantic closeness, not just yes/no answers.

Respond with ONLY a single JSON object, no markdown fences, no commentary, exactly:
{"type": "answer" or "guessResult", "reply": "short reply per rules above", "heat": 0-100, "isCorrectGuess": true or false, "note": "optional short noir aside, max 12 words, can be empty string"}`;

        history.push({ role: "user", content: text });

        let result;
        try {
            result = await callJudge({ system: judgeSystem, messages: history });
        } catch (err) {
            history.pop();
            loadingEl.style.display = 'none';
            submitBtn.disabled = false;
            showGameError('The witness clams up: ' + err.message);
            return;
        }
        history.push({ role: "assistant", content: JSON.stringify(result) });

        loadingEl.style.display = 'none';
        submitBtn.disabled = false;

        questionsUsed++;
        updateCounter();
        drawGauge(result.heat || 0);
        updateGaugeCaption(result.heat || 0);

        addTranscriptEntry(text, result);

        if (result.isCorrectGuess) {
            endGame(true, result.reply);
        } else if (questionsUsed >= MAX_QUESTIONS) {
            endGame(false, `Time's up. The word was "${secretWord}". The witness walks.`);
        }

        playerInput.focus();
    }

    function addTranscriptEntry(question, result) {
        const row = document.createElement('div');
        row.className = 'entry';
        const replyClass = classifyReply(result.reply);
        const noteHtml = result.note ? `<span class="note">${escapeHtml(result.note)}</span>` : '';
        row.innerHTML = `<div class="q">${escapeHtml(question)}</div><div class="a ${replyClass}">${escapeHtml(result.reply)}</div>${noteHtml}`;
        transcriptEl.appendChild(row);
        transcriptEl.scrollTop = transcriptEl.scrollHeight;
    }

    function classifyReply(reply) {
        const r = (reply || '').toLowerCase();
        if (r.startsWith('yes')) return 'yes';
        if (r.startsWith('no')) return 'no';
        if (r.startsWith('sometimes')) return 'sometimes';
        return 'neutral';
    }

    function endGame(won, message) {
        gameOver = true;
        inputRow.style.display = 'none';
        endBanner.style.display = 'block';
        endMessage.textContent = won
            ? `CASE CLOSED — ${message} (cracked it in ${questionsUsed} question${questionsUsed === 1 ? '' : 's'})`
            : message;
        endBanner.style.borderColor = won ? 'var(--moss)' : 'var(--red-stamp)';
    }

    function updateCounter() {
        questionCountEl.textContent = questionsUsed;
        counterFill.style.width = Math.min(100, (questionsUsed / MAX_QUESTIONS) * 100) + '%';
    }

    function updateGaugeCaption(heat) {
        if (heat >= 85) gaugeCaption.textContent = 'Needle\'s pinned. You\'re right on top of it.';
        else if (heat >= 60) gaugeCaption.textContent = 'Getting warm. Keep pulling that thread.';
        else if (heat >= 35) gaugeCaption.textContent = 'Lukewarm. Could go either way.';
        else gaugeCaption.textContent = 'Stone cold. Try another angle.';
    }

    async function callJudge({ system, messages }) {
        const response = await fetch("https://api.anthropic.com/v1/messages", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "x-api-key": apiKey,
                "anthropic-version": "2023-06-01",
                "anthropic-dangerous-direct-browser-access": "true"
            },
            body: JSON.stringify({
                model: MODEL,
                max_tokens: 400,
                system: system,
                messages: messages
            })
        });

        if (!response.ok) {
            const errBody = await response.json().catch(() => ({}));
            const msg = (errBody && errBody.error && errBody.error.message) ? errBody.error.message : `Request failed (${response.status})`;
            throw new Error(msg);
        }
        const data = await response.json();
        const rawText = (data.content || []).map(b => b.text || '').join('').trim();
        const cleaned = rawText.replace(/^```json\s*/i, '').replace(/^```\s*/, '').replace(/```\s*$/, '').trim();
        try {
            return JSON.parse(cleaned);
        } catch (e) {
            throw new Error('could not read the judge\'s notes');
        }
    }

    function escapeHtml(str) {
        const div = document.createElement('div');
        div.textContent = str;
        return div.innerHTML;
    }

    // ---------- Polygraph gauge ----------
    function drawGauge(heat) {
        heat = Math.max(0, Math.min(100, heat));
        const cx = 100, cy = 110, r = 78;
        const startAngle = 180, endAngle = 0; // semicircle, left to right
        const angle = startAngle + (endAngle - startAngle) * (heat / 100); // degrees
        const rad = angle * Math.PI / 180;
        const needleX = cx + r * 0.82 * Math.cos(rad);
        const needleY = cy - r * 0.82 * Math.sin(rad);

        let svg = '';
        // arc background segments: cold(red)->mid(amber)->hot(moss)
        svg += arcSegment(cx, cy, r, 180, 120, '#a3392b');
        svg += arcSegment(cx, cy, r, 120, 60, '#e3a857');
        svg += arcSegment(cx, cy, r, 60, 0, '#6f8f5f');
        // tick marks
        for (let i = 0; i <= 10; i++) {
            const a = 180 - i * 18;
            const ar = a * Math.PI / 180;
            const x1 = cx + (r + 4) * Math.cos(ar), y1 = cy - (r + 4) * Math.sin(ar);
            const x2 = cx + (r + 10) * Math.cos(ar), y2 = cy - (r + 10) * Math.sin(ar);
            svg += `<line x1="${x1.toFixed(1)}" y1="${y1.toFixed(1)}" x2="${x2.toFixed(1)}" y2="${y2.toFixed(1)}" stroke="#38332a" stroke-width="1.5"/>`;
        }
        // needle
        svg += `<line x1="${cx}" y1="${cy}" x2="${needleX.toFixed(1)}" y2="${needleY.toFixed(1)}" stroke="#e8e1d0" stroke-width="2.5" stroke-linecap="round"/>`;
        svg += `<circle cx="${cx}" cy="${cy}" r="6" fill="#e3a857" stroke="#0e0d0b" stroke-width="1.5"/>`;
        // labels
        svg += `<text x="16" y="126" font-family="Courier Prime, monospace" font-size="9" fill="#8f8878">COLD</text>`;
        svg += `<text x="164" y="126" font-family="Courier Prime, monospace" font-size="9" fill="#8f8878">HOT</text>`;

        gaugeSvg.setAttribute('viewBox', '0 0 200 130');
        gaugeSvg.innerHTML = svg;
    }

    function arcSegment(cx, cy, r, a1, a2, color) {
        const r1 = a1 * Math.PI / 180, r2 = a2 * Math.PI / 180;
        const x1 = cx + r * Math.cos(r1), y1 = cy - r * Math.sin(r1);
        const x2 = cx + r * Math.cos(r2), y2 = cy - r * Math.sin(r2);
        const largeArc = Math.abs(a1 - a2) > 180 ? 1 : 0;
        return `<path d="M ${x1.toFixed(1)} ${y1.toFixed(1)} A ${r} ${r} 0 ${largeArc} 1 ${x2.toFixed(1)} ${y2.toFixed(1)}" stroke="${color}" stroke-width="9" fill="none" opacity="0.85" stroke-linecap="round"/>`;
    }
})();