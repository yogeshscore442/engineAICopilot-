import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import ts from 'typescript';

// Compile the actual client with deterministic Vite configuration. No browser or server needed.
const source = (await fs.readFile(new URL('../src/api/index.ts', import.meta.url), 'utf8'))
  .replaceAll('import.meta.env', '({ VITE_USE_MOCK: "false", VITE_API_URL: "http://localhost:8000/api" })');
const compiled = ts.transpileModule(source, { compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ESNext } }).outputText;
const { api } = await import(`data:text/javascript;base64,${Buffer.from(compiled).toString('base64')}`);

test('failed real upload never substitutes a sample record', async () => {
  api.setUseMock(false);
  globalThis.fetch = async () => new Response(JSON.stringify({ error: { message: 'Invalid file' } }), { status: 415 });
  await assert.rejects(api.uploadRecord(new File(['bad'], 'bad.pdf')), e => e.error.message === 'Invalid file');
});

test('network failure propagates without fabricated data', async () => {
  globalThis.fetch = async () => { throw new TypeError('Network unavailable'); };
  await assert.rejects(api.getRecord('missing'));
  await assert.rejects(api.getRecordFile('missing'));
});

test('record API preserves backend error message', async () => {
  globalThis.fetch = async () => new Response(JSON.stringify({ error: { message: 'Record not found' } }), { status: 404 });
  await assert.rejects(api.getRecord('missing'), e => e.error.message === 'Record not found');
});

test('confirmed record payload follows backend contract', async () => {
  let body;
  globalThis.fetch = async (_url, options) => {
    body = JSON.parse(options.body);
    return Response.json({ record_id: 'record-1', status: 'confirmed', record: body.record });
  };
  const record = { doc_type: 'lab_report', tests: [], medicines: [] };
  assert.equal((await api.confirmRecord('record-1', record)).status, 'confirmed');
  assert.deepEqual(body, { record });
});

test('trend names are URL encoded', async () => {
  let url;
  globalThis.fetch = async (value) => { url = value; return Response.json({ points: [] }); };
  await api.getTrends('default', 'A&B test');
  assert.ok(url.endsWith('test=A%26B%20test'));
});

test('file endpoint failures are errors, not placeholder downloads', async () => {
  globalThis.fetch = async () => new Response('', { status: 404 });
  await assert.rejects(api.getRecordFile('missing'), /404/);
});

test('trends derive values from records and preserve confirmation status', async () => {
  const record = { record_id: 'synthetic-lab', doc_type: 'lab_report', doc_date: '2026-01-02', tests: [{ name: 'Synthetic test', value: 12, unit: 'u', flag: 'HIGH' }], medicines: [] };
  globalThis.fetch = async () => Response.json({ record_id: record.record_id, status: 'confirmed', record });
  const conf = await api.confirmRecord(record.record_id, record);
  assert.equal(conf.status, 'confirmed');
  globalThis.fetch = async () => Response.json({ points: [{ date: '2026-01-02', value: 12, unit: 'u', flag: 'HIGH' }] });
  const trends = await api.getTrends('default', 'Synthetic test');
  assert.equal(trends.points.length, 1);
  assert.equal(trends.points[0].value, 12);
  globalThis.fetch = async () => Response.json({ points: [] });
  assert.equal((await api.getTrends('default', 'missing test')).points.length, 0);
});

test('getRecord normalizes missing or non-array fields safely', async () => {
  api.setUseMock(false);
  globalThis.fetch = async () => Response.json({
    record_id: 'rec-test-norm',
    status: 'draft',
    record: {
      needs_review: true,
      medicines: null,
      tests: null,
      diagnoses: null,
    }
  });
  const res = await api.getRecord('rec-test-norm');
  assert.equal(res.record_id, 'rec-test-norm');
  assert.ok(Array.isArray(res.record.needs_review));
  assert.ok(Array.isArray(res.record.medicines));
  assert.ok(Array.isArray(res.record.tests));
  assert.ok(Array.isArray(res.record.diagnoses));
});
