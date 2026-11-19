type QuestionThreadProps = {
  position?: number;
  compact?: boolean;
  completed?: boolean;
};

export function QuestionThread({
  position,
  compact = false,
  completed = false,
}: QuestionThreadProps) {
  return (
    <div className={`question-thread${compact ? " question-thread-compact" : ""}`}>
      <p className="thread-caption">
        {completed
          ? "Fifteen questions complete"
          : position
            ? `Question ${position} of 15`
            : "Question order"}
      </p>
      <ol aria-label="Question sequence">
        {Array.from({ length: 15 }, (_, index) => {
          const step = index + 1;
          const current = !completed && position === step;
          const complete = completed || (position !== undefined && step < position);

          return (
            <li
              key={step}
              className={current ? "is-current" : complete ? "is-complete" : ""}
              aria-current={current ? "step" : undefined}
              aria-label={`Question ${step}${current ? ", current" : complete ? ", complete" : ""}`}
            >
              <span aria-hidden="true">{String(step).padStart(2, "0")}</span>
            </li>
          );
        })}
      </ol>
    </div>
  );
}
