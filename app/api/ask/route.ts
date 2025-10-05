/* eslint-disable @typescript-eslint/no-explicit-any */
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { headers } from "next/headers";
import { InferenceClient } from "@huggingface/inference";

import { MODELS } from "@/lib/providers";
import {
  DIVIDER,
  FOLLOW_UP_SYSTEM_PROMPT,
  INITIAL_SYSTEM_PROMPT,
  MAX_REQUESTS_PER_IP,
  NEW_PAGE_END,
  NEW_PAGE_START,
  REPLACE_END,
  SEARCH_START,
  UPDATE_PAGE_START,
  UPDATE_PAGE_END,
  PROMPT_FOR_PROJECT_NAME,
} from "@/lib/prompts";
import { calculateMaxTokens, estimateInputTokens, getProviderSpecificConfig } from "@/lib/max-tokens";
import MY_TOKEN_KEY from "@/lib/get-cookie-name";
import { Page } from "@/types";
import { createRepo, RepoDesignation, uploadFiles } from "@huggingface/hub";
import { isAuthenticated } from "@/lib/auth";
import { getBestProvider } from "@/lib/best-provider";
// import { rewritePrompt } from "@/lib/rewrite-prompt";
import { COLORS } from "@/lib/utils";
import { templates } from "@/lib/templates";

const ipAddresses = new Map();

