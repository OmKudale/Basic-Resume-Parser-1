import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import multer from 'multer';
import { PDFParse } from 'pdf-parse';
import Groq from 'groq-sdk';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Helper to initialize or refresh Groq client
function getGroqClient() {
  dotenv.config();
  const apiKey = (process.env.GROQ_API_KEY || '').trim();
  if (!apiKey || apiKey === 'your_key_here') {
    const error = new Error('Groq API key is not configured. Please add your GROQ_API_KEY to server/.env');
    error.isApiKeyError = true;
    throw error;
  }
  return new Groq({ apiKey });
}

// File upload configuration
const storage = multer.memoryStorage();
const upload = multer({
  storage: storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
  fileFilter: (_req, file, cb) => {
    const isPdfMime = file.mimetype === 'application/pdf';
    const isPdfExt = file.originalname && file.originalname.toLowerCase().endsWith('.pdf');
    if (isPdfMime || isPdfExt) {
      cb(null, true);
    } else {
      cb(new Error('Only PDF files are allowed'), false);
    }
  },
});

// Extract JSON from LLM response (handles markdown fences, extra text)
function extractJSON(text) {
  if (!text || typeof text !== 'string') {
    throw new Error('Received empty or invalid text from LLM response');
  }

  // Try direct parse first
  try {
    return JSON.parse(text);
  } catch (_) {
    // ignore
  }

  // Remove markdown code fences
  let cleaned = text.replace(/```json\s*/gi, '').replace(/```\s*/g, '');

  // Try parsing the cleaned text
  try {
    return JSON.parse(cleaned.trim());
  } catch (_) {
    // ignore
  }

  // Try to find JSON object in the text
  const jsonMatch = text.match(/\{[\s\S]*\}/);
  if (jsonMatch) {
    try {
      return JSON.parse(jsonMatch[0]);
    } catch (_) {
      // ignore
    }
  }

  throw new Error('Could not extract valid JSON from LLM response');
}

// Helper function to extract text from PDF buffer
async function extractTextFromPdf(buffer) {
  const parser = new PDFParse({ data: buffer });
  try {
    const data = await parser.getText();
    return data?.text || '';
  } finally {
    try {
      await parser.destroy();
    } catch (_) {
      // Clean up resources safely
    }
  }
}

// Helper function to call Groq for resume parsing
async function parseResumeWithGroq(resumeText) {
  const groq = getGroqClient();

  const systemPrompt = `You are a resume parsing assistant.
Extract information from the resume and return ONLY a valid JSON object with these fields:
- name (string)
- email (string or null)
- phone (string or null)
- skills (array of strings)
- education (array of strings)
- experience (array of strings)
- projects (array of strings)
- certifications (array of strings)
- achievements (array of strings)

Rules:
1. Extract only information explicitly present in the resume.
2. Do not invent or assume information.
3. If optional information is missing, use null.
4. If a list-based field has no information, return an empty list.
5. Keep the extracted information concise and relevant.
6. Return ONLY valid JSON, no extra text.`;

  try {
    const completion = await groq.chat.completions.create({
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: `Parse the following resume:\n\n${resumeText}` },
      ],
      model: 'openai/gpt-oss-120b',
      temperature: 0.1,
      response_format: { type: 'json_object' },
    });

    const content = completion.choices[0]?.message?.content || '';
    const raw = extractJSON(content);

    return {
      name: raw.name || 'Candidate',
      email: raw.email || null,
      phone: raw.phone || null,
      skills: Array.isArray(raw.skills) ? raw.skills : [],
      education: Array.isArray(raw.education) ? raw.education : [],
      experience: Array.isArray(raw.experience) ? raw.experience : [],
      projects: Array.isArray(raw.projects) ? raw.projects : [],
      certifications: Array.isArray(raw.certifications) ? raw.certifications : [],
      achievements: Array.isArray(raw.achievements) ? raw.achievements : [],
    };
  } catch (error) {
    console.error('Error parsing resume with Groq:', error);
    if (error.isApiKeyError) throw error;
    if (error.status === 401 || (error.message && error.message.includes('API Key'))) {
      const authErr = new Error('Invalid Groq API key. Please check your GROQ_API_KEY in server/.env.');
      authErr.isApiKeyError = true;
      throw authErr;
    }
    throw new Error('Failed to parse resume: ' + (error.message || 'Unknown error'));
  }
}

