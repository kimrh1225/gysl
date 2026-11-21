import { LIKERT, ITEMS, RECENT_MONTH_PROMPT, SCENARIO_COMMON, SCENARIOS, TRAITS } from './survey-content.mjs';
import { RESULT_INTRO, FEEDBACK, REFLECTIONS, LIMIT_NOTICE } from './feedback-content.mjs';
import { analyze, QUESTION_IDS } from './analysis.mjs';

const app = document.querySelector('#app');
const homeLink = document.querySelector('#home-link');
const answers = {};
const pages = [
  { title: '계획한 시각에 대한 생각', itemIds: ['P1', 'P2', 'P3', 'P4', 'P5'] },
  { title: '과제를 시작할 때의 마음', itemIds: ['A1', 'A2', 'A3'] },
  { title: '과제와 감정에 대한 생각', itemIds: ['A4', 'A5', 'A6'] },
  { title: '시작 시각에 대한 생각', itemIds: ['T1', 'T2', 'T3', 'T4', 'T5'] },
  { title: '상황에서 시작 시각 고르기', scenarioIds: ['S1', 'S2'] },
  { title: '다른 상황에서 선택하기', scenarioIds: ['S3', 'S4'] },
];
let page = -1;

function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char]);
}

function goTop() { window.scrollTo(0, 0); }

function renderHome() {
  page = -1;
  app.innerHTML = `
    <section class="hero"><div>
      <p class="eyebrow">학업 시작을 이해하는 짧은 시간</p>
      <h1>시작은 왜<br><em>그 시각</em>이어야 할까?</h1>
      <p class="lead">계획한 시각을 놓쳤을 때, 과제가 부담스러울 때, 정각을 기다릴 때. 평소 생각과 가상 상황에서의 선택을 살펴보세요.</p>
      <button class="button" id="start">설문 시작하기</button>
      <div class="hero-meta"><span>평소 문항 16개</span><span>상황 4개 · 선택 8개</span><span>로그인 없이 바로 결과 확인</span></div>
    </div><div class="visual" aria-hidden="true"><div class="clock"><span class="clock-dot"></span><span class="clock-mark mark12">12</span><span class="clock-mark mark3">3</span><span class="clock-mark mark6">6</span><span class="clock-mark mark9">9</span></div><div class="float-card float-one"><b>19:17</b>지금 시작해도 될까?</div><div class="float-card float-two"><b>20:00</b>정각이 더 편할까?</div></div></section>
    <h2 class="section-title">내 선택을 차분히 살펴보기</h2>
    <section class="features"><article class="feature"><span class="icon">①</span><h3>평소 생각</h3><p>최근 한 달의 학업 시작 경험을 5점 척도로 돌아봅니다.</p></article><article class="feature"><span class="icon">②</span><h3>가상 상황</h3><p>서로 다른 네 상황에서 시작 시각과 이유를 고릅니다.</p></article><article class="feature"><span class="icon">③</span><h3>나에게 맞는 제안</h3><p>세 영역의 응답과 선택을 함께 보고, 필요한 전략을 직접 고를 수 있습니다.</p></article></section>`;
  document.querySelector('#start').addEventListener('click', () => { page = 0; renderPage(); });
  goTop();
}

function choiceBlock(id, question, options, number) {
  return `<fieldset class="question-block" data-question="${id}"><legend><span class="question-number">${number}</span>${escapeHtml(question)}</legend><div class="options">${options.map((option, index) => {
    const value = index + 1;
    const checked = answers[id] === value;
    return `<label class="option${checked ? ' selected' : ''}"><input type="radio" name="${id}" value="${value}" ${checked ? 'checked' : ''}><span>${escapeHtml(option)}</span></label>`;
  }).join('')}</div></fieldset>`;
}