export async function POST(request: NextRequest) {
  const authHeaders = await headers();
  const userToken = request.cookies.get(MY_TOKEN_KEY())?.value;

  const body = await request.json();
  const { prompt, provider, model, redesignMarkdown, enhancedSettings, pages } = body;

  if (!model || (!prompt && !redesignMarkdown)) {
    return NextResponse.json(
      { ok: false, error: "Missing required fields" },
      { status: 400 }
    );
  }

  const selectedModel = MODELS.find(
    (m) => m.value === model || m.label === model
  );

  if (!selectedModel) {
    return NextResponse.json(
      { ok: false, error: "Invalid model selected" },
      { status: 400 }
    );
  }

  let token: string | null = null;
  if (userToken) token = userToken;
  let billTo: string | null = null;

  /**
   * Handle local usage token, this bypass the need for a user token
   * and allows local testing without authentication.
   * This is useful for development and testing purposes.
   */
  if (process.env.HF_TOKEN && process.env.HF_TOKEN.length > 0) {
    token = process.env.HF_TOKEN;
  }

  const ip = authHeaders.get("x-forwarded-for")?.includes(",")
    ? authHeaders.get("x-forwarded-for")?.split(",")[1].trim()
    : authHeaders.get("x-forwarded-for");

  if (!token) {
    ipAddresses.set(ip, (ipAddresses.get(ip) || 0) + 1);
    if (ipAddresses.get(ip) > MAX_REQUESTS_PER_IP) {
      return NextResponse.json(
        {
          ok: false,
          openLogin: true,
          message: "Log In to continue using the service",
        },
        { status: 429 }
      );
    }

    token = process.env.DEFAULT_HF_TOKEN as string;
    billTo = "huggingface";
  }

  const selectedProvider = await getBestProvider(selectedModel.value, provider)

  let rewrittenPrompt = redesignMarkdown ? `Here is my current design as a markdown:\n\n${redesignMarkdown}\n\nNow, please create a new design based on this markdown. Use the images in the markdown.` : prompt;

  if (enhancedSettings.isActive) {
    // rewrittenPrompt = await rewritePrompt(rewrittenPrompt, enhancedSettings, { token, billTo }, selectedModel.value, selectedProvider.provider);
  }

  try {
    const encoder = new TextEncoder();
    const stream = new TransformStream();
    const writer = stream.writable.getWriter();

    const response = new NextResponse(stream.readable, {
      headers: {
        "Content-Type": "text/plain; charset=utf-8",
        "Cache-Control": "no-cache",
        Connection: "keep-alive",
      },
    });

    (async () => {
      // let completeResponse = "";
      try {
        const client = new InferenceClient(token);
        
        const systemPrompt = INITIAL_SYSTEM_PROMPT;
        
        const userPrompt = rewrittenPrompt;
        const estimatedInputTokens = estimateInputTokens(systemPrompt, userPrompt);
        const dynamicMaxTokens = calculateMaxTokens(selectedProvider, estimatedInputTokens, true);
        const providerConfig = getProviderSpecificConfig(selectedProvider, dynamicMaxTokens);
        
        const chatCompletion = client.chatCompletionStream(
          {
            model: selectedModel.value,
            provider: selectedProvider.provider,
            messages: [
              {
                role: "system",
                content: systemPrompt,
              },
              {
                role: "user",
                content: userPrompt + (enhancedSettings.isActive ? `1. I want to use the following primary color: ${enhancedSettings.primaryColor} (eg: bg-${enhancedSettings.primaryColor}-500).
2. I want to use the following secondary color: ${enhancedSettings.secondaryColor} (eg: bg-${enhancedSettings.secondaryColor}-500).
3. I want to use the following theme: ${enhancedSettings.theme} mode.` : "")
              },
            ],
            ...providerConfig,
          },
          billTo ? { billTo } : {}
        );

        while (true) {
          const { done, value } = await chatCompletion.next()
          if (done) {
            break;
          }

          const chunk = value.choices[0]?.delta?.content;
          if (chunk) {
            await writer.write(encoder.encode(chunk));
          }
        }
        
        // Explicitly close the writer after successful completion
        await writer.close();
      } catch (error: any) {
        if (error.message?.includes("exceeded your monthly included credits")) {
          await writer.write(
            encoder.encode(
              JSON.stringify({
                ok: false,
                openProModal: true,
                message: error.message,
              })
            )
          );
        } else if (error?.message?.includes("inference provider information")) {
          await writer.write(
            encoder.encode(
              JSON.stringify({
                ok: false,
                openSelectProvider: true,
                message: error.message,
              })
            )
          );
        }
        else {
          await writer.write(
            encoder.encode(
              JSON.stringify({
                ok: false,
                message:
                  error.message ||
                  "An error occurred while processing your request.",
              })
            )
          );
        }
      } finally {
        // Ensure the writer is always closed, even if already closed
        try {
          await writer?.close();
        } catch {
          // Ignore errors when closing the writer as it might already be closed
        }
      }
    })();

    return response;
  } catch (error: any) {
    return NextResponse.json(
      {
        ok: false,
        openSelectProvider: true,
        message:
          error?.message || "An error occurred while processing your request.",
      },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest) {
  const user = await isAuthenticated();
  if (user instanceof NextResponse || !user) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  const authHeaders = await headers();

  const body = await request.json();
  const { prompt, previousPrompts, provider, selectedElementHtml, model, pages, files, repoId: repoIdFromBody, isNew, enhancedSettings } =
    body;

  let repoId = repoIdFromBody;

  if (!prompt || pages.length === 0) {
    return NextResponse.json(
      { ok: false, error: "Missing required fields" },
      { status: 400 }
    );
  }

  const selectedModel = MODELS.find(
    (m) => m.value === model || m.label === model
  );
  if (!selectedModel) {
    return NextResponse.json(
      { ok: false, error: "Invalid model selected" },
      { status: 400 }
    );
  }

  let token = user.token as string;
  let billTo: string | null = null;

  /**
   * Handle local usage token, this bypass the need for a user token
   * and allows local testing without authentication.
   * This is useful for development and testing purposes.
   */
  if (process.env.HF_TOKEN && process.env.HF_TOKEN.length > 0) {
    token = process.env.HF_TOKEN;
  }

  const ip = authHeaders.get("x-forwarded-for")?.includes(",")
    ? authHeaders.get("x-forwarded-for")?.split(",")[1].trim()
    : authHeaders.get("x-forwarded-for");

  if (!token) {
    ipAddresses.set(ip, (ipAddresses.get(ip) || 0) + 1);
    if (ipAddresses.get(ip) > MAX_REQUESTS_PER_IP) {
      return NextResponse.json(
        {
          ok: false,
          openLogin: true,
          message: "Log In to continue using the service",
        },
        { status: 429 }
      );
    }

    token = process.env.DEFAULT_HF_TOKEN as string;
    billTo = "huggingface";
  }

  const client = new InferenceClient(token);

  const escapeRegExp = (string: string) => {
    return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  };

  const createFlexibleHtmlRegex = (searchBlock: string) => {
    let searchRegex = escapeRegExp(searchBlock)
      .replace(/\s+/g, '\\s*')
      .replace(/>\s*</g, '>\\s*<')
      .replace(/\s*>/g, '\\s*>');
    
    return new RegExp(searchRegex, 'g');
  };

  const selectedProvider = await getBestProvider(selectedModel.value, provider)

  try {
    const systemPrompt = FOLLOW_UP_SYSTEM_PROMPT + (isNew ? PROMPT_FOR_PROJECT_NAME : "");
    const userContext = "You are modifying the HTML file based on the user's request.";
    
    // Send all pages without filtering
    const allPages = pages || [];
    const pagesContext = allPages
      .map((p: Page) => `- ${p.path}\n${p.html}`)
      .join("\n\n");
    
    const assistantContext = `${
      selectedElementHtml
        ? `\n\nYou have to update ONLY the following element, NOTHING ELSE: \n\n\`\`\`html\n${selectedElementHtml}\n\`\`\` Could be in multiple pages, if so, update all the pages.`
        : ""
    }. Current pages (${allPages.length} total): ${pagesContext}. ${files?.length > 0 ? `Available images: ${files?.map((f: string) => f).join(', ')}.` : ""}`;
    
    const estimatedInputTokens = estimateInputTokens(systemPrompt, prompt, userContext + assistantContext);
    const dynamicMaxTokens = calculateMaxTokens(selectedProvider, estimatedInputTokens, false);
    const providerConfig = getProviderSpecificConfig(selectedProvider, dynamicMaxTokens);
    
    const chatCompletion = client.chatCompletionStream(
      {
        model: selectedModel.value,
        provider: selectedProvider.provider,
        messages: [
          {
            role: "system",
            content: systemPrompt,
          },
          {
            role: "user",
            content: userContext,
          },
          {
            role: "assistant",
            content: assistantContext,
          },
          {
            role: "user",
            content: prompt,
          },
        ],
        ...providerConfig,
      },
      billTo ? { billTo } : {}
    );

    let chunk = "";
    while (true) {
      const { done, value } = await chatCompletion.next();
      if (done) {
        break;
      }

      const deltaContent = value.choices[0]?.delta?.content;
      if (deltaContent) {
        chunk += deltaContent;
      }
    }
    if (!chunk) {
      return NextResponse.json(
        { ok: false, message: "No content returned from the model" },
        { status: 400 }
      );
    }

    if (chunk) {
      const updatedLines: number[][] = [];
      let newHtml = "";
      const updatedPages = [...(pages || [])];

      const updatePageRegex = new RegExp(`${UPDATE_PAGE_START.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}([^\\s]+)\\s*${UPDATE_PAGE_END.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}([\\s\\S]*?)(?=${UPDATE_PAGE_START.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}|${NEW_PAGE_START.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}|$)`, 'g');
      let updatePageMatch;
      
      while ((updatePageMatch = updatePageRegex.exec(chunk)) !== null) {
        const [, pagePath, pageContent] = updatePageMatch;
        
        const pageIndex = updatedPages.findIndex(p => p.path === pagePath);
        if (pageIndex !== -1) {
          let pageHtml = updatedPages[pageIndex].html;
          
          let processedContent = pageContent;
          const htmlMatch = pageContent.match(/```html\s*([\s\S]*?)\s*```/);
          if (htmlMatch) {
            processedContent = htmlMatch[1];
          }
          let position = 0;
          let moreBlocks = true;

          while (moreBlocks) {
            const searchStartIndex = processedContent.indexOf(SEARCH_START, position);
            if (searchStartIndex === -1) {
              moreBlocks = false;
              continue;
            }

            const dividerIndex = processedContent.indexOf(DIVIDER, searchStartIndex);
            if (dividerIndex === -1) {
              moreBlocks = false;
              continue;
            }

            const replaceEndIndex = processedContent.indexOf(REPLACE_END, dividerIndex);
            if (replaceEndIndex === -1) {
              moreBlocks = false;
              continue;
            }

            const searchBlock = processedContent.substring(
              searchStartIndex + SEARCH_START.length,
              dividerIndex
            );
            const replaceBlock = processedContent.substring(
              dividerIndex + DIVIDER.length,
              replaceEndIndex
            );

            if (searchBlock.trim() === "") {
              pageHtml = `${replaceBlock}\n${pageHtml}`;
              updatedLines.push([1, replaceBlock.split("\n").length]);
            } else {
              const regex = createFlexibleHtmlRegex(searchBlock);
              const match = regex.exec(pageHtml);
              
              if (match) {
                const matchedText = match[0];
                const beforeText = pageHtml.substring(0, match.index);
                const startLineNumber = beforeText.split("\n").length;
                const replaceLines = replaceBlock.split("\n").length;
                const endLineNumber = startLineNumber + replaceLines - 1;

                updatedLines.push([startLineNumber, endLineNumber]);
                pageHtml = pageHtml.replace(matchedText, replaceBlock);
              }
            }

            position = replaceEndIndex + REPLACE_END.length;
          }

          updatedPages[pageIndex].html = pageHtml;
          
          if (pagePath === '/' || pagePath === '/index' || pagePath === 'index') {
            newHtml = pageHtml;
          }
        }
      }

      const newPageRegex = new RegExp(`${NEW_PAGE_START.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}([^\\s]+)\\s*${NEW_PAGE_END.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}([\\s\\S]*?)(?=${UPDATE_PAGE_START.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}|${NEW_PAGE_START.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}|$)`, 'g');
      let newPageMatch;
      
      while ((newPageMatch = newPageRegex.exec(chunk)) !== null) {
        const [, pagePath, pageContent] = newPageMatch;
        
        let pageHtml = pageContent;
        const htmlMatch = pageContent.match(/```html\s*([\s\S]*?)\s*```/);
        if (htmlMatch) {
          pageHtml = htmlMatch[1];
        }
        
        const existingPageIndex = updatedPages.findIndex(p => p.path === pagePath);
        
        if (existingPageIndex !== -1) {
          updatedPages[existingPageIndex] = {
            path: pagePath,
            html: pageHtml.trim()
          };
        } else {
          updatedPages.push({
            path: pagePath,
            html: pageHtml.trim()
          });
        }
      }

      if (updatedPages.length === pages?.length && !chunk.includes(UPDATE_PAGE_START)) {
        let position = 0;
        let moreBlocks = true;

        while (moreBlocks) {
          const searchStartIndex = chunk.indexOf(SEARCH_START, position);
          if (searchStartIndex === -1) {
            moreBlocks = false;
            continue;
          }

          const dividerIndex = chunk.indexOf(DIVIDER, searchStartIndex);
          if (dividerIndex === -1) {
            moreBlocks = false;
            continue;
          }

          const replaceEndIndex = chunk.indexOf(REPLACE_END, dividerIndex);
          if (replaceEndIndex === -1) {
            moreBlocks = false;
            continue;
          }

          const searchBlock = chunk.substring(
            searchStartIndex + SEARCH_START.length,
            dividerIndex
          );
          const replaceBlock = chunk.substring(
            dividerIndex + DIVIDER.length,
            replaceEndIndex
          );

          if (searchBlock.trim() === "") {
            newHtml = `${replaceBlock}\n${newHtml}`;
            updatedLines.push([1, replaceBlock.split("\n").length]);
          } else {
            const regex = createFlexibleHtmlRegex(searchBlock);
            const match = regex.exec(newHtml);
            
            if (match) {
              const matchedText = match[0];
              const beforeText = newHtml.substring(0, match.index);
              const startLineNumber = beforeText.split("\n").length;
              const replaceLines = replaceBlock.split("\n").length;
              const endLineNumber = startLineNumber + replaceLines - 1;

              updatedLines.push([startLineNumber, endLineNumber]);
              newHtml = newHtml.replace(matchedText, replaceBlock);
            }
          }

          position = replaceEndIndex + REPLACE_END.length;
        }

        // Update the main HTML if it's the index page
        const mainPageIndex = updatedPages.findIndex(p => p.path === '/' || p.path === '/index' || p.path === 'index');
        if (mainPageIndex !== -1) {
          updatedPages[mainPageIndex].html = newHtml;
        }
      }

      const files: File[] = [];
      updatedPages.forEach((page: Page) => {
        const file = new File([page.html], page.path, { type: "text/html" });
        files.push(file);
      });

      if (isNew) {
        const projectName = chunk.match(/<<<<<<< PROJECT_NAME_START ([\s\S]*?) >>>>>>> PROJECT_NAME_END/)?.[1]?.trim();
        const formattedTitle = projectName?.toLowerCase()
          .replace(/[^a-z0-9]+/g, "-")
          .split("-")
          .filter(Boolean)
          .join("-")
          .slice(0, 96);
        const repo: RepoDesignation = {
          type: "space",
          name: `${user.name}/${formattedTitle}`,
        };
        const { repoUrl} = await createRepo({
          repo,
          accessToken: user.token as string,
        });
        repoId = repoUrl.split("/").slice(-2).join("/");
        const colorFrom = COLORS[Math.floor(Math.random() * COLORS.length)];
        const colorTo = COLORS[Math.floor(Math.random() * COLORS.length)];
        const README = `---
title: ${projectName}
colorFrom: ${colorFrom}
colorTo: ${colorTo}
emoji: 🐳
sdk: static
pinned: false
tags:
  - deepsite-v3
---

# Welcome to your new DeepSite project!
This project was created with [DeepSite](https://deepsite.hf.co).
      `;
        files.push(new File([README], "README.md", { type: "text/markdown" }));
      }

      const response = await uploadFiles({
        repo: {
          type: "space",
          name: repoId,
        },
        files,
        commitTitle: prompt,
        accessToken: user.token as string,
      });

      return NextResponse.json({
        ok: true,
        updatedLines,
        pages: updatedPages,
        repoId,
        commit: {
          ...response.commit,
          title: prompt,
        }
      });
    } else {
      return NextResponse.json(
        { ok: false, message: "No content returned from the model" },
        { status: 400 }
      );
    }
  } catch (error: any) {
    if (error.message?.includes("exceeded your monthly included credits")) {
      return NextResponse.json(
        {
          ok: false,
          openProModal: true,
          message: error.message,
        },
        { status: 402 }
      );
    }
    return NextResponse.json(
      {
        ok: false,
        openSelectProvider: true,
        message:
          error.message || "An error occurred while processing your request.",
      },
      { status: 500 }
    );
  }
}

