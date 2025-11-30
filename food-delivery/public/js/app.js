function showToast(message, isError=false) {
  let toast = document.getElementById('toast');
  if (!toast) {
    toast = document.createElement('div');
    toast.id = 'toast';
    toast.style.position = 'fixed';
    toast.style.bottom = '20px';
    toast.style.right = '20px';
    toast.style.zIndex = '1055';
    document.body.appendChild(toast);
  }
  const el = document.createElement('div');
  el.className = `alert ${isError ? 'alert-danger' : 'alert-success'} shadow`;
  el.textContent = message;
  el.innerText = message;
  toast.appendChild(el);
  setTimeout(() => el.remove(), 2000);
}
if (typeof window !== 'undefined') window.showToast = window.showToast || showToast;