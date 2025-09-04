-- Update video question format to include timing and retake properties
UPDATE video_question_sets 
SET questions = '[
  {
    "id": "q1",
    "text": "Describe a time when you had to support a senior executive under tight deadlines. How did you prioritize tasks and ensure everything was completed on time?",
    "type": "behavioral",
    "read_secs": 30,
    "prep_secs": 30,
    "answer_secs": 180,
    "allow_retakes": true,
    "max_retakes": 1
  },
  {
    "id": "q2", 
    "text": "How would you handle a situation where you need to draft official correspondence on a technical cybersecurity topic that you are not familiar with?",
    "type": "situational",
    "read_secs": 30,
    "prep_secs": 30,
    "answer_secs": 180,
    "allow_retakes": true,
    "max_retakes": 1
  },
  {
    "id": "q3",
    "text": "Explain your approach to maintaining confidentiality when handling sensitive documents and communications in a high-security environment.",
    "type": "competency", 
    "read_secs": 30,
    "prep_secs": 30,
    "answer_secs": 180,
    "allow_retakes": true,
    "max_retakes": 1
  }
]'::jsonb
WHERE id = '2d8f4881-8078-4bbc-8c3a-16b35143fa96';