// Helper function to call Groq for matching resume against job description
async function matchResumeWithGroq(parsedResume, jobDescription) {
  const groq = getGroqClient();

  const systemPrompt = `You are an expert technical recruiter.
Compare a candidate's resume against a job description and evaluate the match.
The job description can be in any format - plain text, bullet points, paragraphs, etc. Just read and understand it.

Return ONLY a valid JSON object with these fields:
- score (integer 0-100)
- matchedSkills (array of strings - skills the candidate has that match the job)
- missingSkills (array of strings - skills required by the job that the candidate lacks)
- strengths (array of strings - candidate's strong points for this role)
- weaknesses (array of strings - areas where the candidate falls short)
- explanation (string - detailed explanation of the score)

Scoring guidelines:
- 50%: Required technical skills
- 20%: Relevant experience
- 15%: Projects
- 10%: Education
- 5%: Certifications and other relevant qualifications

Rules:
1. Score the candidate from 0 to 100.
2. Only use information explicitly present in the resume.
3. Do not assume missing skills or experience.
4. Match skills semantically when appropriate.
5. Required skills are more important than preferred skills.
6. Clearly identify matched and missing skills.
7. Explain the main reasons behind the score.
8. Return ONLY valid JSON, no extra text.`;

  try {
    const completion = await groq.chat.completions.create({
      messages: [
        { role: 'system', content: systemPrompt },
        {
          role: 'user',
          content: `Compare the candidate's resume with the following job requirements.

JOB DESCRIPTION:
${jobDescription}

CANDIDATE RESUME:
${JSON.stringify(parsedResume, null, 2)}

Return the result as a JSON object ONLY.`,
        },
      ],
      model: 'openai/gpt-oss-120b',
      temperature: 0.1,
      response_format: { type: 'json_object' },
    });

    const content = completion.choices[0]?.message?.content || '';
    const raw = extractJSON(content);
    const scoreVal = typeof raw.score === 'number' ? raw.score : (parseInt(raw.score, 10) || 0);

    return {
      score: Math.max(0, Math.min(100, Math.round(scoreVal))),
      matchedSkills: Array.isArray(raw.matchedSkills) ? raw.matchedSkills : (Array.isArray(raw.matched_skills) ? raw.matched_skills : []),
      missingSkills: Array.isArray(raw.missingSkills) ? raw.missingSkills : (Array.isArray(raw.missing_skills) ? raw.missing_skills : []),
      strengths: Array.isArray(raw.strengths) ? raw.strengths : [],
      weaknesses: Array.isArray(raw.weaknesses) ? raw.weaknesses : (Array.isArray(raw.areas_for_growth) ? raw.areas_for_growth : []),
      explanation: raw.explanation || raw.summary || 'Resume analyzed successfully.',
    };
  } catch (error) {
    console.error('Error matching resume with Groq:', error);
    if (error.isApiKeyError) throw error;
    if (error.status === 401 || (error.message && error.message.includes('API Key'))) {
      const authErr = new Error('Invalid Groq API key. Please check your GROQ_API_KEY in server/.env.');
      authErr.isApiKeyError = true;
      throw authErr;
    }
    throw new Error('Failed to match resume: ' + (error.message || 'Unknown error'));
  }
}

// Routes
app.post(
  '/api/upload-resume',
  (req, res, next) => {
    upload.single('resume')(req, res, (err) => {
      if (err) {
        if (err.code === 'LIMIT_FILE_SIZE') {
          return res.status(400).json({ error: 'File size exceeds the 5MB limit', message: 'File size exceeds the 5MB limit' });
        }
        return res.status(400).json({ error: err.message || 'File upload error', message: err.message || 'File upload error' });
      }
      next();
    });
  },
  async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ error: 'No resume file uploaded', message: 'No resume file uploaded' });
      }

      const jobDescription = req.body.jobDescription || '';
      if (!jobDescription.trim()) {
        return res.status(400).json({ error: 'Job description is required', message: 'Job description is required' });
      }

      console.log('Processing resume upload...');
      console.log('Job description length:', jobDescription.length);

      // Extract text from PDF
      const resumeText = await extractTextFromPdf(req.file.buffer);
      console.log('Resume text extracted, length:', resumeText.length);

      if (!resumeText || !resumeText.trim()) {
        return res.status(400).json({
          error: 'Could not extract text from the PDF. Please ensure the PDF has selectable text and is not a scanned image.',
          message: 'Could not extract text from the PDF. Please ensure the PDF has selectable text and is not a scanned image.',
        });
      }

      // Parse resume using Groq
      const parsedResume = await parseResumeWithGroq(resumeText);
      console.log('Resume parsed successfully');

      // Match resume against job description
      const matchResult = await matchResumeWithGroq(parsedResume, jobDescription);
      console.log('Match result score:', matchResult.score);

      // Determine eligibility (score >= 70)
      const eligible = matchResult.score >= 70;

      // Return result
      res.json({
        success: true,
        data: {
          resume: parsedResume,
          match: {
            ...matchResult,
            eligible,
          },
        },
      });
    } catch (error) {
      console.error('Error in upload-resume:', error);
      const userMessage = error.message || 'Internal server error';
      res.status(500).json({ error: userMessage, message: userMessage });
    }
  }
);

// Health check endpoint
app.get('/api/health', (_req, res) => {
  res.json({ status: 'OK', timestamp: new Date().toISOString() });
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

