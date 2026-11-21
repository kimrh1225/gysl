import test from 'node:test';
import assert from 'node:assert/strict';
import { analyze, levelFor } from '../analysis.mjs';
import { ITEMS, SCENARIOS } from '../survey-content.mjs';

function answersFor(value = 3) {
  return Object.fromEntries([
    ...ITEMS.map((item) => [item.id, value]),
    ...SCENARIOS.flatMap((scenario) => [[`${scenario.id}_time`, 1], [`${scenario.id}_reason`, 1]]),
  ]);
}

test('역채점과 반올림 전 수준 경계를 적용한다', () => {
  const answers = answersFor(5);
  const result = analyze(answers);
  assert.equal(result.scores.H1, 4.2);
  assert.equal(result.scores.H2, 26 / 6);
  assert.equal(result.scores.H3, 4.2);
  assert.equal(levelFor(2.5), 'MIXED');
  assert.equal(levelFor(3.5), 'MIXED');
  assert.equal(levelFor(3.50001), 'HIGH');
  assert.equal(levelFor(2.49999), 'LOW');
  assert.deepEqual(result.extraKeys, ['ALL_IMMEDIATE', 'HIGH_WITHOUT_BEHAVIOR', 'NO_PRIMARY']);
  assert.equal(result.strategies.length, 6);
  assert.ok(result.strategies.every((item) => item.mode === 'OPTIONAL'));
});

test('세 영역의 상황 일치 조건과 S3의 8분 지연을 계산한다', () => {
  const answers = answersFor(1);
  Object.assign(answers, { S1_time: 2, S1_reason: 2, S2_time: 3, S2_reason: 2, S3_time: 2, S3_reason: 2 });
  const result = analyze(answers);
  assert.deepEqual(result.matches, { H1: true, H2: true, H3: true });
  assert.equal(result.situations[2].delayMinutes, 8);
  assert.equal(result.strategies.length, 6);
  assert.ok(result.strategies.every((item) => item.mode === 'MATCH'));
  assert.ok(result.extraKeys.includes('MULTI_MATCH'));
  assert.ok(result.extraKeys.includes('LOW_WITH_BEHAVIOR'));
});

test('늦은 시각은 지연 시간을 알 수 없고 준비 이유를 H2 근거로 보지 않는다', () => {
  const answers = answersFor();
  Object.assign(answers, { S2_time: 4, S2_reason: 3 });
  const result = analyze(answers);
  assert.equal(result.situations[1].delayMinutes, null);
  assert.deepEqual(result.matches, { H1: false, H2: false, H3: false });
  assert.ok(result.extraKeys.includes('UNKNOWN_TIME'));
});

test('상황 일치 전략을 선택적 전략보다 먼저 표시한다', () => {
  const answers = answersFor(5);
  Object.assign(answers, { S2_time: 2, S2_reason: 2 });
  const result = analyze(answers);
  assert.deepEqual(result.strategies.map((item) => item.mode), [
    'MATCH', 'MATCH', 'OPTIONAL', 'OPTIONAL', 'OPTIONAL', 'OPTIONAL',
  ]);
  assert.equal(result.strategies[0].trait, 'H2');
});

test('누락된 응답을 분석하지 않는다', () => {
  const answers = answersFor();
  delete answers.P1;
  assert.throws(() => analyze(answers));
});
