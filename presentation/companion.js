// Decorative local animation. No model calls or pointer data storage.
(() => {
  const toggle = document.getElementById('agent-toggle');
  const eyes = [...document.querySelectorAll('.agent-eye')];
  const caption = document.getElementById('agent-caption');
  const motion = window.matchMedia('(prefers-reduced-motion: reduce)');
  let enabled = !motion.matches;
  let frame = null;
  let pointer = null;

  function centerEyes() {
    eyes.forEach(eye => { eye.querySelector('.agent-pupil').style.transform = 'translate(0px, 0px)'; });
  }
  function updateState() {
    toggle.setAttribute('aria-pressed', String(enabled));
    const label = enabled ? 'Pause agent animation' : 'Enable agent animation';
    toggle.setAttribute('aria-label', label);
    toggle.title = label;
    caption.textContent = enabled ? (caption.dataset.line || 'Your curious little copilot') : 'Taking a little break';
    if (!enabled) {
      if (frame !== null) cancelAnimationFrame(frame);
      frame = null;
      centerEyes();
    }
  }
  function draw() {
    frame = null;
    if (!enabled || !pointer) return;
    eyes.forEach(eye => {
      const rect = eye.getBoundingClientRect();
      const dx = pointer.x - (rect.left + rect.width / 2);
      const dy = pointer.y - (rect.top + rect.height / 2);
      const distance = Math.hypot(dx, dy);
      const scale = distance ? Math.min(distance / 100, 1) / distance : 0;
      eye.querySelector('.agent-pupil').style.transform = `translate(${dx * scale * 3}px, ${dy * scale * 4}px)`;
    });
  }
  document.addEventListener('pointermove', event => {
    if (!enabled || event.pointerType === 'touch') return;
    pointer = { x: event.clientX, y: event.clientY };
    if (frame === null) frame = requestAnimationFrame(draw);
  }, { passive: true });
  function reset() {
    pointer = null;
    if (frame !== null) cancelAnimationFrame(frame);
    frame = null;
    centerEyes();
  }
  document.documentElement.addEventListener('pointerleave', reset);
  window.addEventListener('blur', reset);
  toggle.addEventListener('click', () => { enabled = !enabled; updateState(); });
  motion.addEventListener('change', event => { enabled = !event.matches; updateState(); });
  updateState();
})();
