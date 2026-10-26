import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  SIGN_OUT_PHRASE,
  displayValue,
  groupSettings,
  parseSettingInput,
  reasonProblem,
  type ServerSetting,
} from './server-settings.ts';

const base: ServerSetting = {
  key: 'QUOTE_TTL_SECONDS',
  group: 'Trading',
  label: 'Quote lifetime',
  help: '',
  kind: 'int',
  unit: 'seconds',
  min: 5,
  max: 120,
  value: 30,
  source: 'server',
  serverDefault: 30,
  live: true,
  money: false,
};

test('groups keep the order the API sent them in', () => {
  const groups = groupSettings([
    { ...base, key: 'A', group: 'Naira' },
    { ...base, key: 'B', group: 'Trading' },
    { ...base, key: 'C', group: 'Naira' },
  ]);
  assert.deepEqual(
    groups.map((g) => [g.name, g.settings.map((s) => s.key)]),
    [
      ['Naira', ['A', 'C']],
      ['Trading', ['B']],
    ],
  );
});

test('values read in plain words', () => {
  assert.equal(displayValue({ ...base, kind: 'boolean', value: true }), 'On');
  assert.equal(displayValue({ ...base, kind: 'boolean', value: false }), 'Off');
  assert.equal(displayValue({ ...base, value: 30 }), '30 seconds');
  assert.equal(displayValue({ ...base, kind: 'string', unit: null, value: '' }), '(empty)');
  assert.equal(displayValue({ ...base, value: null }), 'Not set');
  assert.equal(displayValue({ ...base, kind: 'decimal', unit: 'USD', value: 2.5 }), '2.5 USD');
});

test('whole numbers must be whole and inside the limits', () => {
  assert.deepEqual(parseSettingInput(base, '45'), { value: 45 });
  assert.match(parseSettingInput(base, '4').error ?? '', /between 5 and 120/);
  assert.match(parseSettingInput(base, '121').error ?? '', /between 5 and 120/);
  assert.match(parseSettingInput(base, '4.5').error ?? '', /whole number/);
  assert.match(parseSettingInput(base, '').error ?? '', /whole number/);
});

test('decimals accept a point and keep the limits', () => {
  const s = { ...base, kind: 'decimal', min: 0.5, max: 1000 };
  assert.deepEqual(parseSettingInput(s, '2.5'), { value: 2.5 });
  assert.match(parseSettingInput(s, '0.1').error ?? '', /between 0.5 and 1000/);
  assert.match(parseSettingInput(s, 'abc').error ?? '', /number/);
});

test('on/off and text pass through; text is trimmed', () => {
  assert.deepEqual(parseSettingInput({ ...base, kind: 'boolean' }, true), { value: true });
  assert.deepEqual(parseSettingInput({ ...base, kind: 'string' }, '  smtp.x.com '), { value: 'smtp.x.com' });
  assert.deepEqual(parseSettingInput({ ...base, kind: 'duration' }, '15m'), { value: '15m' });
});

test('a reason needs 10 characters, like the API', () => {
  assert.ok(reasonProblem('too short'));
  assert.equal(reasonProblem('  rotating the mail server  '), null);
});

test('the sign-out phrase is fixed', () => {
  assert.equal(SIGN_OUT_PHRASE, 'SIGN OUT ALL');
});
