import { useQuery, useQueryClient, useMutation } from "@tanstack/react-query";
import { useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { useLocalStorage } from "react-use";

import { MODELS } from "@/lib/providers";
import { useEditor } from "./useEditor";
import { Page, EnhancedSettings } from "@/types";
import { api } from "@/lib/api";
import { useRouter } from "next/navigation";
import { useUser } from "./useUser";
import { LivePreviewRef } from "@/components/editor/live-preview";

export const useAi = (onScrollToBottom?: () => void, livePreviewRef?: React.RefObject<LivePreviewRef | null>) => {
  const client = useQueryClient();
  const audio = useRef<HTMLAudioElement | null>(null);
  const { setPages, setCurrentPage, setPrompts, prompts, pages, project, setProject, commits, setCommits, setLastSavedPages, isSameHtml } = useEditor();
  const [controller, setController] = useState<AbortController | null>(null);
  const [storageProvider, setStorageProvider] = useLocalStorage("provider", "auto");
  const [storageModel, setStorageModel] = useLocalStorage("model", MODELS[0].value);
  const router = useRouter();
  const { projects, setProjects } = useUser();

  const { data: isAiWorking = false } = useQuery({
    queryKey: ["ai.isAiWorking"],
    queryFn: async () => false,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
    refetchOnMount: false,
  });
  const setIsAiWorking = (newIsAiWorking: boolean) => {
    client.setQueryData(["ai.isAiWorking"], newIsAiWorking);
  };

  const { data: isThinking = false } = useQuery({
    queryKey: ["ai.isThinking"],
    queryFn: async () => false,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
    refetchOnMount: false,
  });
  const setIsThinking = (newIsThinking: boolean) => {
    client.setQueryData(["ai.isThinking"], newIsThinking);
  };

  const { data: selectedElement } = useQuery<HTMLElement | null>({
    queryKey: ["ai.selectedElement"],
    queryFn: async () => null,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
    refetchOnMount: false,
    initialData: null
  });
  const setSelectedElement = (newSelectedElement: HTMLElement | null) => {
    client.setQueryData(["ai.selectedElement"], newSelectedElement);
  };

  const { data: isEditableModeEnabled = false } = useQuery({
    queryKey: ["ai.isEditableModeEnabled"],
    queryFn: async () => false,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
    refetchOnMount: false,
  });
  const setIsEditableModeEnabled = (newIsEditableModeEnabled: boolean) => {
    client.setQueryData(["ai.isEditableModeEnabled"], newIsEditableModeEnabled);
  };

  const { data: selectedFiles } = useQuery<string[]>({
    queryKey: ["ai.selectedFiles"],
    queryFn: async () => [],
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
    refetchOnMount: false,
    initialData: []
  });
  const setSelectedFiles = (newFiles: string[]) => {
    client.setQueryData(["ai.selectedFiles"], newFiles)
  };

  const { data: provider } = useQuery({
    queryKey: ["ai.provider"],
    queryFn: async () => storageProvider ?? "auto",
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
    refetchOnMount: false,
    initialData: storageProvider ?? "auto"
  });
  const setProvider = (newProvider: string) => {
    setStorageProvider(newProvider);
    client.setQueryData(["ai.provider"], newProvider);
  };

  const { data: model } = useQuery({
    queryKey: ["ai.model"],
    queryFn: async () => {
      // check if the model exist in the MODELS array
      const selectedModel = MODELS.find(m => m.value === storageModel || m.label === storageModel);
      if (selectedModel) {
        return selectedModel.value;
      }
      return MODELS[0].value;
    },
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
    refetchOnMount: false,
    initialData: undefined,
  });
  const setModel = (newModel: string) => {
    setStorageModel(newModel);
    client.setQueryData(["ai.model"], newModel);
  };

  const createNewProject = async (prompt: string, htmlPages: Page[], projectName: string | undefined, isLoggedIn?: boolean) => {
    if (isLoggedIn) {
      const response = await api.post("/me/projects", {
        title: projectName,
        pages: htmlPages,
        prompt,
      });
      if (response.data.ok) {
        setIsAiWorking(false);
        // Reset live preview when project is created
        if (livePreviewRef?.current) {
          livePreviewRef.current.reset();
        }
        router.replace(`/${response.data.space.project.space_id}`);
        setProject(response.data.space);
        setProjects([...projects, response.data.space]);
        toast.success("AI responded successfully");
        if (audio.current) audio.current.play();
      }
    } else {
      setIsAiWorking(false);
      if (livePreviewRef?.current) {
        livePreviewRef.current.reset();
      }
      toast.success("AI responded successfully");
      if (audio.current) audio.current.play();
    }
  }
  
  const callAiNewProject = async (prompt: string, enhancedSettings?: EnhancedSettings, redesignMarkdown?: string, isLoggedIn?: boolean) => {
    if (isAiWorking) return;
    if (!redesignMarkdown && !prompt.trim()) return;
    
    setIsAiWorking(true);
    
    const abortController = new AbortController();
    setController(abortController);
    
    try {
      const request = await fetch("/api/ask", {
        method: "POST",
        body: JSON.stringify({
          prompt,
          provider,
          model,
          redesignMarkdown,
          enhancedSettings,
        }),
        headers: {
          "Content-Type": "application/json",
          "x-forwarded-for": window.location.hostname,
        },
        signal: abortController.signal,
      });

      if (request && request.body) {
        const reader = request.body.getReader();
        const decoder = new TextDecoder("utf-8");
        let contentResponse = "";

        const read = async (): Promise<any> => {
          const { done, value } = await reader.read();
          
          if (done) {
            const trimmedResponse = contentResponse.trim();
            if (trimmedResponse.startsWith("{") && trimmedResponse.endsWith("}")) {
              try {
                const jsonResponse = JSON.parse(trimmedResponse);
                if (jsonResponse && !jsonResponse.ok) {
                  setIsAiWorking(false);
                  if (jsonResponse.openLogin) {
                    return { error: "login_required" };
                  } else if (jsonResponse.openSelectProvider) {
                    return { error: "provider_required", message: jsonResponse.message };
                  } else if (jsonResponse.openProModal) {
                    return { error: "pro_required" };
                  } else {
                    toast.error(jsonResponse.message);
                    return { error: "api_error", message: jsonResponse.message };
                  }
                }
              } catch (e) {
                // Not valid JSON, treat as normal content
              }
            }
            
            const newPages = formatPages(contentResponse);
            const projectName = contentResponse.match(/<<<<<<< PROJECT_NAME_START ([\s\S]*?) >>>>>>> PROJECT_NAME_END/)?.[1]?.trim();
            setPages(newPages);
            setLastSavedPages([...newPages]); // Mark initial pages as saved
            createNewProject(prompt, newPages, projectName, isLoggedIn);
            setPrompts([...prompts, prompt]);

            return { success: true, pages: newPages };
          }

          const chunk = decoder.decode(value, { stream: true });
          contentResponse += chunk;
          
          const trimmedResponse = contentResponse.trim();
          if (trimmedResponse.startsWith("{") && trimmedResponse.endsWith("}")) {
            try {
              const jsonResponse = JSON.parse(trimmedResponse);
              if (jsonResponse && !jsonResponse.ok) {
                setIsAiWorking(false);
                if (jsonResponse.openLogin) {
                  return { error: "login_required" };
                } else if (jsonResponse.openSelectProvider) {
                  return { error: "provider_required", message: jsonResponse.message };
                } else if (jsonResponse.openProModal) {
                  return { error: "pro_required" };
                } else {
                  toast.error(jsonResponse.message);
                  return { error: "api_error", message: jsonResponse.message };
                }
              }
            } catch (e) {
              // Not a complete JSON yet, continue reading
            }
          }

          formatPages(contentResponse);
          
          // Continue reading
          return read();
        };

        return await read();
      }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } catch (error: any) {
      setIsAiWorking(false);
      setIsThinking(false);
      setController(null);
      
      if (!abortController.signal.aborted) {
        toast.error(error.message || "Network error occurred");
      }
      
      if (error.openLogin) {
        return { error: "login_required" };
      }
      return { error: "network_error", message: error.message };
    }
  };

  const callAiFollowUp = async (prompt: string, enhancedSettings?: EnhancedSettings, isNew?: boolean) => {
    if (isAiWorking) return;
    if (!prompt.trim()) return;

    
    setIsAiWorking(true);
    
    const abortController = new AbortController();
    setController(abortController);
    
    try {
      const request = await fetch("/api/ask", {
        method: "PUT",
        body: JSON.stringify({
          prompt,
          provider,
          previousPrompts: prompts,
          model,
          pages,
          selectedElementHtml: selectedElement?.outerHTML,
          files: selectedFiles,
          repoId: project?.space_id,
          isNew,
          enhancedSettings,
        }),
        headers: {
          "Content-Type": "application/json",
          "x-forwarded-for": window.location.hostname,
        },
        signal: abortController.signal,
      });

      if (request && request.body) {
        const res = await request.json();
        
        if (!request.ok) {
          if (res.openLogin) {
            setIsAiWorking(false);
            return { error: "login_required" };
          } else if (res.openSelectProvider) {
            setIsAiWorking(false);
            return { error: "provider_required", message: res.message };
          } else if (res.openProModal) {
            setIsAiWorking(false);
            return { error: "pro_required" };
          } else {
            toast.error(res.message);
            setIsAiWorking(false);
            return { error: "api_error", message: res.message };
          }
        }

        toast.success("AI responded successfully");
        const iframe = document.getElementById(
          "preview-iframe"
        ) as HTMLIFrameElement;

        if (isNew && res.repoId) {
          router.push(`/${res.repoId}`);
          setIsAiWorking(false);
        } else {
          setPages(res.pages);
          setLastSavedPages([...res.pages]); // Mark AI changes as saved
          setCommits([res.commit, ...commits]);
          setPrompts(
            [...prompts, prompt]
          )
          setSelectedElement(null);
          setSelectedFiles([]);
          setIsEditableModeEnabled(false);
          setIsAiWorking(false); // This was missing!
        }

        if (audio.current) audio.current.play();
        if (iframe) {
          setTimeout(() => {
            iframe.src = iframe.src;
          }, 500);
        }

        return { success: true, html: res.html, updatedLines: res.updatedLines };
      }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } catch (error: any) {
      setIsAiWorking(false);
      toast.error(error.message);
      if (error.openLogin) {
        return { error: "login_required" };
      }
      return { error: "network_error", message: error.message };
    }
  };

  const formatPages = (content: string) => {
    const pages: Page[] = [];
    if (!content.match(/<<<<<<< START_TITLE (.*?) >>>>>>> END_TITLE/)) {
      return pages;
    }

    const cleanedContent = content.replace(
      /[\s\S]*?<<<<<<< START_TITLE (.*?) >>>>>>> END_TITLE/,
      "<<<<<<< START_TITLE $1 >>>>>>> END_TITLE"
    );
    const htmlChunks = cleanedContent.split(
      /<<<<<<< START_TITLE (.*?) >>>>>>> END_TITLE/
    );
    const processedChunks = new Set<number>();

    htmlChunks.forEach((chunk, index) => {
      if (processedChunks.has(index) || !chunk?.trim()) {
        return;
      }
      const htmlContent = extractHtmlContent(htmlChunks[index + 1]);

      if (htmlContent) {
        const page: Page = {
          path: chunk.trim(),
          html: htmlContent,
        };
        pages.push(page);

        if (htmlContent.length > 200) {
          onScrollToBottom?.();
        }

        processedChunks.add(index);
        processedChunks.add(index + 1);
      }
    });
    if (pages.length > 0) {
      setPages(pages);
      const lastPagePath = pages[pages.length - 1]?.path;
      setCurrentPage(lastPagePath || "index.html");
    }

    return pages;
  };

  const formatPage = (content: string, currentPagePath: string) => {
    if (!content.match(/<<<<<<< START_TITLE (.*?) >>>>>>> END_TITLE/)) {
      return null;
    }

    const cleanedContent = content.replace(
      /[\s\S]*?<<<<<<< START_TITLE (.*?) >>>>>>> END_TITLE/,
      "<<<<<<< START_TITLE $1 >>>>>>> END_TITLE"
    );

    const htmlChunks = cleanedContent.split(
      /<<<<<<< START_TITLE (.*?) >>>>>>> END_TITLE/
    )?.filter(Boolean);

    const pagePath = htmlChunks[0]?.trim() || "";
    const htmlContent = extractHtmlContent(htmlChunks[1]);

    if (!pagePath || !htmlContent) {
      return null;
    }

    const page: Page = {
      path: pagePath,
      html: htmlContent,
    };

    setPages(prevPages => {
      const existingPageIndex = prevPages.findIndex(p => p.path === currentPagePath || p.path === pagePath);
      
      if (existingPageIndex !== -1) {
        const updatedPages = [...prevPages];
        updatedPages[existingPageIndex] = page;
        return updatedPages;
      } else {
        return [...prevPages, page];
      }
    });

    setCurrentPage(pagePath);

    if (htmlContent.length > 200) {
      onScrollToBottom?.();
    }

    return page;
  };

  const extractHtmlContent = (chunk: string): string => {
    if (!chunk) return "";
    const htmlMatch = chunk.trim().match(/<!DOCTYPE html>[\s\S]*/);
    if (!htmlMatch) return "";
    let htmlContent = htmlMatch[0];
    htmlContent = ensureCompleteHtml(htmlContent);
    htmlContent = htmlContent.replace(/```/g, "");
    return htmlContent;
  };

  const ensureCompleteHtml = (html: string): string => {
    let completeHtml = html;
    if (completeHtml.includes("<head>") && !completeHtml.includes("</head>")) {
      completeHtml += "\n</head>";
    }
    if (completeHtml.includes("<body") && !completeHtml.includes("</body>")) {
      completeHtml += "\n</body>";
    }
    if (!completeHtml.includes("</html>")) {
      completeHtml += "\n</html>";
    }
    return completeHtml;
  };

  const cancelRequest = () => {
    if (controller) {
      controller.abort();
      setController(null);
    }
    setIsAiWorking(false);
    setIsThinking(false);
    // Reset live preview when request is aborted
    if (livePreviewRef?.current) {
      livePreviewRef.current.reset();
    }
  };

  const selectedModel = useMemo(() => {
    return MODELS.find(m => m.value === model || m.label === model);
  }, [model]);

  return {
    isThinking,
    setIsThinking,
    callAiNewProject,
    callAiFollowUp,
    isAiWorking,
    setIsAiWorking,
    selectedElement,
    setSelectedElement,
    selectedFiles,
    setSelectedFiles,
    isEditableModeEnabled,
    setIsEditableModeEnabled,
    globalAiLoading: isThinking || isAiWorking,
    cancelRequest,
    model,
    setModel,
    provider,
    setProvider,
    selectedModel,
    audio,
  };
}