const STORAGE_KEY = 'mugla-geoinsight.panels.v1';
const DEFAULT_LAYOUT = { left: true, right: true, bottom: 'compact', lastBottom: 'compact', leftWidth: 244, rightWidth: 314, bottomHeight: 0.34 };
const clamp = (value, min, max) => Math.min(max, Math.max(min, value));

function readLayout() {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY));
    const layout = { ...DEFAULT_LAYOUT };
    for (const key of Object.keys(layout)) {
      if (typeof saved?.[key] === typeof layout[key]) layout[key] = saved[key];
    }
    if (!['expanded', 'compact'].includes(layout.lastBottom)) layout.lastBottom = 'expanded';
    if (!['expanded', 'compact', 'collapsed'].includes(layout.bottom)) layout.bottom = 'expanded';
    return layout;
  } catch {
    return { ...DEFAULT_LAYOUT };
  }
}

export function bindWorkspacePanels(scheduleMapRender) {
  const byId = (id) => document.getElementById(id);
  const workspace = byId('workspaceGrid');
  const dock = byId('bottomPanelDock');
  const bottomPanel = byId('floatingAnalysisPanel');
  const compactBar = bottomPanel.querySelector('.simple-year-bar');
  const focusButton = byId('btnFocusMode');
  const mobile = matchMedia('(max-width: 900px)');
  const layout = readLayout();
  const sides = {
    left: { panel: byId('leftSidebar'), open: byId('btnOpenLeft'), close: byId('btnCloseLeft'), handle: byId('resizeLeft') },
    right: { panel: byId('rightSidebar'), open: byId('btnOpenRight'), close: byId('btnCloseRight'), handle: byId('resizeRight') }
  };
  let drawer = null;
  let focusMode = false;
  let drawing = false;

  function save() {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(layout)); } catch { /* Storage may be disabled. */ }
  }

  function sizeLimits(edge) {
    if (edge === 'bottom') {
      const height = workspace.clientHeight;
      return [Math.min(148, Math.round(height * 0.46)), Math.round(height * 0.68)];
    }
    return [edge === 'left' ? 210 : 264, Math.min(edge === 'left' ? 390 : 510, Math.floor(workspace.clientWidth * 0.35))];
  }

  function applySizes() {
    for (const [edge, controls] of Object.entries(sides)) {
      const [min, max] = sizeLimits(edge);
      const width = clamp(layout[`${edge}Width`], min, Math.max(min, max));
      workspace.style.setProperty(`--${edge}-width`, `${width}px`);
      setSeparatorValue(controls.handle, min, Math.max(min, max), width);
    }
    const [min, max] = sizeLimits('bottom');
    const height = clamp(Math.round(layout.bottomHeight * workspace.clientHeight), min, max);
    dock.style.setProperty('--bottom-height', `${height}px`);
    setSeparatorValue(byId('resizeBottom'), min, max, height);
  }

  function render() {
    workspace.toggleAttribute('data-focus', focusMode);
    for (const [edge, controls] of Object.entries(sides)) {
      const open = !focusMode && (mobile.matches ? drawer === edge : layout[edge]);
      workspace.dataset[edge] = open ? 'open' : 'closed';
      controls.panel.inert = !open;
      controls.open.hidden = open || focusMode;
      controls.open.setAttribute('aria-expanded', open);
      controls.close.setAttribute('aria-expanded', open);
      controls.handle.hidden = !open || mobile.matches;
    }
    const mode = focusMode || (mobile.matches && drawer) ? 'collapsed'
      : drawing && layout.bottom === 'expanded' ? 'compact' : layout.bottom;
    dock.dataset.mode = mode;
    bottomPanel.inert = mode === 'collapsed';
    byId('btnOpenBottom').hidden = mode !== 'collapsed' || focusMode;
    byId('btnOpenBottom').setAttribute('aria-expanded', mode !== 'collapsed');
    byId('resizeBottom').hidden = mode !== 'expanded';
    byId('btnExpandBottom').setAttribute('aria-pressed', mode === 'expanded');
    byId('btnCompactBottom').setAttribute('aria-pressed', mode === 'compact');
    focusButton.setAttribute('aria-pressed', focusMode);
    focusButton.title = focusMode ? 'Restore panel layout (F)' : 'Expand map (F)';
    focusButton.setAttribute('aria-label', focusButton.title);
    focusButton.querySelector('span').textContent = focusMode ? 'Restore Panel Layout' : 'Expand Map';
  }

  function setBottomMode(mode) {
    focusMode = false;
    if (mobile.matches) drawer = null;
    layout.bottom = mode;
    if (mode !== 'collapsed') layout.lastBottom = mode;
    render();
    save();
  }

  function toggleFocus() {
    focusMode = !focusMode;
    render();
  }

  for (const [edge, controls] of Object.entries(sides)) {
    controls.open.addEventListener('click', () => {
      focusMode = false;
      if (mobile.matches) drawer = edge;
      else { layout[edge] = true; save(); }
      render();
      controls.close.focus();
    });
    controls.close.addEventListener('click', () => {
      if (mobile.matches) drawer = null;
      else { layout[edge] = false; save(); }
      render();
      controls.open.focus();
    });
    bindResize(controls.handle, edge);
  }

  byId('btnExpandBottom').addEventListener('click', () => setBottomMode('expanded'));
  byId('btnCompactBottom').addEventListener('click', () => setBottomMode('compact'));
  byId('btnCloseBottom').addEventListener('click', () => {
    setBottomMode('collapsed');
    byId('btnOpenBottom').focus();
  });
  byId('btnOpenBottom').addEventListener('click', () => {
    setBottomMode(layout.lastBottom);
    byId(layout.lastBottom === 'expanded' ? 'btnExpandBottom' : 'btnCompactBottom').focus();
  });
  focusButton.addEventListener('click', toggleFocus);
  document.addEventListener('keydown', (event) => {
    if (event.key.toLowerCase() !== 'f' || event.repeat || event.isComposing || event.ctrlKey || event.altKey || event.metaKey ||
        event.target.closest?.('input, textarea, select, [contenteditable], [role="textbox"]')) return;
    event.preventDefault();
    toggleFocus();
    focusButton.focus();
  });
  mobile.addEventListener('change', () => { drawer = null; render(); });
  bindResize(byId('resizeBottom'), 'bottom');

  // Tile drawing, clipping and overlays share the existing frame scheduler.
  // Observing the element catches grid animations and drags as well as window changes.
  new ResizeObserver(scheduleMapRender).observe(byId('mapViewport'));
  new ResizeObserver(applySizes).observe(workspace);
  new ResizeObserver(() => {
    if (compactBar.offsetHeight) dock.style.setProperty('--compact-height', `${compactBar.offsetHeight + 16}px`);
  }).observe(compactBar);
  applySizes();
  render();

  return {
    setBottomMode,
    setDrawing(value) {
      drawing = value;
      if (drawing) drawer = null;
      render();
    },
    isCompact() { return dock.dataset.mode === 'compact'; }
  };

  function bindResize(handle, edge) {
    const isBottom = edge === 'bottom';
    const direction = edge === 'left' ? 1 : -1;
    const readSize = () => isBottom ? dock.offsetHeight : sides[edge].panel.offsetWidth;
    function resize(size) {
      const [min, max] = sizeLimits(edge);
      const bounded = clamp(Math.round(size), min, Math.max(min, max));
      if (isBottom) layout.bottomHeight = bounded / Math.max(workspace.clientHeight, 1);
      else layout[`${edge}Width`] = bounded;
      applySizes();
    }
    let drag;
    handle.addEventListener('pointerdown', (event) => {
      if (event.button !== 0 || drag) return;
      event.preventDefault();
      handle.focus();
      drag = { id: event.pointerId, coordinate: isBottom ? event.clientY : event.clientX, size: readSize() };
      handle.setPointerCapture(event.pointerId);
      workspace.dataset.resizing = edge;
    });
    handle.addEventListener('pointermove', (event) => {
      if (drag?.id !== event.pointerId) return;
      const coordinate = isBottom ? event.clientY : event.clientX;
      resize(drag.size + (coordinate - drag.coordinate) * direction);
    });
    handle.addEventListener('lostpointercapture', () => {
      drag = null;
      delete workspace.dataset.resizing;
      save();
    });
    handle.addEventListener('keydown', (event) => {
      const step = { ArrowUp: isBottom ? -12 : 0, ArrowDown: isBottom ? 12 : 0, ArrowLeft: isBottom ? 0 : -12, ArrowRight: isBottom ? 0 : 12 }[event.key];
      if (!step && event.key !== 'Home' && event.key !== 'End') return;
      event.preventDefault();
      workspace.dataset.resizing = edge;
      const [min, max] = sizeLimits(edge);
      resize(event.key === 'Home' ? min : event.key === 'End' ? max : readSize() + step * direction);
      requestAnimationFrame(() => { if (!drag) delete workspace.dataset.resizing; });
      save();
    });
  }
}

function setSeparatorValue(handle, min, max, value) {
  handle.setAttribute('aria-valuemin', min);
  handle.setAttribute('aria-valuemax', max);
  handle.setAttribute('aria-valuenow', value);
  handle.setAttribute('aria-valuetext', `${value} pixels`);
}
