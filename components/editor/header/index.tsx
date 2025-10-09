import { ArrowRight, HelpCircle, RefreshCcw, Lock } from "lucide-react";
import Image from "next/image";
import Link from "next/link";

import Logo from "@/assets/logo.svg";
import { Button } from "@/components/ui/button";
import { useUser } from "@/hooks/useUser";
import { ProTag } from "@/components/pro-modal";
import { UserMenu } from "@/components/user-menu";
import { SwitchDevice } from "@/components/editor/switch-devide";
import { SwitchTab } from "./switch-tab";
import { History } from "@/components/editor/history";
import { useEditor } from "@/hooks/useEditor";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";

export function Header() {
  const { project } = useEditor();
  const { user, openLoginWindow } = useUser();
  return (
    <header className="border-b bg-neutral-950 dark:border-neutral-800 grid grid-cols-3 lg:flex items-center max-lg:gap-3 justify-between z-20">
      <div className="flex items-center justify-between lg:max-w-[600px] lg:w-full py-2 px-2 lg:px-3 lg:pl-6 gap-3">
        <h1 className="text-neutral-900 dark:text-white text-lg lg:text-xl font-bold flex items-center justify-start">
          <Image
            src={Logo}
            alt="DeepSite Logo"
            className="size-8 invert-100 dark:invert-0"
          />
          <p className="ml-2 flex items-center justify-start max-lg:hidden">
            DeepSite
            {user?.isPro ? (
              <ProTag className="ml-2 !text-[10px]" />
            ) : (
              <span className="font-mono bg-gradient-to-r from-sky-500/20 to-sky-500/10 text-sky-500 rounded-full text-xs ml-2 px-1.5 py-0.5 border border-sky-500/20">
                {" "}
                v3
              </span>
            )}
          </p>
        </h1>
        <div className="flex items-center justify-end gap-2">
          <History />
          <SwitchTab />
        </div>
      </div>
      <div className="lg:hidden flex items-center justify-center whitespace-nowrap">
        <SwitchTab isMobile />
      </div>
      <div className="lg:w-full px-2 lg:px-3 py-2 flex items-center justify-end lg:justify-between lg:border-l lg:border-neutral-800">
        <div className="font-mono text-muted-foreground flex items-center gap-2">
          <SwitchDevice />
          <Button
            size="xs"
            variant="bordered"
            className="max-lg:hidden"
            onClick={() => {
              const iframe = document.getElementById(
                "preview-iframe"
              ) as HTMLIFrameElement;
              if (iframe) {
                iframe.src = iframe.src;
              }
            }}
          >
            <RefreshCcw className="size-3 mr-0.5" />
            Refresh Preview
          </Button>
          <Link
            href="https://huggingface.co/spaces/enzostvs/deepsite/discussions/427"
            target="_blank"
            className="max-lg:hidden"
          >
            <Button size="xs" variant="bordered">
              <HelpCircle className="size-3 mr-0.5" />
              Help
            </Button>
          </Link>
        </div>
        <div className="flex items-center gap-2">
          {project?.space_id && (
            <Link
              href={`${window.location.origin}/spaces/${project.space_id}`}
              target="_blank"
            >
              <Button
                size="xs"
                variant="bordered"
                className="flex items-center gap-1 justify-center border-gray-200/20 bg-gray-200/10 text-gray-200 max-lg:hidden"
              >
                See Live Preview
              </Button>
            </Link>
          )}
          {project?.private && (
            <Tooltip>
              <TooltipTrigger>
                <div className="max-lg:hidden flex items-center gap-1.5 bg-amber-500/10 backdrop-blur-sm px-3 py-1.5 rounded-full border border-amber-500/20 shadow-lg">
                  <Lock className="w-3 h-3 text-amber-500" />
                  <span className="text-amber-500 text-xs font-medium tracking-wide">
                    Private Project
                  </span>
                </div>
              </TooltipTrigger>
              <TooltipContent>
                <p className="text-xs">
                  This project is private. Only you can see it.
                </p>
              </TooltipContent>
            </Tooltip>
          )}
          {user ? (
            <UserMenu className="!pl-1 !pr-3 !py-1 !h-auto" />
          ) : (
            <Button size="sm" onClick={openLoginWindow}>
              <span className="max-lg:hidden">Log In to DeepSite</span>
              <span className="lg:hidden">Log In</span>
              <ArrowRight className="size-4" />
            </Button>
          )}
        </div>
      </div>
    </header>
  );
}
