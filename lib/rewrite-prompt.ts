import { EnhancedSettings } from "@/types";
import { InferenceClient } from "@/lib/my-inference";
import { PROMPT_FOR_REWRITE_PROMPT, PROMPT_FOR_REWRITE_PROMPT_END } from "./prompts";

export async function rewritePrompt(prompt: string, enhancedSettings: EnhancedSettings, options: { token: string, billTo: string | null }, model: string, provider: string) {
  const { token, billTo } = options;

  const client = new InferenceClient(token);
  const response = await client.chatCompletion(
    {
      model,
      provider: provider as any,
      messages: [
        {
          role: "system",
          content: `You will be given a prompt and a set of enhanced settings. You will need to rewrite the prompt to include the enhanced settings.
IMPORTANT: ALWAYS KEEP THE ORIGINAL IDEA OF THE USER'S PROMPT. DO NOT CHANGE THE ORIGINAL IDEA OF THE USER'S PROMPT.
Make sure to add a lot of details to the prompt, and make it more specific, to create the best prompt possible.
REQUIRED: If in the original prompt, the user asks for multiple pages, make sure to keep the multiple pages in the rewritten prompt.
ALWAYS RETURN THE REWRITTEN PROMPT, DO NOT ADD ANYTHING ELSE.`,
        },
        {
          role: "user",
          content: `Here is my prompt: ${prompt}. IMPORTANT: ALWAYS KEEP THE ORIGINAL IDEA OF MY PROMPT. Here are the enhanced settings:
1. I want to use the following primary color: ${enhancedSettings.primaryColor} (eg: bg-${enhancedSettings.primaryColor}-500).
2. I want to use the following secondary color: ${enhancedSettings.secondaryColor} (eg: bg-${enhancedSettings.secondaryColor}-500).
3. I want to use the following theme: ${enhancedSettings.theme} mode.
Make sure to include the enhanced settings in the rewritten prompt.`,
        },
      ],
    },
    billTo ? { billTo } : {}
  );

  return response.choices[0]?.message?.content;
}