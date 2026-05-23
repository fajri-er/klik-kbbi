document.getElementById('btn-cari').onclick = cari;
document.getElementById('input-kata').onkeyup = (e) => { if(e.key === 'Enter') cari(); };

function cari() {
  const word = document.getElementById('input-kata').value.trim();
  const res = document.getElementById('result-container');
  if (!word) return;

  res.innerHTML = "Mencari...";

  chrome.runtime.sendMessage({ action: "FETCH_HTML", word: word }, (response) => {
    if (!response || !response.success) {
      res.innerHTML = "Gagal akses.";
      return;
    }

    const parser = new DOMParser();
    const doc = parser.parseFromString(response.html, 'text/html');
    const main = doc.querySelector('.container.body-content');
    if (response.html.includes('Entri tidak ditemukan') || !main) {
      res.innerHTML = `<p style="color:#ed8936; font-weight:500; text-align:center; padding:10px;">Kata tidak ditemukan.</p>`;
      return;
    }

    const redLabels = ['n', 'v', 'a', 'adj', 'adv', 'num', 'pron', 'p', 'i'];
    const greenLabels = ['ki', 'ark', 'cak', 'kl', 'hor', 'huk', 'bio', 'psi', 'mat', 'kim', 'far'];
    const blacklist = ["anda baru saja", "etimologi hanya", "© 2016"];
    let out = "";

    main.querySelectorAll('h2').forEach(h => {
      let hClone = h.cloneNode(true);
      hClone.querySelectorAll('sup').forEach(s => s.style.color = "#3498db");
      hClone.querySelectorAll('small, span').forEach(el => el.remove());
      out += `<div style="font-size:20px; font-weight:bold;">${hClone.innerHTML}</div>`;
      
      let sib = h.nextElementSibling;
      while(sib && sib.tagName !== 'H2') {
        if (blacklist.some(b => sib.innerText.toLowerCase().includes(b))) {
            sib = sib.nextElementSibling; continue;
        }
        
        let temp = sib.cloneNode(true);
        temp.querySelectorAll('font, i, b, span').forEach(el => {
            const text = el.innerText.trim().toLowerCase().replace(/[^a-z]/g, '');
            const c = el.getAttribute('color');
            
            if (redLabels.includes(text) || c === 'red') {
                el.style.color = '#d9534f';
                el.style.fontWeight = "bold";
                el.style.fontStyle = "italic";
            } else if (greenLabels.includes(text) || c === 'green') {
                el.style.color = '#27ae60';
                el.style.fontWeight = "bold";
                el.style.fontStyle = "italic";
            } else if (el.tagName === 'I') {
                el.style.color = "#718096";
            }
        });

        if (sib.tagName === 'UL' || sib.tagName === 'OL' || sib.innerText.includes("tidak baku")) {
            out += `<div style="margin:10px 0; font-size:14px; line-height:1.6;">${temp.innerHTML}</div>`;
        }
        sib = sib.nextElementSibling;
      }
    });
    res.innerHTML = out;
  });
}