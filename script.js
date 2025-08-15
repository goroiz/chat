/* WhatsApp export -> pretty chat UI */
(() => {
  const chat = document.getElementById('chat');
  const fileInput = document.getElementById('chatFile');
  const tmpl = document.getElementById('bubbleTpl');
  const search = document.getElementById('search');
  const meNameInput = document.getElementById('meName');
  const otherNameInput = document.getElementById('otherName');
  const toggleTheme = document.getElementById('toggleTheme');
  const scrollBottomBtn = document.getElementById('scrollBottom');

  // Defaults based on the user's ask
  let ME_NAME = 'nanda';
  let OTHER_NAME = 'broo muksin';

  meNameInput.value = ME_NAME;
  otherNameInput.value = OTHER_NAME;

  const START_RE = /^\[(\d{2})\/(\d{2})\/(\d{2}), (\d{2})\.(\d{2})\.(\d{2})\] ([^:]+): (.*)$/;

  let messages = []; // {date: Date, author: string, text: string}

  function normalizeName(s){ return (s||'').trim().toLowerCase(); }

  function parseExport(text){
    messages = [];
    let current = null;

    const lines = text.replace(/\r\n/g, '\n').split('\n');
    for(const raw of lines){
      const line = raw.trimEnd();
      const m = line.match(START_RE);
      if(m){
        // push previous
        if(current) messages.push(current);
        const [_, dd, MM, yy, hh, mm, ss, author, body] = m;
        const dt = new Date(2000+Number(yy), Number(MM)-1, Number(dd), Number(hh), Number(mm), Number(ss));
        current = { date: dt, author: author.trim(), text: body };
      }else{
        if(current){
          // continuation of previous message (multiline)
          current.text += '\n' + line;
        }else if(line.length){
          // Ignore if the file starts with metadata
          // Keep as a system message
          current = { date: new Date(), author: 'system', text: line };
        }
      }
    }
    if(current) messages.push(current);
  }

  function clearChat(){ chat.innerHTML = ''; }

  function formatTime(d){
    const hh = String(d.getHours()).padStart(2,'0');
    const mm = String(d.getMinutes()).padStart(2,'0');
    return `${hh}:${mm}`;
  }

  function formatDateSep(d){
    return d.toLocaleDateString(undefined, { weekday:'short', year:'2-digit', month:'2-digit', day:'2-digit' });
  }

  function classifyContent(text){
    // basic types
    const t = text.trim();
    if(/^‎?sticker omitted/i.test(t)) return {kind:'sticker', label:'Sticker'};
    if(/^‎?image omitted/i.test(t))   return {kind:'image', label:'Image'};
    if(/^‎?video omitted/i.test(t))   return {kind:'video', label:'Video'};
    if(/^‎?audio omitted/i.test(t))   return {kind:'audio', label:'Audio'};
    if(/^‎?document omitted/i.test(t))return {kind:'document', label:'Document'};
    if(/^‎?This message was deleted\./i.test(t)) return {kind:'deleted', label:'Deleted message'};
    const loc = t.match(/^‎?Location:\s*(https?:\/\/\S+)/i);
    if(loc) return {kind:'location', label:'Location', url:loc[1]};
    return {kind:'text'};
  }

  function render(){
    clearChat();
    if(!messages.length){
      chat.innerHTML = '<div class="date-sep">Belum ada chat — import file .txt export WhatsApp</div>';
      return;
    }
    let lastDayKey = '';
    const meKey = normalizeName(ME_NAME);
    const otherKey = normalizeName(OTHER_NAME);

    for(const msg of messages){
      const dayKey = msg.date.toDateString();
      if(dayKey !== lastDayKey){
        const sep = document.createElement('div');
        sep.className = 'date-sep';
        sep.textContent = formatDateSep(msg.date);
        chat.appendChild(sep);
        lastDayKey = dayKey;
      }
      const isMe = normalizeName(msg.author) === meKey;
      const node = tmpl.content.firstElementChild.cloneNode(true);
      node.classList.add(isMe ? 'me' : 'other');

      const textEl = node.querySelector('.text');
      const metaEl = node.querySelector('.time');
      metaEl.textContent = formatTime(msg.date);

      const info = classifyContent(msg.text);

      if(info.kind === 'text'){
        textEl.textContent = msg.text;
      }else if(info.kind === 'location'){
        textEl.innerHTML = `<span class="badge">Location</span>\n<a href="${info.url}" target="_blank" rel="noopener">${info.url}</a>`;
        textEl.classList.add('media');
      }else{
        textEl.innerHTML = `<span class="badge">${info.label}</span>`;
        textEl.classList.add('media');
      }

      chat.appendChild(node);
    }
  }

  // File input & drag-drop
  fileInput.addEventListener('change', async (e) => {
    const f = e.target.files?.[0];
    if(!f) return;
    const text = await f.text();
    parseExport(text);
    render();
    scrollToBottom();
  });

  ['dragenter','dragover'].forEach(ev=>document.addEventListener(ev, e=>{
    e.preventDefault(); e.stopPropagation(); chat.classList.add('highlight');
  }));
  ['dragleave','drop'].forEach(ev=>document.addEventListener(ev, e=>{
    e.preventDefault(); e.stopPropagation(); chat.classList.remove('highlight');
  }));
  document.addEventListener('drop', async (e)=>{
    const f = e.dataTransfer?.files?.[0]; if(!f) return;
    const text = await f.text();
    parseExport(text); render(); scrollToBottom();
  });

  // Search
  search.addEventListener('input', () => {
    const q = search.value.trim().toLowerCase();
    const bubbles = chat.querySelectorAll('.msg');
    let visibleCount = 0;
    bubbles.forEach(b => {
      const text = b.querySelector('.text')?.innerText.toLowerCase() || '';
      const ok = !q || text.includes(q);
      b.style.display = ok ? '' : 'none';
      if(ok) visibleCount++;
    });
  });

  // Name mapping controls
  function updateNames(){
    ME_NAME = meNameInput.value.trim() || 'nanda';
    OTHER_NAME = otherNameInput.value.trim() || 'broo muksin';
    render();
  }
  meNameInput.addEventListener('change', updateNames);
  otherNameInput.addEventListener('change', updateNames);

  // Theme toggle
  function setTheme(light){
    document.body.classList.toggle('light', !!light);
    localStorage.setItem('wa_theme', light ? 'light' : 'dark');
  }
  toggleTheme.addEventListener('click', ()=>{
    const light = !document.body.classList.contains('light');
    setTheme(light);
  });
  setTheme(localStorage.getItem('wa_theme') === 'light');

  function scrollToBottom(){
    chat.scrollTop = chat.scrollHeight + 1000;
  }
  scrollBottomBtn.addEventListener('click', scrollToBottom);

  // If the app is hosted together with _chat.txt, try auto-load
  async function tryAutoLoad(){
    try{
      const res = await fetch('_chat.txt', {cache:'no-store'});
      if(res.ok){
        const text = await res.text();
        parseExport(text); render(); scrollToBottom();
      }
    }catch{ /* ignore */ }
  }
  tryAutoLoad();
})();