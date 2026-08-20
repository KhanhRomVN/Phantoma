import React from 'react';

// Types
import { Question, QuestionAnswer } from '../../../../../types/message';

// Components
import QuestionAnswerBlock from '../../blocks/other/QuestionAnswerBlock';

interface QuestionRendererProps {
  questions?: Question[];
  options?: string[];
  title?: string;
  optional?: boolean;
  selectedOption?: string;
  questionAnswers?: Record<string, QuestionAnswer>;
  disabled?: boolean;
  onAnswer?: (questionId: string, value: string | string[] | boolean) => void;
  onAllAnswered?: (answers: Record<string, QuestionAnswer>) => void;
  onOptionSelect?: (option: string) => void;
}

/**
 * Renderer cho block câu hỏi/tùy chọn
 * Xử lý cả định dạng tùy chọn đơn và nhiều câu hỏi
 */
export const QuestionRenderer: React.FC<QuestionRendererProps> = ({
  questions,
  options,
  title,
  optional,
  selectedOption,
  questionAnswers,
  disabled,
  onAnswer,
  onAllAnswered,
  onOptionSelect,
}) => {
  const hasQuestions = questions && questions.length > 0;

  return (
    <QuestionAnswerBlock
      questions={hasQuestions ? questions : undefined}
      options={!hasQuestions ? options : undefined}
      title={title}
      optional={optional}
      selectedOption={!hasQuestions ? selectedOption : undefined}
      initialAnswers={hasQuestions ? questionAnswers : undefined}
      disabled={disabled}
      onAnswer={(questionId, value) => {
        if (!hasQuestions) return;
        if (onAnswer) {
          onAnswer(questionId, value);
        }
      }}
      onAllAnswered={(answers) => {
        if (!hasQuestions) return;
        if (onAllAnswered) {
          onAllAnswered(answers);
        }
      }}
      onOptionSelect={(option: string) => {
        if (hasQuestions) return;
        if (onOptionSelect) {
          onOptionSelect(option);
        }
      }}
    />
  );
};
