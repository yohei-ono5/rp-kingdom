import * as THREE from 'three';

const DEFAULT_CLOCK_UPDATE_INTERVAL = 1000;

export function createTimeOfDayController({
  clockElement,
  labelElement,
  fixedHour = null,
  clockUpdateInterval = DEFAULT_CLOCK_UPDATE_INTERVAL
} = {}) {
  const state = {
    lastClockUpdate: 0,
    hour: 12,
    label: '昼',
    sky: new THREE.Color(0x7fb8df),
    fog: new THREE.Color(0xa8d4e8),
    ground: new THREE.Color(0x2f6b3b),
    ambientColor: new THREE.Color(0xfff2dd),
    sunColor: new THREE.Color(0xffe6c4),
    fillColor: new THREE.Color(0x8ba1ff),
    sunPosition: new THREE.Vector3(8, 12, 6),
    ambientIntensity: 1.12,
    sunIntensity: 2.15,
    fillIntensity: 0.82,
    exposure: 1.22
  };

  const timeOfDayStops = [
    createTimeOfDayStop(0, 0x0d1026, 0x151a2d, 0x1f4a34, 0x6476c8, 0x8ba1ff, 0x7f8cff, [-9, 4, -4], 0.38, 0.06, 0.92, 0.92),
    createTimeOfDayStop(5, 0x394365, 0x4b526d, 0x285c37, 0xffc59a, 0xff9f5a, 0x788cff, [-7, 5, -3], 0.74, 0.95, 0.82, 1.02),
    createTimeOfDayStop(8, 0x8fbfdc, 0xb4d8e8, 0x327341, 0xfff1dc, 0xffdfab, 0x8aa6ff, [7, 10, 5], 1.02, 1.75, 0.76, 1.16),
    createTimeOfDayStop(12, 0x7fb8df, 0xa8d4e8, 0x347943, 0xfff2dd, 0xffe6c4, 0x8ba1ff, [8, 13, 6], 1.12, 2.15, 0.82, 1.22),
    createTimeOfDayStop(16, 0x6fa8cf, 0x8fbfd2, 0x306f3f, 0xffe4c4, 0xffc277, 0x8598ff, [6, 8, 5], 0.98, 1.55, 0.9, 1.12),
    createTimeOfDayStop(18, 0x49385b, 0x665064, 0x275c37, 0xffba88, 0xff8245, 0x7e78ff, [4, 4.8, 3], 0.68, 0.9, 1.0, 1.02),
    createTimeOfDayStop(20, 0x151a33, 0x20263f, 0x214d35, 0x7d8ed8, 0x9aaeff, 0x7e89ff, [-7, 4.2, -4], 0.44, 0.12, 1.05, 0.94),
    createTimeOfDayStop(24, 0x0d1026, 0x151a2d, 0x1f4a34, 0x6476c8, 0x8ba1ff, 0x7f8cff, [-9, 4, -4], 0.38, 0.06, 0.92, 0.92)
  ];

  return {
    state,
    update(force = false) {
      const now = performance.now();
      if (!force && now - state.lastClockUpdate < clockUpdateInterval) {
        return;
      }

      state.lastClockUpdate = now;
      state.hour = fixedHour ?? getJstHour();
      const sampled = sampleTimeOfDay(state.hour, timeOfDayStops);
      state.label = sampled.label;
      state.sky.copy(sampled.sky);
      state.fog.copy(sampled.fog);
      state.ground.copy(sampled.ground);
      state.ambientColor.copy(sampled.ambientColor);
      state.sunColor.copy(sampled.sunColor);
      state.fillColor.copy(sampled.fillColor);
      state.sunPosition.copy(sampled.sunPosition);
      state.ambientIntensity = sampled.ambientIntensity;
      state.sunIntensity = sampled.sunIntensity;
      state.fillIntensity = sampled.fillIntensity;
      state.exposure = sampled.exposure;

      if (clockElement) {
        clockElement.textContent = fixedHour === null
          ? `日本時間 ${getJstClockText()}`
          : `固定時間 ${formatFixedHour(fixedHour)}`;
      }

      if (labelElement) {
        labelElement.textContent = state.label;
      }
    }
  };
}

