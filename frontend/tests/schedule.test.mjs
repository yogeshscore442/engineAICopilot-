import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import ts from 'typescript';
const source = await fs.readFile(new URL('../src/medicineSchedule.ts', import.meta.url), 'utf8');
const compiled = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.ESNext } }).outputText;
const { dailySlots } = await import(`data:text/javascript;base64,${Buffer.from(compiled).toString('base64')}`);

test('weekly medicine never appears in a daily checklist', () => {
  assert.deepEqual(dailySlots({ schedule_raw: 'Weekly', schedule_parsed: ['morning'] }), []);
});
test('missing and as-needed schedules never default to morning', () => {
  for (const schedule_raw of ['', 'PRN', 'SOS', 'once daily']) assert.deepEqual(dailySlots({ schedule_raw }), []);
});
test('explicit numeric schedule preserves slots and zero doses', () => {
  assert.deepEqual(dailySlots({ schedule_raw: '1 - 0 - 1' }), ['morning', 'night']);
  assert.deepEqual(dailySlots({ schedule_raw: '0-0-0' }), []);
});
test('word matching does not confuse food with OD', () => {
  assert.deepEqual(dailySlots({ schedule_raw: 'after food' }), []);
});
