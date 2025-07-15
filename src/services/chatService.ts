import { GoogleGenerativeAI } from "@google/generative-ai";
import { env } from "../config/env";
import { Question } from "../types/guides";
import { FollowUpRule, FollowUpPrompt } from "../types/followUps";
import { AppError } from "../middlewares/errorHandler";

interface ContextItem {
  question: string;
  answer: string;
}

export class ChatService {
  private genAI: GoogleGenerativeAI;
  private model: any; // Using any temporarily for Gemini model type

  constructor() {
    if (!env.geminiApiKey) {
      throw new Error("GEMINI_API_KEY is not defined in your environment");
    }

    this.genAI = new GoogleGenerativeAI(env.geminiApiKey);
    this.model = this.genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
  }

  private buildFollowUpPrompt(
    question: Question,
    answer: { text: string },
    rule: FollowUpRule,
    previousContext: ContextItem[]
  ): string {
    let prompt = "You are an expert interviewer. Your task is to generate a thoughtful follow-up question.\n\n";

    // Include previous context if configured
    if (question.contextIncluded && previousContext.length > 0) {
      prompt += "Previous context:\n";
      previousContext.forEach(ctx => {
        prompt += `Q: ${ctx.question}\nA: ${ctx.answer}\n\n`;
      });
    }

    // Include the current Q&A
    prompt += `Current question: ${question.text}\n`;
    prompt += `Interviewee's answer: ${answer.text}\n\n`;

    // Add custom guidance based on rule type
    switch (rule.condition.type) {
      case "keywords":
        prompt += "The answer contains keywords of interest. Generate a follow-up that:\n";
        prompt += "1. Explores the mentioned concepts in more depth\n";
        prompt += "2. Asks for specific examples or scenarios\n";
        prompt += "3. Seeks to understand the reasoning or impact\n\n";
        break;

      case "length":
        prompt += "The answer is detailed. Generate a follow-up that:\n";
        prompt += "1. Picks up on a specific detail mentioned\n";
        prompt += "2. Asks for clarification on any assumptions\n";
        prompt += "3. Explores potential implications\n\n";
        break;

      case "sentiment":
        prompt += "The answer has a notable emotional tone. Generate a follow-up that:\n";
        prompt += "1. Acknowledges the expressed sentiment respectfully\n";
        prompt += "2. Seeks to understand the underlying reasons\n";
        prompt += "3. Explores potential solutions or alternatives\n\n";
        break;
    }

    // Add the specific rule template
    prompt += "Using this guidance, generate a follow-up question that: " + rule.promptTemplate;

    return prompt;
  }

  private async evaluateAnswerQuality(
    question: Question,
    answer: { text: string }
  ): Promise<{ isValid: boolean; reason?: string }> {
    const prompt = `
Analyze this interview question and answer:

Question: "${question.text}"
Answer: "${answer.text}"

Evaluate if this is a valid, meaningful response by checking:
1. Relevance: Does it directly address the question?
2. Completeness: Does it provide sufficient information?
3. Clarity: Is it clearly expressed and understandable?
4. Engagement: Does it show genuine engagement with the topic?

Respond in JSON format:
{
  "isValid": boolean,
  "reason": "explanation if invalid"
}`;

    try {
      const chat = this.model.startChat();
      const result = await chat.sendMessage(prompt);
      const response = JSON.parse(result.response.text());
      return response;
    } catch (error) {
      console.error('Error evaluating answer quality:', error);
      return { isValid: true }; // Default to valid if evaluation fails
    }
  }

  private async evaluateFollowUpCondition(
    question: Question,
    answer: { text: string },
    rule: FollowUpRule
  ): Promise<boolean> {
    // First check answer quality
    const qualityCheck = await this.evaluateAnswerQuality(question, answer);
    if (!qualityCheck.isValid) {
      return false;
    }

    // Then evaluate rule-specific conditions
    switch (rule.condition.type) {
      case "keywords": {
        const keywords = rule.condition.value as string[];
        const hasKeywords = keywords.some(keyword => 
          answer.text.toLowerCase().includes(keyword.toLowerCase())
        );

        if (hasKeywords) {
          // Verify keyword context
          const prompt = `
Question: "${question.text}"
Answer: "${answer.text}"
Keywords: ${keywords.join(', ')}

Are the keywords used meaningfully in relation to the question? Answer only 'yes' or 'no'.
Consider:
1. Are they used in the right context?
2. Do they contribute to answering the question?
3. Are they not just mentioned in passing?`;

          const chat = this.model.startChat();
          const result = await chat.sendMessage(prompt);
          return result.response.text().toLowerCase().includes('yes');
        }
        return false;
      }

      case "sentiment": {
        const targetSentiment = rule.condition.value as string;
        const prompt = `
Question: "${question.text}"
Answer: "${answer.text}"

What is the predominant emotional tone of this answer? Choose one:
- positive
- negative
- neutral

Respond with just one word.`;

        const chat = this.model.startChat();
        const result = await chat.sendMessage(prompt);
        const detectedSentiment = result.response.text().toLowerCase().trim();
        return detectedSentiment === targetSentiment.toLowerCase();
      }

      case "length": {
        const minWords = rule.condition.value as number;
        const words = answer.text.trim().split(/\s+/);
        
        if (words.length >= minWords) {
          // Check for answer substance
          const prompt = `
Question: "${question.text}"
Answer: "${answer.text}"

Is this a substantive answer with meaningful content, not just filler words? Answer only 'yes' or 'no'.
Consider:
1. Does it provide specific information?
2. Does it avoid repetition and fluff?
3. Does each part contribute to answering the question?`;

          const chat = this.model.startChat();
          const result = await chat.sendMessage(prompt);
          return result.response.text().toLowerCase().includes('yes');
        }
        return false;
      }

      default:
        return false;
    }
  }

  async generateFollowUps(
    question: Question,
    answer: { text: string },
    previousContext: ContextItem[]
  ): Promise<FollowUpPrompt[]> {
    if (!question.followUpRules || question.followUpRules.length === 0) {
      return [];
    }

    const followUps: FollowUpPrompt[] = [];

    for (const rule of question.followUpRules) {
      if (!await this.evaluateFollowUpCondition(question, answer, rule)) {
        continue;
      }

      try {
        const prompt = this.buildFollowUpPrompt(question, answer, rule, previousContext);
        const chat = this.model.startChat();
        const result = await chat.sendMessage(prompt);
        const followUpText = result.response.text();

        followUps.push({
          questionId: question.id,
          prompt: followUpText,
          generatedAt: new Date(),
          sourceAnswer: answer.text,
          ruleId: rule.condition.type
        });

        if (rule.maxFollowUps > 0 && followUps.length >= rule.maxFollowUps) {
          break;
        }
      } catch (error) {
        console.error("Error generating follow-up:", error);
        throw new AppError("Failed to generate follow-up question", 500);
      }
    }

    return followUps;
  }
}