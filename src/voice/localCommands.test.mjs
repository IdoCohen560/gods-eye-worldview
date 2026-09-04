import test from 'node:test';
import assert from 'node:assert/strict';
import { parseLocalVoiceCommand } from './localCommands.js';

test('local commands translate layer aliases and polarity', () => {
  assert.deepEqual(parseLocalVoiceCommand('turn on planes'), {
    ok: true, name: 'set_layer_visibility', args: { layerId: 'flights', enabled: true }, transcript: 'turn on planes',
  });
  assert.deepEqual(parseLocalVoiceCommand('hide the ships layer'), {
    ok: true, name: 'set_layer_visibility', args: { layerId: 'ais-live-vessels', enabled: false }, transcript: 'hide the ships layer',
  });
});

test('local commands cover conservative map and view operations', () => {
  assert.deepEqual(parseLocalVoiceCommand('zoom out a lot').args, { direction: 'out', amount: 'lot' });
  assert.equal(parseLocalVoiceCommand('show whole world').name, 'zoom_to_globe');
  assert.deepEqual(parseLocalVoiceCommand('open data layers').args, { panelId: 'data-panel', open: true });
  assert.deepEqual(parseLocalVoiceCommand('set style to thermal').args, { style: 'thermal' });
  assert.deepEqual(parseLocalVoiceCommand('context mode space missions').args, { mode: 'space-missions' });
  assert.equal(parseLocalVoiceCommand('stop following').name, 'stop_tracking');
  assert.deepEqual(parseLocalVoiceCommand('fly to Tokyo').args, { query: 'tokyo' });
});

test('local commands reject unknown and free-form requests rather than guessing', () => {
  const unknownLayer = parseLocalVoiceCommand('turn on weather layer');
  assert.equal(unknownLayer.ok, false);
  assert.match(unknownLayer.error, /Unknown local data layer/);
  const freeForm = parseLocalVoiceCommand('what is happening near Tokyo');
  assert.equal(freeForm.ok, false);
  assert.equal(parseLocalVoiceCommand('').ok, false);
});
