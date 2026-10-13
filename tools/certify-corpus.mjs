import assert from 'node:assert/strict';
import { readFile, mkdir, writeFile } from 'node:fs/promises';
import {
  gradeAnswer,
  instantiateExercise,
  projectPublicInstance,
  validateDefinition,
} from 'novlearn-exercise-engine';

const fixture = (id) =>
  new URL(
    `../tests/fixtures/legacy/adapted/${id}.definition.json`,
    import.meta.url,
  );
const ids = [1, 6, 36, 64, 78, 96, 103, 106];
const seeds = [0, 1, 42, 2026];
const compatibility = {
  1: 'compatible-under-reviewed-recipe',
  6: 'partial-indeterminate-wrong-answer',
  36: 'compatible-under-reviewed-recipe',
  64: 'partial-semantic-arbitration',
  78: 'partial-reviewed-domain-restrictions',
  96: 'partial-reviewed-domain-restrictions',
  103: 'compatible-under-reviewed-recipe',
  106: 'compatible-under-reviewed-recipe',
};
const report = {
  schemaVersion: 1,
  createdAt: new Date().toISOString(),
  seeds,
  exercises: [],
};

function questionElements(elements) {
  return elements.filter(
    (element) => element.type === 'question' || element.type === 'mcq',
  );
}

function expectedSubmission(instance, question) {
  return question.type === 'mcq'
    ? { format: 'selection', optionIds: question.expected.optionIds }
    : { format: 'latex', source: question.expected.math.displayLatex };
}

function submission(instance, question, answer) {
  return {
    schemaVersion: 5,
    instanceId: instance.instanceId,
    questionId: question.id,
    answer,
  };
}

function exactValue(value) {
  if (value.kind === 'integer') return [BigInt(value.value), 1n];
  if (value.kind === 'rational')
    return [BigInt(value.numerator), BigInt(value.denominator)];
  throw new Error(
    `Independent oracle does not support generated ${value.kind}.`,
  );
}

function constraintOperand(operand, values) {
  if (Object.hasOwn(operand, 'constant')) return [BigInt(operand.constant), 1n];
  if (Object.hasOwn(operand, 'variable'))
    return exactValue(values[operand.variable]);
  if (operand.latex === '2\\cdot\\mathrm{u0}^2') {
    const [numerator, denominator] = exactValue(values.u0);
    return [2n * numerator * numerator, denominator * denominator];
  }
  throw new Error(
    `Unrecognized reviewed-corpus constraint oracle: ${operand.latex}`,
  );
}

function constraintSatisfied(constraint, values) {
  const [leftNumerator, leftDenominator] = constraintOperand(
    constraint.left,
    values,
  );
  const [rightNumerator, rightDenominator] = constraintOperand(
    constraint.right,
    values,
  );
  const difference =
    leftNumerator * rightDenominator - rightNumerator * leftDenominator;
  return {
    '<': difference < 0n,
    '<=': difference <= 0n,
    '>': difference > 0n,
    '>=': difference >= 0n,
    '==': difference === 0n,
    '!=': difference !== 0n,
  }[constraint.operator];
}

function assertPublicDoesNotExposeAnswers(value) {
  if (Array.isArray(value)) {
    for (const entry of value) assertPublicDoesNotExposeAnswers(entry);
  } else if (value && typeof value === 'object') {
    assert.equal(
      Object.hasOwn(value, 'expected'),
      false,
      'public element exposed expected answer',
    );
    assert.equal(
      Object.hasOwn(value, 'policy'),
      false,
      'public element exposed grading policy',
    );
    for (const entry of Object.values(value))
      assertPublicDoesNotExposeAnswers(entry);
  }
}

