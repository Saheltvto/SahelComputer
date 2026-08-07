const sideToggle = document.getElementById('sideToggle');
const sidebar = document.getElementById('sidebar');
const scrim = document.getElementById('scrim');

function closeSidebar() {
  sidebar.classList.remove('open');
  scrim.classList.remove('open');
}

if (sideToggle) {
  sideToggle.addEventListener('click', () => {
    sidebar.classList.toggle('open');
    scrim.classList.toggle('open');
  });
}
if (scrim) {
  scrim.addEventListener('click', closeSidebar);
}