function renderPage() {
  const config = pages[page];
  const ids = config.itemIds || config.scenarioIds.flatMap((id) => [`${id}_time`, `${id}_reason`]);
  const answered = QUESTION_IDS.filter((id) => answers[id] !== undefined).length;
  const content = config.itemIds
    ? config.itemIds.map((id, index) => {
      const item = ITEMS.find((entry) => entry.id === id);
      return choiceBlock(id, item.text, LIKERT, index + 1);
    }).join('')
    : config.scenarioIds.map((id, index) => {
      const scenario = SCENARIOS.find((entry) => entry.id === id);
      return `<section class="scenario-card"><h2>${escapeHtml(scenario.title)}</h2><p>${escapeHtml(scenario.context)}</p>${choiceBlock(`${id}_time`, scenario.timeQuestion, scenario.timeOptions, index * 2 + 1)}${choiceBlock(`${id}_reason`, scenario.reasonQuestion, scenario.reasonOptions, index * 2 + 2)}</section>`;
    }).join('');
  app.innerHTML = `<section class="survey-wrap"><div class="survey-head"><h1>${escapeHtml(config.title)}</h1><span class="step-label">${page + 1} / ${pages.length} 페이지</span></div><div class="progress" role="progressbar" aria-label="설문 진행률" aria-valuemin="0" aria-valuemax="24" aria-valuenow="${answered}"><div class="progress-fill" style="width:${answered / 24 * 100}%"></div></div><p class="progress-caption">전체 24개 응답 중 ${answered}개 완료</p><p class="hint">${escapeHtml(config.itemIds ? RECENT_MONTH_PROMPT : SCENARIO_COMMON)}</p><div class="panel">${content}</div><p class="error" id="form-error" role="alert"></p><div class="survey-actions"><button class="button secondary" id="back">이전</button><button class="button" id="next">${page === pages.length - 1 ? '결과 보기' : '다음'}</button></div></section>`;
  app.querySelectorAll('input[type="radio"]').forEach((input) => input.addEventListener('change', (event) => {
    answers[event.target.name] = Number(event.target.value);
    event.target.closest('.options').querySelectorAll('.option').forEach((label) => label.classList.toggle('selected', label.contains(event.target)));
    const done = QUESTION_IDS.filter((id) => answers[id] !== undefined).length;
    const progress = app.querySelector('.progress');
    progress.setAttribute('aria-valuenow', done);
    progress.querySelector('.progress-fill').style.width = `${done / 24 * 100}%`;
    app.querySelector('.progress-caption').textContent = `전체 24개 응답 중 ${done}개 완료`;
    app.querySelector('#form-error').textContent = '';
  }));
  app.querySelector('#back').addEventListener('click', () => { page = page === 0 ? -1 : page - 1; page === -1 ? renderHome() : renderPage(); });
  app.querySelector('#next').addEventListener('click', () => {
    const missing = ids.find((id) => answers[id] === undefined);
    if (missing) {
      app.querySelector('#form-error').textContent = '이 페이지의 모든 문항에 답해 주세요.';
      app.querySelector(`[data-question="${missing}"]`).scrollIntoView({ behavior: 'smooth', block: 'center' });
      return;
    }
    if (page < pages.length - 1) { page += 1; renderPage(); }
    else renderResults();
  });
  goTop();
}

function renderResults() {
  const result = analyze(answers);
  const traits = TRAITS.map((trait) => {
    const score = result.scores[trait.id];
    const feedback = FEEDBACK[trait.id];
    return `<article class="panel trait-card"><div class="trait-heading"><h3>${escapeHtml(trait.name)}</h3><strong>${score.toFixed(1)} / 5.0</strong></div><div class="bar" role="img" aria-label="5점 만점 중 ${score.toFixed(1)}점"><span style="width:${score / 5 * 100}%"></span></div><p class="trait-description">${escapeHtml(trait.description)}</p><p>${escapeHtml(feedback[result.levels[trait.id]])}</p><p class="match-note">${escapeHtml(feedback[result.matches[trait.id] ? 'MATCH' : 'NO_MATCH'])}</p></article>`;
  }).join('');
  const situations = result.situations.map((situation) => `<li><strong>${escapeHtml(situation.title)}</strong><span>${escapeHtml(situation.timeLabel)} · ${situation.delayMinutes === null ? '지연 시간 미상' : situation.delayMinutes === 0 ? '바로 시작' : `${situation.delayMinutes}분 뒤 시작`}</span><small>선택 이유: ${escapeHtml(situation.reasonLabel)}</small></li>`).join('');
  const strategies = result.strategies.length ? result.strategies.map((strategy) => `<article class="guide-item"><span class="strategy-label">${escapeHtml(strategy.traitName)} · ${strategy.mode === 'MATCH' ? '상황 선택과 연결된 제안' : '선택적으로 알아보기'}</span><h3>${escapeHtml(strategy.title)}</h3><p>${escapeHtml(strategy.text)}</p></article>`).join('') : '<p class="quiet">이번 응답에서 제안 조건에 해당하는 전략 카드는 없습니다. 필요할 때 자신의 경험을 바탕으로 방법을 선택해 보세요.</p>';
  app.innerHTML = `<section class="results-wrap"><span class="result-kicker">나의 응답 살펴보기</span><h1>학업 시작 성향 결과</h1><p class="result-intro">${escapeHtml(RESULT_INTRO)}</p><section class="result-section"><h2>평소 응답과 상황 선택</h2><p class="section-lead">각 점수는 해당 문항에 대한 동의 경향입니다. 아래 세 영역을 각각 살펴보세요.</p><div class="trait-grid">${traits}</div></section><section class="result-section"><h2>네 상황에서 고른 시작 시각</h2><ul class="situation-list">${situations}</ul></section><section class="result-section"><h2>함께 살펴볼 점</h2><div class="insight-list">${result.extras.map((text) => `<p>${escapeHtml(text)}</p>`).join('')}</div></section><section class="result-section"><h2>필요할 때 시도할 방법</h2><p class="section-lead">상황 선택과 연결된 방법을 먼저 표시하고, 관련 점수가 높을 때는 선택적으로 살펴볼 방법을 이어서 표시합니다.</p><div class="guide">${strategies}</div></section><section class="result-section"><h2>나에게 묻기</h2><ol class="reflection-list">${REFLECTIONS.map((text) => `<li>${escapeHtml(text)}</li>`).join('')}</ol></section><aside class="limit-notice"><h2>결과를 읽을 때</h2><p>${escapeHtml(LIMIT_NOTICE)}</p></aside><div class="result-actions"><button class="button" id="restart">처음부터 다시 하기</button></div></section>`;
  app.querySelector('#restart').addEventListener('click', () => { for (const key of Object.keys(answers)) delete answers[key]; renderHome(); });
  goTop();
}

homeLink.addEventListener('click', (event) => { event.preventDefault(); renderHome(); });
renderHome();
