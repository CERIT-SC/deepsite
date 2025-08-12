export const PROVIDERS = {
  "VLLM": {
    name: "e-INFRA AI",
    max_tokens: 131_000,
    id: "vllm",
  },
};

export const MODELS = [
  {
    value: "deepseek-r1",
    label: "DeepSeek R1 0528",
    providers: [
      "vllm",
    ],
    autoProvider: "vllm",
    isThinker: true,
  },
  {
    value: "qwen3-coder",
    label: "Qwen3 Coder 480B A35B Instruct",
    providers: ["vllm"],
    autoProvider: "vllm",
    isNew: true,
  },
];
