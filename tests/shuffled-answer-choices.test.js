const assert = require("node:assert/strict");
const { readFileSync } = require("node:fs");
const path = require("node:path");
const test = require("node:test");
const vm = require("node:vm");

class MockElement {
  constructor() {
    this.children = [];
    this.listeners = {};
    this.attributes = {};
    this.classNames = new Set();
    this.classList = {
      add: (name) => this.classNames.add(name),
    };
    this.style = { setProperty() {} };
    this.dataset = {};
    this.hidden = false;
    this.disabled = false;
    this.textContent = "";
    this.content = "";
  }

  set innerHTML(value) {
    this.html = value;
    if (this.className === "answer") {
      this.children = ["answer-letter", "answer-text", "answer-icon"].map((className) => {
        const child = new MockElement();
        child.className = className;
        return child;
      });
    }
  }

  get innerHTML() {
    return this.html;
  }

  querySelector(selector) {
    if (selector === ".restart") {
      return this.restartButton || (this.restartButton = new MockElement());
    }
    return this.children.find((child) => child.className === selector.slice(1));
  }

  addEventListener(type, listener) {
    this.listeners[type] = listener;
  }

  append(element) {
    this.children.push(element);
  }

  replaceChildren(...elements) {
    this.children = elements;
  }

  setAttribute(name, value) {
    this.attributes[name] = value;
  }

  getBoundingClientRect() {
    return { left: 0, top: 0, width: 100, height: 40 };
  }

  click() {
    if (!this.disabled) this.listeners.click?.();
  }
}

function createQuiz() {
  const ids = [
    "questionText",
    "questionCount",
    "answers",
    "progressLabel",
    "progressFill",
    "score",
    "feedback",
    "feedbackEmoji",
    "feedbackText",
    "nextButton",
    "hint",
    "quizContent",
    "result",
    "themeToggle",
    "themeIcon",
    "themeLabel",
  ];
  const elements = Object.fromEntries(ids.map((id) => [id, new MockElement()]));
  const progressBar = new MockElement();
  const themeColor = new MockElement();
  const document = {
    body: new MockElement(),
    documentElement: { dataset: {} },
    getElementById: (id) => elements[id],
    querySelector: (selector) => selector === '[role="progressbar"]' ? progressBar : themeColor,
    createElement: () => new MockElement(),
  };
  const deterministicMath = Object.create(Math);
  deterministicMath.random = () => 0;
  const context = vm.createContext({
    document,
    localStorage: { getItem: () => null, setItem() {} },
    window: { matchMedia: () => ({ matches: false }) },
    Math: deterministicMath,
  });
  const html = readFileSync(path.join(__dirname, "..", "index.html"), "utf8");
  const script = html.match(/<script>([\s\S]*?)<\/script>/)[1];
  vm.runInContext(script, context);

  return { context, elements };
}

function currentAnswers(context) {
  return vm.runInContext("questions[current].answers", context);
}

function correctAnswer(context) {
  return vm.runInContext("questions[current].answers[questions[current].correct]", context);
}

function renderedAnswers(elements) {
  return elements.answers.children.map((button) => button.querySelector(".answer-text").textContent);
}

test("shuffles every rendered question while preserving correct scoring and restart", () => {
  const { context, elements } = createQuiz();
  const questionCount = vm.runInContext("questions.length", context);
  const originalAnswers = JSON.stringify(vm.runInContext("questions.map((question) => question.answers)", context));

  for (let question = 0; question < questionCount; question += 1) {
    const sourceAnswers = Array.from(currentAnswers(context));
    const displayedAnswers = renderedAnswers(elements);
    assert.equal(displayedAnswers.length, sourceAnswers.length);
    assert.deepEqual([...displayedAnswers].sort(), [...sourceAnswers].sort());
    assert.notDeepEqual(displayedAnswers, sourceAnswers);

    const correctChoice = correctAnswer(context);
    const correctButton = elements.answers.children.find(
      (button) => button.querySelector(".answer-text").textContent === correctChoice,
    );
    assert.ok(correctButton, "the correct answer should be present after shuffling");
    correctButton.click();
    assert.equal(elements.score.textContent, String(question + 1));
    assert.ok(correctButton.classNames.has("correct"));
    elements.nextButton.click();
  }

  assert.equal(elements.result.hidden, false);
  assert.match(elements.result.innerHTML, /10<span> \/ 10 correct<\/span>/);
  assert.equal(JSON.stringify(vm.runInContext("questions.map((question) => question.answers)", context)), originalAnswers);
  elements.result.querySelector(".restart").click();
  assert.equal(elements.score.textContent, "0");
  assert.equal(vm.runInContext("current", context), 0);
});

test("an incorrect shuffled choice does not score and still identifies the correct answer", () => {
  const { elements } = createQuiz();
  const displayedAnswers = renderedAnswers(elements);
  const correctChoice = "Mars";
  const wrongButton = elements.answers.children.find(
    (button) => button.querySelector(".answer-text").textContent !== correctChoice,
  );
  wrongButton.click();

  assert.equal(elements.score.textContent, "0");
  assert.match(elements.feedbackText.textContent, /The answer is Mars\./);
  assert.ok(elements.answers.children.some((button) => button.classNames.has("correct")));
});
