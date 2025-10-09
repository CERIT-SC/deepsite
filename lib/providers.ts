import DeepSeekLogo from "@/assets/deepseek.svg";
import QwenLogo from "@/assets/qwen.svg";
import KimiLogo from "@/assets/kimi.svg";
import ZaiLogo from "@/assets/zai.svg";

export const PROVIDERS = {
  "VLLM": {
    name: "e-INFRA AI",
    max_tokens: 131_000,
    id: "vllm",
  }
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
    logo: DeepSeekLogo,
    companyName: "",
  },
  {
    value: "qwen3-coder",
    label: "Qwen3 Coder 480B A35B Instruct",
    providers: ["vllm"],
    autoProvider: "vllm",
    isNew: true,
    logo: QwenLogo,
    companyName: "",
  }
];
