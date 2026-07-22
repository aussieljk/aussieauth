import type { ComponentType } from "react";
import ClassicStack from "./01-classic-stack";
import CommandPalette from "./02-command-palette";
import CategoryTabs from "./03-category-tabs";
import SplitScreen from "./04-split-screen";
import LauncherGrid from "./05-launcher-grid";
import AccordionAuth from "./06-accordion";
import WalletFirst from "./07-wallet-first";
import TerminalAuth from "./08-terminal";
import Stepper from "./09-stepper";
import Bento from "./10-bento";

export type Variant = {
  id: string;
  name: string;
  /** One line on what this layout is actually for. */
  tagline: string;
  Component: ComponentType;
};

export const VARIANTS: Variant[] = [
  {
    id: "classic",
    name: "Classic Stack",
    tagline: "Social on top, password in the middle, long tail behind a toggle",
    Component: ClassicStack,
  },
  {
    id: "palette",
    name: "Command Palette",
    tagline: "⌘K search across every method — nothing is buried",
    Component: CommandPalette,
  },
  {
    id: "tabs",
    name: "Category Tabs",
    tagline: "Pick a family of login first, then the specific method",
    Component: CategoryTabs,
  },
  {
    id: "split",
    name: "Split Screen",
    tagline: "Brand panel left, fast form right, icon rail for the rest",
    Component: SplitScreen,
  },
  {
    id: "launcher",
    name: "Launcher Grid",
    tagline: "Equal-billing tiles that open a focused dialog",
    Component: LauncherGrid,
  },
  {
    id: "accordion",
    name: "Accordion",
    tagline: "Every method visible as a row, expanding in place",
    Component: AccordionAuth,
  },
  {
    id: "wallet",
    name: "Wallet First",
    tagline: "For products where the chain account is the account",
    Component: WalletFirst,
  },
  {
    id: "terminal",
    name: "Terminal",
    tagline: "Auth as a CLI — the natural framing for agent auth",
    Component: TerminalAuth,
  },
  {
    id: "stepper",
    name: "Stepper",
    tagline: "One method per screen, carousel-style onboarding",
    Component: Stepper,
  },
  {
    id: "bento",
    name: "Bento Board",
    tagline: "Tile size encodes how strongly we recommend each method",
    Component: Bento,
  },
];
