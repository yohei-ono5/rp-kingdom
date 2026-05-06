export function createSceneInteractionController({
  camera,
  renderer,
  controls,
  raycaster,
  mouse,
  villageGroup,
  landPlotGroup,
  landPlotTargets,
  videoBillboardTargets = [],
  ui,
  dragThreshold,
  getRenderPixelRatio,
  getIntroActive,
  getCurrentView,
  getCameraTransitionActive,
  isPopupOpen,
  onStartIntro,
  onClosePopup,
  onToggleMap,
  onResetView,
  onFocusHouse,
  onFocusPlot,
  onClickVideoBillboard,
  onCameraManualChange,
  onToggleNavMenu,
  onCloseNavMenu
}) {
  let pointerDown = false;
  let dragMoved = false;
  let pointerStartX = 0;
  let pointerStartY = 0;
  let currentHoverPlot = null;
  let selectedPlot = null;

  function bindEvents() {
    window.addEventListener('resize', onResize);

    window.addEventListener('keydown', (event) => {
      if (getIntroActive() && event.key === 'Enter') {
        event.preventDefault();
        onStartIntro();
        return;
      }

      if (event.key === 'Escape') {
        onClosePopup();
        onCloseNavMenu?.();
      }
    });

    renderer.domElement.addEventListener('pointerdown', onPointerDown);
    renderer.domElement.addEventListener('pointermove', onPointerMove);
    renderer.domElement.addEventListener('pointerup', onPointerUp);
    renderer.domElement.addEventListener('pointerleave', onPointerLeave);
    controls.addEventListener('change', onControlsChange);

    ui.mapToggle?.addEventListener('click', () => {
      onToggleMap();
      onCloseNavMenu?.();
    });

    ui.resetView?.addEventListener('click', () => {
      onResetView();
      onCloseNavMenu?.();
    });

    ui.introEnter?.addEventListener('click', () => {
      onStartIntro();
    });

    ui.navMenuToggle?.addEventListener('click', (event) => {
      event.stopPropagation();
      onToggleNavMenu?.();
    });

    document.addEventListener('click', (event) => {
      if (!ui.topNav || !ui.topNav.contains(event.target)) {
        onCloseNavMenu?.();
      }
    });

    ui.viewButtons.forEach((button) => {
      button.addEventListener('click', () => {
        const id = button.dataset.view;
        const house = villageGroup.children.find((item) => item.userData.id === id);
        if (house) {
          onFocusHouse(house);
          onCloseNavMenu?.();
          return;
        }

        const billboard = videoBillboardTargets.find((item) => item.userData.id === id);
        if (billboard) {
          onClickVideoBillboard?.(billboard);
          onCloseNavMenu?.();
        }
      });
    });
  }

  function hideHoverOverlays() {
    hideHouseTooltip();
    hidePlotPanel();
    selectedPlot = null;
  }

  function hideTransientHovers() {
    hideHouseTooltip();
    if (!selectedPlot) {
      hidePlotPanel();
    }
  }

  function resetHoverState() {
    currentHoverPlot = null;

    villageGroup.children.forEach((house) => {
      house.userData.targetHoverScale = 1;
    });

    landPlotGroup.children.forEach((plot) => {
      const isSelected = plot === selectedPlot;
      plot.userData.targetHoverScale = isSelected ? 1.035 : 1;
      plot.userData.targetLift = isSelected ? 0.18 : 0;
    });
  }

  function getCurrentHoverPlot() {
    return currentHoverPlot || selectedPlot;
  }

  function onResize() {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setPixelRatio(getRenderPixelRatio());
    renderer.setSize(window.innerWidth, window.innerHeight);
  }

  function onControlsChange() {
    if (getIntroActive() || getCameraTransitionActive()) {
      return;
    }

    onCameraManualChange();
  }

  function onPointerDown(event) {
    if (getIntroActive()) return;
    pointerDown = true;
    dragMoved = false;
    pointerStartX = event.clientX;
    pointerStartY = event.clientY;
  }

  function onPointerMove(event) {
    if (getIntroActive()) {
      hideHoverOverlays();
      document.body.style.cursor = 'default';
      return;
    }

    if (pointerDown) {
      const dx = event.clientX - pointerStartX;
      const dy = event.clientY - pointerStartY;

      if (Math.abs(dx) > dragThreshold || Math.abs(dy) > dragThreshold) {
        dragMoved = true;
      }
    }

    if (event.pointerType === 'touch') {
      return;
    }

    if (isPopupOpen()) {
      hideTransientHovers();
      document.body.style.cursor = 'default';
      return;
    }

    const hoveredTarget = getHoveredTarget(event);
    const hoveredHouse = hoveredTarget?.type === 'house' ? hoveredTarget.object : null;
    const hoveredPlot = hoveredTarget?.type === 'plot' ? hoveredTarget.object : null;
    const hoveredBillboard = hoveredTarget?.type === 'billboard' ? hoveredTarget.object : null;
    const showHoverState = hoveredHouse && getCurrentView() === 'village';
    const showPlotState = hoveredPlot && getCurrentView() === 'village';
    const showBillboardState = hoveredBillboard && getCurrentView() === 'village';
    document.body.style.cursor = showHoverState || showPlotState || showBillboardState ? 'pointer' : 'default';

    villageGroup.children.forEach((house) => {
      const isHovered = hoveredHouse === house && getCurrentView() === 'village';
      house.userData.targetHoverScale = isHovered ? 1.04 : 1;
    });

    landPlotGroup.children.forEach((plot) => {
      const isHovered = hoveredPlot === plot && getCurrentView() === 'village';
      const isSelected = plot === selectedPlot;
      plot.userData.targetHoverScale = isHovered || isSelected ? 1.035 : 1;
      plot.userData.targetLift = isHovered || isSelected ? 0.18 : 0;
    });

    currentHoverPlot = showPlotState ? hoveredPlot : null;

    if (showHoverState) {
      showHouseTooltip(hoveredHouse, event);
      if (!selectedPlot) hidePlotPanel();
    } else if (showPlotState) {
      hideHouseTooltip();
      showPlotPanel(hoveredPlot, event);
    } else {
      hideTransientHovers();
    }
  }

  function onPointerUp(event) {
    if (getIntroActive()) return;
    if (!pointerDown) return;
    pointerDown = false;

    if (dragMoved) return;
    if (isPopupOpen()) return;

    const isTouch = event.pointerType === 'touch';
    const clickedTarget = getHoveredTarget(event);

    if (clickedTarget?.type === 'plot') {
      const plot = clickedTarget.object;
      selectedPlot = isTouch ? plot : null;
      showPlotPanel(plot, event);
      hideHouseTooltip();
      onFocusPlot?.(plot);
      return;
    }

    if (isTouch && selectedPlot) {
      selectedPlot = null;
      hidePlotPanel();
    }

    if (clickedTarget?.type === 'billboard') {
      selectedPlot = null;
      hidePlotPanel();
      hideHouseTooltip();
      onClickVideoBillboard?.(clickedTarget.object);
      return;
    }

    const clickedHouse = clickedTarget?.type === 'house' ? clickedTarget.object : null;
    if (!clickedHouse?.userData.url && !clickedHouse?.userData.links?.length) return;

    selectedPlot = null;
    hidePlotPanel();
    onFocusHouse(clickedHouse);
  }

  function onPointerLeave() {
    pointerDown = false;
    dragMoved = false;
    document.body.style.cursor = 'default';
    hideTransientHovers();
    resetHoverState();
  }

  function showHouseTooltip(house, event) {
    if (!ui.houseTooltip || !ui.houseTooltipLabel || !ui.houseTooltipName) {
      return;
    }

    ui.houseTooltipLabel.textContent = house.userData.label || house.userData.id?.toUpperCase() || 'HOUSE';
    ui.houseTooltipName.textContent = house.userData.name || '';
    ui.houseTooltip.style.left = `${event.clientX + 16}px`;
    ui.houseTooltip.style.top = `${event.clientY + 18}px`;
    ui.houseTooltip.classList.add('is-visible');
  }

  function hideHouseTooltip() {
    ui.houseTooltip?.classList.remove('is-visible');
  }

  function showPlotPanel(plot, event) {
    if (!ui.plotPanel) {
      return;
    }

    const data = plot.userData;
    if (ui.plotPanelStatus) ui.plotPanelStatus.textContent = data.status || 'FOR SALE';
    if (ui.plotPanelId) ui.plotPanelId.textContent = `${data.plotPrefix || 'Plot'} ${data.id}`;
    if (ui.plotPanelTitle) ui.plotPanelTitle.textContent = data.title || data.plotFallbackTitle || '分譲地';
    if (ui.plotPanelPrice) ui.plotPanelPrice.textContent = data.price || '';
    if (ui.plotPanelSize) ui.plotPanelSize.textContent = data.size || '';
    if (ui.plotPanelDesc) ui.plotPanelDesc.textContent = data.description || '';

    ui.plotPanel.classList.add('is-visible');
    ui.plotPanel.setAttribute('aria-hidden', 'false');
    positionPlotPanel(event);
  }

  function hidePlotPanel() {
    ui.plotPanel?.classList.remove('is-visible');
    ui.plotPanel?.setAttribute('aria-hidden', 'true');
  }

  function positionPlotPanel(event) {
    if (!ui.plotPanel || !event) {
      return;
    }

    const margin = 12;
    const gap = event.pointerType === 'touch' ? 18 : 16;
    const rect = ui.plotPanel.getBoundingClientRect();
    let left = event.clientX + gap;
    let top = event.clientY + gap;

    if (left + rect.width + margin > window.innerWidth) {
      left = event.clientX - rect.width - gap;
    }

    if (top + rect.height + margin > window.innerHeight) {
      top = event.clientY - rect.height - gap;
    }

    left = Math.max(margin, Math.min(left, window.innerWidth - rect.width - margin));
    top = Math.max(margin, Math.min(top, window.innerHeight - rect.height - margin));

    ui.plotPanel.style.left = `${left}px`;
    ui.plotPanel.style.top = `${top}px`;
  }

  function updateMouseFromEvent(event) {
    const rect = renderer.domElement.getBoundingClientRect();
    mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
  }

  function getHoveredTarget(event) {
    updateMouseFromEvent(event);
    raycaster.setFromCamera(mouse, camera);

    const intersects = raycaster.intersectObjects(
      [...villageGroup.children, ...landPlotTargets, ...videoBillboardTargets],
      true
    );
    if (intersects.length === 0) return null;

    for (const intersect of intersects) {
      let object = intersect.object;
      while (
        object
        && !object.userData.isHouse
        && !object.userData.parentPlot
        && !object.userData.isVideoBillboard
        && object.parent
      ) {
        object = object.parent;
      }

      if (object?.userData?.isHouse) {
        return { type: 'house', object };
      }

      if (object?.userData?.parentPlot?.userData?.isLandPlot) {
        return { type: 'plot', object: object.userData.parentPlot };
      }

      if (object?.userData?.isVideoBillboard) {
        return { type: 'billboard', object };
      }
    }

    return null;
  }

  return {
    bindEvents,
    getCurrentHoverPlot,
    hideHoverOverlays,
    resetHoverState
  };
}
