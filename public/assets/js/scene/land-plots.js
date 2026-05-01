import * as THREE from 'three';

export function initLandPlots({
  plots,
  landPlotGroup,
  landPlotTargets,
  landPlotMeta,
  getPlotText = () => ({})
}) {
  plots.forEach((plot) => {
    const width = plot.width || 4.5;
    const depth = plot.depth || 4.5;
    const group = new THREE.Group();

    group.position.set(...plot.position);
    group.rotation.y = plot.rotationY || 0;
    group.userData = {
      ...plot,
      ...getPlotText(plot),
      isLandPlot: true,
      baseY: plot.position?.[1] || 0,
      targetHoverScale: 1,
      targetLift: 0
    };

    const floorMaterial = new THREE.MeshStandardMaterial({
      color: 0x49a655,
      transparent: true,
      opacity: 0.2,
      roughness: 0.88,
      metalness: 0.0,
      side: THREE.DoubleSide,
      depthWrite: false
    });

    const floor = new THREE.Mesh(new THREE.PlaneGeometry(width, depth), floorMaterial);
    floor.rotation.x = -Math.PI / 2;
    floor.position.y = 0.035;
    floor.userData = { isLandPlotTarget: true, parentPlot: group };
    group.add(floor);
    landPlotTargets.push(floor);

    const border = new THREE.LineSegments(
      new THREE.EdgesGeometry(new THREE.BoxGeometry(width, 0.03, depth)),
      new THREE.LineBasicMaterial({ color: 0xd7f08a, transparent: true, opacity: 0.85 })
    );
    border.position.y = 0.07;
    group.add(border);

    const postMaterial = new THREE.MeshStandardMaterial({
      color: 0xb99361,
      roughness: 0.78
    });

    [[-1, -1], [-1, 1], [1, -1], [1, 1]].forEach(([xSign, zSign]) => {
      const post = new THREE.Mesh(
        new THREE.CylinderGeometry(0.08, 0.12, 0.58, 6),
        postMaterial
      );
      post.position.set(
        xSign * (width / 2 - 0.16),
        0.29,
        zSign * (depth / 2 - 0.16)
      );
      post.castShadow = true;
      group.add(post);
    });

    const signZ = -depth * 0.28;
    const signWidth = 1.75;
    const signHeight = 1.75;
    const signDepth = 0.12;

    const stake = new THREE.Mesh(
      new THREE.CylinderGeometry(0.055, 0.075, 1.55, 6),
      postMaterial
    );
    stake.position.set(0, 0.78, signZ - signDepth * 0.68);
    stake.castShadow = true;
    group.add(stake);

    const signBoard = new THREE.Mesh(
      new THREE.BoxGeometry(signWidth, signHeight, signDepth),
      new THREE.MeshStandardMaterial({
        color: 0xc48a42,
        roughness: 0.74,
        metalness: 0.0
      })
    );
    signBoard.position.set(0, 1.72, signZ);
    signBoard.castShadow = true;
    signBoard.receiveShadow = true;
    signBoard.userData = { isLandPlotTarget: true, parentPlot: group };
    group.add(signBoard);
    landPlotTargets.push(signBoard);

    const sign = new THREE.Mesh(
      new THREE.PlaneGeometry(signWidth, signHeight),
      new THREE.MeshBasicMaterial({
        map: makeForSaleTexture(group.userData),
        side: THREE.FrontSide,
        transparent: false,
        depthWrite: true
      })
    );
    sign.position.set(0, 1.72, signZ + signDepth / 2 + 0.004);
    sign.userData = { isLandPlotTarget: true, parentPlot: group };
    group.add(sign);
    landPlotTargets.push(sign);

    landPlotGroup.add(group);
    landPlotMeta.push({
      group,
      floorMaterial,
      borderMaterial: border.material,
      signMaterial: sign.material,
      homeY: group.position.y
    });
  });
}

export function updateLandPlotLanguage({
  landPlotMeta,
  getPlotText = () => ({})
}) {
  landPlotMeta.forEach((meta) => {
    Object.assign(meta.group.userData, getPlotText(meta.group.userData));

    if (!meta.signMaterial) return;
    const previousTexture = meta.signMaterial.map;
    meta.signMaterial.map = makeForSaleTexture(meta.group.userData);
    meta.signMaterial.needsUpdate = true;
    previousTexture?.dispose?.();
  });
}

export function updateLandPlots({
  landPlotMeta,
  currentHoverPlot,
  viewTransitionProgress
}) {
  landPlotMeta.forEach((meta, index) => {
    const { group, floorMaterial, borderMaterial, homeY } = meta;
    const hoverScale = group.userData.targetHoverScale || 1;
    const hoverLift = group.userData.targetLift || 0;
    const mapScale = THREE.MathUtils.lerp(1, 0.96, viewTransitionProgress);
    const finalScale = hoverScale * mapScale;

    group.position.y += (homeY + hoverLift - group.position.y) * 0.12;
    group.scale.x += (finalScale - group.scale.x) * 0.12;
    group.scale.y += (finalScale - group.scale.y) * 0.12;
    group.scale.z += (finalScale - group.scale.z) * 0.12;

    const pulse = Math.sin(performance.now() * 0.0024 + index) * 0.04;
    floorMaterial.opacity = (0.18 + pulse + (currentHoverPlot === group ? 0.08 : 0))
      * (1 - viewTransitionProgress * 0.18);
    borderMaterial.opacity = 0.72 + Math.max(0, pulse) + (currentHoverPlot === group ? 0.16 : 0);
  });
}

function makeForSaleTexture(plot) {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 512;
  const context = canvas.getContext('2d');

  context.fillStyle = '#c48a42';
  context.fillRect(0, 0, canvas.width, canvas.height);

  for (let y = 0; y < canvas.height; y += 22) {
    context.fillStyle = y % 44 === 0
      ? 'rgba(92, 48, 14, 0.18)'
      : 'rgba(255, 234, 184, 0.12)';
    context.fillRect(0, y, canvas.width, 14);
  }

  context.strokeStyle = '#6f3810';
  context.lineWidth = 18;
  context.strokeRect(18, 18, canvas.width - 36, canvas.height - 36);

  context.fillStyle = '#b83218';
  context.fillRect(0, 126, canvas.width, 86);
  context.fillStyle = '#fff8e6';
  context.font = 'bold 54px Georgia, serif';
  context.textAlign = 'center';
  context.fillText(plot.status || 'FOR SALE', canvas.width / 2, 184);

  context.fillStyle = '#3b2108';
  context.font = 'bold 44px sans-serif';
  context.fillText(plot.title || '分譲地', canvas.width / 2, 86);

  context.fillStyle = '#6f3810';
  context.font = '32px Georgia, serif';
  context.fillText(`${plot.plotPrefix || 'Plot'} ${plot.id}`, canvas.width / 2, 266);

  context.fillStyle = '#b83218';
  context.font = 'bold 34px sans-serif';
  context.fillText(plot.price || 'お問い合わせください', canvas.width / 2, 330);

  context.fillStyle = '#6f3810';
  context.font = '24px sans-serif';
  context.fillText(plot.size || '', canvas.width / 2, 382);

  context.fillStyle = 'rgba(75, 43, 11, 0.72)';
  context.font = '22px sans-serif';
  context.fillText(plot.inquiry || 'inquiries welcome', canvas.width / 2, 438);

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.needsUpdate = true;
  return texture;
}
