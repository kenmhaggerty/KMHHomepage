const LINK_ICON = `<svg viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M6.5 9.5L9.5 6.5M7 4L7.94 3.06A2.5 2.5 0 1 1 11.44 6.56L10.5 7.5M9 12L8.06 12.94A2.5 2.5 0 1 1 4.56 9.44L5.5 8.5" stroke="currentColor" stroke-width="1.3" stroke-linecap="round" stroke-linejoin="round"/></svg>`;

function renderSiteTitle(el, text) {
  el.innerHTML = '';
  let runs = [];
  for (const ch of text) {
    const isSmall = /[a-z]/.test(ch);
    const cls = isSmall ? 'rest' : 'cap';
    if (runs.length && runs[runs.length - 1].cls === cls) {
      runs[runs.length - 1].text += ch;
    } else {
      runs.push({ cls, text: ch });
    }
  }
  for (const run of runs) {
    const span = document.createElement('span');
    span.className = run.cls;
    span.textContent = run.text;
    el.appendChild(span);
  }
}

async function loadJSON(path) {
  const res = await fetch(path);
  if (!res.ok) throw new Error(`Failed to load ${path}: ${res.status}`);
  return res.json();
}

function renderGalleryPanel(item) {
  const link = document.createElement('a');
  link.className = 'gallery-panel';
  link.href = `images/${item.full_res}`;
  link.target = '_blank';
  link.rel = 'noopener';

  const img = document.createElement('img');
  img.src = `images/${item.preview}`;
  img.alt = item.alt_text || '';
  link.appendChild(img);

  return link;
}

function renderTextSection(section) {
  const wrap = document.createElement('div');
  wrap.className = 'section';

  const title = document.createElement('p');
  title.className = 'section-title';
  title.textContent = section.title;
  wrap.appendChild(title);

  const body = document.createElement('div');
  body.className = 'section-body';
  body.innerHTML = section.html_content;
  wrap.appendChild(body);

  return wrap;
}

function renderLinksSection(section) {
  const wrap = document.createElement('div');
  wrap.className = 'section';

  const title = document.createElement('p');
  title.className = 'section-title';
  title.textContent = section.title;
  wrap.appendChild(title);

  for (const link of section.links) {
    const pill = document.createElement('a');
    pill.className = 'link-pill';
    pill.href = link.url;
    pill.target = '_blank';
    pill.rel = 'noopener';

    const icon = document.createElement('span');
    icon.innerHTML = LINK_ICON;
    pill.appendChild(icon.firstElementChild);

    const label = document.createElement('span');
    label.textContent = link.title;
    pill.appendChild(label);

    wrap.appendChild(pill);
  }

  return wrap;
}

async function init() {
  const params = new URLSearchParams(window.location.search);
  const key = params.get('key') || 'gfm';

  const [siteInfo, project] = await Promise.all([
    loadJSON('site-info.json'),
    loadJSON(`case-studies/${key}.json`),
  ]);

  document.title = `${project.title} — ${siteInfo.title}`;
  renderSiteTitle(document.getElementById('site-title'), siteInfo.title);
  document.getElementById('site-footer').textContent = siteInfo.footer;

  document.getElementById('project-title').textContent = project.title;
  document.getElementById('project-company').textContent = project.company;
  document.getElementById('project-year').textContent = project.year;

  const galleryEl = document.getElementById('gallery-scroll');
  for (const item of project.gallery || []) {
    galleryEl.appendChild(renderGalleryPanel(item));
  }

  const sectionsEl = document.getElementById('sections');
  for (const section of project.sections || []) {
    sectionsEl.appendChild(
      section.links ? renderLinksSection(section) : renderTextSection(section)
    );
  }
}

init().catch((err) => {
  console.error(err);
});
