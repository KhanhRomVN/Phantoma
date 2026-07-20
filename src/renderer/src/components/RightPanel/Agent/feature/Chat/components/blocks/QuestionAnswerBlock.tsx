import React, { useState, useCallback, useEffect, useRef } from 'react';
import { Question, QuestionAnswer, QuestionType } from '../../types/message';
import { cn } from '@renderer/shared/lib/utils';
import { $ } from '@renderer/utils/color';
import { ToolHeader } from '../tools/ToolHeader';

interface QuestionAnswerBlockProps {
  questions?: Question[];
  options?: string[];
  onAnswer?: (questionId: string, value: string | string[] | boolean) => void;
  onAllAnswered?: (answers: Record<string, QuestionAnswer>) => void;
  initialAnswers?: Record<string, QuestionAnswer>;
  disabled?: boolean;
  title?: string;
  /** Legacy props for single-question mode */
  selectedOption?: string;
  onOptionSelect?: (option: string) => void;
  optional?: boolean;
}

const QuestionAnswerBlock: React.FC<QuestionAnswerBlockProps> = ({
  questions: questionsProp,
  options: optionsProp,
  onAnswer: onAnswerProp,
  onAllAnswered: onAllAnsweredProp,
  initialAnswers = {},
  disabled = false,
  title,
selectedOption: selectedOptionProp,
  onOptionSelect: onOptionSelectProp,
}) => {
  // Determine if this is paginated mode (has questions array) or legacy mode (has options)
  const isPaginated = questionsProp && questionsProp.length > 0;
  const questions = isPaginated ? questionsProp! : [];
  const legacyOptions = optionsProp || [];

  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, QuestionAnswer>>(initialAnswers);
  const [selectedOptions, setSelectedOptions] = useState<Record<string, string | string[]>>({});
  const [textInputs, setTextInputs] = useState<Record<string, string>>({});
  const [confirmValues, setConfirmValues] = useState<Record<string, boolean>>({});
  // Store custom "Khác" values separately so they persist when switching options
  const [customValues, setCustomValues] = useState<Record<string, string>>({});
  // Store multi-choice custom "Khác" values separately
  const [multiCustomValues, setMultiCustomValues] = useState<Record<string, string>>({});
  // Internal state to control summary view (avoid relying on props)
  const [isSummaryMode, setIsSummaryModeState] = useState(false);
  // Ref to track summary mode across re-renders and re-mounts (giống cách TerminalBlock track state)
  const isSummaryModeRef = useRef(false);
  // Ref to track if we've restored from initialAnswers (prevent re-initialization)
  const hasRestoredRef = useRef(false);

  // Wrapper to keep state and ref in sync
  const setIsSummaryMode = (value: boolean) => {
    isSummaryModeRef.current = value;
    setIsSummaryModeState(value);
  };

  // Legacy mode: single question with options
  const isLegacyMode = !isPaginated && legacyOptions.length > 0;
  const legacyAnswered = !!selectedOptionProp;

  // Sync initialAnswers to answers state when it changes (for history load)
  useEffect(() => {
    const initialAnswersKeys = Object.keys(initialAnswers);
    const hasInitialAnswers = isPaginated && initialAnswersKeys.length > 0;

    if (hasInitialAnswers) {
      if (hasRestoredRef.current) {
        return;
      }
      hasRestoredRef.current = true;

      const totalQuestions = questions.length;
      const answeredCount = initialAnswersKeys.length;
      if (answeredCount === totalQuestions) {
        setIsSummaryMode(true);
      }

      setAnswers(initialAnswers);
      Object.entries(initialAnswers).forEach(([qId, answer]) => {
        const question = questions.find((q) => q.id === qId);
        if (!question) return;
        if (question.type === 'confirm') {
          setConfirmValues((prev) => ({
            ...prev,
            [qId]: answer.value as boolean,
          }));
        } else if (question.type === 'single' || question.type === 'multi') {
          const value = answer.value;
          if (typeof value === 'string' || Array.isArray(value)) {
            setSelectedOptions((prev) => ({ ...prev, [qId]: value }));
          }
        }
      });
    } else {
      hasRestoredRef.current = false;
    }
  }, [initialAnswers, isPaginated, questions]);

  const currentQuestion = isPaginated ? questions[currentIndex] : null;
  const totalQuestions = questions.length;
  const isLastQuestion = currentIndex === totalQuestions - 1;
  const isAllAnswered = isPaginated
    ? Object.keys(answers).length === totalQuestions
    : legacyAnswered;

  // Check if current question is answered
  const isCurrentAnswered = useCallback(() => {
    if (!isPaginated || !currentQuestion) return false;
    const q = currentQuestion;
    if (q.type === 'multi') {
      const selected = (selectedOptions[q.id] as string[]) || [];
      return selected.length > 0;
    }
    if (q.type === 'single') {
      const selected = selectedOptions[q.id] as string;
      return !!selected && selected.length > 0;
    }
    if (q.type === 'text') {
      const value = textInputs[q.id] || '';
      return value.trim().length > 0;
    }
    if (q.type === 'confirm') {
      const hasConfirmValue = confirmValues[q.id] !== undefined;
      const hasAnswer = answers[q.id] !== undefined;
      return hasConfirmValue || hasAnswer;
    }
    const answer = answers[q.id];
    if (!answer) return false;
    if (q.type === 'single') return typeof answer.value === 'string' && answer.value.length > 0;
    if (q.type === 'multi') return Array.isArray(answer.value) && answer.value.length > 0;
    if (q.type === 'text')
      return typeof answer.value === 'string' && answer.value.trim().length > 0;
    if (q.type === 'confirm') return typeof answer.value === 'boolean';
    return false;
  }, [isPaginated, currentQuestion, answers, selectedOptions, textInputs, confirmValues]);

  const handleSingleSelect = (option: string) => {
    if (disabled || isAllAnswered || !isPaginated || !currentQuestion) {
      return;
    }
    const answer: QuestionAnswer = {
      questionId: currentQuestion.id,
      value: option,
    };
    const newAnswers = { ...answers, [currentQuestion.id]: answer };
    setAnswers(newAnswers);
    setSelectedOptions((prev) => ({ ...prev, [currentQuestion.id]: option }));
    onAnswerProp?.(currentQuestion.id, option);
  };

  const handleMultiToggle = (option: string) => {
    if (disabled || isAllAnswered || !isPaginated || !currentQuestion) return;
    const currentSelected = (selectedOptions[currentQuestion.id] as string[]) || [];
    const newSelected = currentSelected.includes(option)
      ? currentSelected.filter((o) => o !== option)
      : [...currentSelected, option];
    setSelectedOptions({
      ...selectedOptions,
      [currentQuestion.id]: newSelected,
    });
  };

  const handleTextSubmit = () => {
    if (disabled || isAllAnswered || !isPaginated || !currentQuestion) {
      return;
    }

    const value = textInputs[currentQuestion.id] || '';
    if (value.trim().length === 0) {
      return;
    }

    const answer: QuestionAnswer = {
      questionId: currentQuestion.id,
      value: value.trim(),
    };

    const newAnswers = { ...answers, [currentQuestion.id]: answer };
    setAnswers(newAnswers);
    onAnswerProp?.(currentQuestion.id, value.trim());
    setTimeout(() => {
      if (currentIndex < totalQuestions - 1) {
        setCurrentIndex(currentIndex + 1);
      } else {
        setIsSummaryMode(true);
        onAllAnsweredProp?.(newAnswers);
      }
    }, 300);
  };
  const handleConfirm = (value: boolean) => {
    if (disabled || isAllAnswered || !isPaginated || !currentQuestion) return;
    const answer: QuestionAnswer = { questionId: currentQuestion.id, value };
    const newAnswers = { ...answers, [currentQuestion.id]: answer };
    setAnswers(newAnswers);
    setConfirmValues({ ...confirmValues, [currentQuestion.id]: value });
    onAnswerProp?.(currentQuestion.id, value);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      if (currentQuestion?.type === 'text') {
        handleTextSubmit();
      }
    }
  };

  const wrapperClassName = 'flex flex-col gap-1.5 pb-3 w-full';

  // --- Legacy rendering ---
  if (isLegacyMode) {
    const legacySelected = selectedOptionProp || null;
    return (
      <div className={wrapperClassName}>
        <ToolHeader
          title="QUESTION"
          statusColor={legacyAnswered ? $('--success, #3fb950') : $('--secondary-text')}
          icon={<span className="codicon codicon-question text-sm" />}
        />
        <div className="pl-9 mt-1">
          {title && <div className="text-[13px] font-medium text-text-primary mb-2">{title}</div>}
          <div className="flex flex-col gap-2">
            {legacyOptions.map((option) => (
              <button
                key={option}
                onClick={() => onOptionSelectProp?.(option)}
                disabled={disabled || legacyAnswered}
                className={cn(
                  'py-1.5 px-3 border-none rounded-none text-[13px] text-left transition-all duration-[0.15s] w-full',
                  legacySelected === option
                    ? 'bg-primary text-text-foreground font-semibold opacity-100'
                    : 'bg-transparent text-text-primary font-normal',
                  legacyAnswered && legacySelected !== option && 'opacity-50',
                  disabled || legacyAnswered ? 'cursor-default' : 'cursor-pointer',
                )}
                style={{
                  borderLeft: `3px solid ${legacySelected === option ? $('--primary') : $('--secondary-text')}`,
                }}
              >
                {option}
              </button>
            ))}
          </div>
        </div>
      </div>
    );
  }

  // --- Paginated rendering ---
  if (!isPaginated || !currentQuestion) {
    return null;
  }

  const getTypeLabel = (type: QuestionType): string => {
    switch (type) {
      case 'single':
        return 'Chọn một';
      case 'multi':
        return 'Chọn nhiều';
      case 'text':
        return 'Nhập văn bản';
      case 'confirm':
        return 'Xác nhận';
      default:
        return '';
    }
  };

  // Determine status color for ToolHeader dot
  const getStatusColor = () => {
    if (isAllAnswered) return $('--success, #3fb950');
    if (isCurrentAnswered()) return $('--success, #3fb950');
    return $('--secondary-text');
  };

  // Render single question type
  const renderSingle = (q: Question) => {
    const isDisabled = disabled || isAllAnswered;
    const selected = (answers[q.id]?.value as string) || '';
    const customValue = customValues[q.id] || '';

    const options = q.options || [];
    const lastOption = options.length > 0 ? options[options.length - 1] : '';
    const hasAiOther =
      lastOption.toLowerCase().includes('khác') || lastOption.toLowerCase().includes('other');

    const updateCustomSelection = (value: string) => {
      setCustomValues((prev) => ({ ...prev, [q.id]: value }));

      if (value.trim()) {
        const fullValue = `Khác: ${value.trim()}`;
        setSelectedOptions((prev) => ({
          ...prev,
          [q.id]: fullValue,
        }));
        const answer: QuestionAnswer = { questionId: q.id, value: fullValue };
        setAnswers((prev) => ({ ...prev, [q.id]: answer }));
        onAnswerProp?.(q.id, fullValue);
      } else {
        setSelectedOptions((prev) => {
          const newState = { ...prev };
          delete newState[q.id];
          return newState;
        });
        setAnswers((prev) => {
          const newState = { ...prev };
          delete newState[q.id];
          return newState;
        });
      }
    };

    const renderOtherInput = (isSelected: boolean, placeholder: string, key: string) => {
      return (
        <div
          key={key}
          className={cn(
            'flex items-center px-4 py-2 transition-all duration-[0.15s] cursor-pointer',
            isSelected ? 'bg-primary/20' : 'bg-transparent',
          )}
          style={{
            borderLeft: `3px solid ${isSelected ? $('--primary') : $('--secondary-text')}`,
          }}
          onMouseEnter={(e) => {
            if (!isDisabled && !isSelected) {
              e.currentTarget.style.borderLeftColor = $('--secondary-text');
              e.currentTarget.style.backgroundColor = `color-mix(in srgb, ${$('--secondary-text')} 10%, transparent)`;
            }
          }}
          onMouseLeave={(e) => {
            if (!isDisabled && !isSelected) {
              e.currentTarget.style.borderLeftColor = $('--secondary-text');
              e.currentTarget.style.backgroundColor = 'transparent';
            }
          }}
          onClick={() => {
            if (!isDisabled && !isSelected) {
              const savedCustomValue = customValues[q.id] || '';
              const existingAnswer = (answers[q.id]?.value as string) || '';
              const hasKhacValue =
                existingAnswer &&
                existingAnswer.toString().startsWith('Khác:') &&
                existingAnswer.toString().length > 'Khác: '.length;

              if (savedCustomValue) {
                setCustomValues((prev) => ({
                  ...prev,
                  [q.id]: savedCustomValue,
                }));
                updateCustomSelection(savedCustomValue);
              } else if (hasKhacValue) {
                const existingText = existingAnswer.toString().replace('Khác: ', '');
                setCustomValues((prev) => ({ ...prev, [q.id]: existingText }));
                updateCustomSelection(existingText);
              }
            }
          }}
        >
          <input
            type="text"
            value={customValue}
            onChange={(e) => {
              setCustomValues((prev) => ({ ...prev, [q.id]: e.target.value }));
              updateCustomSelection(e.target.value);
            }}
            onFocus={(e) => e.target.select()}
            placeholder={placeholder}
            disabled={isDisabled}
            className={cn(
              'flex-1 p-0 bg-transparent text-text-primary border-none outline-none text-[13px] font-[inherit] min-w-0',
              isSelected ? 'font-semibold' : 'font-normal',
            )}
          />
        </div>
      );
    };

    const renderedItems: React.ReactNode[] = [];

    options.forEach((option, index) => {
      if (index === options.length - 1 && hasAiOther) {
        const isSelected = !!(selected && selected.toString().startsWith('Khác:'));
        renderedItems.push(renderOtherInput(isSelected, 'Khác (ý kiến của bạn)', `other-${q.id}`));
        return;
      }

      const isSelected = selected === option;
      renderedItems.push(
        <button
          key={`${q.id}-${option}`}
          onClick={() => handleSingleSelect(option)}
          disabled={isDisabled}
          className={cn(
            'question-option-btn py-2 px-4 border-none rounded-none text-[13px] text-left transition-[background-color,color,border-color,font-weight] duration-[0.15s] w-full',
            isSelected
              ? 'bg-primary/20 text-primary font-semibold opacity-100'
              : 'bg-transparent text-text-primary font-normal',
            isDisabled ? 'cursor-default' : 'cursor-pointer',
          )}
          style={{
            borderLeft: `3px solid ${isSelected ? $('--primary') : $('--secondary-text')}`,
          }}
          onMouseEnter={(e) => {
            if (!isDisabled && !isSelected) {
              e.currentTarget.style.borderLeftColor = $('--secondary-text');
              e.currentTarget.style.color = $('--text-primary');
              e.currentTarget.style.background = `color-mix(in srgb, ${$('--secondary-text')} 10%, transparent)`;
            }
          }}
          onMouseLeave={(e) => {
            if (!isDisabled && !isSelected) {
              e.currentTarget.style.borderLeftColor = $('--secondary-text');
              e.currentTarget.style.color = $('--text-primary');
              e.currentTarget.style.background = 'transparent';
            }
          }}
        >
          {option}
        </button>,
      );
    });

    if (!hasAiOther) {
      const isSelected = !!(selected && selected.toString().startsWith('Khác:'));
      renderedItems.push(
        renderOtherInput(isSelected, 'Khác (ý kiến của bạn)', `auto-other-${q.id}`),
      );
    }

    return <div className="flex flex-col gap-2">{renderedItems}</div>;
  };

  // Render multi question type
  const renderMulti = (q: Question) => {
    const isDisabled = disabled || isAllAnswered;
    const selected = (selectedOptions[q.id] as string[]) || [];
    const isAnswered = !!answers[q.id];
    const multiCustomValue = multiCustomValues[q.id] || '';

    const originalOptions = q.options || [];
    const hasOther = originalOptions.some(
      (opt) => opt.toLowerCase().includes('khác') || opt.toLowerCase().includes('other'),
    );

    const options = hasOther ? originalOptions : [...originalOptions, 'Khác'];
    const otherOptionText = 'Khác';
    const hasOtherOption = true;

    const handleMultiCustomChange = (value: string) => {
      setMultiCustomValues((prev) => ({ ...prev, [q.id]: value }));
      if (value.trim()) {
        const fullValue = `Khác: ${value.trim()}`;
        const newSelected = selected.filter(
          (opt) => opt !== otherOptionText && !opt.startsWith('Khác:'),
        );
        newSelected.push(fullValue);
        setSelectedOptions({ ...selectedOptions, [q.id]: newSelected });
      } else {
        if (!selected.includes(otherOptionText)) {
          const newSelected = [...selected, otherOptionText];
          setSelectedOptions({ ...selectedOptions, [q.id]: newSelected });
        }
      }
    };

    return (
      <div className="flex flex-col gap-1">
        {options.map((option) => {
          const isSelected = selected.includes(option);
          const isOther = hasOtherOption && option === otherOptionText;
          return (
            <div key={option}>
              <div
                className={cn(
                  'flex items-center gap-2.5 px-1.5 py-2 transition-all duration-[0.15s] border-l-0 bg-transparent',
                  isAnswered && !isSelected && 'opacity-50',
                )}
                style={{ cursor: isDisabled || isAnswered ? 'default' : 'pointer' }}
              >
                <input
                  type="checkbox"
                  checked={isSelected}
                  onChange={() => {
                    if (isOther) {
                      if (selected.includes(option)) {
                        const newSelected = selected.filter((opt) => opt !== option);
                        setSelectedOptions({ ...selectedOptions, [q.id]: newSelected });
                        setMultiCustomValues((prev) => ({ ...prev, [q.id]: '' }));
                      } else {
                        const newSelected = [...selected, option];
                        setSelectedOptions({ ...selectedOptions, [q.id]: newSelected });
                      }
                    } else {
                      handleMultiToggle(option);
                    }
                  }}
                  disabled={isDisabled}
                  className="w-4 h-4"
                  style={{
                    accentColor: isSelected ? $('--primary') : $('--secondary-text'),
                    cursor: isDisabled || isAnswered ? 'default' : 'pointer',
                    opacity: isSelected ? 1 : 0.4,
                  }}
                />
                {isOther ? (
                  <>
                    <input
                      type="text"
                      value={multiCustomValue}
                      onChange={(e) => {
                        setMultiCustomValues((prev) => ({
                          ...prev,
                          [q.id]: e.target.value,
                        }));
                        handleMultiCustomChange(e.target.value);
                      }}
                      placeholder="Khác (ý kiến của bạn)"
                      disabled={isDisabled}
                      className="flex-1 py-0.5 px-2 bg-transparent text-text-primary border-none outline-none text-[13px] font-[inherit] min-w-[60px]"
                      onFocus={(e) => e.target.select()}
                    />
                  </>
                ) : (
                  <span className="text-[13px]">{option}</span>
                )}
              </div>
            </div>
          );
        })}
      </div>
    );
  };

  // Render text question type
  const renderText = (q: Question) => {
    const isDisabled = disabled || isAllAnswered;
    const value = textInputs[q.id] || '';
    const isAnswered = !!answers[q.id];
    return (
      <div className="flex flex-col gap-2">
        <textarea
          value={value}
          onChange={(e) => setTextInputs({ ...textInputs, [q.id]: e.target.value })}
          onKeyDown={handleKeyDown}
          placeholder="Nhập câu trả lời của bạn..."
          disabled={isDisabled || isAnswered}
          className="w-full min-h-[80px] bg-input-background text-text-primary border border-border rounded-[4px] p-2 text-[13px] font-[inherit] resize-y outline-none"
        />
      </div>
    );
  };

  // Render confirm question type
  const renderConfirm = (q: Question) => {
    const isDisabled = disabled || isAllAnswered;
    const isAnswered = !!answers[q.id];
    const selected = confirmValues[q.id];
    const greenColor = $('--success, #3fb950');
    const redColor = $('--error, #f85149');
    const customValue = customValues[q.id] || '';

    const updateCustomSelection = (value: string) => {
      setCustomValues((prev) => ({ ...prev, [q.id]: value }));
      if (value.trim()) {
        const fullValue = `Ý kiến: ${value.trim()}`;
        const answer: QuestionAnswer = { questionId: q.id, value: fullValue };
        setAnswers((prev) => ({ ...prev, [q.id]: answer }));
        setConfirmValues((prev) => {
          const newState = { ...prev };
          delete newState[q.id];
          return newState;
        });
        onAnswerProp?.(q.id, fullValue);
      } else {
        setAnswers((prev) => {
          const newState = { ...prev };
          delete newState[q.id];
          return newState;
        });
        setConfirmValues((prev) => {
          const newState = { ...prev };
          delete newState[q.id];
          return newState;
        });
      }
    };

    const renderOptionBar = (value: boolean, label: string, color: string, isSelected: boolean) => {
      const borderColor = isSelected ? color : $('--secondary-text');
      const bgColor = isSelected ? `color-mix(in srgb, ${color} 20%, transparent)` : 'transparent';

      return (
        <div
          onClick={() => {
            if (!isDisabled) {
              handleConfirm(value);
            }
          }}
          className={cn(
            'flex items-center px-4 py-2 rounded-none text-[13px] w-full transition-all duration-[0.15s] opacity-100',
            isDisabled ? 'cursor-default' : 'cursor-pointer',
            isSelected ? 'font-semibold' : 'font-normal',
          )}
          style={{
            borderLeft: `3px solid ${borderColor}`,
            backgroundColor: bgColor,
            color: isSelected ? color : $('--text-primary'),
          }}
          onMouseEnter={(e) => {
            if (!isDisabled && !isSelected) {
              e.currentTarget.style.borderLeftColor = $('--secondary-text');
              e.currentTarget.style.color = $('--text-primary');
              e.currentTarget.style.backgroundColor = `color-mix(in srgb, ${$('--secondary-text')} 10%, transparent)`;
            }
          }}
          onMouseLeave={(e) => {
            if (!isDisabled && !isSelected) {
              e.currentTarget.style.borderLeftColor = $('--secondary-text');
              e.currentTarget.style.color = $('--text-primary');
              e.currentTarget.style.backgroundColor = 'transparent';
            }
          }}
        >
          <span>{label}</span>
        </div>
      );
    };

    return (
      <div className="flex flex-col gap-1 py-1">
        {renderOptionBar(true, 'Có', greenColor, selected === true)}
        {renderOptionBar(false, 'Không', redColor, selected === false)}

        <div
          className={cn(
            'flex items-center px-4 py-2 transition-all duration-[0.15s] cursor-pointer',
            customValue.trim() ? 'bg-primary/20' : 'bg-transparent',
          )}
          style={{
            borderLeft: `3px solid ${customValue.trim() ? $('--primary') : $('--secondary-text')}`,
          }}
          onMouseEnter={(e) => {
            if (!isDisabled && !customValue.trim()) {
              e.currentTarget.style.borderLeftColor = $('--secondary-text');
              e.currentTarget.style.backgroundColor = `color-mix(in srgb, ${$('--secondary-text')} 10%, transparent)`;
            }
          }}
          onMouseLeave={(e) => {
            if (!isDisabled && !customValue.trim()) {
              e.currentTarget.style.borderLeftColor = $('--secondary-text');
              e.currentTarget.style.backgroundColor = 'transparent';
            }
          }}
        >
          <input
            type="text"
            value={customValue}
            onChange={(e) => {
              setCustomValues((prev) => ({ ...prev, [q.id]: e.target.value }));
              updateCustomSelection(e.target.value);
            }}
            onFocus={(e) => e.target.select()}
            placeholder="Ý kiến khác..."
            disabled={isDisabled}
            className={cn(
              'flex-1 p-0 bg-transparent text-text-primary border-none outline-none text-[13px] font-[inherit] min-w-0',
              customValue.trim() ? 'font-semibold' : 'font-normal',
            )}
          />
        </div>
      </div>
    );
  };
  const renderQuestionContent = () => {
    if (!currentQuestion) return null;
    switch (currentQuestion.type) {
      case 'single':
        return renderSingle(currentQuestion);
      case 'multi':
        return renderMulti(currentQuestion);
      case 'text':
        return renderText(currentQuestion);
      case 'confirm':
        return renderConfirm(currentQuestion);
      default:
        return null;
    }
  };

  const answeredCount = Object.keys(answers).length;

  // Navigation icons for view mode (after all answered)
  const renderNavIcons = () => {
    if (totalQuestions <= 1) return null;
    const iconColor = $('--text-primary');
    const bgColor = `color-mix(in srgb, ${iconColor} 10%, transparent)`;
    return (
      <div className="flex gap-0.5 items-center">
        <button
          onClick={() => setCurrentIndex(Math.max(0, currentIndex - 1))}
          disabled={currentIndex === 0}
          className={cn(
            'border-none p-1 rounded flex items-center justify-center',
            currentIndex === 0
              ? 'bg-transparent cursor-default opacity-30'
              : 'cursor-pointer opacity-80',
          )}
          style={{
            background: currentIndex === 0 ? 'transparent' : bgColor,
            color: iconColor,
          }}
          title="Câu hỏi trước"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="18"
            height="18"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="m15 18-6-6 6-6" />
          </svg>
        </button>
        <button
          onClick={() => setCurrentIndex(Math.min(totalQuestions - 1, currentIndex + 1))}
          disabled={currentIndex === totalQuestions - 1}
          className={cn(
            'border-none p-1 rounded flex items-center justify-center',
            currentIndex === totalQuestions - 1
              ? 'bg-transparent cursor-default opacity-30'
              : 'cursor-pointer opacity-80',
          )}
          style={{
            background: currentIndex === totalQuestions - 1 ? 'transparent' : bgColor,
            color: iconColor,
          }}
          title="Câu hỏi tiếp theo"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="18"
            height="18"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="m9 18 6-6-6-6" />
          </svg>
        </button>
      </div>
    );
  };

  // Render Summary view
  const renderSummary = () => {
    const answerCount = Object.keys(answers).length;
    const statusColor =
      answerCount === totalQuestions ? $('--success, #3fb950') : $('--secondary-text');

    const formatAnswer = (answer: QuestionAnswer): string => {
      const value = answer.value;
      if (Array.isArray(value)) {
        return value.join(', ');
      }
      if (typeof value === 'boolean') {
        return value ? '✅ Có' : '❌ Không';
      }
      return String(value);
    };

    const getAnswer = (questionId: string): string => {
      const answer = answers[questionId];
      if (!answer) return 'Chưa trả lời';
      return formatAnswer(answer);
    };

    return (
      <div className={wrapperClassName}>
        <ToolHeader
          title={
            <div className="flex items-center gap-2 text-xs text-text-primary">
              <span className="font-semibold opacity-80">QUESTION</span>
              <span className="text-[10px] opacity-50 font-normal ml-1">
                ✅ Đã trả lời {answerCount}/{totalQuestions}
              </span>
            </div>
          }
          statusColor={statusColor}
          icon={<span className="codicon codicon-question text-sm" />}
        />
        <div className="pl-9 mt-2">
          {title && (
            <div className="text-[13px] font-medium text-text-primary mb-3 py-1">{title}</div>
          )}

          <div className="flex flex-col gap-2.5">
            {questions.map((q, index) => {
              const answer = getAnswer(q.id);
              const isAnswered = !!answers[q.id];

              return (
                <div key={q.id} className="flex flex-col gap-0.5 px-3 py-1.5 rounded-none">
                  <div className="flex items-center gap-1.5 text-[13px] font-medium text-text-primary">
                    <span className="text-[13px] font-semibold text-text-secondary opacity-60 min-w-[28px]">
                      {index + 1}.
                    </span>
                    <span className="-ml-0.5">{q.label}</span>
                  </div>
                  <div
                    className={cn(
                      'text-[13px] pl-[30px]',
                      isAnswered
                        ? 'text-text-primary font-medium opacity-100'
                        : 'text-text-secondary font-normal opacity-50',
                    )}
                  >
                    {isAnswered ? (
                      <span className="inline-block px-2.5 py-0.5 bg-primary/15 rounded text-xs">
                        {answer}
                      </span>
                    ) : (
                      <span className="italic">Chưa trả lời</span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    );
  };

  // If in summary mode, render summary view
  const willRenderSummary = isSummaryMode && isPaginated;
  if (willRenderSummary) {
    return renderSummary();
  }

  return (
    <div className={wrapperClassName}>
      <ToolHeader
        title={
          <div className="flex items-center gap-2 text-xs text-text-primary">
            <span className="font-semibold opacity-80">QUESTION</span>
            <span className="text-[10px] opacity-50 font-normal ml-1">
              {`${answeredCount} / ${totalQuestions} đã trả lời`}
            </span>
          </div>
        }
        statusColor={getStatusColor()}
        icon={<span className="codicon codicon-question text-sm" />}
        headerActions={isAllAnswered ? renderNavIcons() : undefined}
      />
      <div className="pl-9 mt-2">
        {/* Question Label */}
        <div className="text-sm font-medium text-text-primary py-1 pb-2">
          {currentQuestion?.label}
          {currentQuestion?.type && (
            <span className="text-[10px] font-normal text-text-secondary ml-2 opacity-60 uppercase tracking-[0.3px]">
              ({getTypeLabel(currentQuestion.type)})
            </span>
          )}
        </div>

        {/* Question Content */}
        <div className="py-0.5">{renderQuestionContent()}</div>

        {/* Navigation buttons */}
        {!isSummaryMode && (
          <div className="flex justify-end gap-2 mt-2">
            <button
              onClick={() => setCurrentIndex(Math.max(0, currentIndex - 1))}
              disabled={currentIndex === 0}
              className={cn(
                'py-1 px-3 bg-transparent text-text-primary border-none text-[11px]',
                currentIndex === 0 ? 'cursor-default opacity-30' : 'cursor-pointer opacity-70',
              )}
            >
              ← Trước
            </button>
            <button
              onClick={() => {
                let allAnswers = answers;
                if (currentQuestion?.type === 'multi') {
                  const selected = (selectedOptions[currentQuestion.id] as string[]) || [];
                  if (selected.length === 0) return;
                  const answer: QuestionAnswer = {
                    questionId: currentQuestion.id,
                    value: selected,
                  };
                  allAnswers = {
                    ...answers,
                    [currentQuestion.id]: answer,
                  };
                  setAnswers(allAnswers);
                  onAnswerProp?.(currentQuestion.id, selected);
                }

                if (currentQuestion?.type === 'text') {
                  const value = textInputs[currentQuestion.id] || '';
                  if (value.trim().length === 0) return;
                  const answer: QuestionAnswer = {
                    questionId: currentQuestion.id,
                    value: value.trim(),
                  };
                  allAnswers = {
                    ...answers,
                    [currentQuestion.id]: answer,
                  };
                  setAnswers(allAnswers);
                  onAnswerProp?.(currentQuestion.id, value.trim());
                }

                if (isCurrentAnswered()) {
                  if (currentIndex < totalQuestions - 1) {
                    setCurrentIndex(currentIndex + 1);
                  } else {
                    setIsSummaryMode(true);
                    onAllAnsweredProp?.(allAnswers);
                  }
                }
              }}
              disabled={!isCurrentAnswered()}
              className={cn(
                'py-1 px-3 border-none rounded text-[11px] font-medium',
                isCurrentAnswered()
                  ? 'bg-primary text-text-foreground cursor-pointer opacity-100'
                  : 'bg-transparent text-text-primary cursor-default opacity-30',
              )}
            >
              {isLastQuestion ? 'Hoàn tất →' : 'Tiếp theo →'}
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default QuestionAnswerBlock;
