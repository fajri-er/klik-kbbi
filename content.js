let currentTooltip = null;

chrome.runtime.onMessage.addListener((request) => {
  if (request.action === "CONTEXT_SEARCH") showTooltip(request.word);
});

async function showTooltip(word) {
  if (currentTooltip) currentTooltip.remove();
  currentTooltip = document.createElement('div');
  currentTooltip.id = 'kbbi-ext-tooltip';
  
  const sel = window.getSelection();
  if (!sel.rangeCount) return;
  const rect = sel.getRangeAt(0).getBoundingClientRect();
  
  currentTooltip.style.top = `${window.scrollY + rect.bottom + 10}px`;
  currentTooltip.style.left = `${window.scrollX + rect.left}px`;
  currentTooltip.innerHTML = `<div id="kbbi-ext-close">&times;</div><div id="kbbi-ext-res">Mencari...</div>`;
  document.body.appendChild(currentTooltip);

  currentTooltip.querySelector('#kbbi-ext-close').onclick = () => currentTooltip.remove();

  chrome.runtime.sendMessage({ action: "FETCH_HTML", word: word.trim() }, (response) => {
    const resDiv = document.getElementById('kbbi-ext-res');
    if (!response || !response.success) {
      resDiv.innerHTML = "Gagal terhubung.";
      return;
    }
    renderKBBI(response.html, resDiv);
  });
}

function renderKBBI(html, container) {
  const parser = new DOMParser();
  const doc = parser.parseFromString(html, 'text/html');
  const main = doc.querySelector('.container.body-content');
  
  if (html.includes('Entri tidak ditemukan') || !main) {
    container.innerHTML = `<p style="color:#ed8936;">Kata tidak ditemukan.</p>`;
    return;
  }

  const blacklist = ["anda baru saja", "akun yang terdaftar", "etimologi hanya", "memudahkan pencarian", "© 2016", "tesaurus"];

  let output = "";
  const headings = main.querySelectorAll('h2');

  headings.forEach(h => {
    let hClone = h.cloneNode(true);
    hClone.querySelectorAll('sup').forEach(s => s.className = 'kbbi-sup');
    hClone.querySelectorAll('small, span').forEach(el => el.remove());
    output += `<span class="kbbi-ext-header">${hClone.innerHTML.trim()}</span>`;
    
    let sibling = h.nextElementSibling;
    while (sibling && sibling.tagName !== 'H2') {
      const textLower = sibling.innerText.toLowerCase();
      if (blacklist.some(b => textLower.includes(b))) {
        sibling = sibling.nextElementSibling;
        continue;
      }

      if (sibling.tagName === 'UL' || sibling.tagName === 'OL' || textLower.includes("bentuk tidak baku")) {
        let temp = sibling.cloneNode(true);
        processColorsAndLinks(temp);
        
        const lis = temp.querySelectorAll('li');
        if(lis.length > 0) {
            lis.forEach(li => {
               let liText = li.innerHTML.replace(/^\d+[\.\s]*/, "");
               output += `<div class="kbbi-ext-item">${liText}</div>`;
            });
        } else {
            output += `<div class="kbbi-ext-item">${temp.innerHTML}</div>`;
        }
      }
      sibling = sibling.nextElementSibling;
    }
  });

  container.innerHTML = output;
}

function processColorsAndLinks(node) {
  // Daftar kode tata bahasa yang HARUS MERAH
  const redLabels = ['n', 'v', 'a', 'adj', 'adv', 'num', 'pron', 'p', 'i'];
  // Daftar kode bidang yang HARUS HIJAU
  const greenLabels = ['ki', 'ark', 'cak', 'kl', 'hor', 'huk', 'bio', 'psi', 'mat', 'fis', 'kim', 'far'];

  node.querySelectorAll('a').forEach(a => {
    let href = a.getAttribute('href');
    if (href && href.startsWith('/')) {
      a.href = 'https://kbbi.kemendikdasmen.go.id' + href;
      a.target = '_blank';
    }
  });

  node.querySelectorAll('font, i, b, span').forEach(el => {
    const colorAttr = el.getAttribute('color');
    const text = el.innerText.trim().toLowerCase().replace(/[^a-z]/g, '');

    // HEURISTIC LOGIC: Cek isi teks dulu
    if (redLabels.includes(text) || colorAttr === 'red') {
      el.className = "kbbi-red";
    } else if (greenLabels.includes(text) || colorAttr === 'green') {
      el.className = "kbbi-green";
    } else if (el.tagName === 'I') {
      // Jika bukan label tata bahasa/bidang, baru dianggap contoh (abu-abu)
      if (!el.querySelector('.kbbi-red') && !el.querySelector('.kbbi-green')) {
        el.className = "kbbi-grey";
      }
    }
  });
}

document.addEventListener('mousedown', (e) => {
  if (currentTooltip && !currentTooltip.contains(e.target)) currentTooltip.remove();
});