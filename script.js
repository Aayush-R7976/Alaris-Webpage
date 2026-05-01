const navToggle = document.querySelector('.nav-toggle');
const siteNav = document.querySelector('.site-nav');
const searchInput = document.getElementById('teamSearch');
const teamGrid = document.getElementById('teamGrid');
const leadershipGrid = document.getElementById('leadershipGrid');
const emptyState = document.getElementById('teamEmpty');
const filterChips = Array.from(document.querySelectorAll('.filter-chip'));

if (navToggle && siteNav) {
  navToggle.addEventListener('click', () => {
    siteNav.classList.toggle('open');
    const expanded = navToggle.getAttribute('aria-expanded') === 'true';
    navToggle.setAttribute('aria-expanded', String(!expanded));
  });

  siteNav.querySelectorAll('a').forEach((link) => {
    link.addEventListener('click', () => {
      siteNav.classList.remove('open');
      navToggle.setAttribute('aria-expanded', 'false');
    });
  });
}

const modalRoot = document.createElement('div');
modalRoot.className = 'person-modal';
modalRoot.innerHTML = `
  <div class="person-modal-backdrop"></div>
  <div class="person-modal-dialog" role="dialog" aria-modal="true" aria-labelledby="personModalName">
    <button class="person-modal-close" aria-label="Close modal">&times;</button>
    <div class="person-modal-content">
      <div class="person-modal-image-wrap">
        <img id="personModalImage" class="person-modal-image" src="" alt="">
      </div>
      <div class="person-modal-body">
        <h3 id="personModalName"></h3>
        <p id="personModalRole" class="person-modal-role"></p>
        <p id="personModalBio" class="person-modal-bio"></p>
        <div id="personModalLinks" class="person-modal-links"></div>
      </div>
    </div>
  </div>
`;
document.body.appendChild(modalRoot);

const modalEls = {
  root: modalRoot,
  backdrop: modalRoot.querySelector('.person-modal-backdrop'),
  close: modalRoot.querySelector('.person-modal-close'),
  image: modalRoot.querySelector('#personModalImage'),
  name: modalRoot.querySelector('#personModalName'),
  role: modalRoot.querySelector('#personModalRole'),
  bio: modalRoot.querySelector('#personModalBio'),
  links: modalRoot.querySelector('#personModalLinks')
};

function normalizeText(value = '') {
  return String(value).replace(/\s+/g, ' ').trim();
}

function createId(name, index) {
  return `${String(name || 'member')
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')}-${index}`;
}

function normalizeGroup(section = '') {
  const s = section.toLowerCase();
  if (s.includes('founder') && !s.includes('co')) return 'founder';
  if (s.includes('co-founder') || s.includes('co founders')) return 'cofounder';
  if (s.includes('bioscience') || s.includes('biology')) return 'bioscience';
  if (s.includes('hardware')) return 'hardware';
  if (s.includes('ai engineering') || s.includes('coding') || s.includes('software')) return 'ai';
  return 'other';
}

function getShortBlurb(person) {
  return normalizeText(
    person.blurb ||
    person.cardBlurb ||
    person.description ||
    person.about ||
    person.bio ||
    ''
  );
}

function personImage(person, size = 600) {
  return person.image || `https://placehold.co/${size}x${size}?text=${encodeURIComponent(person.name || 'Member')}`;
}

function linkButton(label, href) {
  if (!href) return '';
  return `<a href="${href}" target="_blank" rel="noopener">${label}</a>`;
}

function createLeadershipCard(person) {
  return `
    <article class="leadership-card" tabindex="0" data-person="${person.id}">
      <img src="${personImage(person)}" alt="${person.name}"
        onerror="this.onerror=null; this.src='https://placehold.co/600x600?text=${encodeURIComponent(person.name)}'">
      <h3>${person.name}</h3>
      <p class="leadership-role">${person.role || ''}</p>
      <p class="leadership-blurb">${getShortBlurb(person)}</p>
    </article>
  `;
}

function createDirectoryCard(person) {
  return `
    <article class="person-card" tabindex="0" data-person="${person.id}" data-group="${person.group}">
      <img class="person-image" src="${personImage(person)}" alt="${person.name}"
        onerror="this.onerror=null; this.src='https://placehold.co/600x600?text=${encodeURIComponent(person.name)}'">
      <h4>${person.name}</h4>
      <p class="person-role">${[person.role, person.trackOrDept].filter(Boolean).join(' • ')}</p>
      <p class="person-bio">${getShortBlurb(person)}</p>
    </article>
  `;
}

