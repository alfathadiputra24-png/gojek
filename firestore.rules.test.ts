import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const rules = fs.readFileSync('firestore.rules', 'utf8');
const blueprint = JSON.parse(fs.readFileSync('firebase-blueprint.json', 'utf8'));

test('firestore.rules contains global deny safety net and Eight Pillars primitives', () => {
  assert.match(rules, /rules_version\s*=\s*'2';/);
  assert.match(rules, /match \/\{document=\*\*\}\s*\{\s*allow read, write: if false;/);
  assert.match(rules, /function isValidId\(id\)/);
  assert.match(rules, /function isVerifiedUser\(\)/);
  assert.match(rules, /request\.auth\.token\.email_verified == true/);
});

test('every blueprint collection has an explicit match block and validation helper', () => {
  assert.ok(blueprint.firestore['/users/{userId}']);
  assert.ok(blueprint.firestore['/users/{userId}/addresses/{addressId}']);
  assert.ok(blueprint.firestore['/orders/{orderId}']);
  assert.ok(blueprint.firestore['/conversations/{conversationId}']);
  assert.ok(blueprint.firestore['/conversations/{conversationId}/messages/{messageId}']);
  assert.ok(blueprint.firestore['/bug_reports/{reportId}']);

  assert.match(rules, /isValidUserProfile\(incoming\(\)\)/);
  assert.match(rules, /isValidSavedAddress\(incoming\(\), userId\)/);
  assert.match(rules, /isValidOrderRecord\(incoming\(\)\)/);
  assert.match(rules, /isValidConversation\(incoming\(\)\)/);
  assert.match(rules, /isValidMessage\(incoming\(\), conversationId\)/);
  assert.match(rules, /isValidBugReport\(incoming\(\)\)/);
});

test('Dirty Dozen protections: no blanket list reads, terminal status lock, Master Gate on messages', () => {
  assert.doesNotMatch(rules, /allow list:\s*if isSignedIn\(\)/);
  assert.match(rules, /!\(existing\(\)\.status in \['completed', 'cancelled'\]\)/);
  assert.match(rules, /get\(\/databases\/\$\(database\)\/documents\/conversations\/\$\(conversationId\)\)\.data\.userId == request\.auth\.uid/);
  assert.match(rules, /incoming\(\)\.createdAt == request\.time/);
  assert.match(rules, /incoming\(\)\.updatedAt == request\.time/);
});
