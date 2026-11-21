import { ITEMS, SCENARIOS, TRAITS } from './survey-content.mjs';
import { EXTRA_FEEDBACK, FEEDBACK } from './feedback-content.mjs';

export const QUESTION_IDS = [
  ...ITEMS.map((item) => item.id),
  ...SCENARIOS.flatMap((scenario) => [`${scenario.id}_time`, `${scenario.id}_reason`]),
];

export function levelFor(score) {
  if (score < 2.5) return 'LOW';
  if (score > 3.5) return 'HIGH';
  return 'MIXED';
}

export function analyze(answers) {
  for (const item of ITEMS) {
    if (!Number.isInteger(answers[item.id]) || answers[item.id] < 1 || answers[item.id] > 5) {
      throw new Error(`응답이 올바르지 않습니다: ${item.id}`);
    }
  }
  for (const scenario of SCENARIOS) {
    for (const key of [`${scenario.id}_time`, `${scenario.id}_reason`]) {
      if (!Number.isInteger(answers[key]) || answers[key] < 1 || answers[key] > 4) {
        throw new Error(`응답이 올바르지 않습니다: ${key}`);
      }
    }
  }

  const scores = Object.fromEntries(TRAITS.map((trait) => {
    const items = ITEMS.filter((item) => item.trait === trait.id);
    const sum = items.reduce((total, item) => total + (item.reverse ? 6 - answers[item.id] : answers[item.id]), 0);
    return [trait.id, sum / items.length];
  }));
  const levels = Object.fromEntries(TRAITS.map((trait) => [trait.id, levelFor(scores[trait.id])]));
  const situations = SCENARIOS.map((scenario) => {
    const time = answers[`${scenario.id}_time`];
    const reason = answers[`${scenario.id}_reason`];
    return {
      id: scenario.id,
      title: scenario.title,
      time,
      reason,
      timeLabel: scenario.timeOptions[time - 1],
      reasonLabel: scenario.reasonOptions[reason - 1],
      delayed: time !== 1,
      boundary: time === 2 || time === 3,
      unknownTime: time === 4,
      delayMinutes: scenario.delayMinutes[time - 1],
    };
  });
  const byId = Object.fromEntries(situations.map((s) => [s.id, s]));
  const matches = {
    H1: ['S1', 'S4'].some((id) => byId[id].delayed && byId[id].reason === 2),
    H2: (byId.S2.delayed && byId.S2.reason === 2) || (byId.S4.delayed && byId.S4.reason === 3),
    H3: situations.some((s) => s.boundary && s.reason === ({ S1: 3, S2: 4, S3: 2, S4: 4 })[s.id]),
  };
  const strategies = TRAITS.flatMap((trait) => {
    const mode = matches[trait.id] ? 'MATCH' : levels[trait.id] === 'HIGH' ? 'OPTIONAL' : null;
    return mode ? FEEDBACK[trait.id].strategies.map((strategy) => ({ ...strategy, trait: trait.id, traitName: trait.name, mode })) : [];
  }).sort((left, right) => (left.mode === 'MATCH' ? 0 : 1) - (right.mode === 'MATCH' ? 0 : 1));
  const extraKeys = [];
  if (Object.values(matches).filter(Boolean).length >= 2) extraKeys.push('MULTI_MATCH');
  if (situations.every((s) => !s.delayed)) extraKeys.push('ALL_IMMEDIATE');
  if (Object.values(levels).every((level) => level === 'MIXED')) extraKeys.push('ALL_MIXED');
  if (TRAITS.some((trait) => levels[trait.id] === 'HIGH' && !matches[trait.id])) extraKeys.push('HIGH_WITHOUT_BEHAVIOR');
  if (TRAITS.some((trait) => levels[trait.id] === 'LOW' && matches[trait.id])) extraKeys.push('LOW_WITH_BEHAVIOR');
  if (situations.some((s) => s.unknownTime)) extraKeys.push('UNKNOWN_TIME');
  extraKeys.push('NO_PRIMARY');
  return { scores, levels, situations, matches, strategies, extraKeys, extras: extraKeys.map((key) => EXTRA_FEEDBACK[key]) };
}