function openModal(person) {
  modalEls.image.src = personImage(person, 800);
  modalEls.image.alt = person.name || '';
  modalEls.name.textContent = person.name || '';
  modalEls.role.textContent = [person.role, person.trackOrDept].filter(Boolean).join(' • ');
  modalEls.bio.textContent = normalizeText(person.bio || person.blurb || 'Bio coming soon.');

  const links = person.links || {};
  modalEls.links.innerHTML = [
    linkButton('Website', links.website),
    linkButton('GitHub', links.github),
    linkButton('LinkedIn', links.linkedin),
    linkButton('Email', links.email ? `mailto:${links.email}` : '')
  ].join('');

  modalEls.root.classList.add('open');
  document.body.classList.add('modal-open');
}

function closeModal() {
  modalEls.root.classList.remove('open');
  document.body.classList.remove('modal-open');
}

modalEls.backdrop.addEventListener('click', closeModal);
modalEls.close.addEventListener('click', closeModal);
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') closeModal();
});

let allPeople = [];
let activeFilter = 'all';
let activeQuery = '';

function leadershipPeople(team) {
  return team
    .filter(person => person.group === 'founder' || person.group === 'cofounder')
    .sort((a, b) => {
      if (/abraham nakhal/i.test(a.name)) return -1;
      if (/abraham nakhal/i.test(b.name)) return 1;
      if (a.group !== b.group) return a.group.localeCompare(b.group);
      return a.name.localeCompare(b.name);
    });
}

function directoryPeople(team) {
  return team
    .filter(person => ['bioscience', 'hardware', 'ai'].includes(person.group))
    .sort((a, b) => a.name.localeCompare(b.name));
}

function renderLeadership() {
  const leaders = leadershipPeople(allPeople);
  leadershipGrid.innerHTML = leaders.map(createLeadershipCard).join('');
}

function matchesQuery(person, query) {
  if (!query) return true;
  const haystack = normalizeText([
    person.name,
    person.role,
    person.trackOrDept,
    person.section,
    getShortBlurb(person),
    (person.tags || []).join(' ')
  ].join(' ')).toLowerCase();
  return haystack.includes(query.toLowerCase());
}

function renderDirectory() {
  const people = directoryPeople(allPeople).filter(person => {
    const groupOk = activeFilter === 'all' || person.group === activeFilter;
    return groupOk && matchesQuery(person, activeQuery);
  });

  teamGrid.innerHTML = people.map(createDirectoryCard).join('');
  emptyState.hidden = people.length !== 0;
  attachCardEvents();
}

function attachCardEvents() {
  document.querySelectorAll('[data-person]').forEach((card) => {
    const id = card.getAttribute('data-person');
    const person = allPeople.find(p => p.id === id);
    if (!person) return;

    card.addEventListener('click', () => openModal(person));
    card.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        openModal(person);
      }
    });
  });
}

function attachFilters() {
  filterChips.forEach((chip) => {
    chip.addEventListener('click', () => {
      activeFilter = chip.dataset.filter;
      filterChips.forEach(c => {
        const active = c === chip;
        c.classList.toggle('active', active);
        c.setAttribute('aria-selected', String(active));
      });
      renderDirectory();
    });
  });

  if (searchInput) {
    searchInput.addEventListener('input', () => {
      activeQuery = searchInput.value.trim();
      renderDirectory();
    });
  }
}

async function loadTeam() {
  const res = await fetch('team.json', { cache: 'no-cache' });
  if (!res.ok) throw new Error(`Failed to load team.json: ${res.status}`);
  const data = await res.json();
  return data.map((person, index) => ({
    ...person,
    id: person.id || createId(person.name, index),
    group: normalizeGroup(person.section || '')
  }));
}

(async function init() {
  try {
    allPeople = await loadTeam();
    renderLeadership();
    renderDirectory();
    attachFilters();
    attachCardEvents();
  } catch (err) {
    console.error(err);
    emptyState.hidden = false;
    emptyState.textContent = 'Unable to load team data right now.';
  }
})();
