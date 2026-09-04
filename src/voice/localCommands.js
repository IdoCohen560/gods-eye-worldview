/**
 * Deterministic, no-LLM voice commands.
 *
 * This module deliberately translates only unambiguous operator commands into
 * the existing GEV action-runner vocabulary. It performs no network calls and
 * has no browser dependencies, making it safe to use for both speech and
 * typed-command input.
 */

const LAYERS = new Map([
  ['flights', 'flights'], ['planes', 'flights'], ['aircraft', 'flights'],
  ['military', 'military'], ['military flights', 'military'],
  ['earthquakes', 'earthquakes'], ['quakes', 'earthquakes'],
  ['satellites', 'satellites'],
  ['space missions', 'rocket-launches'], ['missions', 'rocket-launches'],
  ['traffic', 'traffic'], ['street traffic', 'traffic'],
  ['cctv', 'cctv'], ['cameras', 'cctv'],
  ['radio', 'radio'], ['internet radio', 'radio'],
  ['bikeshare', 'bikeshare'], ['bikes', 'bikeshare'],
  ['ais', 'ais-live-vessels'], ['ships', 'ais-live-vessels'], ['vessels', 'ais-live-vessels'],
  ['data centers', 'local-datacenters'], ['datacenters', 'local-datacenters'],
  ['dams', 'local-dams'], ['submarine cables', 'telegeography-submarine-cables'], ['cables', 'telegeography-submarine-cables'],
  ['fires', 'local-firms'], ['active fires', 'local-firms'], ['firms', 'local-firms'],
]);

const PANELS = new Map([
  ['data', 'data-panel'], ['data layers', 'data-panel'], ['layers', 'data-panel'],
  ['locations', 'location-bar'], ['location', 'location-bar'],
  ['styles', 'control-panel'], ['filters', 'control-panel'], ['visual styles', 'control-panel'],
  ['cctv', 'cctv-panel'], ['cameras', 'cctv-panel'], ['radio', 'radio-panel'],
  ['context', 'global-context-panel'], ['global context', 'global-context-panel'],
  ['scenes', 'scene-panel'], ['scene', 'scene-panel'],
]);

const STYLES = new Map([
  ['normal', 'normal'], ['retro', 'retro'], ['surveillance', 'surveillance'],
  ['thermal', 'thermal'], ['anime', 'anime'], ['noir', 'noir'], ['snow', 'snow'],
]);

const CONTEXT_MODES = new Map([
  ['off', 'off'], ['none', 'off'], ['clear', 'off'],
  ['contacts', 'contacts'], ['contact', 'contacts'], ['flights', 'contacts'],
  ['space missions', 'space-missions'], ['space mission', 'space-missions'], ['missions', 'space-missions'],
]);

function result(name, args, transcript) {
  return Object.freeze({ ok: true, name, args: Object.freeze(args), transcript });
}

function rejected(transcript, error = 'I only recognize local map commands.') {
  return Object.freeze({ ok: false, error, transcript });
}

function normalize(text) {
  return String(text ?? '')
    .toLowerCase()
    .replace(/[’']/g, '')
    .replace(/[^a-z0-9.,\-\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function mapValue(map, phrase) {
  return map.get(phrase) || null;
}

/**
 * Parse one spoken or typed local operator command.
 *
 * @returns {{ok:true,name:string,args:object,transcript:string}|{ok:false,error:string,transcript:string}}
 */
export function parseLocalVoiceCommand(text) {
  const transcript = normalize(text);
  if (!transcript) return rejected(transcript, 'Say a local map command.');

  if (/^(?:stop|cancel)(?: tracking)?$/.test(transcript) || transcript === 'stop following') {
    return result('stop_tracking', {}, transcript);
  }
  if (/^(?:zoom|go) (?:to )?(?:the )?globe$|^show (?:the )?whole world$/.test(transcript)) {
    return result('zoom_to_globe', {}, transcript);
  }

  const zoom = transcript.match(/^(?:zoom )?(in|out)(?: (a little|little|a lot|lot))?$/);
  if (zoom) {
    const amount = zoom[2]?.includes('lot') ? 'lot' : (zoom[2] ? 'little' : 'medium');
    return result('adjust_camera_zoom', { direction: zoom[1], amount }, transcript);
  }

  const layer = transcript.match(/^(turn|switch|enable|show|activate|disable|hide|deactivate)(?: (on|off))? (?:the )?(.+?)(?: layer)?$/);
  if (layer) {
    const [, verb, switchWord, phrase] = layer;
    const enabled = switchWord ? switchWord === 'on' : !['disable', 'hide', 'deactivate'].includes(verb);
    const layerId = mapValue(LAYERS, phrase);
    if (!layerId) return rejected(transcript, `Unknown local data layer: ${phrase}`);
    return result('set_layer_visibility', { layerId, enabled }, transcript);
  }

  const panel = transcript.match(/^(open|show|close|hide) (?:the )?(.+?)(?: panel| menu)?$/);
  if (panel) {
    const panelId = mapValue(PANELS, panel[2]);
    if (!panelId) return rejected(transcript, `Unknown panel: ${panel[2]}`);
    return result('set_panel_open', { panelId, open: panel[1] === 'open' || panel[1] === 'show' }, transcript);
  }

  const style = transcript.match(/^(?:set )?(?:style|visual style) (?:to )?(.+)$/);
  if (style) {
    const value = mapValue(STYLES, style[1]);
    if (!value) return rejected(transcript, `Unknown visual style: ${style[1]}`);
    return result('set_visual_style', { style: value }, transcript);
  }

  const context = transcript.match(/^(?:set |show )?(?:context mode|context) (?:to )?(.+)$/);
  if (context) {
    const mode = mapValue(CONTEXT_MODES, context[1]);
    if (!mode) return rejected(transcript, `Unknown context mode: ${context[1]}`);
    return result('set_context_mode', { mode }, transcript);
  }

  const destination = transcript.match(/^(?:fly|go|take me) to (?:the )?(.+)$/);
  if (destination?.[1] && destination[1].length <= 120) {
    return result('fly_to_location', { query: destination[1] }, transcript);
  }

  return rejected(transcript);
}
