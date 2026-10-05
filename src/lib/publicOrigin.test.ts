import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { publicOrigin } from './publicOrigin.ts';

const request = (host?: string) =>
  new Request('http://block.internal/x', {
    headers: host ? { 'x-orig-host': host } : {},
  });
const url = new URL('http://block.internal/x');

describe('publicOrigin', () => {
  it('uses the public host the request handler forwards', () => {
    assert.equal(
      publicOrigin(request('www.example.com'), url),
      'https://www.example.com'
    );
  });
  it('keeps http for localhost', () => {
    assert.equal(
      publicOrigin(request('localhost:4321'), url),
      'http://localhost:4321'
    );
  });
  it('falls back to the request origin', () => {
    assert.equal(publicOrigin(request(), url), 'http://block.internal');
  });
});
