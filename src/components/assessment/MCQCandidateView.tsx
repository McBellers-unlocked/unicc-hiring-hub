import { useState, useEffect, useCallback, useRef } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Clock, ChevronLeft, ChevronRight, ListChecks, CheckCircle, Circle, AlertTriangle, Timer } from "lucide-react";
import { differenceInSeconds, addMinutes } from "date-fns";

interface MCQQuestion {
  id: string;
  order_index: number;
  question_text: string;
  question_type: string;
  points: number;
  explanation: string | null;
  assessment_mcq_options: MCQOption[];
}

interface MCQOption {
  id: string;
  order_index: number;
  option_text: string;
  is_correct: boolean;
}

interface AssessmentData {
  slot_id: string;
  assessment_id: string;
  candidate_name: string;
  candidate_email: string;
  time_limit_minutes: number;
  instructions: string;
  title: string;
  started_at: string | null;
  available_from: string | null;
  available_until: string | null;
}

interface MCQCandidateViewProps {
  assessmentData: AssessmentData;
  token: string;
  onComplete: () => void;
}

export function MCQCandidateView({ assessmentData, token, onComplete }: MCQCandidateViewProps) {
  const [hasStarted, setHasStarted] = useState(!!assessmentData.started_at);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string[]>>({});
  const [timeRemaining, setTimeRemaining] = useState<number | null>(null);
  const [showSubmitDialog, setShowSubmitDialog] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const autoSaveTimer = useRef<NodeJS.Timeout | null>(null);

  // Fetch questions with options
  const { data: questions, isLoading: questionsLoading } = useQuery({
    queryKey: ["mcq-questions", assessmentData.assessment_id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("assessment_mcq_questions")
        .select("*, assessment_mcq_options(*)")
        .eq("assessment_id", assessmentData.assessment_id)
        .order("order_index");
      if (error) throw error;
      
      // Sort options by order_index
      return (data as MCQQuestion[]).map(q => ({
        ...q,
        assessment_mcq_options: q.assessment_mcq_options.sort((a, b) => a.order_index - b.order_index)
      }));
    },
    enabled: !!assessmentData.assessment_id,
  });

  // Fetch existing responses
  const { data: existingResponses } = useQuery({
    queryKey: ["mcq-responses", assessmentData.slot_id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("assessment_mcq_responses")
        .select("*")
        .eq("slot_id", assessmentData.slot_id);
      if (error) throw error;
      return data;
    },
    enabled: !!assessmentData.slot_id && hasStarted,
  });

  // Load existing responses into state
  useEffect(() => {
    if (existingResponses) {
      const answersMap: Record<string, string[]> = {};
      existingResponses.forEach((r) => {
        answersMap[r.question_id] = r.selected_options || [];
      });
      setAnswers(answersMap);
    }
  }, [existingResponses]);

  // Timer countdown
  useEffect(() => {
    if (!hasStarted || !assessmentData) return;

    const startTime = assessmentData.started_at
      ? new Date(assessmentData.started_at)
      : new Date();
    const endTime = addMinutes(startTime, assessmentData.time_limit_minutes);

    const interval = setInterval(() => {
      const remaining = differenceInSeconds(endTime, new Date());
      setTimeRemaining(Math.max(0, remaining));

      // Auto-submit when time runs out
      if (remaining <= 0) {
        clearInterval(interval);
        handleSubmit();
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [hasStarted, assessmentData]);

  // Auto-save every 30 seconds
  useEffect(() => {
    if (!hasStarted || !assessmentData) return;

    autoSaveTimer.current = setInterval(() => {
      saveAllResponses();
    }, 30000);

    return () => {
      if (autoSaveTimer.current) clearInterval(autoSaveTimer.current);
    };
  }, [hasStarted, assessmentData, answers]);

  const startAssessment = async () => {
    // Request fullscreen mode
    try {
      await document.documentElement.requestFullscreen();
    } catch (e) {
      console.log("Fullscreen not supported or denied");
    }

    const { data: success } = await supabase.rpc("start_assessment", { p_token: token });
    if (success) {
      setHasStarted(true);
      toast.success("Assessment started. Good luck!");
    } else {
      toast.error("Failed to start assessment");
    }
  };

  const saveAnswer = useCallback(async (questionId: string, selectedOptions: string[]) => {
    if (!assessmentData) return;

    await supabase.from("assessment_mcq_responses").upsert({
      slot_id: assessmentData.slot_id,
      question_id: questionId,
      selected_options: selectedOptions,
      answered_at: new Date().toISOString(),
    }, { onConflict: "slot_id,question_id" });
  }, [assessmentData]);

  const saveAllResponses = async () => {
    for (const [questionId, selectedOptions] of Object.entries(answers)) {
      await saveAnswer(questionId, selectedOptions);
    }
  };

  const handleAnswerChange = (questionId: string, optionId: string, questionType: string) => {
    setAnswers(prev => {
      let newSelected: string[];
      
      if (questionType === "single") {
        newSelected = [optionId];
      } else {
        const current = prev[questionId] || [];
        if (current.includes(optionId)) {
          newSelected = current.filter(id => id !== optionId);
        } else {
          newSelected = [...current, optionId];
        }
      }
      
      // Auto-save this answer
      saveAnswer(questionId, newSelected);
      
      return { ...prev, [questionId]: newSelected };
    });
  };

  const handleSubmit = async () => {
    setIsSubmitting(true);
    
    // Save all answers first
    await saveAllResponses();
    
    // Calculate scores
    if (questions) {
      for (const question of questions) {
        const selectedOptions = answers[question.id] || [];
        const correctOptions = question.assessment_mcq_options
          .filter(opt => opt.is_correct)
          .map(opt => opt.id);
        
        // Check if answer is correct
        const isCorrect = 
          selectedOptions.length === correctOptions.length &&
          selectedOptions.every(id => correctOptions.includes(id));
        
        const pointsEarned = isCorrect ? question.points : 0;
        
        // Update response with scoring
        await supabase.from("assessment_mcq_responses").upsert({
          slot_id: assessmentData.slot_id,
          question_id: question.id,
          selected_options: selectedOptions,
          is_correct: isCorrect,
          points_earned: pointsEarned,
          answered_at: new Date().toISOString(),
        }, { onConflict: "slot_id,question_id" });
      }
    }

    // Submit the assessment
    const { data: success } = await supabase.rpc("submit_assessment", { p_token: token });
    if (success) {
      toast.success("Assessment submitted successfully!");
      onComplete();
    } else {
      toast.error("Failed to submit assessment");
    }
    setIsSubmitting(false);
  };

  const formatTime = (seconds: number) => {
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    if (hrs > 0) {
      return `${hrs}:${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
    }
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  const formatDateTime = (date: Date) => {
    return date.toLocaleDateString("en-US", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  // Check availability window
  const now = new Date();
  const availableFrom = assessmentData.available_from ? new Date(assessmentData.available_from) : null;
  const availableUntil = assessmentData.available_until ? new Date(assessmentData.available_until) : null;
  const isTooEarly = availableFrom && now < availableFrom;
  const isWindowExpired = availableUntil && now > availableUntil && !assessmentData.started_at;
  const isWithinWindow = !isTooEarly && !isWindowExpired;

  // Too early screen
  if (isTooEarly && availableFrom) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="max-w-2xl w-full">
          <CardHeader className="text-center">
            <CardTitle className="text-2xl">{assessmentData.title}</CardTitle>
            <CardDescription>Multiple Choice Assessment</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="text-center py-8">
              <Timer className="w-16 h-16 mx-auto mb-4 text-primary opacity-70" />
              <h3 className="text-xl font-semibold mb-2">Assessment Not Yet Available</h3>
              <p className="text-muted-foreground">
                Your assessment will open at:
              </p>
              <p className="text-2xl font-bold text-primary mt-2">
                {formatDateTime(availableFrom)}
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Window expired screen
  if (isWindowExpired) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="max-w-md">
          <CardContent className="pt-6 text-center">
            <AlertTriangle className="w-12 h-12 mx-auto text-destructive mb-4" />
            <h2 className="text-xl font-semibold mb-2">Assessment Window Expired</h2>
            <p className="text-muted-foreground">
              The time window to start this assessment has passed.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Pre-start screen
  if (!hasStarted && isWithinWindow) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="max-w-2xl w-full">
          <CardHeader className="text-center">
            <CardTitle className="text-2xl">{assessmentData.title}</CardTitle>
            <CardDescription>Multiple Choice Assessment</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="bg-muted p-4 rounded-lg">
              <h3 className="font-semibold mb-2">Welcome, {assessmentData.candidate_name}!</h3>
              <div className="prose prose-sm text-muted-foreground whitespace-pre-line">
                {assessmentData.instructions || (
                  <p>
                    This assessment contains multiple choice questions. Read each question carefully 
                    and select the best answer(s). You have <strong>{assessmentData.time_limit_minutes} minutes</strong> to complete all questions.
                  </p>
                )}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4 text-center">
              <div className="p-4 bg-muted rounded-lg">
                <Clock className="w-8 h-8 mx-auto mb-2 text-primary" />
                <p className="font-semibold">{assessmentData.time_limit_minutes} minutes</p>
                <p className="text-sm text-muted-foreground">Time Limit</p>
              </div>
              <div className="p-4 bg-muted rounded-lg">
                <ListChecks className="w-8 h-8 mx-auto mb-2 text-primary" />
                <p className="font-semibold">{questions?.length || 0}</p>
                <p className="text-sm text-muted-foreground">Questions</p>
              </div>
            </div>

            <div className="bg-amber-50 border border-amber-200 p-4 rounded-lg dark:bg-amber-950/30 dark:border-amber-800">
              <div className="flex items-start gap-3">
                <AlertTriangle className="w-5 h-5 text-amber-600 mt-0.5" />
                <div className="text-sm text-amber-800 dark:text-amber-200">
                  <p className="font-semibold mb-1">Important - Read Before Starting:</p>
                  <ul className="list-disc list-inside space-y-1">
                    <li>Once you click "Start", the timer begins immediately</li>
                    <li>You cannot pause or restart the assessment</li>
                    <li>Your answers are saved automatically</li>
                    <li>Use Previous/Next to navigate between questions</li>
                    <li>You can review and change answers before submitting</li>
                  </ul>
                </div>
              </div>
            </div>

            <Button onClick={startAssessment} className="w-full" size="lg" disabled={questionsLoading}>
              Start Assessment ({assessmentData.time_limit_minutes} minutes)
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!questions || questions.length === 0) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Card className="max-w-md">
          <CardContent className="pt-6 text-center">
            <AlertTriangle className="w-12 h-12 mx-auto text-amber-500 mb-4" />
            <h2 className="text-xl font-semibold mb-2">No Questions Found</h2>
            <p className="text-muted-foreground">
              This assessment has no questions configured.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const currentQuestion = questions[currentIndex];
  const answeredCount = Object.keys(answers).filter(qId => answers[qId]?.length > 0).length;
  const progressPercent = (answeredCount / questions.length) * 100;

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header with timer */}
      <header className="bg-primary text-primary-foreground py-3 px-4 shadow-lg sticky top-0 z-50">
        <div className="container mx-auto flex items-center justify-between">
          <div className="flex items-center gap-4">
            <ListChecks className="w-6 h-6" />
            <div>
              <h1 className="font-semibold">{assessmentData.title}</h1>
              <p className="text-sm opacity-80">{assessmentData.candidate_name}</p>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <div className="text-sm opacity-80">
              Question {currentIndex + 1} of {questions.length}
            </div>
            <div
              className={`flex items-center gap-2 px-4 py-2 rounded-lg ${
                timeRemaining && timeRemaining < 300
                  ? "bg-red-600 animate-pulse"
                  : "bg-primary-foreground/10"
              }`}
            >
              <Clock className="w-5 h-5" />
              <span className="font-mono text-xl font-bold">
                {timeRemaining !== null ? formatTime(timeRemaining) : "--:--"}
              </span>
            </div>
            <Button
              variant="secondary"
              onClick={() => setShowSubmitDialog(true)}
              disabled={isSubmitting}
            >
              Submit
            </Button>
          </div>
        </div>
      </header>

      {/* Progress bar */}
      <div className="border-b bg-muted/30 px-4 py-2">
        <div className="container mx-auto flex items-center gap-4">
          <span className="text-sm text-muted-foreground">Progress:</span>
          <Progress value={progressPercent} className="flex-1 h-2" />
          <span className="text-sm text-muted-foreground">
            {answeredCount}/{questions.length} answered
          </span>
        </div>
      </div>

      {/* Question navigation dots */}
      <div className="border-b bg-muted/20 px-4 py-3">
        <div className="container mx-auto">
          <div className="flex flex-wrap gap-2 justify-center">
            {questions.map((q, idx) => {
              const isAnswered = answers[q.id]?.length > 0;
              const isCurrent = idx === currentIndex;
              
              return (
                <button
                  key={q.id}
                  onClick={() => setCurrentIndex(idx)}
                  className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium transition-colors ${
                    isCurrent
                      ? "bg-primary text-primary-foreground"
                      : isAnswered
                      ? "bg-emerald-500 text-white"
                      : "bg-muted hover:bg-muted-foreground/20"
                  }`}
                >
                  {idx + 1}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Question content */}
      <main className="flex-1 container mx-auto py-8 px-4">
        <Card className="max-w-3xl mx-auto">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardDescription>
                Question {currentIndex + 1} • {currentQuestion.points} point{currentQuestion.points !== 1 ? 's' : ''}
                {currentQuestion.question_type === "multi" && (
                  <span className="ml-2 text-amber-600">(Select all that apply)</span>
                )}
              </CardDescription>
              {answers[currentQuestion.id]?.length > 0 && (
                <CheckCircle className="w-5 h-5 text-emerald-500" />
              )}
            </div>
            <CardTitle className="text-xl">{currentQuestion.question_text}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {currentQuestion.question_type === "single" ? (
                <RadioGroup
                  value={answers[currentQuestion.id]?.[0] || ""}
                  onValueChange={(value) => handleAnswerChange(currentQuestion.id, value, "single")}
                >
                  {currentQuestion.assessment_mcq_options.map((option, optIdx) => (
                    <div
                      key={option.id}
                      className="flex items-center space-x-3 p-4 rounded-lg border hover:bg-muted/50 cursor-pointer"
                      onClick={() => handleAnswerChange(currentQuestion.id, option.id, "single")}
                    >
                      <RadioGroupItem value={option.id} id={option.id} />
                      <Label htmlFor={option.id} className="flex-1 cursor-pointer text-base">
                        <span className="font-semibold mr-2">
                          {String.fromCharCode(65 + optIdx)}.
                        </span>
                        {option.option_text}
                      </Label>
                    </div>
                  ))}
                </RadioGroup>
              ) : (
                <div className="space-y-3">
                  {currentQuestion.assessment_mcq_options.map((option, optIdx) => {
                    const isSelected = answers[currentQuestion.id]?.includes(option.id);
                    return (
                      <div
                        key={option.id}
                        className={`flex items-center space-x-3 p-4 rounded-lg border hover:bg-muted/50 cursor-pointer ${
                          isSelected ? "bg-primary/5 border-primary" : ""
                        }`}
                        onClick={() => handleAnswerChange(currentQuestion.id, option.id, "multi")}
                      >
                        <Checkbox
                          id={option.id}
                          checked={isSelected}
                          onCheckedChange={() => handleAnswerChange(currentQuestion.id, option.id, "multi")}
                        />
                        <Label htmlFor={option.id} className="flex-1 cursor-pointer text-base">
                          <span className="font-semibold mr-2">
                            {String.fromCharCode(65 + optIdx)}.
                          </span>
                          {option.option_text}
                        </Label>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Navigation buttons */}
        <div className="max-w-3xl mx-auto mt-6 flex items-center justify-between">
          <Button
            variant="outline"
            onClick={() => setCurrentIndex(prev => prev - 1)}
            disabled={currentIndex === 0}
          >
            <ChevronLeft className="w-4 h-4 mr-2" />
            Previous
          </Button>
          
          {currentIndex === questions.length - 1 ? (
            <Button onClick={() => setShowSubmitDialog(true)}>
              Review & Submit
            </Button>
          ) : (
            <Button onClick={() => setCurrentIndex(prev => prev + 1)}>
              Next
              <ChevronRight className="w-4 h-4 ml-2" />
            </Button>
          )}
        </div>
      </main>

      {/* Submit confirmation dialog */}
      <AlertDialog open={showSubmitDialog} onOpenChange={setShowSubmitDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Submit Assessment?</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to submit your assessment? You cannot make changes after submission.
              <div className="mt-4 p-3 bg-muted rounded-lg">
                <p className="text-sm">
                  <strong>Answered:</strong> {answeredCount} of {questions.length} questions
                </p>
                {answeredCount < questions.length && (
                  <p className="text-sm text-amber-600 mt-1">
                    ⚠️ You have {questions.length - answeredCount} unanswered question(s)
                  </p>
                )}
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Continue Assessment</AlertDialogCancel>
            <AlertDialogAction onClick={handleSubmit} disabled={isSubmitting}>
              {isSubmitting ? "Submitting..." : "Submit Assessment"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}