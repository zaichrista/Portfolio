import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { validateContact } from '../src/contact.mjs';

const valid = () => ({
  name: 'Example Person',
  email: 'PERSON@example.com',
  company: 'Example Ltd',
  message: 'A sufficiently long professional enquiry.',
  website: '',
  startedAt: Date.now() - 3_000,
  privacyAccepted: true
});

describe('contact validation', () => {
  it('normalises a valid submission', () => {
    assert.deepEqual(validateContact(valid()), {
      name: 'Example Person',
      email: 'person@example.com',
      company: 'Example Ltd',
      message: 'A sufficiently long professional enquiry.'
    });
  });

  it('rejects honeypot submissions and missing acknowledgement', () => {
    assert.equal(validateContact({ ...valid(), website: 'https://spam.example' }), null);
    assert.equal(validateContact({ ...valid(), privacyAccepted: false }), null);
  });

  it('rejects implausibly fast forms and header control characters', () => {
    assert.equal(validateContact({ ...valid(), startedAt: Date.now() }), null);
    assert.equal(validateContact({ ...valid(), name: 'Person\r\nBcc: victim@example.com' }), null);
  });
});
