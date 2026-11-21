/**
 * Hora del día y clima del patio. Lógica pura (sin Three.js): la escena lee estos valores para
 * mover el sol, teñir el cielo, prender faroles y hacer llover.
 * La hora avanza con tiempo real (no con el x6 de la cocción): una hora del juego dura `realSecondsPerHour`.
 */
export type Weather = 'despejado' | 'nublado' | 'lluvia';

export const DAY_SETTINGS = {
  realSecondsPerHour: 60,
  /** Córdoba en noviembre: amanece ~6:15 y anochece ~20:10. */
  sunrise: 6.25,
  sunset: 20.15,
  /** Media hora de crepúsculo a cada lado. */
  twilightHours: 0.6,
  /** Cuánto dura cada clima antes de cambiar (segundos reales). */
  weatherMinSeconds: 120,
  weatherMaxSeconds: 260,
  /** Segundos reales que tarda en pasar de un clima al otro. */
  weatherTransitionSeconds: 25,
} as const;

const WEATHER_WEIGHTS: [Weather, number][] = [['despejado', 0.5], ['nublado', 0.3], ['lluvia', 0.2]];
const TARGETS: Record<Weather, { clouds: number; rain: number }> = {
  despejado: { clouds: 0.05, rain: 0 },
  nublado: { clouds: 0.75, rain: 0 },
  lluvia: { clouds: 1, rain: 1 },
};

export const WEATHER_LABEL: Record<Weather, string> = { despejado: '☀️ Despejado', nublado: '☁️ Nublado', lluvia: '🌧️ Lluvia' };

/** Altura del sol: 1 al mediodía solar, 0 en el horizonte, negativa de noche (−1 a medianoche). */
export function sunHeight(hour: number): number {
  const { sunrise, sunset } = DAY_SETTINGS;
  const noon = (sunrise + sunset) / 2, halfDay = (sunset - sunrise) / 2;
  const h = ((hour % 24) + 24) % 24;
  if(h >= sunrise && h <= sunset) return Math.cos((h - noon) / halfDay * Math.PI / 2);
  const night = 24 - (sunset - sunrise), sinceSunset = h > sunset ? h - sunset : h + 24 - sunset;
  return -Math.sin(sinceSunset / night * Math.PI);
}

/** Recorrido del sol de este a oeste (−1 al amanecer, 1 al atardecer). */
export function sunAzimuth(hour: number): number {
  const { sunrise, sunset } = DAY_SETTINGS;
  return Math.max(-1.2, Math.min(1.2, ((hour % 24) - sunrise) / (sunset - sunrise) * 2 - 1));
}

export type Daylight = {
  /** 0 de noche, 1 a pleno sol (ya descontadas las nubes). */
  sun: number;
  /** Luz difusa del cielo, 0.15 de noche a 1 de día. */
  ambient: number;
  /** 0 de día, 1 en el pico del atardecer/amanecer (cielo naranja). */
  golden: number;
  /** 1 de noche cerrada (estrellas, faroles). */
  night: number;
};

export function daylight(hour: number, clouds: number): Daylight {
  const height = sunHeight(hour);
  const tw = DAY_SETTINGS.twilightHours / 6;
  const sunUp = Math.max(0, Math.min(1, (height + tw) / (tw * 2 + 0.25)));
  const night = Math.max(0, Math.min(1, (-height - tw * 0.3) / (tw * 1.5)));
  const golden = Math.max(0, 1 - Math.abs(height) / 0.28) * (1 - night);
  const cloudShade = 1 - clouds * 0.6;
  return {
    sun: sunUp * cloudShade,
    ambient: 0.15 + 0.85 * (1 - night) * (0.55 + 0.45 * sunUp) * (1 - clouds * 0.25),
    golden: golden * (1 - clouds * 0.7),
    night,
  };
}

export function formatHour(hour: number): string {
  const h = ((hour % 24) + 24) % 24;
  const hh = Math.floor(h), mm = Math.floor((h - hh) * 60);
  return `${String(hh).padStart(2, '0')}:${String(mm).padStart(2, '0')}`;
}

export type DayEvent = { kind: 'anochece' | 'amanece' | 'clima'; message: string };

export class DayCycle {
  public hour: number;
  public weather: Weather = 'despejado';
  /** Valores actuales (con transición suave) que lee la escena. */
  public clouds = TARGETS.despejado.clouds;
  public rain = 0;
  private weatherTimer: number;
  private seed: number;
  private wasNight: boolean;

  constructor(startHour = 18, seed = 7) {
    this.hour = startHour;
    this.seed = seed >>> 0;
    this.weatherTimer = this.nextDuration();
    this.wasNight = daylight(startHour, this.clouds).night > 0.5;
  }

  get light(): Daylight { return daylight(this.hour, this.clouds); }
  get isNight(): boolean { return this.light.night > 0.5; }

  private random(): number {
    this.seed = (Math.imul(this.seed, 1664525) + 1013904223) >>> 0;
    return this.seed / 4294967296;
  }
  private nextDuration(): number {
    return DAY_SETTINGS.weatherMinSeconds + this.random() * (DAY_SETTINGS.weatherMaxSeconds - DAY_SETTINGS.weatherMinSeconds);
  }

  setHour(hour: number): void { this.hour = ((hour % 24) + 24) % 24; this.wasNight = this.isNight; }
  /** Cambia el clima; `instant` salta la transición (pruebas, capturas). */
  setWeather(weather: Weather, instant = false): void {
    this.weather = weather;
    this.weatherTimer = this.nextDuration();
    if(instant) { this.clouds = TARGETS[weather].clouds; this.rain = TARGETS[weather].rain; }
  }

  tick(realDt: number): DayEvent[] {
    if(!Number.isFinite(realDt) || realDt <= 0) return [];
    const events: DayEvent[] = [];
    this.hour = (this.hour + realDt / DAY_SETTINGS.realSecondsPerHour) % 24;
    this.weatherTimer -= realDt;
    if(this.weatherTimer <= 0) {
      let pick = this.random(), next: Weather = 'despejado';
      for(const [w, weight] of WEATHER_WEIGHTS) { if(pick < weight) { next = w; break; } pick -= weight; }
      if(next !== this.weather) {
        events.push({ kind: 'clima', message: next === 'lluvia' ? '🌧️ Se largó a llover. Bajo la campana del asador no te mojás.'
          : next === 'nublado' ? '☁️ Se nubló el cielo.' : '☀️ Se despejó el cielo.' });
      }
      this.setWeather(next);
    }
    const k = Math.min(1, realDt / DAY_SETTINGS.weatherTransitionSeconds * 3);
    const target = TARGETS[this.weather];
    this.clouds += (target.clouds - this.clouds) * k;
    // La lluvia arranca cuando ya está bien nublado y para antes de que se despeje.
    const rainTarget = this.clouds > 0.85 ? target.rain : 0;
    this.rain += (rainTarget - this.rain) * k;
    const night = this.isNight;
    if(night !== this.wasNight) {
      this.wasNight = night;
      events.push(night
        ? { kind: 'anochece', message: '🌙 Se hizo de noche: prendé la luz del asador (E en la llave de luz de la columna).' }
        : { kind: 'amanece', message: '🌅 Amanece en el patio. Ya podés apagar la luz del asador.' });
    }
    return events;
  }
}
