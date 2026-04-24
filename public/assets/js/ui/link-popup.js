export function createLinkPopup({
  onResetFocus,
  onNavigate,
  getAnchorWorld,
  projectWorldToScreen,
  screenOffset = 22
}) {
  let pendingUrl = null;
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
  popupEl.style.maxWidth = '280px';
  popupEl.style.fontFamily = 'Georgia, serif';
  popupEl.style.pointerEvents = 'auto';

  const title = document.createElement('div');
  title.id = 'popup-title';
  title.style.fontSize = '18px';
  title.style.marginBottom = '8px';
  title.style.color = '#ffe7a8';
  popupEl.appendChild(title);

  const desc = document.createElement('div');
  desc.textContent = 'この建物のリンク先へ移動しますか？';
  desc.style.fontSize = '14px';
  desc.style.lineHeight = '1.5';
  desc.style.marginBottom = '14px';
  popupEl.appendChild(desc);

  const actions = document.createElement('div');
  actions.style.display = 'flex';
  actions.style.justifyContent = 'flex-end';
  actions.style.gap = '10px';

  const cancel = document.createElement('button');
  cancel.textContent = 'キャンセル';
  cancel.type = 'button';
  cancel.style.padding = '10px 14px';
  cancel.style.borderRadius = '10px';
  cancel.style.border = '1px solid rgba(255,255,255,0.18)';
  cancel.style.background = 'rgba(255,255,255,0.08)';
  cancel.style.color = '#fff';
  cancel.style.cursor = 'pointer';

  const go = document.createElement('button');
  go.textContent = '移動する';
  go.type = 'button';
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

  const closePopup = ({ resetFocus = false } = {}) => {
    pendingUrl = null;
    popupAnchorHouse = null;
    popupEl.style.display = 'none';

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

  return {
    openPopup(name, url, house) {
      pendingUrl = url;
      popupAnchorHouse = house || null;
      title.textContent = name || 'リンク先';
      popupEl.style.display = 'block';
      updatePosition();
    },
    closePopup,
    updatePosition,
    isOpen() {
      return popupEl.style.display !== 'none';
    }
  };
}
