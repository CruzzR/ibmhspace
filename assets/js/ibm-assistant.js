/**
 * U.Y.U.T — ibm-assistant.js  v2.0
 * IBM Watsonx Granite chat widget via Server-Sent Events streaming.
 * Supports multi-object targets (hilal, meteor, iss, milkyway).
 */

const IBMAssistant = (() => {
  const API_NARRATE = '/api/narrate';

  let _currentHilal  = null;
  let _currentScore  = null;
  let _currentTarget = 'hilal';

  /* ── DOM refs ─────────────────────────────────────────── */
  let messagesEl, inputEl, sendBtn;

  function init(opts = {}) {
    messagesEl = opts.messagesEl || document.getElementById('ai-messages');
    inputEl    = opts.inputEl    || document.getElementById('ai-input');
    sendBtn    = opts.sendBtn    || document.getElementById('ai-send');

    if (sendBtn) sendBtn.addEventListener('click', _handleSend);
    if (inputEl) {
      inputEl.addEventListener('keydown', e => {
        if (e.key === 'Enter' && !e.shiftKey) {
          e.preventDefault();
          _handleSend();
        }
      });
    }

    _appendMsg(
      'Salam! Saya UYUT, asisten astronomi berbasis IBM Granite. ' +
      'Pilih target pengamatan dan spot observasi di peta, lalu tanya saya kondisi terbaik!',
      'system'
    );
  }

  /** Inject current observation context: data, score, and active target */
  function setContext(hilalData, scoreData, targetId) {
    _currentHilal  = hilalData;
    _currentScore  = scoreData;
    _currentTarget = targetId || 'hilal';

    // Update context bar in AI panel
    const targetLabel = document.getElementById('ai-target-label');
    const spotLabel   = document.getElementById('ai-spot-label');
    const targetNames = {
      hilal: '🌙 Hilal', meteor: '☄️ Meteor',
      iss: '🛰️ ISS', milkyway: '🌌 Milky Way',
    };
    if (targetLabel) targetLabel.textContent = targetNames[_currentTarget] || _currentTarget;
    if (spotLabel && hilalData) {
      spotLabel.textContent = `· skor ${scoreData?.score ?? '—'}/100`;
    }
  }

  function _handleSend() {
    const question = inputEl?.value?.trim();
    if (!question) return;
    if (!_currentHilal) {
      _appendMsg('Pilih dahulu sebuah spot observasi di peta untuk melihat datanya.', 'system');
      return;
    }
    _appendMsg(question, 'user');
    inputEl.value = '';
    _stream(question);
  }

  function _stream(question) {
    if (sendBtn) sendBtn.disabled = true;

    const msgEl = _appendMsg('', 'ai');
    msgEl.innerHTML = '<span class="typing-cursor">▋</span>';
    let buffer = '';

    fetch(API_NARRATE, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        question,
        hilal_data: _currentHilal,
        obs_data:   _currentHilal,   // alias for non-hilal targets
        score_data: _currentScore || {},
        target:     _currentTarget,
      }),
    })
      .then(res => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const reader  = res.body.getReader();
        const decoder = new TextDecoder();

        function pump() {
          return reader.read().then(({ done, value }) => {
            if (done) { _finalise(msgEl, buffer); return; }
            const text = decoder.decode(value, { stream: true });
            text.split('\n').forEach(line => {
              if (line.startsWith('data: ')) {
                buffer += line.slice(6);
                msgEl.innerHTML = _md(buffer) + '<span class="typing-cursor">▋</span>';
                messagesEl.scrollTop = messagesEl.scrollHeight;
              }
            });
            return pump();
          });
        }
        return pump();
      })
      .catch(e => _finalise(msgEl, `[Kesalahan koneksi: ${e.message}]`))
      .finally(() => { if (sendBtn) sendBtn.disabled = false; });
  }

  function _finalise(el, text) {
    el.innerHTML = _md(text);
    messagesEl.scrollTop = messagesEl.scrollHeight;
  }

  function _appendMsg(text, type) {
    const div = document.createElement('div');
    div.className = `msg msg-${type}`;
    div.innerHTML = _md(text);
    messagesEl.appendChild(div);
    messagesEl.scrollTop = messagesEl.scrollHeight;
    return div;
  }

  /** Minimal markdown renderer */
  function _md(text) {
    return text
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
      .replace(/\*(.+?)\*/g,     '<em>$1</em>')
      .replace(/^- (.+)$/gm,     '• $1')
      .replace(/\n/g,            '<br>');
  }

  /** Auto-narrate when a spot is selected — question adapts to current target */
  function autoNarrate(spotName) {
    if (!_currentHilal) return;
    const questions = {
      hilal:    `Bagaimana kondisi hilal di ${spotName}? Apakah rekomendasinya untuk rukyat?`,
      meteor:   `Bagaimana kondisi pengamatan hujan meteor di ${spotName}? Kapan waktu terbaik?`,
      iss:      `Bagaimana lintasan ISS di lokasi ${spotName}? Berikan panduan pengamatan.`,
      milkyway: `Apakah ${spotName} cocok untuk astrofotografi Milky Way? Rekomendasikan pengaturan kamera.`,
    };
    const q = questions[_currentTarget] || questions.hilal;
    if (inputEl) inputEl.value = '';
    _appendMsg(q, 'user');
    _stream(q);
  }

  return { init, setContext, autoNarrate };
})();
