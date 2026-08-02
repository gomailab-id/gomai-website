
const body = document.body;
const langBtn = document.querySelector('[data-lang-toggle]');
if (langBtn) {
  const saved = localStorage.getItem('gomai-lang') || 'id';
  if (saved === 'zh') body.classList.add('zh');
  updateLangLabel();
  langBtn.addEventListener('click', () => {
    body.classList.toggle('zh');
    localStorage.setItem('gomai-lang', body.classList.contains('zh') ? 'zh' : 'id');
    updateLangLabel();
  });
}
function updateLangLabel(){
  if(!langBtn) return;
  langBtn.textContent = body.classList.contains('zh') ? '中文' : 'ID';
}
document.querySelectorAll('[data-main-image]').forEach(btn => {
  btn.addEventListener('click', () => {
    const main = document.querySelector('#mainProductImage');
    if (main) main.src = btn.dataset.mainImage;
    document.querySelectorAll('[data-main-image]').forEach(x => x.classList.remove('active'));
    btn.classList.add('active');
  });
});
document.querySelectorAll('.option').forEach(btn => {
  btn.addEventListener('click', () => {
    btn.parentElement.querySelectorAll('.option').forEach(x => x.classList.remove('selected'));
    btn.classList.add('selected');
  });
});
