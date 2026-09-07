import assert from 'node:assert/strict';
import { test } from 'node:test';
import { applicationDisplayLanguages, applicationDisplaySkills } from '../src/lib/applicationProfileDisplay.ts';

test('object-shaped submitted skills render as skill labels instead of throwing during array spread', () => {
  const phf = { skills: { additional_skills: 'Product discovery; SQL; business model canvas' } };
  const saved = structuredClone(phf);
  assert.deepEqual(applicationDisplaySkills(phf), ['Product discovery', 'SQL', 'business model canvas']);
  assert.deepEqual(phf, saved);
});

test('existing skill arrays, named items and additional-information text remain supported', () => {
  assert.deepEqual(applicationDisplaySkills({
    _skills: ['SQL', { name: 'Service design' }, null, {}],
    skills: ['SQL', 'Research'], additionalInformation: { additional_skills: 'Portfolio planning, Research' },
  }), ['SQL', 'Service design', 'Research', 'Portfolio planning']);
  assert.deepEqual(applicationDisplaySkills({ _skills: false, skills: 12 }), []);
  assert.deepEqual(applicationDisplaySkills(null), []);
});

test('imported language arrays retain every supplied reading, speaking and writing level', () => {
  const languages = [{ language: 'English', reading: 'Fluent', speaking: 'Fluent', writing: 'Fluent' },
    { name: 'French', proficiency: 'limited' }];
  const saved = structuredClone(languages);
  assert.deepEqual(applicationDisplayLanguages(languages), {
    un_languages: {}, other_languages: [
      { language: 'English', read: 'Fluent', speak: 'Fluent', write: 'Fluent', proficiency: '' },
      { language: 'French', read: '', speak: '', write: '', proficiency: 'limited' },
    ],
  });
  assert.deepEqual(languages, saved);
});

test('grouped PHF languages preserve legacy strings, per-skill levels and optional other languages', () => {
  assert.deepEqual(applicationDisplayLanguages({
    un_languages: { english: 'native', french: { read: 'fluent', speak: 'limited', write: 'basic' } },
    other_languages: [{ language: 'Portuguese', read: { english: 'fluent' }, speak: 'basic', write: 'basic' }, null, {}],
  }), {
    un_languages: { english: 'native', french: { read: 'fluent', speak: 'limited', write: 'basic' } },
    other_languages: [{ language: 'Portuguese', read: 'fluent', speak: 'basic', write: 'basic', proficiency: '' }],
  });
  assert.deepEqual(applicationDisplayLanguages({ un_languages: [], other_languages: {} }), { un_languages: {}, other_languages: [] });
  assert.deepEqual(applicationDisplayLanguages(null), { un_languages: {}, other_languages: [] });
});
