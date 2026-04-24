export function createSceneInteractionController({
  camera,
  renderer,
  controls,
  raycaster,
  mouse,
  villageGroup,
  landPlotGroup,
  landPlotTargets,
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

        if (!house) return;
        onFocusHouse(house);
        onCloseNavMenu?.();
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
    if (getIntroActive() || getCameraTransitionActive() || getCurrentView() === 'map') {
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
    const showHoverState = hoveredHouse && getCurrentView() === 'village';
    const showPlotState = hoveredPlot && getCurrentView() === 'village';
    document.body.style.cursor = showHoverState || showPlotState ? 'pointer' : 'default';

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
      showPlotPanel(hoveredPlot);
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
      if (isTouch) {
        const plot = clickedTarget.object;
        if (selectedPlot === plot) {
          selectedPlot = null;
          hidePlotPanel();
        } else {
          selectedPlot = plot;
          showPlotPanel(plot);
        }
      }
      return;
    }

    if (isTouch && selectedPlot) {
      selectedPlot = null;
      hidePlotPanel();
    }

    const clickedHouse = clickedTarget?.type === 'house' ? clickedTarget.object : null;
    if (!clickedHouse?.userData.url) return;

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

  function showPlotPanel(plot) {
    if (!ui.plotPanel) {
      return;
    }

    const data = plot.userData;
    if (ui.plotPanelStatus) ui.plotPanelStatus.textContent = data.status || 'FOR SALE';
    if (ui.plotPanelId) ui.plotPanelId.textContent = `Plot ${data.id}`;
    if (ui.plotPanelTitle) ui.plotPanelTitle.textContent = data.title || '分譲地';
    if (ui.plotPanelPrice) ui.plotPanelPrice.textContent = data.price || '';
    if (ui.plotPanelSize) ui.plotPanelSize.textContent = data.size || '';
    if (ui.plotPanelDesc) ui.plotPanelDesc.textContent = data.description || '';

    ui.plotPanel.classList.add('is-visible');
    ui.plotPanel.setAttribute('aria-hidden', 'false');
  }

  function hidePlotPanel() {
    ui.plotPanel?.classList.remove('is-visible');
    ui.plotPanel?.setAttribute('aria-hidden', 'true');
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
      [...villageGroup.children, ...landPlotTargets],
      true
    );
    if (intersects.length === 0) return null;

    for (const intersect of intersects) {
      let object = intersect.object;
      while (object && !object.userData.isHouse && !object.userData.parentPlot && object.parent) {
        object = object.parent;
      }

      if (object?.userData?.isHouse) {
        return { type: 'house', object };
      }

      if (object?.userData?.parentPlot?.userData?.isLandPlot) {
        return { type: 'plot', object: object.userData.parentPlot };
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
