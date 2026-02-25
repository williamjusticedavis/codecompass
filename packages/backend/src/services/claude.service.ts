import Anthropic from '@anthropic-ai/sdk';
import { env } from '../config/env';
import { logger } from '../utils/logger';

export interface ClaudeMessage {
  role: 'user' | 'assistant';
  content: string;
}

export interface ClaudeOptions {
  model?: 'claude-opus-4' | 'claude-sonnet-4.5' | 'claude-haiku-4';
  maxTokens?: number;
  temperature?: number;
  systemPrompt?: string;
}

export class ClaudeService {
  private client: Anthropic;
  private readonly defaultModel = 'claude-sonnet-4.5';
  private readonly defaultMaxTokens = 4096;

  constructor() {
    if (!env.ANTHROPIC_API_KEY) {
      throw new Error('ANTHROPIC_API_KEY is not configured');
    }

    this.client = new Anthropic({
      apiKey: env.ANTHROPIC_API_KEY,
    });
  }

  /**
   * Send a message to Claude and get a response
   */
  async sendMessage(
    message: string,
    options: ClaudeOptions = {}
  ): Promise<{ content: string; tokensUsed: number }> {
    const {
      model = this.defaultModel,
      maxTokens = this.defaultMaxTokens,
      temperature = 1.0,
      systemPrompt,
    } = options;

    try {
      const response = await this.client.messages.create({
        model: this.getModelId(model),
        max_tokens: maxTokens,
        temperature,
        system: systemPrompt,
        messages: [
          {
            role: 'user',
            content: message,
          },
        ],
      });

      const content =
        response.content[0].type === 'text' ? response.content[0].text : '';

      const tokensUsed = response.usage.input_tokens + response.usage.output_tokens;

      logger.info('Claude API call successful', {
        model,
        inputTokens: response.usage.input_tokens,
        outputTokens: response.usage.output_tokens,
        totalTokens: tokensUsed,
      });

      return {
        content,
        tokensUsed,
      };
    } catch (error) {
      logger.error('Claude API call failed', { error, model, message: message.substring(0, 100) });
      throw error;
    }
  }

  /**
   * Send a conversation with multiple messages
   */
  async sendConversation(
    messages: ClaudeMessage[],
    options: ClaudeOptions = {}
  ): Promise<{ content: string; tokensUsed: number }> {
    const {
      model = this.defaultModel,
      maxTokens = this.defaultMaxTokens,
      temperature = 1.0,
      systemPrompt,
    } = options;

    try {
      const response = await this.client.messages.create({
        model: this.getModelId(model),
        max_tokens: maxTokens,
        temperature,
        system: systemPrompt,
        messages: messages.map((msg) => ({
          role: msg.role,
          content: msg.content,
        })),
      });

      const content =
        response.content[0].type === 'text' ? response.content[0].text : '';

      const tokensUsed = response.usage.input_tokens + response.usage.output_tokens;

      logger.info('Claude API conversation successful', {
        model,
        messageCount: messages.length,
        inputTokens: response.usage.input_tokens,
        outputTokens: response.usage.output_tokens,
        totalTokens: tokensUsed,
      });

      return {
        content,
        tokensUsed,
      };
    } catch (error) {
      logger.error('Claude API conversation failed', { error, model, messageCount: messages.length });
      throw error;
    }
  }

  /**
   * Get the full model ID for Anthropic API
   */
  private getModelId(model: string): string {
    const modelMap: Record<string, string> = {
      'claude-opus-4': 'claude-opus-4-20250514',
      'claude-sonnet-4.5': 'claude-sonnet-4-5-20250929',
      'claude-haiku-4': 'claude-haiku-4-20250228',
    };

    return modelMap[model] || model;
  }
}

export const claudeService = new ClaudeService();
