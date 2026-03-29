import { v4 as uuidv4 } from 'uuid';

export interface CourseNotes {
  [courseId: string]: {
    title: string;
    content: string;
    sections: {
      title: string;
      content: string;
      keyPoints: string[];
    }[];
  };
}

export const courseNotesDB: CourseNotes = {
  // Defensive Driving
  'defensive-driving': {
    title: 'Defensive Driving Fundamentals',
    content: 'This course covers essential defensive driving techniques for fleet drivers.',
    sections: [
      {
        title: 'The SIPDE Process',
        content: 'A systematic approach to hazard awareness and response.',
        keyPoints: [
          'Scan: Continuously scan the road ahead, to the sides, and behind',
          'Identify: Identify potential hazards and risks',
          'Predict: Predict what might happen based on identified hazards',
          'Decide: Decide on the best course of action',
          'Execute: Execute your decision smoothly and safely'
        ]
      },
      {
        title: 'Following Distance Rules',
        content: 'Maintaining proper following distance is critical for safety.',
        keyPoints: [
          '3-Second Rule: Maintain at least 3 seconds behind in normal conditions',
          '4-Second Rule: Increase to 4 seconds in adverse weather or heavy traffic',
          '5-Second Rule: Use 5+ seconds for large vehicles or hazardous conditions'
        ]
      },
      {
        title: 'Managing Distractions',
        content: 'Distractions are a leading cause of accidents.',
        keyPoints: [
          'Put mobile devices away or use hands-free only',
          'Set GPS before starting the journey',
          'Avoid eating while driving',
          'Keep conversations minimal and focused',
          'Never text while driving'
        ]
      }
    ]
  },

  // Vehicle Inspection
  'vehicle-inspection': {
    title: 'Vehicle Inspection & Maintenance',
    content: 'Learn comprehensive inspection procedures to ensure vehicle safety.',
    sections: [
      {
        title: 'Pre-Trip Inspection',
        content: 'Systematic vehicle check before each trip.',
        keyPoints: [
          'Engine oil, coolant, and fluid levels',
          'Tire pressure and tread depth',
          'All lights and signals',
          'Brake functionality',
          'Windshield and mirrors',
          'Seat belts and emergency equipment'
        ]
      },
      {
        title: 'Tire Safety',
        content: 'Tires are critical for vehicle safety.',
        keyPoints: [
          'Check pressure when tires are cold',
          'Use manufacturer recommended pressure',
          'Inspect for cuts, bulges, and wear',
          'Minimum tread depth: 2/32", recommended: 4/32"',
          'Rotate tires every 5,000-8,000 miles'
        ]
      }
    ]
  },

  // Fuel Efficiency
  'fuel-efficiency': {
    title: 'Fuel Efficiency & Eco-Driving',
    content: 'Techniques to reduce fuel consumption and extend vehicle life.',
    sections: [
      {
        title: 'Eco-Driving Principles',
        content: 'Driving habits that maximize fuel economy.',
        keyPoints: [
          'Accelerate smoothly and gradually',
          'Maintain steady speeds',
          'Reduce speed by 10 mph to improve MPG by 10-15%',
          'Anticipate stops and coast when possible',
          'Avoid excessive idling'
        ]
      },
      {
        title: 'Route Optimization',
        content: 'Planning routes for maximum efficiency.',
        keyPoints: [
          'Avoid congestion when possible',
          'Combine multiple stops efficiently',
          'Use real-time traffic updates',
          'Consider vehicle weight distribution'
        ]
      }
    ]
  },

  // Safety
  'safety': {
    title: 'Accident Prevention & Response',
    content: 'Skills to prevent accidents and respond when they occur.',
    sections: [
      {
        title: 'Common Accident Causes',
        content: 'Understanding what causes accidents helps prevent them.',
        keyPoints: [
          'Distracted driving',
          'Following too closely',
          'Failure to yield',
          'Speeding',
          'Driver fatigue',
          'Improper lane changes'
        ]
      },
      {
        title: 'Post-Accident Procedures',
        content: 'What to do if an accident occurs.',
        keyPoints: [
          'Stop immediately - hit-and-run is a crime',
          'Check for injuries and call 911',
          'Move vehicles to safety if possible',
          'Exchange information with other parties',
          'Take photos and document the scene',
          'Notify supervisor within 24 hours'
        ]
      }
    ]
  },

  // Compliance
  'compliance': {
    title: 'Regulatory Compliance & Hours of Service',
    content: 'Understanding DOT regulations and compliance requirements.',
    sections: [
      {
        title: 'Hours of Service (HOS) Rules',
        content: 'Federal limits on driving and on-duty time.',
        keyPoints: [
          '11-hour driving limit after 10 hours off-duty',
          '14-hour on-duty limit',
          '30-minute break after 8 hours driving',
          '60/70 hour rule for 7/8 day periods'
        ]
      },
      {
        title: 'Logbook Requirements',
        content: 'Accurate record keeping is mandatory.',
        keyPoints: [
          'Record all duty status changes',
          'Include location and time',
          'Retain logs for minimum 6 months',
          'ELD mandate for most commercial vehicles'
        ]
      }
    ]
  },

  // Cargo Securement
  'cargo-securement': {
    title: 'Cargo Securement',
    content: 'Proper techniques for loading and securing cargo.',
    sections: [
      {
        title: 'Working Load Limit (WLL)',
        content: 'Understanding tie-down requirements.',
        keyPoints: [
          'Aggregate WLL must be at least 50% of cargo weight',
          'Number of tie-downs based on cargo weight',
          'Inspect all securement devices before use',
          'Check cargo within first 50 miles'
        ]
      }
    ]
  },

  // Hazardous Materials
  'hazmat': {
    title: 'Hazardous Materials Transportation',
    content: 'Regulations and safety for transporting hazardous materials.',
    sections: [
      {
        title: 'Hazard Classes',
        content: 'The 9 DOT hazard classes.',
        keyPoints: [
          'Class 1: Explosives',
          'Class 2: Gases',
          'Class 3: Flammable Liquids',
          'Class 4: Flammable Solids',
          'Class 5: Oxidizers',
          'Class 6: Toxic Materials',
          'Class 7: Radioactive',
          'Class 8: Corrosives',
          'Class 9: Miscellaneous'
        ]
      },
      {
        title: 'Emergency Response',
        content: 'What to do in case of hazmat incidents.',
        keyPoints: [
          'Keep people away (upwind, uphill)',
          'Isolate area minimum 150 feet',
          'Call CHEMTREC: 1-800-424-9300',
          'Use shipping papers to identify material',
          'Never touch spilled material'
        ]
      }
    ]
  },

  // Security
  'security': {
    title: 'Security & Anti-Terrorism',
    content: 'Protecting vehicles, cargo, and personnel.',
    sections: [
      {
        title: 'Vehicle Security',
        content: 'Preventing theft and unauthorized access.',
        keyPoints: [
          'Lock all doors and windows',
          'Remove or secure valuables',
          'Park in well-lit, secure areas',
          'Take keys with you',
          'Use anti-theft devices'
        ]
      },
      {
        title: 'Recognizing Suspicious Activity',
        content: 'Identifying potential security threats.',
        keyPoints: [
          'Someone watching facilities or vehicles',
          'Unfamiliar vehicles following you',
          'Questions about routes or cargo',
          'Abandoned packages or vehicles'
        ]
      }
    ]
  }
};

