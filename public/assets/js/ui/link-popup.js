import { DEFAULT_POPUP_TEXT } from '../i18n.js';

export function createLinkPopup({
  onResetFocus,
  onNavigate,
  getAnchorWorld,
  projectWorldToScreen,
  screenOffset = 22,
  getText
}) {
  let pendingUrl = null;
  let pendingLinks = [];
  let popupAnchorHouse = null;

  const popupEl = document.createElement('div');
  popupEl.style.display = 'none';
  popupEl.style.position = 'fixed';
  popupEl.style.left = '0';
  popupEl.style.top = '0';
  popupEl.style.transform = 'translate(-50%, -100%)';
  popupEl.style.background = 'rgba(20,16,40,0.96)';
  popupEl.style.color = '#fff4d8';
  popupEl.style.padding = '16px 18px';
  popupEl.style.borderRadius = '16px';
  popupEl.style.border = '1px solid rgba(255,220,140,0.35)';
  popupEl.style.boxShadow = '0 20px 60px rgba(0,0,0,0.45)';
  popupEl.style.zIndex = '1000';
  popupEl.style.minWidth = '240px';
  popupEl.style.maxWidth = '520px';
  popupEl.style.fontFamily = 'Georgia, serif';
  popupEl.style.pointerEvents = 'auto';

  const title = document.createElement('div');
  title.id = 'popup-title';
  title.style.fontSize = '18px';
  title.style.marginBottom = '8px';
  title.style.color = '#ffe7a8';
  popupEl.appendChild(title);

  const desc = document.createElement('div');
  desc.style.fontSize = '14px';
  desc.style.lineHeight = '1.5';
  desc.style.marginBottom = '14px';
  popupEl.appendChild(desc);

  const actions = document.createElement('div');
  actions.style.display = 'flex';
  actions.style.justifyContent = 'flex-end';
  actions.style.gap = '10px';
  actions.style.flexWrap = 'nowrap';

  const cancel = document.createElement('button');
  cancel.type = 'button';
  cancel.style.order = '2';
  cancel.style.padding = '10px 14px';
  cancel.style.borderRadius = '10px';
  cancel.style.border = '1px solid rgba(255,255,255,0.18)';
  cancel.style.background = 'rgba(255,255,255,0.08)';
  cancel.style.color = '#fff';
  cancel.style.cursor = 'pointer';

  const go = document.createElement('button');
  go.type = 'button';
  go.style.order = '1';
  go.style.padding = '10px 14px';
  go.style.borderRadius = '10px';
  go.style.border = '1px solid rgba(255,220,140,0.28)';
  go.style.background = 'linear-gradient(135deg, #f0b54a, #d98a2b)';
  go.style.color = '#2a1808';
  go.style.cursor = 'pointer';
  go.style.fontWeight = 'bold';

  actions.appendChild(cancel);
  actions.appendChild(go);
  popupEl.appendChild(actions);
  document.body.appendChild(popupEl);

  const resolveText = (key) => getText?.(key, DEFAULT_POPUP_TEXT[key]) || DEFAULT_POPUP_TEXT[key];

  const updateTexts = () => {
    desc.textContent = resolveText('popupQuestion');
    cancel.textContent = resolveText('cancel');
    go.textContent = resolveText('go');
  };

  updateTexts();

  const closePopup = ({ resetFocus = false } = {}) => {
    pendingUrl = null;
    pendingLinks = [];
    popupAnchorHouse = null;
    popupEl.style.display = 'none';
    removeOptionButtons();

    if (resetFocus) {
      onResetFocus?.();
    }
  };

  const updatePosition = () => {
    if (!popupAnchorHouse) {
      return;
    }

    const anchorWorld = getAnchorWorld(popupAnchorHouse);
    const screenPoint = projectWorldToScreen(anchorWorld);

    if (!screenPoint.visible) {
      popupEl.style.display = 'none';
      return;
    }

    popupEl.style.display = 'block';
    popupEl.style.left = `${screenPoint.x}px`;
    popupEl.style.top = `${screenPoint.y - screenOffset}px`;
  };

  cancel.addEventListener('click', (event) => {
    event.preventDefault();
    event.stopPropagation();
    closePopup({ resetFocus: true });
  });

  go.addEventListener('click', (event) => {
    event.preventDefault();
    event.stopPropagation();

    if (pendingUrl) {
      onNavigate?.(pendingUrl);
    }

    closePopup();
  });

  function removeOptionButtons() {
    actions.querySelectorAll('.popup-option-link').forEach((button) => {
      button.remove();
    });
    go.style.display = '';
    cancel.style.order = '2';
    go.style.order = '1';
    actions.style.justifyContent = 'flex-end';
  }

  function renderOptionButtons(links) {
    removeOptionButtons();
    pendingLinks = Array.isArray(links) ? links : [];

    if (pendingLinks.length === 0) {
      return;
    }

    go.style.display = 'none';
    cancel.style.order = '3';
    actions.style.justifyContent = 'flex-start';

    pendingLinks.forEach((link, index) => {
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'popup-option-link';
      button.textContent = link.label || link.id || resolveText('go');
      button.style.order = String(index + 1);
      button.style.padding = '10px 14px';
      button.style.borderRadius = '10px';
      button.style.border = '1px solid rgba(255,220,140,0.28)';
      button.style.background = 'linear-gradient(135deg, #f0b54a, #d98a2b)';
      button.style.color = '#2a1808';
      button.style.cursor = 'pointer';
      button.style.fontWeight = 'bold';

      button.addEventListener('click', (event) => {
        event.preventDefault();
        event.stopPropagation();

        if (link.url) {
          onNavigate?.(link.url);
        }

        closePopup();
      });

      actions.appendChild(button);
    });
  }

  return {
    openPopup(name, destination, house) {
      const links = Array.isArray(destination)
        ? destination
        : destination?.links;
      const url = typeof destination === 'string'
        ? destination
        : destination?.url;

      pendingUrl = url || null;
      popupAnchorHouse = house || null;
      title.textContent = name || resolveText('fallbackLinkTitle');
      renderOptionButtons(links);
      popupEl.style.display = 'block';
      updatePosition();
    },
    closePopup,
    updateTexts,
    updatePosition,
    isOpen() {
      return popupEl.style.display !== 'none';
    }
  };
}