function formatFixedHour(hour) {
  const normalizedHour = ((hour % 24) + 24) % 24;
  const wholeHour = Math.floor(normalizedHour);
  const minute = Math.floor((normalizedHour - wholeHour) * 60);
  const second = Math.floor((((normalizedHour - wholeHour) * 60) - minute) * 60);

  return [wholeHour, minute, second]
    .map((value) => String(value).padStart(2, '0'))
    .join(':');
}

function createTimeOfDayStop(
  hour,
  sky,
  fog,
  groundColor,
  ambientColor,
  sunColor,
  fillColor,
  sunPosition,
  ambientIntensity,
  sunIntensity,
  fillIntensity,
  exposure
) {
  return {
    hour,
    sky: new THREE.Color(sky),
    fog: new THREE.Color(fog),
    ground: new THREE.Color(groundColor),
    ambientColor: new THREE.Color(ambientColor),
    sunColor: new THREE.Color(sunColor),
    fillColor: new THREE.Color(fillColor),
    sunPosition: new THREE.Vector3(...sunPosition),
    ambientIntensity,
    sunIntensity,
    fillIntensity,
    exposure
  };
}

function getJstHour() {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: 'Asia/Tokyo',
    hour: 'numeric',
    minute: 'numeric',
    second: 'numeric',
    hour12: false
  }).formatToParts(new Date());

  const values = Object.fromEntries(
    parts
      .filter((part) => part.type !== 'literal')
      .map((part) => [part.type, Number(part.value)])
  );

  const hour = (values.hour || 0) % 24;
  const minute = values.minute || 0;
  const second = values.second || 0;
  return hour + minute / 60 + second / 3600;
}

function getJstClockText() {
  return new Intl.DateTimeFormat('ja-JP', {
    timeZone: 'Asia/Tokyo',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false
  }).format(new Date());
}

function getTimeOfDayLabel(hour) {
  if (hour < 5) return '深夜';
  if (hour < 8) return '朝焼け';
  if (hour < 16) return '昼';
  if (hour < 18) return '午後';
  if (hour < 20) return '夕暮れ';
  return '夜';
}

function sampleTimeOfDay(hour, timeOfDayStops) {
  const normalizedHour = ((hour % 24) + 24) % 24;
  const lastIndex = timeOfDayStops.length - 1;
  let start = timeOfDayStops[0];
  let end = timeOfDayStops[lastIndex];

  for (let index = 0; index < lastIndex; index += 1) {
    const candidateStart = timeOfDayStops[index];
    const candidateEnd = timeOfDayStops[index + 1];

    if (normalizedHour >= candidateStart.hour && normalizedHour < candidateEnd.hour) {
      start = candidateStart;
      end = candidateEnd;
      break;
    }
  }

  const span = end.hour - start.hour || 1;
  const progress = smootherStep((normalizedHour - start.hour) / span);

  return {
    label: getTimeOfDayLabel(normalizedHour),
    sky: start.sky.clone().lerp(end.sky, progress),
    fog: start.fog.clone().lerp(end.fog, progress),
    ground: start.ground.clone().lerp(end.ground, progress),
    ambientColor: start.ambientColor.clone().lerp(end.ambientColor, progress),
    sunColor: start.sunColor.clone().lerp(end.sunColor, progress),
    fillColor: start.fillColor.clone().lerp(end.fillColor, progress),
    sunPosition: start.sunPosition.clone().lerp(end.sunPosition, progress),
    ambientIntensity: THREE.MathUtils.lerp(start.ambientIntensity, end.ambientIntensity, progress),
    sunIntensity: THREE.MathUtils.lerp(start.sunIntensity, end.sunIntensity, progress),
    fillIntensity: THREE.MathUtils.lerp(start.fillIntensity, end.fillIntensity, progress),
    exposure: THREE.MathUtils.lerp(start.exposure, end.exposure, progress)
  };
}

function smootherStep(value) {
  return value * value * value * (value * (value * 6 - 15) + 10);
}
