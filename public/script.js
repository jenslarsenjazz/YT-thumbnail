const swapForm = document.getElementById('swapForm');
const baseInput = document.getElementById('baseImage');
const portraitInput = document.getElementById('portraitImage');
const extraInstructionsInput = document.getElementById('extraInstructions');
const submitBtn = document.getElementById('submitBtn');

const basePreview = document.getElementById('basePreview');
const basePreviewBox = document.getElementById('basePreviewBox');
const portraitPreview = document.getElementById('portraitPreview');
const portraitPreviewBox = document.getElementById('portraitPreviewBox');

const statusEl = document.getElementById('status');
const resultSection = document.getElementById('resultSection');
const resultImage = document.getElementById('resultImage');
const downloadBtn = document.getElementById('downloadBtn');

function setStatus(message, type = '') {
  statusEl.textContent = message;
  statusEl.className = `status ${type}`.trim();
}

function previewFile(inputEl, imageEl, previewBoxEl) {
  const file = inputEl.files?.[0];
  if (!file) {
    previewBoxEl.hidden = true;
    imageEl.removeAttribute('src');
    return;
  }

  const url = URL.createObjectURL(file);
  imageEl.src = url;
  previewBoxEl.hidden = false;
}

baseInput.addEventListener('change', () => previewFile(baseInput, basePreview, basePreviewBox));
portraitInput.addEventListener('change', () => previewFile(portraitInput, portraitPreview, portraitPreviewBox));

swapForm.addEventListener('submit', async (event) => {
  event.preventDefault();

  const baseFile = baseInput.files?.[0];
  const portraitFile = portraitInput.files?.[0];

  if (!baseFile || !portraitFile) {
    setStatus('Please select both images before generating.', 'error');
    return;
  }

  submitBtn.disabled = true;
  resultSection.hidden = true;
  setStatus('Generating image... this can take a bit.', '');

  try {
    const formData = new FormData();
    formData.append('baseImage', baseFile);
    formData.append('portraitImage', portraitFile);
    formData.append('extraInstructions', extraInstructionsInput.value || '');

    const response = await fetch('/api/swap-face', {
      method: 'POST',
      body: formData
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data?.error || 'Failed to generate image.');
    }

    if (!data?.imageDataUrl) {
      throw new Error('No generated image returned from server.');
    }

    resultImage.src = data.imageDataUrl;
    downloadBtn.href = data.imageDataUrl;
    resultSection.hidden = false;
    setStatus('Done! You can preview and download the edited thumbnail below.', 'success');
  } catch (error) {
    console.error(error);
    setStatus(error.message || 'Something went wrong while generating.', 'error');
  } finally {
    submitBtn.disabled = false;
  }
});
