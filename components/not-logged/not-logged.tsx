"use client";

import { useUser } from "@/hooks/useUser";
import { AnimatedBlobs } from "../animated-blobs";
import { FakeAskAi } from "../editor/ask-ai/fake-ask";
import { redirect } from "next/navigation";


export const NotLogged = () => {
  redirect("/api/auth/signin")
  const { openLoginWindow } = useUser();
  return (
    <section className="relative max-w-[86rem] mx-auto">
      <header className="container mx-auto pt-20 px-6 relative flex flex-col items-center justify-center text-center">
        <div className="rounded-full border border-sky-100/10 bg-gradient-to-r from-sky-500/15 to-sky-sky-500/5 text-sm text-sky-300 px-3 py-1 max-w-max mx-auto mb-2">
          ✨ DeepSite v3 is out!
        </div>
        <h1 className="text-5xl lg:text-7xl font-semibold text-white font-mono max-w-4xl">
          Welcome to DeepSite
        </h1>
        <p className="text-white/70 text-xl mt-3 mb-8">
          Code your website with AI in seconds. <br />
          Access the most simple and powerful AI Vibe Code Editor to create your
          next project.
        </p>
        <FakeAskAi />
        <AnimatedBlobs />
      </header>
      <div id="features" className="min-h-screen py-20 px-6 relative">
        <div className="container mx-auto"></div>
        <div className="text-center mb-16">
          <div className="rounded-full border border-neutral-100/10 bg-neutral-100/5 text-sm text-neutral-300 px-3 py-1 max-w-max mx-auto mb-4">
            🚀 Powerful Features
          </div>
          <h2 className="text-4xl lg:text-5xl font-extrabold text-white font-mono mb-4">
            Everything you need
          </h2>
          <p className="text-base lg:text-lg text-neutral-300/80 max-w-2xl mx-auto">
            Build, deploy, and scale your websites with cutting-edge features
          </p>
        </div>

        {/* Bento Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-7xl mx-auto">
          {/* Multi Pages */}
          <div
            className="lg:row-span-2 relative p-8 rounded-2xl border border-neutral-100/10 bg-neutral-900/50 backdrop-blur-sm overflow-hidden group hover:border-neutral-100/20 transition-all duration-500 hover:scale-105 hover:rotate-1 hover:-translate-y-2 hover:shadow-2xl hover:shadow-purple-500/20"
            style={{ transformStyle: "preserve-3d" }}
          >
            <div className="relative z-10">
              <div className="text-3xl lg:text-4xl mb-4">📄</div>
              <h3 className="text-2xl lg:text-3xl font-bold text-white font-mono mb-3">
                Multi Pages
              </h3>
              <p className="text-neutral-300/80 lg:text-lg mb-6">
                Create complex websites with multiple interconnected pages.
                Build everything from simple landing pages to full-featured web
                applications with dynamic routing and navigation.
              </p>
              <div className="flex flex-wrap gap-2">
                <span className="px-3 py-1 bg-purple-500/20 text-purple-300 rounded-full text-sm">
                  Dynamic Routing
                </span>
                <span className="px-3 py-1 bg-blue-500/20 text-blue-300 rounded-full text-sm">
                  Navigation
                </span>
                <span className="px-3 py-1 bg-green-500/20 text-green-300 rounded-full text-sm">
                  SEO Ready
                </span>
              </div>
            </div>
            <div className="absolute -top-20 -right-20 w-40 h-40 bg-gradient-to-r from-purple-500 to-pink-500 opacity-20 blur-3xl rounded-full transition-all duration-700 ease-out group-hover:scale-[4] group-hover:opacity-30" />
          </div>

          {/* Auto Deploy */}
          <div
            className="relative p-6 rounded-2xl border border-neutral-100/10 bg-neutral-900/50 backdrop-blur-sm overflow-hidden group hover:border-neutral-100/20 transition-all duration-500 hover:scale-110 hover:-translate-y-4 hover:-rotate-3 hover:shadow-2xl hover:shadow-yellow-500/25"
            style={{ perspective: "1000px", transformStyle: "preserve-3d" }}
          >
            <div className="relative z-10">
              <div className="text-3xl mb-4">⚡</div>
              <h3 className="text-2xl font-bold text-white font-mono mb-3">
                Auto Deploy
              </h3>
              <p className="text-neutral-300/80 mb-4">
                Push your changes and watch them go live instantly. No complex
                CI/CD setup required.
              </p>
            </div>
            <div className="absolute -bottom-10 -right-10 w-32 h-32 bg-gradient-to-r from-yellow-500 to-orange-500 opacity-20 blur-2xl rounded-full transition-all duration-700 ease-out group-hover:scale-[5] group-hover:opacity-35" />
          </div>

          {/* Free Hosting */}
          <div className="relative p-6 rounded-2xl border border-neutral-100/10 bg-neutral-900/50 backdrop-blur-sm overflow-hidden group hover:border-neutral-100/20 transition-all duration-500 hover:scale-105 hover:rotate-2 hover:-translate-y-3 hover:shadow-xl hover:shadow-green-500/20">
            <div className="relative z-10">
              <div className="text-3xl mb-4">🌐</div>
              <h3 className="text-2xl font-bold text-white font-mono mb-3">
                Free Hosting
              </h3>
              <p className="text-neutral-300/80 mb-4">
                Host your websites for free with global CDN and lightning-fast
                performance.
              </p>
            </div>
            <div className="absolute -top-10 -left-10 w-32 h-32 bg-gradient-to-r from-green-500 to-emerald-500 opacity-20 blur-2xl rounded-full transition-all duration-700 ease-out group-hover:scale-[5] group-hover:opacity-35" />
          </div>

          {/* Open Source Models */}
          <div
            className="lg:col-span-2 md:col-span-2 relative p-6 rounded-2xl border border-neutral-100/10 bg-neutral-900/50 backdrop-blur-sm overflow-hidden group hover:border-neutral-100/20 transition-all duration-600 hover:scale-[1.02] hover:rotate-y-6 hover:-translate-y-1 hover:shadow-2xl hover:shadow-cyan-500/20"
            style={{ perspective: "1200px", transformStyle: "preserve-3d" }}
          >
            <div className="relative z-10">
              <div className="text-3xl mb-4">🔓</div>
              <h3 className="text-2xl font-bold text-white font-mono mb-3">
                Open Source Models
              </h3>
              <p className="text-neutral-300/80 mb-4">
                Powered by cutting-edge open source AI models. Transparent,
                customizable, and community-driven development.
              </p>
              <div className="flex flex-wrap gap-2">
                <span className="px-3 py-1 bg-cyan-500/20 text-cyan-300 rounded-full text-sm">
                  Llama
                </span>
                <span className="px-3 py-1 bg-indigo-500/20 text-indigo-300 rounded-full text-sm">
                  Mistral
                </span>
                <span className="px-3 py-1 bg-pink-500/20 text-pink-300 rounded-full text-sm">
                  CodeLlama
                </span>
              </div>
            </div>
            <div className="absolute -bottom-10 right-10 w-32 h-32 bg-gradient-to-r from-cyan-500 to-indigo-500 opacity-20 blur-2xl rounded-full transition-all duration-700 ease-out group-hover:scale-[5] group-hover:opacity-35" />
          </div>

          {/* UX Focus */}
          <div
            className="relative p-6 rounded-2xl border border-neutral-100/10 bg-neutral-900/50 backdrop-blur-sm overflow-hidden group hover:border-neutral-100/20 transition-all duration-500 hover:scale-110 hover:rotate-3 hover:-translate-y-2 hover:rotate-x-6 hover:shadow-xl hover:shadow-rose-500/25"
            style={{ transformStyle: "preserve-3d" }}
          >
            <div className="relative z-10">
              <div className="text-3xl mb-4">✨</div>
              <h3 className="text-2xl font-bold text-white font-mono mb-3">
                Perfect UX
              </h3>
              <p className="text-neutral-300/80 mb-4">
                Intuitive interface designed for developers and non-developers
                alike.
              </p>
            </div>
            <div className="absolute -top-10 -right-10 w-32 h-32 bg-gradient-to-r from-rose-500 to-pink-500 opacity-20 blur-2xl rounded-full transition-all duration-700 ease-out group-hover:scale-[5] group-hover:opacity-35" />
          </div>

          {/* Hugging Face Integration */}
          <div
            className="relative p-6 rounded-2xl border border-neutral-100/10 bg-neutral-900/50 backdrop-blur-sm overflow-hidden group hover:border-neutral-100/20 transition-all duration-500 hover:scale-[1.08] hover:-rotate-2 hover:-translate-y-3 hover:rotate-y-8 hover:shadow-xl hover:shadow-amber-500/20"
            style={{ perspective: "800px" }}
          >
            <div className="relative z-10">
              <div className="text-3xl mb-4">🤗</div>
              <h3 className="text-2xl font-bold text-white font-mono mb-3">
                Hugging Face
              </h3>
              <p className="text-neutral-300/80 mb-4">
                Seamless integration with Hugging Face models and datasets for
                cutting-edge AI capabilities.
              </p>
            </div>
            <div className="absolute -top-10 -right-10 w-32 h-32 bg-gradient-to-r from-yellow-500 to-amber-500 opacity-20 blur-2xl rounded-full transition-all duration-700 ease-out group-hover:scale-[5] group-hover:opacity-35" />
          </div>

          {/* Performance */}
          <div
            className="relative p-6 rounded-2xl border border-neutral-100/10 bg-neutral-900/50 backdrop-blur-sm overflow-hidden group hover:border-neutral-100/20 transition-all duration-500 hover:scale-105 hover:rotate-1 hover:-translate-y-4 hover:rotate-x-8 hover:shadow-2xl hover:shadow-blue-500/25"
            style={{ transformStyle: "preserve-3d" }}
          >
            <div className="relative z-10">
              <div className="text-3xl mb-4">🚀</div>
              <h3 className="text-2xl font-bold text-white font-mono mb-3">
                Blazing Fast
              </h3>
              <p className="text-neutral-300/80 mb-4">
                Optimized performance with edge computing and smart caching.
              </p>
            </div>
            <div className="absolute -bottom-10 -right-10 w-32 h-32 bg-gradient-to-r from-blue-500 to-cyan-500 opacity-20 blur-2xl rounded-full transition-all duration-700 ease-out group-hover:scale-[5] group-hover:opacity-35" />
          </div>
        </div>
      </div>
    </section>
  );
};