// Helper function to generate questions from course notes
export function generateQuestionsFromNotes(category: string, count: number): any[] {
  const notes = courseNotesDB[category];
  if (!notes) return [];

  const questions: any[] = [];
  const usedKeyPoints: Set<string> = new Set();

  // Generate questions from each section
  for (const section of notes.sections) {
    for (const point of section.keyPoints) {
      if (questions.length >= count) break;
      if (usedKeyPoints.has(point)) continue;

      usedKeyPoints.add(point);

      // Create true/false or multiple choice based on content
      if (point.includes(':')) {
        // This looks like a definition or rule - make it multiple choice
        const parts = point.split(':');
        const concept = parts[0].trim();
        const definition = parts[1].trim();

        questions.push({
          id: uuidv4(),
          questionText: `What is the correct definition or application of "${concept}"?`,
          questionType: 'multiple_choice',
          options: [
            { id: 'a', text: definition, isCorrect: true },
            { id: 'b', text: `The opposite of ${concept}`, isCorrect: false },
            { id: 'c', text: `Unrelated to ${concept}`, isCorrect: false },
            { id: 'd', text: 'None of the above', isCorrect: false }
          ],
          correctAnswer: 'a',
          explanation: `${concept}: ${definition}`,
          points: 1
        });
      } else {
        // Make it true/false
        questions.push({
          id: uuidv4(),
          questionText: `True or False: ${point}`,
          questionType: 'true_false',
          options: [
            { id: 'a', text: 'True', isCorrect: true },
            { id: 'b', text: 'False', isCorrect: false }
          ],
          correctAnswer: 'a',
          explanation: `This is correct: ${point}`,
          points: 1
        });
      }
    }
  }

  // If we don't have enough questions from notes, add some generic fleet questions
  const genericQuestions = [
    {
      id: uuidv4(),
      questionText: 'What is the minimum recommended following distance in normal driving conditions?',
      questionType: 'multiple_choice',
      options: [
        { id: 'a', text: '1 second', isCorrect: false },
        { id: 'b', text: '2 seconds', isCorrect: false },
        { id: 'c', text: '3 seconds', isCorrect: true },
        { id: 'd', text: '5 seconds', isCorrect: false }
      ],
      correctAnswer: 'c',
      explanation: 'The 3-second rule is the minimum recommended following distance in normal conditions.',
      points: 1
    },
    {
      id: uuidv4(),
      questionText: 'Pre-trip inspections should be performed:',
      questionType: 'multiple_choice',
      options: [
        { id: 'a', text: 'Weekly', isCorrect: false },
        { id: 'b', text: 'Only when something seems wrong', isCorrect: false },
        { id: 'c', text: 'Daily before each trip', isCorrect: true },
        { id: 'd', text: 'Monthly', isCorrect: false }
      ],
      correctAnswer: 'c',
      explanation: 'Pre-trip inspections must be performed daily before operating the vehicle.',
      points: 1
    },
    {
      id: uuidv4(),
      questionText: 'True or False: You should turn off your engine if stopped for more than 30-60 seconds.',
      questionType: 'true_false',
      options: [
        { id: 'a', text: 'True', isCorrect: true },
        { id: 'b', text: 'False', isCorrect: false }
      ],
      correctAnswer: 'a',
      explanation: 'Idling wastes fuel. Turn off the engine if stopped for more than 30-60 seconds.',
      points: 1
    },
    {
      id: uuidv4(),
      questionText: 'What does SIPDE stand for?',
      questionType: 'multiple_choice',
      options: [
        { id: 'a', text: 'Scan, Identify, Predict, Decide, Execute', isCorrect: true },
        { id: 'b', text: 'See, Identify, Predict, Drive, Evade', isCorrect: false },
        { id: 'c', text: 'Scan, Inspect, Predict, Drive, Evaluate', isCorrect: false },
        { id: 'd', text: 'See, Identify, Plan, Drive, Exit', isCorrect: false }
      ],
      correctAnswer: 'a',
      explanation: 'SIPDE: Scan, Identify, Predict, Decide, Execute - the defensive driving process.',
      points: 1
    },
    {
      id: uuidv4(),
      questionText: 'When should you increase your following distance?',
      questionType: 'multiple_choice',
      options: [
        { id: 'a', text: 'Only in heavy traffic', isCorrect: false },
        { id: 'b', text: 'In adverse weather, heavy traffic, or when driving large vehicles', isCorrect: true },
        { id: 'c', text: 'Never - 3 seconds is always enough', isCorrect: false },
        { id: 'd', text: 'Only at night', isCorrect: false }
      ],
      correctAnswer: 'b',
      explanation: 'Increase following distance in adverse weather, heavy traffic, or with large vehicles.',
      points: 1
    }
  ];

  // Add generic questions until we reach the requested count
  while (questions.length < count && genericQuestions.length > 0) {
    const randomIndex = Math.floor(Math.random() * genericQuestions.length);
    const question = genericQuestions.splice(randomIndex, 1)[0];
    
    // Make sure we don't duplicate
    if (!questions.some(q => q.questionText === question.questionText)) {
      questions.push(question);
    }
  }

  return questions.slice(0, count);
}