for (const id of ids) {
  const definition = JSON.parse(await readFile(fixture(id), 'utf8'));
  const valid = validateDefinition(definition);
  assert.equal(valid.ok, true, `exercise ${id}: ${JSON.stringify(valid)}`);
  const exercise = {
    id,
    compatibility: compatibility[id],
    elements: definition.elements.length,
    seeds: [],
  };

  for (const seed of seeds) {
    const instanceId = `cert-${id}-${seed}`;
    const result = instantiateExercise(valid.value, { seed, instanceId });
    assert.equal(
      result.ok,
      true,
      `exercise ${id}, seed ${seed}: ${JSON.stringify(result)}`,
    );
    const official = result.value;
    assert.equal(official.elements.length, definition.elements.length);
    assert.deepEqual(
      official.elements.map((element) => element.id),
      definition.elements.map((element) => element.id),
    );

    const replay = instantiateExercise(valid.value, { seed, instanceId });
    assert.equal(replay.ok, true);
    assert.equal(JSON.stringify(replay.value), JSON.stringify(official));

    const questions = questionElements(official.elements);
    const constraintResults = valid.value.generation.constraints.map(
      (constraint) => ({
        constraint,
        satisfied: constraintSatisfied(constraint, official.generation.values),
      }),
    );
    assert.ok(
      constraintResults.every((entry) => entry.satisfied),
      `exercise ${id}, seed ${seed} violated a generation constraint`,
    );
    const questionResults = [];
    for (const question of questions) {
      const correctCandidates =
        question.type === 'mcq'
          ? [expectedSubmission(official, question)]
          : [
              question.expected.math.displayLatex,
              question.expected.math.source,
              question.expected.math.displayLatex.replaceAll(
                '\\exponentialE',
                'e',
              ),
              ...(question.policy.form === 'power-of-e' &&
              question.expected.math.displayLatex.startsWith('\\exp(') &&
              question.expected.math.displayLatex.endsWith(')')
                ? [`e^{${question.expected.math.displayLatex.slice(5, -1)}}`]
                : []),
            ]
              .filter((source, index, all) => all.indexOf(source) === index)
              .map((source) => ({ format: 'latex', source }));
      const correctAttempts = correctCandidates.map((answer) => ({
        answer,
        result: gradeAnswer(official, submission(official, question, answer)),
      }));
      const correct =
        correctAttempts.find((attempt) => attempt.result.state === 'correct')
          ?.result ?? correctAttempts[0].result;
      if (correct.state !== 'correct')
        report.failures = [
          ...(report.failures ?? []),
          {
            exerciseId: id,
            seed,
            questionId: question.id,
            kind: 'expected-answer-not-accepted',
            attempts: correctAttempts,
          },
        ];

      const wrongAnswer =
        question.type === 'mcq'
          ? {
              format: 'selection',
              optionIds: question.options
                .filter(
                  (option) => !question.expected.optionIds.includes(option.id),
                )
                .slice(0, 1)
                .map((option) => option.id),
            }
          : {
              format: 'latex',
              source: question.expected.math.displayLatex === '0' ? '1' : '0',
            };
      const incorrect = gradeAnswer(
        official,
        submission(official, question, wrongAnswer),
      );
      assert.notEqual(
        incorrect.state,
        'correct',
        `exercise ${id}/${question.id} wrong answer was accepted: ${JSON.stringify(incorrect)}`,
      );

      const invalidAnswer =
        question.type === 'mcq'
          ? { format: 'selection', optionIds: ['__unknown_option__'] }
          : { format: 'latex', source: '' };
      const invalid = gradeAnswer(
        official,
        submission(official, question, invalidAnswer),
      );
      assert.equal(
        invalid.state,
        'invalid',
        `exercise ${id}/${question.id} invalid answer: ${JSON.stringify(invalid)}`,
      );
      questionResults.push({
        id: question.id,
        type: question.type,
        expected: question.expected,
        correctAttempts,
        incorrect,
        invalid,
      });
    }

    const publicInstance = projectPublicInstance(official);
    assertPublicDoesNotExposeAnswers(publicInstance);
    const roundTrip = JSON.parse(JSON.stringify(official));
    assert.equal(JSON.stringify(roundTrip), JSON.stringify(official));
    const replayFromSnapshot = gradeAnswer(
      roundTrip,
      submission(
        roundTrip,
        questions[0],
        expectedSubmission(roundTrip, questions[0]),
      ),
    );
    assert.equal(replayFromSnapshot.state, 'correct');
    exercise.seeds.push({
      seed,
      values: official.generation.values,
      constraintResults,
      elements: official.elements,
      questions: questionResults,
      publicInstance,
      serializationReplay: replayFromSnapshot,
    });
  }
  report.exercises.push(exercise);
  const exerciseFailures = (report.failures ?? []).filter(
    (failure) => failure.exerciseId === id,
  ).length;
  console.log(
    `exercise ${id}: ${exercise.elements} elements; ${exercise.seeds.length} seeds; ${exercise.seeds[0].questions.length} questions; ${exerciseFailures ? `FAIL (${exerciseFailures} expected answer(s) rejected)` : 'PASS'}`,
  );
}

const questions = report.exercises.flatMap((exercise) =>
  exercise.seeds.flatMap((seed) => seed.questions),
);
report.summary = {
  status: report.failures?.length ? 'failed' : 'passed',
  exercises: report.exercises.length,
  seedsPerExercise: seeds.length,
  instances: report.exercises.reduce(
    (total, exercise) => total + exercise.seeds.length,
    0,
  ),
  elementsInstantiated: report.exercises.reduce(
    (total, exercise) => total + exercise.seeds.length * exercise.elements,
    0,
  ),
  questionRuns: questions.length,
  correctAnswersAccepted: questions.filter((question) =>
    question.correctAttempts.some(
      (attempt) => attempt.result.state === 'correct',
    ),
  ).length,
  wrongAnswerStates: questions.reduce((states, question) => {
    states[question.incorrect.state] =
      (states[question.incorrect.state] ?? 0) + 1;
    return states;
  }, {}),
  invalidAnswersRejected: questions.filter(
    (question) => question.invalid.state === 'invalid',
  ).length,
  generationConstraintsChecked: report.exercises.reduce(
    (total, exercise) =>
      total +
      exercise.seeds.reduce(
        (seedTotal, seed) => seedTotal + seed.constraintResults.length,
        0,
      ),
    0,
  ),
  failures: report.failures?.length ?? 0,
};

const output = new URL(
  '../docs/certification/corpus-report.json',
  import.meta.url,
);
await mkdir(new URL('../docs/certification/', import.meta.url), {
  recursive: true,
});
await writeFile(output, `${JSON.stringify(report, null, 2)}\n`);
console.log(`Machine report: ${output.pathname}`);
if (report.summary.status !== 'passed') process.exitCode = 1;
