import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Checkbox } from "@/components/ui/checkbox";
import { GripVertical, Trash2, Plus, CircleDot, CheckSquare } from "lucide-react";

export interface MCQOption {
  id?: string;
  order_index: number;
  option_text: string;
  is_correct: boolean;
}

export interface MCQQuestion {
  id?: string;
  order_index: number;
  question_text: string;
  question_type: "single" | "multi";
  points: number;
  explanation?: string;
  options: MCQOption[];
}

interface MCQQuestionEditorProps {
  questions: MCQQuestion[];
  onQuestionsChange: (questions: MCQQuestion[]) => void;
}

const OPTION_LETTERS = ["A", "B", "C", "D", "E", "F"];

export function MCQQuestionEditor({ questions, onQuestionsChange }: MCQQuestionEditorProps) {
  const addQuestion = () => {
    const newQuestion: MCQQuestion = {
      order_index: questions.length,
      question_text: "",
      question_type: "single",
      points: 1,
      explanation: "",
      options: [
        { order_index: 0, option_text: "", is_correct: false },
        { order_index: 1, option_text: "", is_correct: false },
        { order_index: 2, option_text: "", is_correct: false },
        { order_index: 3, option_text: "", is_correct: false },
      ],
    };
    onQuestionsChange([...questions, newQuestion]);
  };

  const updateQuestion = (index: number, updates: Partial<MCQQuestion>) => {
    const updated = [...questions];
    updated[index] = { ...updated[index], ...updates };
    
    // If switching from multi to single, ensure only one correct answer
    if (updates.question_type === "single") {
      const correctCount = updated[index].options.filter(o => o.is_correct).length;
      if (correctCount > 1) {
        // Keep only the first correct answer
        let foundFirst = false;
        updated[index].options = updated[index].options.map(opt => {
          if (opt.is_correct && !foundFirst) {
            foundFirst = true;
            return opt;
          }
          return { ...opt, is_correct: false };
        });
      }
    }
    
    onQuestionsChange(updated);
  };

  const removeQuestion = (index: number) => {
    onQuestionsChange(questions.filter((_, i) => i !== index));
  };

  const addOption = (questionIndex: number) => {
    const question = questions[questionIndex];
    if (question.options.length >= 6) return;
    
    const newOption: MCQOption = {
      order_index: question.options.length,
      option_text: "",
      is_correct: false,
    };
    
    updateQuestion(questionIndex, {
      options: [...question.options, newOption],
    });
  };

  const updateOption = (questionIndex: number, optionIndex: number, updates: Partial<MCQOption>) => {
    const question = questions[questionIndex];
    const updatedOptions = [...question.options];
    
    // For single-select, if marking as correct, unmark others
    if (updates.is_correct && question.question_type === "single") {
      updatedOptions.forEach((opt, i) => {
        updatedOptions[i] = { ...opt, is_correct: i === optionIndex };
      });
    } else {
      updatedOptions[optionIndex] = { ...updatedOptions[optionIndex], ...updates };
    }
    
    updateQuestion(questionIndex, { options: updatedOptions });
  };

  const removeOption = (questionIndex: number, optionIndex: number) => {
    const question = questions[questionIndex];
    if (question.options.length <= 2) return;
    
    const updatedOptions = question.options
      .filter((_, i) => i !== optionIndex)
      .map((opt, i) => ({ ...opt, order_index: i }));
    
    updateQuestion(questionIndex, { options: updatedOptions });
  };

  return (
    <div className="space-y-4">
      {questions.length === 0 ? (
        <div className="text-center py-12 border-2 border-dashed rounded-lg">
          <p className="text-muted-foreground mb-4">No questions added yet</p>
          <Button onClick={addQuestion}>
            <Plus className="w-4 h-4 mr-2" />
            Add First Question
          </Button>
        </div>
      ) : (
        <>
          {questions.map((question, qIndex) => (
            <Card key={qIndex} className="border-l-4 border-l-primary">
              <CardContent className="pt-4">
                {/* Question Header */}
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <GripVertical className="w-4 h-4 text-muted-foreground cursor-move" />
                    <Badge variant="outline">Question {qIndex + 1}</Badge>
                    <Badge 
                      variant="secondary" 
                      className="flex items-center gap-1"
                    >
                      {question.question_type === "single" ? (
                        <>
                          <CircleDot className="w-3 h-3" />
                          Single Select
                        </>
                      ) : (
                        <>
                          <CheckSquare className="w-3 h-3" />
                          Multi Select
                        </>
                      )}
                    </Badge>
                    <Badge variant="outline">{question.points} pt{question.points !== 1 ? "s" : ""}</Badge>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => removeQuestion(qIndex)}
                  >
                    <Trash2 className="w-4 h-4 text-destructive" />
                  </Button>
                </div>

                {/* Question Text */}
                <div className="space-y-2 mb-4">
                  <Label>Question Text</Label>
                  <Textarea
                    value={question.question_text}
                    onChange={(e) => updateQuestion(qIndex, { question_text: e.target.value })}
                    placeholder="Enter the question..."
                    rows={3}
                  />
                </div>

                {/* Question Type & Points */}
                <div className="grid grid-cols-2 gap-4 mb-4">
                  <div className="space-y-2">
                    <Label>Answer Type</Label>
                    <RadioGroup
                      value={question.question_type}
                      onValueChange={(v: "single" | "multi") => updateQuestion(qIndex, { question_type: v })}
                      className="flex gap-4"
                    >
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="single" id={`q${qIndex}-single`} />
                        <Label htmlFor={`q${qIndex}-single`} className="font-normal cursor-pointer">
                          Single correct answer
                        </Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="multi" id={`q${qIndex}-multi`} />
                        <Label htmlFor={`q${qIndex}-multi`} className="font-normal cursor-pointer">
                          Multiple correct answers
                        </Label>
                      </div>
                    </RadioGroup>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor={`q${qIndex}-points`}>Points</Label>
                    <Input
                      id={`q${qIndex}-points`}
                      type="number"
                      min={1}
                      max={10}
                      value={question.points}
                      onChange={(e) => updateQuestion(qIndex, { points: parseInt(e.target.value) || 1 })}
                      className="w-24"
                    />
                  </div>
                </div>

                {/* Options */}
                <div className="space-y-2 mb-4">
                  <Label>Answer Options</Label>
                  <div className="space-y-2">
                    {question.options.map((option, oIndex) => (
                      <div key={oIndex} className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center text-sm font-medium">
                          {OPTION_LETTERS[oIndex]}
                        </div>
                        <Input
                          value={option.option_text}
                          onChange={(e) => updateOption(qIndex, oIndex, { option_text: e.target.value })}
                          placeholder={`Option ${OPTION_LETTERS[oIndex]}`}
                          className="flex-1"
                        />
                        <div className="flex items-center gap-2">
                          {question.question_type === "single" ? (
                            <Button
                              type="button"
                              variant={option.is_correct ? "default" : "outline"}
                              size="sm"
                              onClick={() => updateOption(qIndex, oIndex, { is_correct: true })}
                              className={option.is_correct ? "bg-emerald-600 hover:bg-emerald-700" : ""}
                            >
                              {option.is_correct ? "✓ Correct" : "Mark Correct"}
                            </Button>
                          ) : (
                            <div className="flex items-center gap-2">
                              <Checkbox
                                id={`q${qIndex}-o${oIndex}-correct`}
                                checked={option.is_correct}
                                onCheckedChange={(checked) => 
                                  updateOption(qIndex, oIndex, { is_correct: checked === true })
                                }
                              />
                              <Label 
                                htmlFor={`q${qIndex}-o${oIndex}-correct`}
                                className={`font-normal cursor-pointer ${option.is_correct ? "text-emerald-600 font-medium" : ""}`}
                              >
                                Correct
                              </Label>
                            </div>
                          )}
                          {question.options.length > 2 && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => removeOption(qIndex, oIndex)}
                            >
                              <Trash2 className="w-4 h-4 text-muted-foreground" />
                            </Button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                  {question.options.length < 6 && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => addOption(qIndex)}
                      className="mt-2"
                    >
                      <Plus className="w-4 h-4 mr-2" />
                      Add Option
                    </Button>
                  )}
                </div>

                {/* Explanation */}
                <div className="space-y-2">
                  <Label htmlFor={`q${qIndex}-explanation`}>
                    Explanation <span className="text-muted-foreground font-normal">(shown after test)</span>
                  </Label>
                  <Textarea
                    id={`q${qIndex}-explanation`}
                    value={question.explanation || ""}
                    onChange={(e) => updateQuestion(qIndex, { explanation: e.target.value })}
                    placeholder="Optional: Explain why this is the correct answer..."
                    rows={2}
                  />
                </div>
              </CardContent>
            </Card>
          ))}

          <Button onClick={addQuestion} className="w-full" variant="outline">
            <Plus className="w-4 h-4 mr-2" />
            Add Question
          </Button>
        </>
      )}
    </div>
  );
}
