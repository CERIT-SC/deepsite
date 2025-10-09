"use client";

import { useRef, useState, useEffect, forwardRef } from "react";
import { useUpdateEffect } from "react-use";
import classNames from "classnames";

import { cn } from "@/lib/utils";
import { GridPattern } from "@/components/magic-ui/grid-pattern";
import { useEditor } from "@/hooks/useEditor";
import { useAi } from "@/hooks/useAi";
import { htmlTagToText } from "@/lib/html-tag-to-text";
import { AnimatedBlobs } from "@/components/animated-blobs";
import { AiLoading } from "../ask-ai/loading";
import { defaultHTML } from "@/lib/consts";
import { Button } from "@/components/ui/button";
import { LivePreview, LivePreviewRef } from "../live-preview";
import { HistoryNotification } from "../history-notification";
import { AlertCircle } from "lucide-react";
import { api } from "@/lib/api";
import { toast } from "sonner";
import Loading from "@/components/loading";

export const Preview = forwardRef<LivePreviewRef, { isNew: boolean }>(
  ({ isNew }, ref) => {
    const {
      project,
      device,
      isLoadingProject,
      currentTab,
      currentCommit,
      setCurrentCommit,
      currentPageData,
      pages,
      setPages,
      setCurrentPage,
      isSameHtml,
    } = useEditor();
    const {
      isEditableModeEnabled,
      setSelectedElement,
      isAiWorking,
      globalAiLoading,
    } = useAi();

    const iframeRef = useRef<HTMLIFrameElement>(null);

    const [hoveredElement, setHoveredElement] = useState<{
      tagName: string;
      rect: { top: number; left: number; width: number; height: number };
    } | null>(null);
    const [isPromotingVersion, setIsPromotingVersion] = useState(false);
    const [stableHtml, setStableHtml] = useState<string>("");

    useEffect(() => {
      if (!isAiWorking && !globalAiLoading && currentPageData?.html) {
        setStableHtml(currentPageData.html);
      }
    }, [isAiWorking, globalAiLoading, currentPageData?.html]);

    useEffect(() => {
      if (
        currentPageData?.html &&
        !stableHtml &&
        !isAiWorking &&
        !globalAiLoading
      ) {
        setStableHtml(currentPageData.html);
      }
    }, [currentPageData?.html, stableHtml, isAiWorking, globalAiLoading]);

    useUpdateEffect(() => {
      const cleanupListeners = () => {
        if (iframeRef?.current?.contentDocument) {
          const iframeDocument = iframeRef.current.contentDocument;
          iframeDocument.removeEventListener("mouseover", handleMouseOver);
          iframeDocument.removeEventListener("mouseout", handleMouseOut);
          iframeDocument.removeEventListener("click", handleClick);
        }
      };

      if (iframeRef?.current) {
        const iframeDocument = iframeRef.current.contentDocument;
        if (iframeDocument) {
          cleanupListeners();

          if (isEditableModeEnabled) {
            iframeDocument.addEventListener("mouseover", handleMouseOver);
            iframeDocument.addEventListener("mouseout", handleMouseOut);
            iframeDocument.addEventListener("click", handleClick);
          }
        }
      }

      return cleanupListeners;
    }, [iframeRef, isEditableModeEnabled]);

    const promoteVersion = async () => {
      setIsPromotingVersion(true);
      await api
        .post(
          `/me/projects/${project?.space_id}/commits/${currentCommit}/promote`
        )
        .then((res) => {
          if (res.data.ok) {
            setCurrentCommit(null);
            setPages(res.data.pages);
            setCurrentPage(res.data.pages[0].path);
            toast.success("Version promoted successfully");
          }
        })
        .catch((err) => {
          toast.error(err.response.data.error);
        });
      setIsPromotingVersion(false);
    };

    const handleMouseOver = (event: MouseEvent) => {
      if (iframeRef?.current) {
        const iframeDocument = iframeRef.current.contentDocument;
        if (iframeDocument) {
          const targetElement = event.target as HTMLElement;
          if (
            hoveredElement?.tagName !== targetElement.tagName ||
            hoveredElement?.rect.top !==
              targetElement.getBoundingClientRect().top ||
            hoveredElement?.rect.left !==
              targetElement.getBoundingClientRect().left ||
            hoveredElement?.rect.width !==
              targetElement.getBoundingClientRect().width ||
            hoveredElement?.rect.height !==
              targetElement.getBoundingClientRect().height
          ) {
            if (targetElement !== iframeDocument.body) {
              const rect = targetElement.getBoundingClientRect();
              setHoveredElement({
                tagName: targetElement.tagName,
                rect: {
                  top: rect.top,
                  left: rect.left,
                  width: rect.width,
                  height: rect.height,
                },
              });
              targetElement.classList.add("hovered-element");
            } else {
              return setHoveredElement(null);
            }
          }
        }
      }
    };
    const handleMouseOut = () => {
      setHoveredElement(null);
    };
    const handleClick = (event: MouseEvent) => {
      if (iframeRef?.current) {
        const iframeDocument = iframeRef.current.contentDocument;
        if (iframeDocument) {
          const targetElement = event.target as HTMLElement;
          if (targetElement !== iframeDocument.body) {
            setSelectedElement(targetElement);
          }
        }
      }
    };

    const handleCustomNavigation = (event: MouseEvent) => {
      if (iframeRef?.current) {
        const iframeDocument = iframeRef.current.contentDocument;
        if (iframeDocument) {
          const findClosestAnchor = (
            element: HTMLElement
          ): HTMLAnchorElement | null => {
            let current = element;
            while (current && current !== iframeDocument.body) {
              if (current.tagName === "A") {
                return current as HTMLAnchorElement;
              }
              current = current.parentElement as HTMLElement;
            }
            return null;
          };

          const anchorElement = findClosestAnchor(event.target as HTMLElement);
          if (anchorElement) {
            let href = anchorElement.getAttribute("href");
            if (href) {
              event.stopPropagation();
              event.preventDefault();

              if (href.includes("#") && !href.includes(".html")) {
                const targetElement = iframeDocument.querySelector(href);
                if (targetElement) {
                  targetElement.scrollIntoView({ behavior: "smooth" });
                }
                return;
              }

              href = href.split(".html")[0] + ".html";
              const isPageExist = pages.some((page) => page.path === href);
              if (isPageExist) {
                setCurrentPage(href);
              }
            }
          }
        }
      }
    };

    return (
      <div
        className={classNames(
          "bg-neutral-900/30 w-full h-[calc(100dvh-57px)] flex flex-col items-center justify-center relative z-1 lg:border-l border-neutral-800",
          {
            "max-lg:h-0 overflow-hidden": currentTab === "chat",
            "max-lg:h-full": currentTab === "preview",
          }
        )}
      >
        <GridPattern
          x={-1}
          y={-1}
          strokeDasharray={"4 2"}
          className={cn(
            "[mask-image:radial-gradient(900px_circle_at_center,white,transparent)] opacity-40"
          )}
        />
        {!isAiWorking && hoveredElement && isEditableModeEnabled && (
          <div
            className="cursor-pointer absolute bg-sky-500/10 border-[2px] border-dashed border-sky-500 rounded-r-lg rounded-b-lg p-3 z-10 pointer-events-none"
            style={{
              top: hoveredElement.rect.top,
              left: hoveredElement.rect.left,
              width: hoveredElement.rect.width,
              height: hoveredElement.rect.height,
            }}
          >
            <span className="bg-sky-500 rounded-t-md text-sm text-neutral-100 px-2 py-0.5 -translate-y-7 absolute top-0 left-0">
              {htmlTagToText(hoveredElement.tagName.toLowerCase())}
            </span>
          </div>
        )}
        {isNew && !isLoadingProject && !globalAiLoading && isSameHtml ? (
          <iframe
            className={classNames(
              "w-full select-none transition-all duration-200 bg-black h-full",
              {
                "lg:max-w-md lg:mx-auto lg:!rounded-[42px] lg:border-[8px] lg:border-neutral-700 lg:shadow-2xl lg:h-[80dvh] lg:max-h-[996px]":
                  device === "mobile",
              }
            )}
            srcDoc={defaultHTML}
          />
        ) : (isNew && globalAiLoading) || isLoadingProject ? (
          <div className="w-full h-full flex items-center justify-center relative">
            <div className="py-10 w-full relative z-1 max-w-3xl mx-auto text-center">
              <AiLoading
                text={isLoadingProject ? "Fetching your project..." : undefined}
                className="flex-col"
              />
              <AnimatedBlobs />
              <AnimatedBlobs />
            </div>
            {!isLoadingProject && (
              <LivePreview
                ref={ref}
                currentPageData={currentPageData}
                isAiWorking={isAiWorking}
                defaultHTML={defaultHTML}
                className="bottom-4 left-4"
              />
            )}
          </div>
        ) : (
          <>
            <iframe
              id="preview-iframe"
              ref={iframeRef}
              className={classNames(
                "w-full select-none transition-all duration-200 bg-black h-full",
                {
                  "lg:max-w-md lg:mx-auto lg:!rounded-[42px] lg:border-[8px] lg:border-neutral-700 lg:shadow-2xl lg:h-[80dvh] lg:max-h-[996px]":
                    device === "mobile",
                }
              )}
              src={
                currentCommit
                  ? `${window.location.origin}/spaces/${project.space_id}/${currentCommit}`
                  : undefined
              }
              srcDoc={!currentCommit ? stableHtml : undefined}
              onLoad={
                !currentCommit
                  ? () => {
                      if (iframeRef?.current?.contentWindow?.document?.body) {
                        iframeRef.current.contentWindow.document.body.scrollIntoView(
                          {
                            block: isAiWorking ? "end" : "start",
                            inline: "nearest",
                            behavior: isAiWorking ? "instant" : "smooth",
                          }
                        );
                      }
                      // add event listener to all links in the iframe to handle navigation
                      if (iframeRef?.current?.contentWindow?.document) {
                        const links =
                          iframeRef.current.contentWindow.document.querySelectorAll(
                            "a"
                          );
                        links.forEach((link) => {
                          link.addEventListener(
                            "click",
                            handleCustomNavigation
                          );
                        });
                      }
                    }
                  : undefined
              }
              sandbox="allow-scripts allow-same-origin allow-popups allow-popups-to-escape-sandbox"
              allow="accelerometer; ambient-light-sensor; autoplay; battery; camera; clipboard-read; clipboard-write; display-capture; document-domain; encrypted-media; fullscreen; geolocation; gyroscope; layout-animations; legacy-image-formats; magnetometer; microphone; midi; oversized-images; payment; picture-in-picture; publickey-credentials-get; serial; sync-xhr; usb; vr ; wake-lock; xr-spatial-tracking"
            />
            <div
              className={classNames(
                "w-full h-full flex items-center justify-center absolute left-0 top-0 bg-black/40 backdrop-blur-lg transition-all duration-200",
                {
                  "opacity-0 pointer-events-none": !globalAiLoading,
                }
              )}
            >
              <div className="py-10 w-full relative z-1 max-w-3xl mx-auto text-center">
                <AiLoading
                  text={
                    isLoadingProject ? "Fetching your project..." : undefined
                  }
                  className="flex-col"
                />
                <AnimatedBlobs />
                <AnimatedBlobs />
              </div>
            </div>
            <HistoryNotification
              isVisible={!!currentCommit}
              isPromotingVersion={isPromotingVersion}
              onPromoteVersion={promoteVersion}
              onGoBackToCurrent={() => setCurrentCommit(null)}
            />
          </>
        )}
      </div>
    );
  }
);

Preview.displayName = "Preview";
