import { OpenClawModel } from '@openclaw/core';
import axios from 'axios';

export class Kimi25Model implements OpenClawModel {
  private apiKey: string;
  private endpoint = 'https://integrate.api.nvidia.com/v1/chat/completions';
  
  constructor(apiKey: string) {
    this.apiKey = apiKey;
  }

  async execute(prompt: string, options: {
    maxTokens?: number;
    temperature?: number;
    stream?: boolean;
  } = {}): Promise<string> {
    const payload = {
      model: 'moonshotai/kimi-k2.5',
      messages: [{ role: 'user', content: prompt }],
      max_tokens: options.maxTokens || 16384,
      temperature: options.temperature ?? 1.0,
      top_p: 1.0,
      stream: options.stream ?? false,
      chat_template_kwargs: { thinking: true }
    };

    try {
      const response = await axios.post(this.endpoint, payload, {
        headers: {
          Authorization: `Bearer ${this.apiKey}`,
          Accept: options.stream ? 'text/event-stream' : 'application/json'
        },
        responseType: options.stream ? 'stream' : 'json'
      });

      if (options.stream) {
        let fullResponse = '';
        for await (const chunk of response.data) {
          fullResponse += chunk.toString();
        }
        return fullResponse;
      } else {
        return response.data.choices[0].message.content;
      }
    } catch (error) {
      console.error('Kimi API error:', error);
      throw new Error(`Kimi execution failed: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  getModelInfo() {
    return {
      id: 'kimi-2.5',
      name: 'Moonshot Kimi 2.5 (via NVIDIA)',
      capabilities: ['long-context', 'reasoning', 'code'],
      maxTokens: 16384,
      costPerToken: 0.000015 // Example pricing
    };
  }
}

export default Kimi25Model;
