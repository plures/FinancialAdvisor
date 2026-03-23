// Advice package stub — implementation pending

export interface AdviceRequest {
  userId: string;
  context?: Record<string, unknown>;
}

export interface AdviceResponse {
  advice: string;
  confidence: number;
}

export class AdviceService {
  getAdvice(_request: AdviceRequest): AdviceResponse {
    return {
      advice: 'Advice service not yet implemented.',
      confidence: 0,
    };
  }
}
