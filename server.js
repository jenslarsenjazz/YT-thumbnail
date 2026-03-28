require('dotenv').config();

const express = require('express');
const multer = require('multer');
const path = require('path');
const { GoogleGenAI } = require('@google/genai');

const app = express();
const port = Number(process.env.PORT) || 3000;
const modelName = process.env.GEMINI_MODEL || 'gemini-3-pro-image-preview';

if (!process.env.GEMINI_API_KEY) {
  console.warn('[WARN] GEMINI_API_KEY is missing. API requests will fail until it is configured.');
}

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || '' });

const MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024; // 10MB per image
const ALLOWED_MIME_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp']);

const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: MAX_FILE_SIZE_BYTES,
    files: 2
  },
  fileFilter: (req, file, cb) => {
    if (!ALLOWED_MIME_TYPES.has(file.mimetype)) {
      cb(new Error('Only JPG, PNG, and WEBP images are allowed.'));
      return;
    }

    cb(null, true);
  }
});

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

function buildEditPrompt(extraInstructions = '') {
  const defaultInstruction =
    'Edit the base thumbnail image by replacing the visible face/head of the person in the thumbnail with the face/head from the uploaded portrait image. Preserve the thumbnail composition, camera angle, crop, background, body pose, clothing, and overall thumbnail style as much as possible. Blend the new head naturally so it looks like a cohesive thumbnail image.';

  const trimmedExtras = String(extraInstructions || '').trim();
  if (!trimmedExtras) {
    return defaultInstruction;
  }

  return `${defaultInstruction}\n\nExtra instructions from the user:\n${trimmedExtras}`;
}

/**
 * Attempts to pull an inline image from various Gemini response shapes.
 *
 * Why this is defensive:
 * Depending on SDK/model version, image parts can appear in different places,
 * usually as candidates[].content.parts[].inlineData.
 */
function extractGeneratedImage(result) {
  if (!result || !Array.isArray(result.candidates)) return null;

  for (const candidate of result.candidates) {
    const parts = candidate?.content?.parts;
    if (!Array.isArray(parts)) continue;

    for (const part of parts) {
      const inline = part?.inlineData;
      if (inline?.data && inline?.mimeType?.startsWith('image/')) {
        return {
          mimeType: inline.mimeType,
          data: inline.data
        };
      }

      // Fallback shape used by some SDK versions.
      const data = part?.data;
      const mimeType = part?.mimeType;
      if (data && mimeType && String(mimeType).startsWith('image/')) {
        return { mimeType, data };
      }
    }
  }

  return null;
}

app.post(
  '/api/swap-face',
  upload.fields([
    { name: 'baseImage', maxCount: 1 },
    { name: 'portraitImage', maxCount: 1 }
  ]),
  async (req, res) => {
    try {
      if (!process.env.GEMINI_API_KEY) {
        return res.status(500).json({
          error: 'Server is missing GEMINI_API_KEY. Please configure it in .env.'
        });
      }

      const baseImage = req.files?.baseImage?.[0];
      const portraitImage = req.files?.portraitImage?.[0];
      const extraInstructions = req.body?.extraInstructions || '';

      if (!baseImage || !portraitImage) {
        return res.status(400).json({
          error: 'Please upload both images: a base thumbnail image and a portrait/head image.'
        });
      }

      const prompt = buildEditPrompt(extraInstructions);

      const result = await ai.models.generateContent({
        model: modelName,
        contents: [
          {
            role: 'user',
            parts: [
              { text: prompt },
              {
                text: 'Image A (base thumbnail): keep framing/composition and replace only face/head.'
              },
              {
                inlineData: {
                  mimeType: baseImage.mimetype,
                  data: baseImage.buffer.toString('base64')
                }
              },
              {
                text: 'Image B (portrait/head source): use this face/head identity.'
              },
              {
                inlineData: {
                  mimeType: portraitImage.mimetype,
                  data: portraitImage.buffer.toString('base64')
                }
              }
            ]
          }
        ],
        config: {
          responseModalities: ['IMAGE', 'TEXT']
        }
      });

      const generatedImage = extractGeneratedImage(result);

      if (!generatedImage) {
        console.error('[Gemini] No image found in response:', JSON.stringify(result, null, 2));
        return res.status(502).json({
          error:
            'The model did not return an edited image. Try again with clearer instructions or different images.'
        });
      }

      return res.status(200).json({
        imageDataUrl: `data:${generatedImage.mimeType};base64,${generatedImage.data}`
      });
    } catch (error) {
      // Basic server-side logging for easier debugging.
      console.error('[POST /api/swap-face] Failed to generate image:', error);

      return res.status(500).json({
        error:
          error?.message ||
          'Something went wrong while generating the image. Please try again with different images.'
      });
    }
  }
);

app.use((err, req, res, next) => {
  if (err instanceof multer.MulterError) {
    if (err.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({
        error: `File too large. Maximum size is ${MAX_FILE_SIZE_BYTES / (1024 * 1024)}MB per image.`
      });
    }

    return res.status(400).json({ error: err.message || 'Upload error.' });
  }

  if (err) {
    console.error('[Express error handler]:', err);
    return res.status(400).json({ error: err.message || 'Request error.' });
  }

  return next();
});

app.listen(port, () => {
  console.log(`Server running at http://localhost:${port}`);
  console.log(`Using Gemini model: ${modelName}`);
});
