import OpenAI from "openai";
import type { ChatCompletionChunk, ChatCompletion } from "openai/resources/chat/completions";

interface ChatCompletionMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

interface ChatCompletionRequest {
  model: string;
  provider: string;
  max_tokens?: number;
  messages: ChatCompletionMessage[];
}

interface InferenceOptions {
  billTo?: string;
}

export class InferenceClient {
  private openai: OpenAI;
  private defaultOptions: { billTo?: string };

  constructor(token: string, options: { baseURL?: string } = {}) {
    this.openai = new OpenAI({
      apiKey: process.env.LLM_API_KEY,
      baseURL: options.baseURL || process.env.LLM_URL,
      timeout: 1200000, // 20 minutes
    });
    this.defaultOptions = {};
  }

  async chatCompletion(
    args: ChatCompletionRequest,
    options?: InferenceOptions
  ): Promise<ChatCompletion> {
    try {
      delete args.max_tokens;
      const response = await this.openai.chat.completions.create({
        ...args,
        stream: false
      });

      return response;
    } catch (error) {
      console.error("Error in chat completion:", error);
      throw new Error(`Failed to create chat completion: ${error}`);
    }
  }

  async *chatCompletionStream(
    args: ChatCompletionRequest,
    options?: InferenceOptions
  ): AsyncGenerator<ChatCompletionChunk, void, unknown> {
    try {
      delete args.max_tokens;
      const response = await this.openai.chat.completions.create({
        ...args,
        stream: true
      });
      for await (const chunk of response) {
        yield chunk;
      }
    } catch (error) {
      console.error("Error in streaming chat completion:", error);
      throw new Error(`Failed to create chat completion stream: ${error}`);
    }
  }
}