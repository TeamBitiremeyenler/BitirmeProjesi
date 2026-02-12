import { Href } from "expo-router";

export type StaticAnimation = {
  appName: string;
  animationName: string;
  href: Href;
};

export const STATIC_ANIMATIONS: StaticAnimation[] = [
  {
    animationName: "Text strikethrough animation",
    appName: "Superlist",
    href: "/superlist/task",
  },
  {
    animationName: "Stories carousel animation",
    appName: "Instagram",
    href: "/instagram/stories",
  },
  {
    animationName: "Profile segmented control animation",
    appName: "Perplexity",
    href: "/perplexity/profile",
  },
  {
    animationName: "Pull to refresh loading animation",
    appName: "Reddit",
    href: "/reddit/home",
  },
  {
    animationName: "Moving dashed border animation",
    appName: "Opal",
    href: "/opal/blocks",
  },
  {
    animationName: "Onboarding flow animation",
    appName: "Superlist",
    href: "/superlist/onboarding",
  },
  {
    animationName: "Text input freeze on modal open animation",
    appName: "Perplexity",
    href: "/perplexity/home",
  },
  { animationName: "Set timer slider animation", appName: "Opal", href: "/opal/home" },
  { animationName: "Home header animation", appName: "Perplexity", href: "/perplexity/home" },
  {
    animationName: "Onboarding animation",
    appName: "Longevity Deck",
    href: "/longevity-deck/onboarding",
  },
  {
    animationName: "Chat input on focus animation",
    appName: "Perplexity",
    href: "/perplexity/chat",
  },
  {
    animationName: "Bottom sheet backdrop animation",
    appName: "Perplexity",
    href: "/perplexity/home",
  },
  { animationName: "Header animation", appName: "App Store", href: "/app-store/app" },
  {
    animationName: "Search screen open close animation",
    appName: "Linear",
    href: "/linear/home",
  },
  {
    animationName: "Schedule timer tabs transition animation",
    appName: "Opal",
    href: "/opal/schedule",
  },
  { animationName: "Paywall upgrade button animation", appName: "Grok", href: "/grok/paywall" },
  { animationName: "Paywall screen animation", appName: "Raycast", href: "/raycast/paywall" },
  { animationName: "Paywall screen animation", appName: "Grok", href: "/grok/paywall" },
  { animationName: "Header on scroll animation", appName: "Linear", href: "/linear/home" },
  { animationName: "Horizontal carousel animation", appName: "Opal", href: "/opal/blocks" },
  { animationName: "Start timer button animation", appName: "Opal", href: "/opal/home" },
  { animationName: "Tabs shared header animation", appName: "Shopify", href: "/shopify/home" },
  {
    animationName: "Custom bottom tab bar animation",
    appName: "Shopify",
    href: "/shopify/home",
  },
  { animationName: "Menu transition animation", appName: "Shopify", href: "/shopify/home" },
  { animationName: "Theme toggle animation", appName: "ColorsApp", href: "/colorsapp/home" },
  {
    animationName: "Search screen top tabs animation",
    appName: "Shopify",
    href: "/shopify/search",
  },
  {
    animationName: "Upgrade to pro modal animation",
    appName: "ColorsApp",
    href: "/colorsapp/paywall",
  },
  {
    animationName: "Blurry background animation",
    appName: "ColorsApp",
    href: "/colorsapp/paywall",
  },
  {
    animationName: "Post truncated text animation",
    appName: "Instagram",
    href: "/instagram/home",
  },
  { animationName: "Onboarding carousel animation", appName: "Alma", href: "/alma/onboarding" },
  { animationName: "Attach file menu animation", appName: "Grok", href: "/grok/chat" },
  {
    animationName: "Upcoming list scroll animation",
    appName: "Showcase",
    href: "/showcase/upcoming",
  },
  { animationName: "Top tabs indicator animation", appName: "Discord", href: "/discord/account" },
  {
    animationName: "Button shimmer effect animation",
    appName: "Discord",
    href: "/discord/profile",
  },
  { animationName: "Custom switch animation", appName: "Discord", href: "/discord/clips" },
  {
    animationName: "Language radio button animation",
    appName: "Discord",
    href: "/discord/language",
  },
  { animationName: "Shimmer text animation", appName: "ChatGPT", href: "/chatgpt/chat" },
  {
    animationName: "Header on scroll animation",
    appName: "Instagram",
    href: "/instagram/home",
  },
  { animationName: "Catch up cards swipe animation", appName: "Slack", href: "/slack/catch-up" },
  {
    animationName: "Catch up header counter animation",
    appName: "Slack",
    href: "/slack/catch-up",
  },
  { animationName: "Info cards carousel animation", appName: "Fuse", href: "/fuse/home" },
  {
    animationName: "Balance secure view toggle animation",
    appName: "Fuse",
    href: "/fuse/home",
  },
  {
    animationName: "Tab item layout animation",
    appName: "Google Chrome",
    href: "/google-chrome/tabs",
  },
  {
    animationName: "Footer animation",
    appName: "Google Chrome",
    href: "/google-chrome/tabs",
  },
  {
    animationName: "Header background animation",
    appName: "Google Chrome",
    href: "/google-chrome/tabs",
  },
  {
    animationName: "Home search transition animation",
    appName: "Raycast",
    href: "/raycast/home",
  },
  { animationName: "Home header tabs animation", appName: "Threads", href: "/threads/home" },
  { animationName: "Bottom tab bar and fab animation", appName: "Gmail", href: "/gmail/inbox" },
  { animationName: "Home tabs transition animation", appName: "Fuse", href: "/fuse/home" },
  { animationName: "Balance change toggle animation", appName: "Fuse", href: "/fuse/home" },
  {
    animationName: "Achievements carousel animation",
    appName: "Github",
    href: "/github/achievements",
  },
  {
    animationName: "Pagination dots animation",
    appName: "Instagram",
    href: "/instagram/home",
  },
  { animationName: "Header scroll animation", appName: "Gmail", href: "/gmail/inbox" },
  { animationName: "Profile picture animation", appName: "Threads", href: "/threads/profile" },
  { animationName: "Custom switch animation", appName: "Queue", href: "/queue/preferences" },
  { animationName: "Header transition animation", appName: "Canva", href: "/canva/projects" },
  { animationName: "Home header marquee animation", appName: "Adidas", href: "/adidas/home" },
  { animationName: "Profile header title animation", appName: "Github", href: "/github/profile" },
  {
    animationName: "Welcome screen animation",
    appName: "Apple Invites",
    href: "/apple-invites/welcome",
  },
  {
    animationName: "Top tabs indicator animation",
    appName: "Google Chrome",
    href: "/google-chrome/tabs",
  },
  {
    animationName: "Header large title animation",
    appName: "WhatsApp",
    href: "/whatsapp/communities",
  },
  {
    animationName: "Updates screen header animation",
    appName: "WhatsApp",
    href: "/whatsapp/updates",
  },
  {
    animationName: "Add status background animation",
    appName: "WhatsApp",
    href: "/whatsapp/updates",
  },
  { animationName: "Header large title animation", appName: "Viber", href: "/viber/calls" },
  {
    animationName: "Card blurry circles animation",
    appName: "ColorsApp",
    href: "/colorsapp/home",
  },
  { animationName: "Home header animation", appName: "ColorsApp", href: "/colorsapp/home" },
  { animationName: "Calls top tabs animation", appName: "Viber", href: "/viber/calls" },
  { animationName: "Chats header animation", appName: "Viber", href: "/viber/chats" },
  { animationName: "Blurred header image animation", appName: "Luma", href: "/luma/discover-city" },
  { animationName: "Header on scroll animation", appName: "Linkedin", href: "/linkedin/home" },
  { animationName: "Top tabs indicator animation", appName: "X", href: "/x/home" },
  { animationName: "Home header animation", appName: "X", href: "/x/home" },
  { animationName: "Menu buttons animation", appName: "Apple Books", href: "/apple-books/book" },
  {
    animationName: "Color picker background animation",
    appName: "ColorsApp",
    href: "/colorsapp/color-picker",
  },
  {
    animationName: "Palette picker color change animation",
    appName: "ColorsApp",
    href: "/colorsapp/palette-picker",
  },
  {
    animationName: "Navigation between boards animation",
    appName: "Pinterest",
    href: "/pinterest/home",
  },
  {
    animationName: "Pull to refresh loading animation",
    appName: "Pinterest",
    href: "/pinterest/home",
  },
  {
    animationName: "Story controls animation",
    appName: "Instagram",
    href: "/instagram/add-content",
  },
  { animationName: "Floating action button animation", appName: "X", href: "/x/home" },
  { animationName: "Bottom tabs background animation", appName: "X", href: "/x/home" },
  {
    animationName: "Button tabs indicator animation",
    appName: "Linear",
    href: "/linear/home/dev-issues",
  },
  {
    animationName: "Bottom tabs indicator animation",
    appName: "Linkedin",
    href: "/linkedin/home",
  },
];
