# Copilot instructions

## Project shape

- `index.html` is the complete application: semantic HTML, CSS, quiz data, and vanilla JavaScript live together in one file.
- The quiz state and flow are managed in that file: `questions` holds question content, `renderQuestion()` builds each round, `selectAnswer()` scores and gives feedback, and `showResults()` / `restartQuiz()` manage the end of a run.
- The theme is independent of quiz state. CSS variables in `:root` and `[data-theme="dark"]` define the palettes; `setTheme()` applies the theme and the `orbit-theme` local-storage value persists a manual choice.

## Running and checking

- Open `index.html` directly in a browser; there is no package manifest or configured build, test, or lint command.
- For a browser smoke check, try correct and incorrect answers, confirm score and progress updates, complete the quiz and restart it, and switch themes. Answer choices are native buttons and should remain keyboard-focusable.

## Code conventions

- Keep the app self-contained and dependency-free unless a requested change requires otherwise.
- Add or edit quiz content in the `questions` array. `correct` is a zero-based index into `answers`; progress, completion, and score display use `questions.length`.
- Keep theme-specific colors in the CSS custom properties for both themes. Preserve the system-theme default and saved user selection when changing theme behavior.
- Preserve accessible interaction patterns: native buttons, the answer group's label, live feedback, progress-bar values, visible keyboard focus, and hidden decorative emoji.
- Honor `prefers-reduced-motion` when adding or changing animation.
