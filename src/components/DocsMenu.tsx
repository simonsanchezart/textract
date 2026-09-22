import { join, resourceDir } from "@tauri-apps/api/path";
import { openPath, openUrl } from "@tauri-apps/plugin-opener";
import { FaBook } from "react-icons/fa";
import { getShortcutModifierLabel } from "@/utils/utils";
import { Button } from "./ui/Button";
import { Tooltip, TooltipContent, TooltipTrigger } from "./ui/Tooltip";

function ShortcutHelper({ shortcut, description }: { shortcut: string; description: string }) {
  return (
    <>
      <span>
        <b>{shortcut}</b>
        {" "}
        -
        <span className="opacity-50">
          {" "}
          {description}
        </span>
      </span>
    </>
  );
}

async function openHelpDoc() {
  const helpPath = await join(await resourceDir(), "resources", "help.html");
  await openPath(helpPath);
}

export default function DocsMenu() {
  const shortcutModifier = getShortcutModifierLabel();

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button
          variant="outline"
          size="icon-xs"
          className="rounded-full cursor-pointer"
          onClick={openHelpDoc}
        >
          <FaBook />
        </Button>
      </TooltipTrigger>

      <TooltipContent className="flex flex-col gap-2">
        <ShortcutHelper shortcut="Shift+A" description="Load Images" />
        <ShortcutHelper shortcut={`${shortcutModifier}+A`} description="Select All" />
        <ShortcutHelper shortcut="Delete" description="Delete Images" />

        <hr />

        <ShortcutHelper shortcut={`${shortcutModifier}+Click`} description="Add Mark Point" />
        <ShortcutHelper shortcut="Shift+Click (on point)" description="Add/Remove From Selection" />
        <ShortcutHelper shortcut="Esc" description="Clear Point Selection" />
        <ShortcutHelper shortcut="Shift+R" description="Convert Marks" />
        <ShortcutHelper shortcut="Alt+Click" description="Delete Mark" />
        <ShortcutHelper shortcut="Space (hold)" description="Quick Zoom" />
        <ShortcutHelper shortcut={`${shortcutModifier}+Z`} description="Undo" />
        <ShortcutHelper shortcut={`Shift+${shortcutModifier}+Z`} description="Redo" />

        <hr />

        <ShortcutHelper shortcut={`${shortcutModifier}+E`} description="Export Atlas" />
        <ShortcutHelper shortcut={`${shortcutModifier}+S`} description="Export Selected" />

        <hr />

        <small>
          <a className="link" onClick={async () => await openUrl("https://www.simonsanchez.art/")}>
            made by simon sanchez
          </a>
          {" "}
          and
          {" "}
          <a
            className="link"
            onClick={async () =>
              await openUrl("https://github.com/simonsanchezart/textract/graphs/contributors")}
          >
            contributors
          </a>
        </small>
      </TooltipContent>
    </Tooltip>
  );
}
