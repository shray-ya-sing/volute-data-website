import { ThemeState } from "../store/themeSlice";

interface GenerateSlideRequest {
  prompt: string;
  slideNumber: number;
  context?: string;
  theme: ThemeState;
  images?: { data: string; mediaType?: string }[];
}

interface GenerateSlideResponse {
  code: string;
  slideNumber: number;
  imageCount?: number;
  usage: {
    input_tokens: number;
    output_tokens: number;
  };
}

interface GenerateSlideError {
  error: string;
  details?: string;
  truncated?: boolean;
}

export class SlideGenerationError extends Error {
  truncated: boolean;
  details?: string;

  constructor(message: string, truncated = false, details?: string) {
    super(message);
    this.name = "SlideGenerationError";
    this.truncated = truncated;
    this.details = details;
  }
}

export async function generateSlide(
  request: GenerateSlideRequest
): Promise<GenerateSlideResponse> {
  console.log(`[generateSlide] POST request for slide ${request.slideNumber}`, {
    promptLength: request.prompt.length,
    imageCount: request.images?.length ?? 0,
    theme: request.theme,
  });

  const response = await fetch("https://www.getvolute.com/api/generate-slide", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(request),
  });

  if (!response.ok) {
    let error: GenerateSlideError;
    try {
      error = await response.json();
    } catch {
      error = { error: `HTTP ${response.status}: ${response.statusText}` };
    }
    console.error(`[generateSlide] API error (HTTP ${response.status}):`, error);
    throw new SlideGenerationError(
      error.error || "Failed to generate slide",
      error.truncated ?? false,
      error.details
    );
  }

  const data: GenerateSlideResponse = await response.json();
  console.log(`[generateSlide] Response received:`, {
    slideNumber: data.slideNumber,
    codeLength: data.code?.length ?? 0,
    imageCount: data.imageCount,
    usage: data.usage,
  });

  return data;
}