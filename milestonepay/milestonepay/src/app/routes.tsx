import { useState, useEffect, useRef } from "react";
import { motion, useScroll, useTransform } from "motion/react";
import {
  createBrowserRouter, Navigate, Outlet, useNavigate, useLocation, useParams, Link,
} from "react-router";
import {
  LayoutDashboard, FileText, CreditCard, Bell, Settings,
  Search, ArrowRight, Shield, CheckCircle2, Clock,
  AlertCircle, Plus, TrendingUp, DollarSign, Users, Send, Menu, X,
  ChevronRight, Zap, Lock, BarChart2, ChevronDown, RefreshCw,
  Download, Upload, ChevronLeft, Flag, RotateCcw, ListChecks,
  Timer, Info, MessageSquare, ExternalLink, Check, Pencil,
  Eye, Calendar, GripVertical, Trash2, Copy, Star,
  Mail, Building2, UserPlus, UserCheck,
} from "lucide-react";

// ── Utilities ──────────────────────────────────────────────────────────────────

type NavId = "dashboard" | "agreements" | "contacts" | "payments" | "notifications" | "settings";

function usd(n: number) {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", minimumFractionDigits: 0 }).format(n);
}

// ── Design system ─────────────────────────────────────────────────────────────

function StatusDot({ status }: { status: string }) {
  const color: Record<string, string> = {
    "Completed":        "bg-emerald-500",
    "In Review":        "bg-amber-400",
    "In Progress":      "bg-violet-500",
    "Active":           "bg-emerald-500",
    "Pending":          "bg-gray-300",
    "Secured":          "bg-violet-500",
    "Awaiting Review":  "bg-amber-400",
    "Draft":            "bg-gray-300",
    "Pending Approval": "bg-amber-400",
  };
  return <span className={`inline-block w-1.5 h-1.5 rounded-full flex-shrink-0 ${color[status] ?? "bg-gray-300"}`} />;
}

function StatusBadge({ status }: { status: string }) {
  const textColor: Record<string, string> = {
    "Completed":        "text-emerald-700",
    "In Review":        "text-amber-700",
    "In Progress":      "text-violet-700",
    "Active":           "text-emerald-700",
    "Pending":          "text-gray-500",
    "Secured":          "text-violet-700",
    "Awaiting Review":  "text-amber-700",
    "Draft":            "text-gray-500",
    "Pending Approval": "text-amber-700",
  };
  return (
    <span className={`inline-flex items-center gap-1.5 text-xs font-medium ${textColor[status] ?? "text-gray-500"}`}>
      <StatusDot status={status} />
      {status}
    </span>
  );
}

function ProgressBar({ value, done, total }: { value: number; done: number; total: number }) {
  return (
    <div className="flex items-center gap-2.5">
      <div className="w-16 h-0.5 bg-gray-100 rounded-full overflow-hidden">
        <div className="h-full bg-violet-500 rounded-full" style={{ width: `${value}%` }} />
      </div>
      <span className="text-xs text-gray-400 tabular-nums">{done}/{total}</span>
    </div>
  );
}

function Breadcrumb({ items }: { items: { label: string; path?: string }[] }) {
  return (
    <div className="flex items-center gap-1.5 text-xs text-gray-400 mb-5">
      {items.map((item, i) => (
        <div key={i} className="flex items-center gap-1.5">
          {i > 0 && <ChevronRight className="w-3 h-3 text-gray-300" />}
          {item.path
            ? <Link to={item.path} className="hover:text-gray-600 transition-colors">{item.label}</Link>
            : <span className="text-gray-600">{item.label}</span>}
        </div>
      ))}
    </div>
  );
}

function Divider() {
  return <div className="border-t border-gray-100" />;
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return <p className="text-[11px] font-medium text-gray-400 uppercase tracking-widest mb-3">{children}</p>;
}

function Tag({ children, variant = "default" }: { children: React.ReactNode; variant?: "default" | "violet" | "amber" | "emerald" | "red" }) {
  const styles: Record<string, string> = {
    default: "bg-gray-100 text-gray-600",
    violet:  "bg-violet-50 text-violet-700",
    amber:   "bg-amber-50 text-amber-700",
    emerald: "bg-emerald-50 text-emerald-700",
    red:     "bg-red-50 text-red-700",
  };
  return (
    <span className={`inline-flex items-center text-[11px] font-medium px-2 py-0.5 rounded ${styles[variant]}`}>
      {children}
    </span>
  );
}

// ── Static data ────────────────────────────────────────────────────────────────

const PROJECTS = [
  { id: 1, name: "E-commerce Platform Redesign", client: "Acme Corp",        value: 24000, status: "In Progress", progress: 45, done: 2, total: 5, due: "Aug 14" },
  { id: 2, name: "Brand Identity Package",       client: "Nexus Ventures",   value: 8500,  status: "In Review",   progress: 67, done: 2, total: 3, due: "Aug 10" },
  { id: 3, name: "Mobile App MVP",               client: "Harbor Labs",      value: 15000, status: "Active",      progress: 20, done: 1, total: 6, due: "Aug 22" },
  { id: 4, name: "Data Dashboard",               client: "Prism Analytics",  value: 6200,  status: "In Progress", progress: 80, done: 3, total: 4, due: "Aug 9"  },
  { id: 5, name: "API Integration Suite",        client: "Stackline",        value: 9800,  status: "Pending",     progress: 5,  done: 0, total: 4, due: "Aug 30" },
];

const ACTIVITY = [
  { id: 1, icon: "check",  text: "Milestone approved",             sub: "Brand Identity Package · Logo Design",     time: "2h ago"  },
  { id: 2, icon: "dollar", text: "Payment released — $2,500",      sub: "Nexus Ventures",                           time: "3h ago"  },
  { id: 3, icon: "users",  text: "New project inquiry",            sub: "Stackline · API Integration Suite",        time: "5h ago"  },
  { id: 4, icon: "clock",  text: "Milestone submitted for review", sub: "E-commerce Platform Redesign",             time: "Yesterday" },
  { id: 5, icon: "card",   text: "Payment secured — $9,800",       sub: "Stackline",                                time: "Yesterday" },
  { id: 6, icon: "check",  text: "Agreement signed by both sides", sub: "Harbor Labs",                              time: "2 days ago" },
];

const APPROVALS = [
  { id: 1, milestone: "UI/UX Design Mockups",      project: "E-commerce Platform Redesign", amount: 6000, date: "Aug 7" },
  { id: 2, milestone: "Final Logo Concepts",        project: "Brand Identity Package",       amount: 2500, date: "Aug 6" },
  { id: 3, milestone: "API Specification Document", project: "API Integration Suite",        amount: 1800, date: "Aug 5" },
];

const CONTRACT_MILESTONES = [
  { id: 1, name: "Discovery & Requirements", deliverable: "Project brief, technical spec",       duration: "Wks 1–2",   payment: 4000, status: "Secured" },
  { id: 2, name: "UI/UX Design",             deliverable: "Wireframes, design system, mockups",  duration: "Wks 3–5",   payment: 6000, status: "Secured" },
  { id: 3, name: "Frontend Development",     deliverable: "React components, responsive UI",     duration: "Wks 6–10",  payment: 8000, status: "Pending" },
  { id: 4, name: "Backend Integration",      deliverable: "APIs, database, authentication",      duration: "Wks 11–14", payment: 4000, status: "Pending" },
  { id: 5, name: "QA & Launch",              deliverable: "Testing, deployment, handoff docs",   duration: "Wks 15–16", payment: 2000, status: "Pending" },
];

const MILESTONE_CRITERIA: Record<string, string[]> = {
  "Discovery & Requirements": [
    "Signed project brief with all agreed requirements documented",
    "Technical specification reviewed and approved by both sides",
    "Project timeline confirmed with milestone due dates",
    "All third-party credentials and assets handed over",
  ],
  "UI/UX Design": [
    "All screens designed to the agreed wireframe direction",
    "Design system documented with all components and usage",
    "Responsive variants for mobile, tablet, and desktop complete",
    "Client has reviewed and formally approved final designs",
  ],
  "Frontend Development": [
    "All pages load correctly in the latest Chrome, Firefox, and Safari",
    "Lighthouse performance score ≥ 90 on all main pages",
    "Responsive at 375px, 768px, 1280px, and 1440px breakpoints",
    "No console errors or broken links in production build",
  ],
  "Backend Integration": [
    "All agreed API endpoints live, documented, and tested",
    "Authentication and authorization working end-to-end",
    "Database schema finalized, migrations run cleanly",
    "Error handling covers all edge cases described in the brief",
  ],
  "QA & Launch": [
    "No critical or high-severity bugs remain open",
    "All features match the agreed project brief",
    "Handoff pack delivered (credentials, repositories, documentation)",
    "30-day support period confirmed with contact details",
  ],
};

const REVISION_POLICIES = [
  { id: "1-round",   label: "1 revision per milestone",  desc: "One round of revisions per milestone at no extra cost. Additional work billed at $150/hr." },
  { id: "2-rounds",  label: "2 revisions per milestone",  desc: "Two rounds per milestone at no extra cost. Additional work billed at $150/hr." },
  { id: "3-rounds",  label: "3 revisions per milestone",  desc: "Three rounds included. Further changes billed at $150/hr with prior approval." },
  { id: "unlimited", label: "Unlimited within 30 days",   desc: "Unlimited minor revisions within 30 days. Major scope changes require a separate agreement." },
];

const EXAMPLE_PROMPTS = [
  "Website redesign for a SaaS startup — 8 weeks, $12,000",
  "Mobile app MVP with React Native — 3 months, $25,000",
  "Brand identity package including logo and guidelines — $6,000",
  "API integration and backend development — 6 weeks, $9,500",
];

const AGREEMENTS = [
  { id: "AGR-2847", name: "E-commerce Platform Redesign", client: "TechFlow Inc.",   value: 24000, status: "Awaiting Review", date: "Aug 7, 2024",  milestones: 5 },
  { id: "AGR-2841", name: "Brand Identity Package",       client: "Nexus Ventures",  value: 8500,  status: "Active",          date: "Jul 28, 2024", milestones: 3 },
  { id: "AGR-2835", name: "Mobile App MVP",               client: "Harbor Labs",     value: 15000, status: "Draft",           date: "Jul 15, 2024", milestones: 6 },
];

const WORKSPACE_MILESTONES = [
  { id: 1, name: "Discovery & Requirements", deliverable: "Project brief, technical spec",       duration: "Wks 1–2",   payment: 4000, status: "Completed", date: "Aug 1, 2024"  },
  { id: 2, name: "UI/UX Design",             deliverable: "Wireframes, design system, mockups",  duration: "Wks 3–5",   payment: 6000, status: "In Review", date: "Aug 14, 2024" },
  { id: 3, name: "Frontend Development",     deliverable: "React components, responsive UI",     duration: "Wks 6–10",  payment: 8000, status: "Pending",   date: "Sep 12, 2024" },
  { id: 4, name: "Backend Integration",      deliverable: "APIs, database, authentication",      duration: "Wks 11–14", payment: 4000, status: "Pending",   date: "Oct 10, 2024" },
  { id: 5, name: "QA & Launch",              deliverable: "Testing, deployment, handoff docs",   duration: "Wks 15–16", payment: 2000, status: "Pending",   date: "Nov 7, 2024"  },
];

const WORKSPACE_ACTIVITY = [
  { id: 1, text: "Milestone 2 submitted for review",             time: "Aug 7 · 10:24 AM", icon: "upload" },
  { id: 2, text: "TechFlow Inc. started review period",          time: "Aug 7 · 10:25 AM", icon: "clock"  },
  { id: 3, text: "Milestone 1 approved — $4,000 released",       time: "Aug 1 · 3:14 PM",  icon: "check"  },
  { id: 4, text: "Payment secured — $24,000 held for project",   time: "Jul 28 · 9:00 AM", icon: "dollar" },
  { id: 5, text: "Agreement signed by both sides",               time: "Jul 27 · 4:45 PM", icon: "check"  },
];

const DELIVERABLES = [
  { id: 1, name: "design-system-v3.fig",       type: "Figma", size: "24.3 MB", date: "Aug 7" },
  { id: 2, name: "homepage-wireframes.pdf",     type: "PDF",   size: "4.1 MB",  date: "Aug 7" },
  { id: 3, name: "component-library.zip",       type: "ZIP",   size: "12.8 MB", date: "Aug 7" },
];

const CHECKLIST_ITEMS = [
  "All agreed deliverables have been received",
  "Files are named and organized correctly",
  "Designs match the approved wireframe direction",
  "Mobile and desktop variants are included",
  "Source files are editable and complete",
];

const CHANGE_VERSIONS = [
  { v: "v1", title: "Original Agreement",   date: "Jul 27, 2024", note: "Initial agreement — both sides signed",  signed: true  },
  { v: "v2", title: "Project Changes #1",   date: "Jul 31, 2024", note: "Added analytics dashboard (+$1,200)",    signed: true  },
  { v: "v3", title: "Project Changes #2",   date: "Aug 5, 2024",  note: "Pending your approval",                  signed: false },
];

const MESSAGES = [
  { id: 1, from: "TechFlow", initials: "TF", mine: false, text: "Hi Sarah, just reviewed the wireframes. They look great! Can you clarify how the product filter works on mobile?", time: "Aug 7 · 9:14 AM" },
  { id: 2, from: "Sarah Chen", initials: "SC", mine: true,  text: "On mobile the filter slides in as a drawer from the left, triggered by the filter icon in the top bar. It's on screen 12 of the Figma file.", time: "Aug 7 · 9:41 AM" },
  { id: 3, from: "TechFlow", initials: "TF", mine: false, text: "Perfect. One more: can we add a wishlist icon on each product card?", time: "Aug 7 · 10:03 AM" },
  { id: 4, from: "Sarah Chen", initials: "SC", mine: true,  text: "Absolutely. Small change — I'll add it in the final delivery without counting it as a revision.", time: "Aug 7 · 10:18 AM" },
  { id: 5, from: "TechFlow", initials: "TF", mine: false, text: "Amazing, thank you!", time: "Aug 7 · 10:22 AM" },
];

const EXTENDED_ACTIVITY = [
  { id: 1, icon: "upload", text: "Milestone 2 submitted for review",         sub: "3 files · 41.2 MB total",       time: "Aug 7 · 10:24 AM" },
  { id: 2, icon: "clock",  text: "TechFlow started 5-day review period",     sub: "Review deadline Aug 12",         time: "Aug 7 · 10:25 AM" },
  { id: 3, icon: "msg",    text: "4 messages exchanged with TechFlow",        sub: "Latest: wishlist icon request",  time: "Aug 7 · 10:18 AM" },
  { id: 4, icon: "check",  text: "Milestone 1 approved — $4,000 released",   sub: "Discovery & Requirements",       time: "Aug 1 · 3:14 PM"  },
  { id: 5, icon: "dollar", text: "$24,000 secured for this project",          sub: "All funds held by MilestonePay", time: "Jul 28 · 9:00 AM" },
  { id: 6, icon: "check",  text: "Agreement signed by both sides",            sub: "AGR-2847 · 5 milestones",       time: "Jul 27 · 4:45 PM" },
];

const PAYMENT_MILESTONES = [
  { id: 1, name: "Discovery & Requirements", pct: 17, amount: 4000 },
  { id: 2, name: "UI/UX Design",             pct: 25, amount: 6000 },
  { id: 3, name: "Frontend Development",     pct: 33, amount: 8000 },
  { id: 4, name: "Backend Integration",      pct: 17, amount: 4000 },
  { id: 5, name: "QA & Launch",              pct:  8, amount: 2000 },
];

const REVIEW_FILES = [
  { id: 1, name: "design-system-v3.fig",   type: "Figma", size: "24.3 MB", desc: "64 components · typography · color tokens", emoji: "🎨" },
  { id: 2, name: "homepage-wireframes.pdf", type: "PDF",   size: "4.1 MB",  desc: "12 screens · 4 breakpoints · annotated",   emoji: "📄" },
  { id: 3, name: "component-library.zip",  type: "ZIP",   size: "12.8 MB", desc: "React components · Storybook docs",         emoji: "📦" },
];

const REVIEW_CRITERIA = [
  { id: 1, text: "All screens designed to the agreed wireframe direction",           critical: true  },
  { id: 2, text: "Design system documented with all components and usage",            critical: true  },
  { id: 3, text: "Responsive variants for mobile, tablet, and desktop complete",      critical: true  },
  { id: 4, text: "Client has reviewed and formally approved final designs",           critical: false },
  { id: 5, text: "Source files are editable, named correctly, and organized",        critical: false },
];

const INITIAL_SCOPE = [
  { id: 1, title: "Product recommendation engine", detail: "Collaborative filtering on homepage",      milestone: 3, cost: 2200, hours: 14 },
  { id: 2, title: "Klaviyo integration",           detail: "Abandoned cart · post-purchase flows",     milestone: 3, cost: 1200, hours: 8  },
  { id: 3, title: "Loyalty points dashboard",      detail: "Tier visualisation · points history",       milestone: 4, cost: 800,  hours: 5  },
];

const ALL_VERSIONS = [
  { v: "v1", label: "Original Agreement",  date: "Jul 27, 2024", author: "Sarah Chen",   total: 24000, deadline: "Nov 15, 2024", signed: true,  current: false, changes: [] as string[] },
  { v: "v2", label: "Project Changes #1", date: "Jul 31, 2024", author: "TechFlow Inc.", total: 25200, deadline: "Nov 15, 2024", signed: true,  current: false, changes: ["+ Analytics dashboard (+$1,200)", "Milestone 3 updated"] },
  { v: "v3", label: "Project Changes #2", date: "Aug 5, 2024",  author: "TechFlow Inc.", total: 28200, deadline: "Nov 29, 2024", signed: false, current: true,  changes: ["+ Recommendation engine (+$2,200)", "+ Klaviyo (+$1,200)", "+ Loyalty dashboard (+$800)", "Deadline +2 weeks"] },
];

// ── Contacts data ──────────────────────────────────────────────────────────────

const CONTACTS = [
  { id: "c1", name: "Jordan Park",   email: "jordan@techflow.io",     title: "Product Manager",   company: "TechFlow Inc.",    initials: "JP", bg: "bg-blue-100",    text: "text-blue-700",    projects: 3, totalValue: 49200, lastProject: "E-commerce Platform Redesign", lastWorked: "Aug 2024", since: "Mar 2023" },
  { id: "c2", name: "Mia Torres",    email: "mia@nexusventures.co",   title: "Creative Director", company: "Nexus Ventures",   initials: "MT", bg: "bg-emerald-100", text: "text-emerald-700", projects: 2, totalValue: 16500, lastProject: "Brand Identity Package",       lastWorked: "Jul 2024", since: "Nov 2023" },
  { id: "c3", name: "Liam Chen",     email: "liam@harborlabs.io",     title: "CTO",               company: "Harbor Labs",      initials: "LC", bg: "bg-amber-100",   text: "text-amber-700",   projects: 1, totalValue: 15000, lastProject: "Mobile App MVP",               lastWorked: "Jul 2024", since: "Jun 2024" },
  { id: "c4", name: "Priya Sharma",  email: "priya@prismanalytics.com",title: "Data Lead",         company: "Prism Analytics",  initials: "PS", bg: "bg-violet-100",  text: "text-violet-700",  projects: 2, totalValue: 11400, lastProject: "Data Dashboard",               lastWorked: "Jun 2024", since: "Jan 2024" },
  { id: "c5", name: "Alex Rivera",   email: "alex@stackline.io",      title: "Engineering Lead",  company: "Stackline",        initials: "AR", bg: "bg-rose-100",    text: "text-rose-700",    projects: 1, totalValue: 9800,  lastProject: "API Integration Suite",        lastWorked: "Aug 2024", since: "Jul 2024" },
];

const CONTACT_PROJECTS: Record<string, { name: string; status: string; value: number; date: string; milestones: number }[]> = {
  c1: [
    { name: "E-commerce Platform Redesign", status: "In Progress", value: 24000, date: "Jul 2024",  milestones: 5 },
    { name: "Dashboard Analytics Module",   status: "Completed",   value: 14200, date: "Jan 2024",  milestones: 3 },
    { name: "Brand Guidelines Update",      status: "Completed",   value: 11000, date: "Oct 2023",  milestones: 2 },
  ],
  c2: [
    { name: "Brand Identity Package",       status: "In Review",   value: 8500,  date: "Jul 2024",  milestones: 3 },
    { name: "Marketing Site Redesign",      status: "Completed",   value: 8000,  date: "Mar 2024",  milestones: 3 },
  ],
  c3: [
    { name: "Mobile App MVP",               status: "Active",      value: 15000, date: "Jul 2024",  milestones: 6 },
  ],
  c4: [
    { name: "Data Dashboard",               status: "In Progress", value: 6200,  date: "Jun 2024",  milestones: 4 },
    { name: "Internal Analytics Tool",      status: "Completed",   value: 5200,  date: "Mar 2024",  milestones: 3 },
  ],
  c5: [
    { name: "API Integration Suite",        status: "Pending",     value: 9800,  date: "Aug 2024",  milestones: 4 },
  ],
};

// ── Countdown hook ─────────────────────────────────────────────────────────────

function useCountdown(deadline: Date) {
  const [remaining, setRemaining] = useState(() => Math.max(0, deadline.getTime() - Date.now()));
  useEffect(() => {
    const tick = setInterval(() => setRemaining(r => Math.max(0, r - 1000)), 1000);
    return () => clearInterval(tick);
  }, []);
  const d   = Math.floor(remaining / 86400000);
  const h   = Math.floor((remaining % 86400000) / 3600000);
  const m   = Math.floor((remaining % 3600000) / 60000);
  const s   = Math.floor((remaining % 60000) / 1000);
  const pct = Math.max(0, Math.min(100, (remaining / (5 * 86400000)) * 100));
  return { d, h, m, s, pct, expired: remaining === 0 };
}

// ── Landing Page ───────────────────────────────────────────────────────────────

/** Fades + lifts a section in as it enters the viewport. Animates once. */
function Reveal({ children, delay = 0, className = "" }: { children: React.ReactNode; delay?: number; className?: string }) {
  return (
    <motion.div
      className={className}
      initial={{ opacity: 0, y: 22 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-80px" }}
      transition={{ duration: 0.7, delay, ease: [0.16, 1, 0.3, 1] }}
    >
      {children}
    </motion.div>
  );
}

/** Underlined nav link with an animated hover underline. */
function NavLink({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <button onClick={onClick} className="relative text-[13px] text-gray-500 hover:text-gray-900 transition-colors group py-1">
      {label}
      <span className="absolute left-0 -bottom-0.5 h-px w-0 bg-violet-600 transition-all duration-300 group-hover:w-full" />
    </button>
  );
}

function LandingPage() {
  const navigate = useNavigate();
  const featuresRef          = useRef<HTMLElement>(null);
  const howItWorksRef        = useRef<HTMLElement>(null);
  const paymentProtectionRef = useRef<HTMLElement>(null);
  const heroRef              = useRef<HTMLDivElement>(null);

  const { scrollYProgress } = useScroll({ target: heroRef, offset: ["start start", "end start"] });
  const blobY = useTransform(scrollYProgress, [0, 1], [0, 80]);

  const scrollTo = (ref: React.RefObject<HTMLElement | null>) => {
    ref.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  const NAV_LINKS = [
    { label: "How It Works",       ref: howItWorksRef      },
    { label: "Features",           ref: featuresRef        },
    { label: "Payment Protection", ref: paymentProtectionRef },
  ];

  return (
    <div className="min-h-screen bg-white" style={{ fontFamily: "'Inter', system-ui, sans-serif" }}>
      {/* Nav */}
      <nav className="sticky top-0 z-50 bg-white/80 backdrop-blur-md border-b border-gray-100">
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-10">
            <Link to="/" className="flex items-center gap-2">
              <div className="w-6 h-6 bg-violet-600 rounded-[7px] flex items-center justify-center">
                <Shield className="w-3.5 h-3.5 text-white" />
              </div>
              <span className="text-[15px] font-semibold text-gray-900 tracking-tight">MilestonePay</span>
            </Link>
            <div className="hidden md:flex items-center gap-7">
              {NAV_LINKS.map(({ label, ref }) => (
                <NavLink key={label} label={label} onClick={() => scrollTo(ref)} />
              ))}
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button className="text-[13px] text-gray-600 hover:text-gray-900 transition-colors px-3 py-2 hidden sm:block">Sign in</button>
            <motion.button
              whileHover={{ y: -1 }}
              whileTap={{ y: 0, scale: 0.98 }}
              onClick={() => navigate("/agreements/new")}
              className="text-[13px] bg-violet-600 text-white px-4 py-2 rounded-full hover:bg-violet-700 transition-colors font-medium shadow-[0_1px_2px_rgba(109,94,247,0.25)]"
            >
              Get started
            </motion.button>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <div ref={heroRef} className="relative overflow-hidden">
        {/* Soft background shapes */}
        <motion.div
          aria-hidden
          className="pointer-events-none absolute -top-32 right-[-10%] w-[560px] h-[560px] rounded-full opacity-[0.35] blur-3xl animate-float-slow"
          style={{
            y: blobY,
            background: "radial-gradient(circle at 30% 30%, #B8ADFA, transparent 70%)",
          }}
        />
        <div aria-hidden className="pointer-events-none absolute top-24 left-[-8%] w-[380px] h-[380px] rounded-full opacity-[0.25] blur-3xl"
          style={{ background: "radial-gradient(circle at 50% 50%, #EAE6FE, transparent 70%)" }} />

        <section className="relative max-w-6xl mx-auto px-6 pt-24 pb-20 lg:pt-32 lg:pb-28">
          <div className="max-w-3xl">
            <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }}
              className="inline-flex items-center gap-1.5 text-xs font-medium text-violet-700 bg-violet-50 rounded-full px-3 py-1 mb-7">
              <Shield className="w-3 h-3" />
              Milestone-based payment protection
            </motion.div>
            <motion.h1
              initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.75, delay: 0.05, ease: [0.16, 1, 0.3, 1] }}
              className="text-6xl lg:text-[5.25rem] font-semibold text-gray-900 leading-[1.02] tracking-[-0.03em] mb-6"
            >
              The smarter way<br />to get paid
            </motion.h1>
            <motion.p
              initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.7, delay: 0.15 }}
              className="text-xl text-gray-500 leading-relaxed mb-9 max-w-xl"
            >
              Project agreements with milestone-based payment protection. Scope work, secure funds, and get paid on time — every time.
            </motion.p>
            <motion.div initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.7, delay: 0.25 }}
              className="flex items-center gap-5">
              <motion.button
                whileHover={{ y: -2 }} whileTap={{ y: 0, scale: 0.98 }}
                onClick={() => navigate("/agreements/new")}
                className="flex items-center gap-2 bg-violet-600 text-white px-6 py-3 rounded-full text-[15px] font-medium hover:bg-violet-700 transition-colors shadow-[0_1px_2px_rgba(109,94,247,0.25)]"
              >
                Start free <ArrowRight className="w-4 h-4" />
              </motion.button>
              <button onClick={() => scrollTo(howItWorksRef)} className="text-[15px] text-gray-500 hover:text-gray-900 transition-colors flex items-center gap-1.5">
                How it works <ChevronRight className="w-4 h-4" />
              </button>
            </motion.div>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.7, delay: 0.4 }}
              className="flex items-center gap-3 mt-10">
              <div className="flex -space-x-2">
                {["#818cf8","#34d399","#fb923c","#a78bfa"].map((c, i) => (
                  <div key={i} className="w-7 h-7 rounded-full ring-2 ring-white" style={{ background: c }} />
                ))}
              </div>
              <p className="text-sm text-gray-400">Trusted by <span className="text-gray-700 font-medium">2,400+</span> freelancers</p>
            </motion.div>
          </div>
        </section>
      </div>

      {/* How It Works */}
      <section ref={howItWorksRef} className="max-w-6xl mx-auto px-6 py-24 lg:py-28 scroll-mt-16">
        <Reveal>
          <p className="text-xs font-semibold text-violet-600 uppercase tracking-[0.14em] mb-3">How it works</p>
          <h2 className="text-4xl font-semibold text-gray-900 tracking-tight mb-16 max-w-2xl">From brief to payment in four steps</h2>
        </Reveal>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-x-10 gap-y-14">
          {[
            { n: "01", title: "Describe project",      desc: "Enter your project details — deliverables, timeline, milestones, and payment terms.",            Icon: FileText    },
            { n: "02", title: "Generate agreement",    desc: "Get a complete project agreement with milestones, payment schedule, and acceptance criteria.",   Icon: Zap         },
            { n: "03", title: "Client secures payment",desc: "Your client pays the full project amount upfront — held safely before work begins.",            Icon: Lock        },
            { n: "04", title: "Get paid per step",     desc: "Submit milestones for approval. Payment releases automatically as each step is approved.",       Icon: CheckCircle2 },
          ].map((step, i) => (
            <Reveal key={step.n} delay={i * 0.08} className="group">
              <p className="text-xs text-gray-300 font-mono mb-4">{step.n}</p>
              <div className="w-9 h-9 rounded-lg bg-violet-50 flex items-center justify-center mb-4 transition-colors group-hover:bg-violet-100">
                <step.Icon className="w-4 h-4 text-violet-600" />
              </div>
              <h3 className="text-[15px] font-semibold text-gray-900 mb-2">{step.title}</h3>
              <p className="text-sm text-gray-500 leading-relaxed">{step.desc}</p>
            </Reveal>
          ))}
        </div>
      </section>

      {/* Stats */}
      <section className="border-y border-gray-100 bg-gray-50/60">
        <div className="max-w-6xl mx-auto px-6 py-16">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-10">
            {[
              { value: "$124M+", label: "Payments protected"  },
              { value: "2,400+", label: "Active freelancers"  },
              { value: "99.2%",  label: "On-time payments"    },
              { value: "<48h",   label: "Avg issue resolution" },
            ].map((s, i) => (
              <Reveal key={s.label} delay={i * 0.06}>
                <p className="text-4xl font-semibold text-gray-900 tracking-tight mb-1.5">{s.value}</p>
                <p className="text-sm text-gray-400">{s.label}</p>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* Features */}
      <section ref={featuresRef} className="max-w-6xl mx-auto px-6 py-24 lg:py-28 scroll-mt-16">
        <Reveal>
          <p className="text-xs font-semibold text-violet-600 uppercase tracking-[0.14em] mb-3">Why MilestonePay</p>
          <h2 className="text-4xl font-semibold text-gray-900 tracking-tight mb-16 max-w-2xl">Built for how freelancers actually work</h2>
        </Reveal>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-x-10 gap-y-12">
          {[
            { Icon: FileText,  title: "Agreement Builder",  desc: "Describe your project and get a complete agreement with milestones, deadlines, and payment terms in seconds." },
            { Icon: Shield,    title: "Payment Protection", desc: "Your client's payment is held safely and only released when each milestone is approved. No more chasing invoices." },
            { Icon: Zap,       title: "Fast Payments",      desc: "Once a milestone is approved, funds transfer within hours — not weeks. ACH, wire, and more." },
            { Icon: Lock,      title: "Issue Resolution",   desc: "Get help resolving any disagreements. Our team reviews both sides fairly within 48 hours." },
            { Icon: BarChart2, title: "Project Analytics",  desc: "Track earnings, milestone velocity, and client relationships across all your projects." },
            { Icon: Users,     title: "Client Portal",      desc: "Give clients a clean portal to view progress and approve milestones — no account required." },
          ].map((f, i) => (
            <Reveal key={f.title} delay={(i % 3) * 0.08} className="group">
              <f.Icon className="w-5 h-5 text-violet-600 mb-4 transition-transform duration-300 group-hover:-translate-y-0.5" />
              <h3 className="text-[15px] font-semibold text-gray-900 mb-2">{f.title}</h3>
              <p className="text-sm text-gray-500 leading-relaxed">{f.desc}</p>
            </Reveal>
          ))}
        </div>
      </section>

      {/* Payment Protection */}
      <section ref={paymentProtectionRef} className="bg-gray-50/60 border-y border-gray-100 scroll-mt-16">
        <div className="max-w-6xl mx-auto px-6 py-24 lg:py-28">
          <Reveal>
            <p className="text-xs font-semibold text-violet-600 uppercase tracking-[0.14em] mb-3">Payment Protection</p>
          </Reveal>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-start">
            <Reveal>
              <h2 className="text-4xl font-semibold text-gray-900 tracking-tight leading-[1.1] mb-5">
                Your money stays protected until both sides follow the agreement
              </h2>
              <p className="text-gray-500 leading-relaxed max-w-md">
                MilestonePay is designed so neither the buyer nor the freelancer has full control over project funds once a payment is secured.
              </p>
            </Reveal>
            <Reveal delay={0.1} className="space-y-6">
              {[
                { title: "Protected payments",         body: "Funds are held safely until a milestone is approved or resolved." },
                { title: "Both sides must agree",      body: "Project terms and later changes only take effect after approval from both parties." },
                { title: "Clear payment records",      body: "Approvals, submissions, changes, and payments are recorded in the project timeline." },
                { title: "Disputed payments stay locked", body: "If an issue is raised, the affected payment is not released until it is reviewed." },
                { title: "No silent contract changes", body: "New requirements, prices, or deadlines must be approved before they become part of the project." },
              ].map((item, i) => (
                <div key={i} className="flex items-start gap-3">
                  <div className="w-5 h-5 rounded-full bg-violet-100 flex items-center justify-center flex-shrink-0 mt-0.5">
                    <Check className="w-3 h-3 text-violet-600" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-900">{item.title}</p>
                    <p className="text-sm text-gray-500 mt-0.5 leading-relaxed">{item.body}</p>
                  </div>
                </div>
              ))}
              <p className="text-xs text-gray-400 pt-4 border-t border-gray-200 leading-relaxed">
                The payment process is secured in the background while the interface stays simple for everyday users.
              </p>
            </Reveal>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="relative overflow-hidden">
        <div aria-hidden className="pointer-events-none absolute inset-x-0 top-0 h-full flex items-center justify-center">
          <div className="w-[600px] h-[300px] rounded-full opacity-[0.3] blur-3xl"
            style={{ background: "radial-gradient(circle, #B8ADFA, transparent 70%)" }} />
        </div>
        <Reveal className="relative max-w-6xl mx-auto px-6 py-28 lg:py-32 text-center">
          <h2 className="text-4xl lg:text-5xl font-semibold text-gray-900 tracking-tight mb-5">Ready to get paid on time?</h2>
          <p className="text-gray-500 mb-9 max-w-sm mx-auto leading-relaxed">
            Join thousands of freelancers who protect their work and get paid without friction.
          </p>
          <motion.button
            whileHover={{ y: -2 }} whileTap={{ y: 0, scale: 0.98 }}
            onClick={() => navigate("/agreements/new")}
            className="bg-violet-600 text-white px-8 py-3.5 rounded-full text-[15px] font-medium hover:bg-violet-700 transition-colors shadow-[0_1px_2px_rgba(109,94,247,0.25)]"
          >
            Create free account
          </motion.button>
          <p className="text-xs text-gray-400 mt-4">No credit card required · Free for up to 2 active projects</p>
        </Reveal>
      </section>

      {/* Footer */}
      <footer className="border-t border-gray-100">
        <div className="max-w-6xl mx-auto px-6 py-9 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <div className="w-5 h-5 bg-violet-600 rounded-md flex items-center justify-center"><Shield className="w-3 h-3 text-white" /></div>
            <span className="text-sm font-semibold text-gray-900">MilestonePay</span>
          </div>
          <p className="text-xs text-gray-400">© 2024 MilestonePay, Inc.</p>
          <div className="flex items-center gap-5">
            {["Privacy", "Terms", "Payment Protection", "Status"].map(l => (
              <a key={l} href="#" className="text-xs text-gray-400 hover:text-gray-600 transition-colors">{l}</a>
            ))}
          </div>
        </div>
      </footer>
    </div>
  );
}

// ── Sidebar ────────────────────────────────────────────────────────────────────

const NAV_ITEMS: { id: NavId; label: string; Icon: typeof LayoutDashboard; badge?: number }[] = [
  { id: "dashboard",     label: "Dashboard",     Icon: LayoutDashboard                },
  { id: "agreements",   label: "Agreements",    Icon: FileText                       },
  { id: "contacts",     label: "Contacts",      Icon: Users                          },
  { id: "payments",     label: "Payments",      Icon: CreditCard                     },
  { id: "notifications",label: "Notifications", Icon: Bell,         badge: 3         },
  { id: "settings",     label: "Settings",      Icon: Settings                       },
];

const NAV_ROUTES: Record<NavId, string> = {
  dashboard:     "/dashboard",
  agreements:    "/agreements",
  contacts:      "/contacts",
  payments:      "/payment/AGR-2847",
  notifications: "/notifications",
  settings:      "/settings",
};

function getActiveNav(pathname: string): NavId {
  if (pathname.startsWith("/agreements") || pathname.startsWith("/projects")) return "agreements";
  if (pathname.startsWith("/contacts"))   return "contacts";
  if (pathname.startsWith("/payment"))    return "payments";
  if (pathname === "/notifications")      return "notifications";
  if (pathname === "/settings")           return "settings";
  return "dashboard";
}

function Sidebar({ onClose }: { onClose?: () => void }) {
  const location  = useLocation();
  const navigate  = useNavigate();
  const activeNav = getActiveNav(location.pathname);

  const handleNav = (id: NavId) => { navigate(NAV_ROUTES[id]); onClose?.(); };

  return (
    <aside className="w-56 h-full flex flex-col bg-white border-r border-gray-100" style={{ fontFamily: "'Inter', system-ui, sans-serif" }}>
      {/* Logo */}
      <div className="h-14 px-4 flex items-center justify-between border-b border-gray-100 flex-shrink-0">
        <Link to="/dashboard" className="flex items-center gap-2.5">
          <div className="w-6 h-6 bg-violet-600 rounded flex items-center justify-center flex-shrink-0">
            <Shield className="w-3.5 h-3.5 text-white" />
          </div>
          <span className="text-sm font-semibold text-gray-900">MilestonePay</span>
        </Link>
        {onClose && (
          <button onClick={onClose} className="lg:hidden text-gray-400 hover:text-gray-600 transition-colors p-1">
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* New agreement CTA */}
      <div className="px-3 pt-3 pb-1 flex-shrink-0">
        <button onClick={() => { navigate("/agreements/new"); onClose?.(); }}
          className="w-full flex items-center justify-center gap-1.5 bg-violet-600 text-white text-xs font-medium py-2 rounded-md hover:bg-violet-700 transition-colors">
          <Plus className="w-3.5 h-3.5" /> New Agreement
        </button>
      </div>

      {/* Nav */}
      <nav className="px-3 py-2 flex-1 space-y-0.5 overflow-y-auto">
        {NAV_ITEMS.map(({ id, label, Icon, badge }) => {
          const active = activeNav === id;
          return (
            <button key={id} onClick={() => handleNav(id)}
              className={`relative w-full flex items-center justify-between px-2.5 py-1.5 rounded-md text-sm transition-colors group ${active ? "bg-violet-50 text-violet-700 font-medium" : "text-gray-500 hover:text-gray-900 hover:bg-gray-50"}`}>
              {active && <span className="absolute left-0 top-1.5 bottom-1.5 w-0.5 rounded-full bg-violet-600 -translate-x-3" />}
              <div className="flex items-center gap-2.5">
                <Icon className={`w-4 h-4 flex-shrink-0 ${active ? "text-violet-600" : "text-gray-400 group-hover:text-gray-600"}`} />
                {label}
              </div>
              {badge && (
                <span className="text-[10px] font-semibold bg-violet-100 text-violet-700 rounded-full w-4 h-4 flex items-center justify-center">
                  {badge}
                </span>
              )}
            </button>
          );
        })}
      </nav>

      {/* User */}
      <div className="p-3 border-t border-gray-100 flex-shrink-0">
        <div className="flex items-center gap-2.5 px-2 py-1.5 rounded-md hover:bg-gray-50 cursor-pointer transition-colors">
          <div className="w-6 h-6 rounded-full bg-violet-100 flex items-center justify-center text-[10px] font-bold text-violet-700 flex-shrink-0">SC</div>
          <div className="min-w-0 flex-1">
            <p className="text-xs font-medium text-gray-900 truncate">Sarah Chen</p>
            <p className="text-[10px] text-gray-400 truncate">Freelancer</p>
          </div>
          <ChevronDown className="w-3 h-3 text-gray-400 flex-shrink-0" />
        </div>
      </div>
    </aside>
  );
}

// ── Top Bar ────────────────────────────────────────────────────────────────────

function TopBar({ onMenu }: { onMenu: () => void }) {
  const navigate = useNavigate();
  return (
    <header className="h-14 border-b border-gray-100 bg-white flex items-center px-4 gap-3 flex-shrink-0" style={{ fontFamily: "'Inter', system-ui, sans-serif" }}>
      <button onClick={onMenu} className="lg:hidden w-8 h-8 flex items-center justify-center text-gray-400 hover:text-gray-700 rounded-md hover:bg-gray-100 transition-colors">
        <Menu className="w-4 h-4" />
      </button>
      <div className="flex-1 flex items-center">
        <div className="relative hidden sm:flex items-center">
          <Search className="w-3.5 h-3.5 text-gray-400 absolute left-2.5 pointer-events-none" />
          <input type="text" placeholder="Search…" className="pl-8 pr-4 py-1.5 text-sm bg-gray-50 border border-gray-200 rounded-md text-gray-700 placeholder-gray-400 focus:outline-none focus:ring-1 focus:ring-violet-500 focus:border-violet-500 w-56 transition-all" />
        </div>
      </div>
      <button onClick={() => navigate("/notifications")} className="relative w-8 h-8 rounded-md hover:bg-gray-100 flex items-center justify-center transition-colors">
        <Bell className="w-4 h-4 text-gray-500" />
        <span className="absolute top-1.5 right-1.5 w-1.5 h-1.5 bg-violet-600 rounded-full" />
      </button>
      <div className="w-7 h-7 rounded-full bg-violet-100 flex items-center justify-center text-[10px] font-bold text-violet-700 cursor-pointer">SC</div>
    </header>
  );
}

// ── App Shell ──────────────────────────────────────────────────────────────────

function AppShell() {
  const [mobileOpen, setMobileOpen] = useState(false);
  return (
    <div className="h-screen flex overflow-hidden bg-white">
      {mobileOpen && (
        <div className="fixed inset-0 z-40 lg:hidden">
          <div className="absolute inset-0 bg-black/10" onClick={() => setMobileOpen(false)} />
          <div className="absolute left-0 top-0 h-full z-50 shadow-lg">
            <Sidebar onClose={() => setMobileOpen(false)} />
          </div>
        </div>
      )}
      <div className="hidden lg:flex flex-shrink-0"><Sidebar /></div>
      <div className="flex-1 flex flex-col overflow-hidden min-w-0">
        <TopBar onMenu={() => setMobileOpen(true)} />
        <main className="flex-1 overflow-hidden flex"><Outlet /></main>
      </div>
    </div>
  );
}

// ── Dashboard ──────────────────────────────────────────────────────────────────

function DashboardView() {
  const navigate  = useNavigate();
  const [approvals, setApprovals] = useState(APPROVALS);
  const approve = (id: number) => setApprovals(a => a.filter(x => x.id !== id));

  const actIcon = (icon: string) => {
    const map: Record<string, string> = {
      check: "text-emerald-600", dollar: "text-violet-600",
      users: "text-gray-400",   clock: "text-amber-500", card: "text-violet-500",
    };
    return map[icon] ?? "text-gray-400";
  };

  return (
    <div className="flex-1 overflow-y-auto" style={{ fontFamily: "'Inter', system-ui, sans-serif" }}>
      <div className="max-w-5xl mx-auto px-6 py-8">

        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-xl font-semibold text-gray-900 tracking-tight">Dashboard</h1>
            <p className="text-sm text-gray-400 mt-0.5">Thursday, August 7, 2024</p>
          </div>
          <button onClick={() => navigate("/agreements/new")} className="flex items-center gap-1.5 bg-violet-600 text-white text-sm font-medium px-3.5 py-2 rounded-lg hover:bg-violet-700 transition-colors">
            <Plus className="w-4 h-4" /> New agreement
          </button>
        </div>

        {/* Stats — flat, no cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-8 mb-10">
          {[
            { label: "Protected",       value: "$47,250",  delta: "+$9,800",       up: true  },
            { label: "Active projects", value: "6",        delta: "+1 this week",  up: true  },
            { label: "Pending review",  value: String(approvals.length), delta: "Needs action", up: false },
            { label: "Earned (month)",  value: "$12,800",  delta: "+18%",          up: true  },
          ].map(s => (
            <div key={s.label}>
              <p className="text-xs text-gray-400 mb-1">{s.label}</p>
              <p className="text-2xl font-semibold text-gray-900 tracking-tight mb-0.5">{s.value}</p>
              <p className={`text-xs ${s.up ? "text-emerald-600" : "text-amber-600"}`}>{s.delta}</p>
            </div>
          ))}
        </div>

        <Divider />

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mt-8">
          {/* Projects table */}
          <div className="lg:col-span-2">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-sm font-medium text-gray-900">Active Projects</h2>
              <button onClick={() => navigate("/projects/1")} className="text-xs text-violet-600 hover:text-violet-700 transition-colors font-medium">View all</button>
            </div>
            <div>
              {/* Header row */}
              <div className="grid grid-cols-[1fr_auto_auto_auto] gap-4 pb-2 border-b border-gray-100">
                <p className="text-xs text-gray-400">Project</p>
                <p className="text-xs text-gray-400 hidden sm:block">Value</p>
                <p className="text-xs text-gray-400">Progress</p>
                <p className="text-xs text-gray-400 hidden md:block">Status</p>
              </div>
              {PROJECTS.map(p => (
                <button key={p.id} onClick={() => navigate("/projects/1")}
                  className="w-full grid grid-cols-[1fr_auto_auto_auto] gap-4 py-3 border-b border-gray-50 hover:bg-gray-50/50 transition-colors -mx-2 px-2 rounded text-left">
                  <div className="min-w-0">
                    <p className="text-sm text-gray-900 truncate">{p.name}</p>
                    <p className="text-xs text-gray-400 mt-0.5">{p.client}</p>
                  </div>
                  <p className="text-sm text-gray-600 tabular-nums hidden sm:block self-center">{usd(p.value)}</p>
                  <div className="self-center"><ProgressBar value={p.progress} done={p.done} total={p.total} /></div>
                  <div className="self-center hidden md:block"><StatusBadge status={p.status} /></div>
                </button>
              ))}
            </div>

            {/* Pending approvals */}
            {approvals.length > 0 && (
              <div className="mt-8">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-sm font-medium text-gray-900">Pending Approvals</h2>
                  <span className="text-xs text-amber-600 font-medium">{approvals.length} waiting</span>
                </div>
                <div className="space-y-0">
                  {approvals.map((item, i) => (
                    <div key={item.id} className={`flex items-center justify-between py-3 ${i < approvals.length - 1 ? "border-b border-gray-50" : ""}`}>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm text-gray-900 truncate">{item.milestone}</p>
                        <p className="text-xs text-gray-400 mt-0.5">{item.project} · {item.date}</p>
                      </div>
                      <div className="flex items-center gap-3 ml-4 flex-shrink-0">
                        <p className="text-sm font-medium text-gray-900 tabular-nums hidden sm:block">{usd(item.amount)}</p>
                        <button onClick={() => approve(item.id)} className="text-xs text-emerald-700 bg-emerald-50 hover:bg-emerald-100 px-3 py-1.5 rounded-md transition-colors font-medium">Approve</button>
                        <button onClick={() => navigate("/projects/1/review")} className="text-xs text-gray-500 hover:text-gray-700 transition-colors">Review</button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Activity */}
          <div>
            <h2 className="text-sm font-medium text-gray-900 mb-4">Recent Activity</h2>
            <div className="space-y-3">
              {ACTIVITY.map(item => (
                <div key={item.id} className="flex items-start gap-3">
                  <div className={`w-1.5 h-1.5 rounded-full mt-1.5 flex-shrink-0 ${actIcon(item.icon).replace("text-", "bg-")}`} />
                  <div className="min-w-0">
                    <p className="text-sm text-gray-700 leading-snug">{item.text}</p>
                    <p className="text-xs text-gray-400 mt-0.5">{item.sub} · {item.time}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Agreement Builder ───────────────────────────────────────────────────────────

function ContractBuilderView() {
  const navigate = useNavigate();

  // ── Wizard state ──────────────────────────────────────────────────────────
  const [step, setStep] = useState(1);

  // Step 1 — person
  const [personSearch, setPersonSearch] = useState("");
  const [selectedContact, setSelectedContact] = useState<typeof CONTACTS[0] | null>(null);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteName, setInviteName] = useState("");
  const personFilteredContacts = personSearch.trim()
    ? CONTACTS.filter(c =>
        c.name.toLowerCase().includes(personSearch.toLowerCase()) ||
        c.email.toLowerCase().includes(personSearch.toLowerCase()) ||
        c.company.toLowerCase().includes(personSearch.toLowerCase()))
    : CONTACTS;
  const chosenName = selectedContact?.name ?? inviteName ?? (inviteEmail ? inviteEmail.split("@")[0] : "");
  const chosenEmail = selectedContact?.email ?? inviteEmail;
  const personReady = selectedContact !== null || inviteEmail.includes("@");

  // Step 2 — project details
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [type, setType] = useState("Web Development");
  const [timeline, setTimeline] = useState("16 weeks");
  const [budget, setBudget] = useState("24000");
  const [revisionPolicy, setRevisionPolicy] = useState("2-rounds");
  const projectReady = title.trim().length > 0 || description.trim().length > 0;
  const selectedPolicy = REVISION_POLICIES.find(p => p.id === revisionPolicy) ?? REVISION_POLICIES[1];

  // Step 3 — generated terms
  const [generating, setGenerating] = useState(false);
  const [generated, setGenerated] = useState(false);

  // Step 4 — sent
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);

  const STEPS = [
    { n: 1, label: "Choose person"    },
    { n: 2, label: "Project details"  },
    { n: 3, label: "Review terms"     },
    { n: 4, label: "Send"             },
  ];

  const goNext = () => {
    if (step === 2 && !generated) {
      setGenerating(true);
      setStep(3);
      setTimeout(() => { setGenerating(false); setGenerated(true); }, 2000);
      return;
    }
    if (step === 4) {
      setSending(true);
      setTimeout(() => { setSending(false); setSent(true); }, 1800);
      return;
    }
    setStep(s => Math.min(4, s + 1));
  };
  const goBack = () => setStep(s => Math.max(1, s - 1));

  const budgetNum = Number(budget.replace(/\D/g, "")) || 24000;
  const totalValue = CONTRACT_MILESTONES.reduce((s, m) => s + m.payment, 0);

  // ── Sent confirmation ─────────────────────────────────────────────────────
  if (sent) {
    return (
      <div className="flex-1 flex items-center justify-center bg-white" style={{ fontFamily: "'Inter', system-ui, sans-serif" }}>
        <div className="text-center max-w-sm px-6">
          <div className="w-12 h-12 rounded-full bg-violet-100 flex items-center justify-center mx-auto mb-5">
            <Send className="w-5 h-5 text-violet-600" />
          </div>
          <h2 className="text-xl font-semibold text-gray-900 tracking-tight mb-2">Agreement sent</h2>
          <p className="text-sm text-gray-500 mb-1">
            {chosenName || chosenEmail} will receive an email to review and sign.
          </p>
          <p className="text-xs text-gray-400 mb-8">You'll be notified when they respond.</p>
          <div className="border border-gray-100 rounded-lg p-4 text-left mb-6 space-y-2.5">
            <SectionLabel>Next steps</SectionLabel>
            {[
              "They review the milestones, terms, and payment schedule",
              "Both sides approve — you each confirm the agreement",
              "They secure the full project payment before work starts",
              "You begin work and submit each milestone for approval",
            ].map((t, i) => (
              <div key={i} className="flex items-start gap-2">
                <span className="text-xs text-gray-300 font-mono mt-0.5 flex-shrink-0">{String(i + 1).padStart(2, "0")}</span>
                <p className="text-sm text-gray-600">{t}</p>
              </div>
            ))}
          </div>
          <div className="flex gap-2">
            <button onClick={() => navigate("/agreements")} className="flex-1 border border-gray-200 text-gray-700 py-2.5 rounded-lg text-sm font-medium hover:bg-gray-50 transition-colors">View agreements</button>
            <button onClick={() => { setStep(1); setSent(false); setSelectedContact(null); setInviteEmail(""); setTitle(""); setDescription(""); setGenerated(false); }}
              className="flex-1 bg-violet-600 text-white py-2.5 rounded-lg text-sm font-medium hover:bg-violet-700 transition-colors">New agreement</button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-hidden flex flex-col bg-white" style={{ fontFamily: "'Inter', system-ui, sans-serif" }}>
      {/* Step indicator */}
      <div className="border-b border-gray-100 px-6 py-4 flex-shrink-0">
        <div className="max-w-2xl mx-auto flex items-center">
          {STEPS.map((s, i) => {
            const done    = step > s.n;
            const current = step === s.n;
            return (
              <div key={s.n} className="flex items-center flex-1 last:flex-none">
                <button onClick={() => done ? setStep(s.n) : undefined} disabled={!done}
                  className="flex items-center gap-2 group disabled:cursor-default">
                  <div className={`w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 text-[11px] font-semibold transition-colors ${
                    done    ? "bg-violet-600 text-white" :
                    current ? "bg-violet-600 text-white" :
                              "bg-gray-100 text-gray-400"
                  }`}>
                    {done ? <Check className="w-3 h-3" /> : s.n}
                  </div>
                  <span className={`text-xs font-medium hidden sm:block transition-colors ${
                    current ? "text-violet-600" : done ? "text-gray-500 group-hover:text-violet-500" : "text-gray-400"
                  }`}>{s.label}</span>
                </button>
                {i < STEPS.length - 1 && (
                  <div className={`flex-1 h-px mx-3 transition-colors ${done ? "bg-violet-200" : "bg-gray-100"}`} />
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Step content */}
      <div className="flex-1 overflow-y-auto">
        <div className="max-w-2xl mx-auto px-6 py-10">

          {/* ── Step 1: Choose / invite person ─────────────────────────────── */}
          {step === 1 && (
            <div>
              <h2 className="text-2xl font-semibold text-gray-900 tracking-tight mb-1">Who is this agreement for?</h2>
              <p className="text-sm text-gray-400 mb-8">Choose someone you've worked with, or invite someone new by email.</p>

              {/* Selected person pill */}
              {(selectedContact || inviteEmail) && (
                <div className="mb-6 flex items-center gap-3 p-3 border border-violet-100 bg-violet-50/40 rounded-lg">
                  {selectedContact ? (
                    <div className={`w-8 h-8 rounded-full ${selectedContact.bg} ${selectedContact.text} flex items-center justify-center text-xs font-bold flex-shrink-0`}>
                      {selectedContact.initials}
                    </div>
                  ) : (
                    <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center flex-shrink-0">
                      <Mail className="w-4 h-4 text-gray-400" />
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900">{chosenName || chosenEmail}</p>
                    {selectedContact && <p className="text-xs text-gray-400">{selectedContact.title}, {selectedContact.company}</p>}
                    {!selectedContact && inviteEmail && <p className="text-xs text-violet-600">Will receive an invite to create an account</p>}
                  </div>
                  <button onClick={() => { setSelectedContact(null); setInviteEmail(""); setInviteName(""); }}
                    className="text-gray-400 hover:text-gray-600 transition-colors p-1">
                    <X className="w-4 h-4" />
                  </button>
                </div>
              )}

              {/* Search */}
              <div className="relative mb-3">
                <Search className="w-3.5 h-3.5 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input type="text" value={personSearch} onChange={e => setPersonSearch(e.target.value)}
                  placeholder="Search contacts by name, company, or email…"
                  className="w-full pl-9 pr-4 py-2.5 text-sm bg-gray-50 border border-gray-200 rounded-lg text-gray-700 placeholder-gray-400 focus:outline-none focus:ring-1 focus:ring-violet-500 focus:bg-white focus:border-violet-500 transition-all" />
              </div>

              {/* Contact list */}
              {personFilteredContacts.length > 0 && (
                <div className="mb-6">
                  <SectionLabel>Your contacts</SectionLabel>
                  <div className="space-y-1">
                    {personFilteredContacts.map(c => (
                      <button key={c.id} onClick={() => { setSelectedContact(c); setInviteEmail(""); setInviteName(""); setPersonSearch(""); }}
                        className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-left transition-colors border ${
                          selectedContact?.id === c.id ? "border-violet-200 bg-violet-50/40" : "border-transparent hover:bg-gray-50"
                        }`}>
                        <div className={`w-8 h-8 rounded-full ${c.bg} ${c.text} flex items-center justify-center text-xs font-bold flex-shrink-0`}>{c.initials}</div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <p className="text-sm font-medium text-gray-900">{c.name}</p>
                            <span className="text-[10px] text-gray-400">{c.projects} project{c.projects > 1 ? "s" : ""} together</span>
                          </div>
                          <p className="text-xs text-gray-400 truncate">{c.title}, {c.company}</p>
                        </div>
                        {selectedContact?.id === c.id && <Check className="w-4 h-4 text-violet-500 flex-shrink-0" />}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {personFilteredContacts.length === 0 && personSearch && (
                <p className="text-sm text-gray-400 text-center py-4 mb-4">No contacts match "{personSearch}"</p>
              )}

              {/* Invite by email */}
              <div className="border-t border-gray-100 pt-5">
                <p className="text-xs font-medium text-gray-500 mb-3">Invite someone by email</p>
                <p className="text-xs text-gray-400 mb-3 leading-relaxed">They don't need a MilestonePay account. They'll get an email to review the agreement and create one if they choose to.</p>
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <Mail className="w-3.5 h-3.5 text-gray-400 absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                    <input type="email" value={inviteEmail}
                      onChange={e => { setInviteEmail(e.target.value); setSelectedContact(null); }}
                      placeholder="colleague@company.com"
                      className="w-full pl-8 pr-3 py-2 text-sm bg-white border border-gray-200 rounded-lg text-gray-700 placeholder-gray-400 focus:outline-none focus:ring-1 focus:ring-violet-500 focus:border-violet-500 transition-all" />
                  </div>
                  <input type="text" value={inviteName} onChange={e => setInviteName(e.target.value)}
                    placeholder="Their name"
                    className="w-36 px-3 py-2 text-sm bg-white border border-gray-200 rounded-lg text-gray-700 placeholder-gray-400 focus:outline-none focus:ring-1 focus:ring-violet-500 focus:border-violet-500 transition-all" />
                </div>
              </div>
            </div>
          )}

          {/* ── Step 2: Project details ──────────────────────────────────────── */}
          {step === 2 && (
            <div>
              <h2 className="text-2xl font-semibold text-gray-900 tracking-tight mb-1">Describe the project</h2>
              <p className="text-sm text-gray-400 mb-8">
                Tell us what you're building for{" "}
                <span className="font-medium text-gray-700">{chosenName || "your client"}</span>.
                We'll use this to generate milestones, payment schedule, and terms.
              </p>

              <div className="space-y-5">
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1.5">Project name</label>
                  <input type="text" value={title} onChange={e => setTitle(e.target.value)}
                    placeholder="e.g. E-commerce Platform Redesign"
                    className="w-full text-sm bg-white border border-gray-200 rounded-lg px-3 py-2.5 text-gray-700 placeholder-gray-400 focus:outline-none focus:ring-1 focus:ring-violet-500 focus:border-violet-500 transition-all" />
                </div>

                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1.5">What are you building?</label>
                  <textarea value={description} onChange={e => setDescription(e.target.value)}
                    placeholder="Describe deliverables, goals, and any important requirements…"
                    rows={5} className="w-full text-sm bg-white border border-gray-200 rounded-lg px-3 py-2.5 text-gray-700 placeholder-gray-400 focus:outline-none focus:ring-1 focus:ring-violet-500 focus:border-violet-500 resize-none transition-all leading-relaxed" />
                </div>

                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1.5">Type</label>
                    <select value={type} onChange={e => setType(e.target.value)} className="w-full text-sm bg-white border border-gray-200 rounded-lg px-3 py-2 text-gray-700 focus:outline-none focus:ring-1 focus:ring-violet-500 focus:border-violet-500">
                      {["Web Development","Mobile App","Design","Branding","Content","Marketing","Consulting","Other"].map(t => <option key={t}>{t}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1.5">Timeline</label>
                    <input type="text" value={timeline} onChange={e => setTimeline(e.target.value)}
                      className="w-full text-sm bg-white border border-gray-200 rounded-lg px-3 py-2 text-gray-700 focus:outline-none focus:ring-1 focus:ring-violet-500 focus:border-violet-500" />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1.5">Budget (USD)</label>
                    <input type="text" value={budget} onChange={e => setBudget(e.target.value)}
                      className="w-full text-sm bg-white border border-gray-200 rounded-lg px-3 py-2 text-gray-700 focus:outline-none focus:ring-1 focus:ring-violet-500 focus:border-violet-500" />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1.5">Revision policy</label>
                  <select value={revisionPolicy} onChange={e => setRevisionPolicy(e.target.value)}
                    className="w-full text-sm bg-white border border-gray-200 rounded-lg px-3 py-2 text-gray-700 focus:outline-none focus:ring-1 focus:ring-violet-500 focus:border-violet-500 mb-2">
                    {REVISION_POLICIES.map(p => <option key={p.id} value={p.id}>{p.label}</option>)}
                  </select>
                  <p className="text-xs text-gray-400 leading-relaxed">{selectedPolicy.desc}</p>
                </div>

                <Divider />

                <div>
                  <p className="text-xs font-medium text-gray-500 mb-2">Or start from an example</p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {EXAMPLE_PROMPTS.map((ex, i) => (
                      <button key={i} onClick={() => { setDescription(ex); setTitle(ex.split("—")[0].trim()); }}
                        className="text-left text-xs text-gray-500 border border-gray-100 rounded-lg px-3 py-2.5 hover:border-gray-300 hover:text-gray-700 transition-all leading-snug">
                        {ex}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ── Step 3: Review generated terms ──────────────────────────────── */}
          {step === 3 && (
            <div>
              {generating ? (
                <div className="flex flex-col items-center justify-center py-20 text-center">
                  <RefreshCw className="w-7 h-7 text-violet-400 mb-5 animate-spin" />
                  <p className="text-base font-medium text-gray-800 mb-2">Building your agreement…</p>
                  <p className="text-sm text-gray-400 mb-6">This takes a few seconds</p>
                  <div className="space-y-2 text-left w-52">
                    {["Structuring milestones", "Setting payment schedule", "Writing acceptance criteria", "Applying revision policy"].map(item => (
                      <div key={item} className="flex items-center gap-2 text-xs text-gray-400">
                        <div className="w-2.5 h-2.5 rounded-full border border-violet-300 border-t-violet-600 animate-spin flex-shrink-0" />
                        {item}
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <>
                  <div className="flex items-start justify-between mb-8 gap-4">
                    <div>
                      <h2 className="text-2xl font-semibold text-gray-900 tracking-tight mb-1">Review generated terms</h2>
                      <p className="text-sm text-gray-400">Edit any milestone, amount, or criteria before sending.</p>
                    </div>
                    <div className="flex-shrink-0 text-right">
                      <p className="text-2xl font-semibold text-gray-900 tabular-nums">{usd(budgetNum)}</p>
                      <p className="text-xs text-gray-400">{timeline} · {CONTRACT_MILESTONES.length} milestones</p>
                    </div>
                  </div>

                  {/* Milestones */}
                  <div className="mb-6">
                    <SectionLabel>Milestones & payment schedule</SectionLabel>
                    <div>
                      {CONTRACT_MILESTONES.map((m, i) => (
                        <div key={m.id} className={`py-3.5 ${i < CONTRACT_MILESTONES.length - 1 ? "border-b border-gray-50" : ""}`}>
                          <div className="flex items-start justify-between gap-4 mb-1">
                            <div className="flex items-start gap-2.5 flex-1 min-w-0">
                              <span className="text-xs text-gray-300 font-mono mt-0.5 flex-shrink-0">{String(m.id).padStart(2,"0")}</span>
                              <div className="min-w-0">
                                <p className="text-sm font-medium text-gray-900">{m.name}</p>
                                <p className="text-xs text-gray-400 mt-0.5">{m.deliverable}</p>
                              </div>
                            </div>
                            <div className="text-right flex-shrink-0">
                              <p className="text-sm font-semibold text-gray-900 tabular-nums">{usd(m.payment)}</p>
                              <p className="text-xs text-gray-400 font-mono">{m.duration}</p>
                            </div>
                          </div>
                          <div className="ml-7 space-y-0.5">
                            {(MILESTONE_CRITERIA[m.name] ?? []).slice(0, 2).map((c, ci) => (
                              <p key={ci} className="text-xs text-gray-400 flex items-start gap-1.5">
                                <Check className="w-3 h-3 text-gray-300 flex-shrink-0 mt-0.5" /> {c}
                              </p>
                            ))}
                          </div>
                        </div>
                      ))}
                      <div className="flex justify-between pt-3 border-t border-gray-100">
                        <p className="text-sm font-medium text-gray-900">Total</p>
                        <p className="text-sm font-semibold text-violet-600 tabular-nums">{usd(totalValue)}</p>
                      </div>
                    </div>
                  </div>

                  <Divider />

                  {/* Revision policy */}
                  <div className="py-5">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-xs text-gray-400 mb-0.5">Revision policy</p>
                        <p className="text-sm font-medium text-gray-900">{selectedPolicy.label}</p>
                        <p className="text-xs text-gray-400 mt-0.5 leading-relaxed max-w-md">{selectedPolicy.desc}</p>
                      </div>
                      <select value={revisionPolicy} onChange={e => setRevisionPolicy(e.target.value)}
                        className="text-xs text-gray-600 border border-gray-200 rounded-md px-2 py-1.5 focus:outline-none focus:ring-1 focus:ring-violet-500 flex-shrink-0">
                        {REVISION_POLICIES.map(p => <option key={p.id} value={p.id}>{p.label}</option>)}
                      </select>
                    </div>
                  </div>
                </>
              )}
            </div>
          )}

          {/* ── Step 4: Review & send ────────────────────────────────────────── */}
          {step === 4 && (
            <div>
              <h2 className="text-2xl font-semibold text-gray-900 tracking-tight mb-1">Ready to send</h2>
              <p className="text-sm text-gray-400 mb-8">
                Review the summary, then send the agreement to{" "}
                <span className="font-medium text-gray-700">{chosenName || chosenEmail}</span> for approval.
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-[1fr_200px] gap-6 items-start">
                {/* Summary */}
                <div className="space-y-5">
                  {/* Parties */}
                  <div>
                    <SectionLabel>Parties</SectionLabel>
                    <div className="space-y-2.5">
                      {[
                        { role: "You (Freelancer)", name: "Sarah Chen",     email: "sarah@designcraft.co", initials: "SC", bg: "bg-violet-100", text: "text-violet-700" },
                        { role: selectedContact ? "Client" : "Invited",
                          name: chosenName || chosenEmail,
                          email: chosenEmail,
                          initials: chosenName ? chosenName.split(" ").map(n => n[0]).join("").slice(0, 2).toUpperCase() : "?",
                          bg: selectedContact?.bg ?? "bg-gray-100",
                          text: selectedContact?.text ?? "text-gray-600",
                        },
                      ].map(p => (
                        <div key={p.role} className="flex items-center gap-3">
                          <div className={`w-8 h-8 rounded-full ${p.bg} ${p.text} flex items-center justify-center text-xs font-bold flex-shrink-0`}>{p.initials}</div>
                          <div>
                            <p className="text-sm font-medium text-gray-900">{p.name}</p>
                            <p className="text-xs text-gray-400">{p.role} · {p.email}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  <Divider />

                  {/* Project */}
                  <div>
                    <SectionLabel>Project</SectionLabel>
                    <p className="text-sm font-medium text-gray-900 mb-0.5">{title || "E-commerce Platform Redesign"}</p>
                    <p className="text-xs text-gray-400">{type} · {timeline} · {usd(budgetNum)}</p>
                  </div>

                  <Divider />

                  {/* Milestones */}
                  <div>
                    <SectionLabel>Milestone schedule</SectionLabel>
                    <div className="space-y-2">
                      {CONTRACT_MILESTONES.map(m => (
                        <div key={m.id} className="flex justify-between items-center">
                          <p className="text-sm text-gray-700">{m.name}</p>
                          <p className="text-sm font-medium text-gray-900 tabular-nums">{usd(m.payment)}</p>
                        </div>
                      ))}
                      <Divider />
                      <div className="flex justify-between items-center pt-0.5">
                        <p className="text-sm font-semibold text-gray-900">Total</p>
                        <p className="text-base font-semibold text-violet-600 tabular-nums">{usd(totalValue)}</p>
                      </div>
                    </div>
                  </div>

                  <Divider />

                  <div className="flex items-start gap-2 text-xs text-gray-400">
                    <Shield className="w-3.5 h-3.5 flex-shrink-0 mt-0.5 text-gray-300" />
                    Once both sides approve, {chosenName?.split(" ")[0] || "your client"} will be prompted to secure the full payment before work begins.
                  </div>
                </div>

                {/* What happens next */}
                <div className="border border-gray-100 rounded-lg p-4 space-y-3">
                  <p className="text-xs font-semibold text-gray-500">What happens next</p>
                  {[
                    { n: "1", text: "They receive an email" },
                    { n: "2", text: "They review & approve" },
                    { n: "3", text: "They secure payment"   },
                    { n: "4", text: "Work begins"           },
                  ].map(s => (
                    <div key={s.n} className="flex items-center gap-2.5">
                      <span className="w-5 h-5 rounded-full bg-gray-100 text-gray-500 text-[10px] font-semibold flex items-center justify-center flex-shrink-0">{s.n}</span>
                      <p className="text-xs text-gray-600">{s.text}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Footer nav */}
      <div className="border-t border-gray-100 px-6 py-4 flex items-center justify-between flex-shrink-0 bg-white">
        <button onClick={step === 1 ? () => navigate("/agreements") : goBack}
          className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-800 transition-colors px-3 py-2 rounded-lg hover:bg-gray-50">
          <ChevronLeft className="w-4 h-4" /> {step === 1 ? "Cancel" : "Back"}
        </button>

        <div className="flex items-center gap-3">
          {step < 4 && (
            <p className="text-xs text-gray-400 hidden sm:block">Step {step} of {STEPS.length}</p>
          )}
          <button onClick={goNext}
            disabled={
              (step === 1 && !personReady) ||
              (step === 2 && !projectReady) ||
              (step === 3 && generating) ||
              sending
            }
            className="flex items-center gap-2 bg-violet-600 text-white text-sm font-medium px-5 py-2.5 rounded-lg hover:bg-violet-700 transition-colors disabled:opacity-40 disabled:cursor-not-allowed">
            {sending ? (
              <><RefreshCw className="w-4 h-4 animate-spin" /> Sending…</>
            ) : step === 4 ? (
              <><Send className="w-4 h-4" /> Send to {chosenName?.split(" ")[0] || "client"}</>
            ) : step === 2 ? (
              <><Zap className="w-4 h-4" /> Generate terms</>
            ) : (
              <>Continue <ChevronRight className="w-4 h-4" /></>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Agreements List ─────────────────────────────────────────────────────────────

function AgreementsListView() {
  const navigate = useNavigate();
  return (
    <div className="flex-1 overflow-y-auto" style={{ fontFamily: "'Inter', system-ui, sans-serif" }}>
      <div className="max-w-4xl mx-auto px-6 py-8">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-xl font-semibold text-gray-900 tracking-tight">Agreements</h1>
            <p className="text-sm text-gray-400 mt-0.5">{AGREEMENTS.length} agreements</p>
          </div>
          <button onClick={() => navigate("/agreements/new")} className="flex items-center gap-1.5 bg-violet-600 text-white text-sm font-medium px-3.5 py-2 rounded-lg hover:bg-violet-700 transition-colors">
            <Plus className="w-4 h-4" /> New agreement
          </button>
        </div>

        {/* Filter tabs */}
        <div className="flex items-center gap-0 border-b border-gray-100 mb-6">
          {["All", "Active", "Awaiting Review", "Draft"].map((tab, i) => (
            <button key={tab} className={`px-3 py-2 text-sm border-b-2 transition-colors ${i === 0 ? "border-violet-600 text-violet-600 font-medium" : "border-transparent text-gray-500 hover:text-gray-800"}`}>{tab}</button>
          ))}
        </div>

        {/* Table */}
        <div>
          <div className="grid grid-cols-[1fr_auto_auto_auto_auto] gap-4 pb-2 border-b border-gray-100">
            <p className="text-xs text-gray-400">Agreement</p>
            <p className="text-xs text-gray-400 hidden md:block">Value</p>
            <p className="text-xs text-gray-400 hidden sm:block">Date</p>
            <p className="text-xs text-gray-400">Status</p>
            <p className="text-xs text-gray-400"></p>
          </div>
          {AGREEMENTS.map(a => (
            <div key={a.id} className="grid grid-cols-[1fr_auto_auto_auto_auto] gap-4 py-3.5 border-b border-gray-50 hover:bg-gray-50/50 transition-colors rounded -mx-2 px-2">
              <div className="min-w-0">
                <p className="text-sm text-gray-900">{a.name}</p>
                <p className="text-xs text-gray-400 mt-0.5">{a.client} · <span className="font-mono">{a.id}</span></p>
              </div>
              <p className="text-sm text-gray-600 tabular-nums hidden md:block self-center">{usd(a.value)}</p>
              <p className="text-xs text-gray-400 self-center hidden sm:block">{a.date}</p>
              <div className="self-center"><StatusBadge status={a.status} /></div>
              <div className="self-center">
                {a.status === "Awaiting Review" && (
                  <button onClick={() => navigate(`/agreements/${a.id}`)} className="text-xs text-violet-600 hover:text-violet-700 font-medium transition-colors">Review</button>
                )}
                {a.status === "Active" && (
                  <button onClick={() => navigate("/projects/1")} className="text-xs text-gray-500 hover:text-gray-700 transition-colors">Open</button>
                )}
                {a.status === "Draft" && (
                  <button onClick={() => navigate("/agreements/new")} className="text-xs text-gray-500 hover:text-gray-700 transition-colors">Edit</button>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ── Agreement Review ────────────────────────────────────────────────────────────

function AgreementReviewView() {
  const navigate = useNavigate();
  const [approved, setApproved] = useState(false);
  const [requestingChanges, setRequestingChanges] = useState(false);
  const [changeNote, setChangeNote] = useState("");

  return (
    <div className="flex-1 overflow-hidden flex" style={{ fontFamily: "'Inter', system-ui, sans-serif" }}>
      {/* Document */}
      <div className="flex-1 overflow-y-auto">
        <div className="max-w-2xl mx-auto px-8 py-8">
          <Breadcrumb items={[{ label: "Agreements", path: "/agreements" }, { label: "E-commerce Platform Redesign" }]} />

          <div className="mb-8">
            <div className="flex items-center gap-2 mb-3">
              <div className="w-4 h-4 bg-violet-600 rounded flex items-center justify-center"><Shield className="w-2.5 h-2.5 text-white" /></div>
              <span className="text-xs text-gray-400">AGR-2847</span>
              <StatusBadge status="Awaiting Review" />
            </div>
            <h1 className="text-2xl font-semibold text-gray-900 tracking-tight mb-1">E-commerce Platform Redesign</h1>
            <p className="text-sm text-gray-400">Generated Aug 7, 2024 · 16 weeks · 5 milestones</p>
          </div>

          <Divider />

          {/* Parties */}
          <div className="py-6">
            <SectionLabel>Parties</SectionLabel>
            <div className="grid grid-cols-2 gap-6">
              {[
                { role: "Freelancer", name: "Sarah Chen",    email: "sarah@designcraft.co", detail: "DBA DesignCraft Studio" },
                { role: "Client",     name: "TechFlow Inc.", email: "hello@techflow.io",     detail: "San Francisco, CA 94105" },
              ].map(p => (
                <div key={p.role}>
                  <p className="text-xs text-gray-400 mb-1">{p.role}</p>
                  <p className="text-sm font-medium text-gray-900">{p.name}</p>
                  <p className="text-xs text-gray-400">{p.email}</p>
                  <p className="text-xs text-gray-400">{p.detail}</p>
                </div>
              ))}
            </div>
          </div>

          <Divider />

          {/* Scope */}
          <div className="py-6">
            <SectionLabel>Scope of Work</SectionLabel>
            <p className="text-sm text-gray-600 leading-relaxed mb-4">
              Complete redesign of the TechFlow e-commerce platform including UX research, design system creation, responsive frontend implementation, backend API integration, and quality assurance. All source files, design assets, and documentation included. 30-day post-launch support.
            </p>
            <div className="space-y-2">
              {[
                "UX research, user interviews, and competitive analysis",
                "Complete design system with 60+ components and documentation",
                "Responsive frontend implementation in React + TypeScript",
                "Backend integration with existing APIs and new endpoints",
                "Full QA, accessibility audit (WCAG 2.1 AA), and launch support",
              ].map((item, i) => (
                <div key={i} className="flex items-start gap-2.5">
                  <Check className="w-3.5 h-3.5 text-violet-500 flex-shrink-0 mt-0.5" />
                  <p className="text-sm text-gray-600">{item}</p>
                </div>
              ))}
            </div>
          </div>

          <Divider />

          {/* Milestones */}
          <div className="py-6">
            <SectionLabel>Milestone & Payment Schedule</SectionLabel>
            <div>
              <div className="grid grid-cols-[auto_1fr_auto_auto] gap-4 pb-2 border-b border-gray-100">
                <p className="text-xs text-gray-400">#</p>
                <p className="text-xs text-gray-400">Milestone</p>
                <p className="text-xs text-gray-400 hidden sm:block">Period</p>
                <p className="text-xs text-gray-400 text-right">Amount</p>
              </div>
              {CONTRACT_MILESTONES.map(m => (
                <div key={m.id} className="grid grid-cols-[auto_1fr_auto_auto] gap-4 py-3 border-b border-gray-50">
                  <p className="text-xs text-gray-300 font-mono self-center">{String(m.id).padStart(2, "0")}</p>
                  <div>
                    <p className="text-sm text-gray-900">{m.name}</p>
                    <p className="text-xs text-gray-400 mt-0.5">{m.deliverable}</p>
                  </div>
                  <p className="text-xs text-gray-400 font-mono self-center hidden sm:block">{m.duration}</p>
                  <p className="text-sm font-medium text-gray-900 tabular-nums self-center text-right">{usd(m.payment)}</p>
                </div>
              ))}
              <div className="flex justify-between pt-3">
                <p className="text-sm font-medium text-gray-900">Total</p>
                <p className="text-sm font-semibold text-violet-600 tabular-nums">{usd(24000)}</p>
              </div>
            </div>
          </div>

          <Divider />

          {/* Acceptance criteria */}
          <div className="py-6">
            <div className="flex items-center gap-2 mb-4">
              <ListChecks className="w-3.5 h-3.5 text-gray-400" />
              <SectionLabel>Acceptance Criteria</SectionLabel>
            </div>
            <p className="text-sm text-gray-500 leading-relaxed mb-4">Each milestone is complete when all criteria below are met. Payment releases on approval.</p>
            <div className="space-y-4">
              {CONTRACT_MILESTONES.map(m => (
                <div key={m.id}>
                  <p className="text-xs font-medium text-gray-700 mb-1.5">Milestone {m.id} — {m.name}</p>
                  <ul className="space-y-1 ml-3">
                    {(MILESTONE_CRITERIA[m.name] ?? []).map((c, ci) => (
                      <li key={ci} className="flex items-start gap-2 text-xs text-gray-500">
                        <Check className="w-3 h-3 text-gray-300 flex-shrink-0 mt-0.5" />
                        {c}
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </div>

          <Divider />

          {/* Revision policy */}
          <div className="py-6">
            <div className="flex items-center gap-2 mb-3">
              <RotateCcw className="w-3.5 h-3.5 text-gray-400" />
              <SectionLabel>Revision Policy</SectionLabel>
            </div>
            <p className="text-sm font-medium text-gray-900 mb-1">2 revisions per milestone</p>
            <p className="text-sm text-gray-500 leading-relaxed">Two rounds of revisions per milestone at no extra cost. Additional work billed at $150/hr with prior written approval. Revisions must be requested within 5 business days of delivery.</p>
          </div>

          <Divider />

          {/* Terms */}
          <div className="py-6">
            <SectionLabel>Standard Terms</SectionLabel>
            <div className="space-y-4">
              {[
                { title: "Payment Protection",  body: "Your full payment is held by MilestonePay before work begins. Funds release only when both sides approve each milestone." },
                { title: "Review Period",        body: "Client has 5 business days to review each milestone. Silence after 5 days constitutes automatic approval." },
                { title: "Issue Resolution",     body: "Issues reviewed by MilestonePay within 48 hours. Process is fair to both sides. Payments paused during review." },
                { title: "Intellectual Property",body: "All work product transfers to the client on final payment. Freelancer retains right to portfolio use." },
              ].map(t => (
                <div key={t.title}>
                  <p className="text-xs font-medium text-gray-700 mb-1">{t.title}</p>
                  <p className="text-sm text-gray-500 leading-relaxed">{t.body}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Change request */}
          {requestingChanges && (
            <div className="border-t border-gray-100 pt-6">
              <p className="text-sm font-medium text-gray-900 mb-3">Request changes</p>
              <textarea value={changeNote} onChange={e => setChangeNote(e.target.value)} placeholder="Describe the changes you'd like…" rows={4}
                className="w-full text-sm bg-white border border-gray-200 rounded-lg px-3 py-2.5 text-gray-700 placeholder-gray-400 focus:outline-none focus:ring-1 focus:ring-violet-500 resize-none mb-3" />
              <div className="flex gap-2">
                <button className="text-sm bg-gray-900 text-white px-4 py-2 rounded-lg hover:bg-gray-800 transition-colors font-medium">Send to freelancer</button>
                <button onClick={() => setRequestingChanges(false)} className="text-sm text-gray-500 px-4 py-2 rounded-lg hover:bg-gray-100 transition-colors">Cancel</button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Sidebar */}
      <div className="w-64 border-l border-gray-100 flex-shrink-0 overflow-y-auto p-5 space-y-6">
        {approved ? (
          <div className="text-center py-4">
            <CheckCircle2 className="w-8 h-8 text-emerald-500 mx-auto mb-2" />
            <p className="text-sm font-medium text-gray-900 mb-0.5">Agreement approved</p>
            <p className="text-xs text-gray-400 mb-4">Secure payment to begin work</p>
            <button onClick={() => navigate("/payment/AGR-2847")} className="w-full bg-violet-600 text-white py-2 rounded-lg text-sm font-medium hover:bg-violet-700 transition-colors">
              Secure Payment →
            </button>
          </div>
        ) : (
          <>
            <div>
              <SectionLabel>Payment summary</SectionLabel>
              <div className="space-y-2">
                {[
                  { label: "Project total", val: "$24,000" },
                  { label: "Service fee (1.5%)", val: "$360" },
                  { label: "Total to pay", val: "$24,360", bold: true },
                  { label: "Milestones", val: "5 payments" },
                  { label: "Timeline", val: "16 weeks" },
                ].map(s => (
                  <div key={s.label} className="flex justify-between">
                    <p className="text-xs text-gray-400">{s.label}</p>
                    <p className={`text-xs tabular-nums ${s.bold ? "font-semibold text-gray-900" : "text-gray-600"}`}>{s.val}</p>
                  </div>
                ))}
              </div>
            </div>

            <Divider />

            <div>
              <SectionLabel>Review checklist</SectionLabel>
              <div className="space-y-2">
                {["Scope and deliverables are accurate", "Milestone schedule works for you", "Payment amounts are agreed", "Acceptance criteria are clear", "Revision policy is acceptable"].map((item, i) => (
                  <div key={i} className="flex items-start gap-2">
                    <Check className="w-3.5 h-3.5 text-violet-500 flex-shrink-0 mt-0.5" />
                    <p className="text-xs text-gray-500 leading-snug">{item}</p>
                  </div>
                ))}
              </div>
            </div>

            <Divider />

            <div className="space-y-2">
              <button onClick={() => setApproved(true)} className="w-full flex items-center justify-center gap-2 bg-violet-600 text-white py-2.5 rounded-lg text-sm font-medium hover:bg-violet-700 transition-colors">
                <Check className="w-4 h-4" /> Approve Agreement
              </button>
              <button onClick={() => setRequestingChanges(true)} className="w-full flex items-center justify-center gap-2 border border-gray-200 text-gray-700 py-2.5 rounded-lg text-sm font-medium hover:bg-gray-50 transition-colors">
                <Pencil className="w-3.5 h-3.5" /> Request Changes
              </button>
              <button className="w-full flex items-center justify-center gap-2 text-gray-400 hover:text-gray-600 py-1.5 text-sm transition-colors">
                <Download className="w-3.5 h-3.5" /> Download PDF
              </button>
            </div>
          </>
        )}

        <Divider />

        <div>
          <SectionLabel>Activity</SectionLabel>
          <div className="space-y-2">
            {[
              { text: "Agreement sent by Sarah Chen", time: "Aug 7, 10:12 AM" },
              { text: "Agreement created",         time: "Aug 7, 10:10 AM" },
            ].map((a, i) => (
              <div key={i}>
                <p className="text-xs text-gray-700">{a.text}</p>
                <p className="text-[10px] text-gray-400 font-mono">{a.time}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Secure Payment ─────────────────────────────────────────────────────────────

function EscrowFundingView() {
  const navigate = useNavigate();
  const [walletConnected, setWalletConnected] = useState(true);
  const [connecting, setConnecting] = useState(false);
  const [funding, setFunding] = useState(false);
  const [funded, setFunded] = useState(false);

  const connect = () => { setConnecting(true); setTimeout(() => { setConnecting(false); setWalletConnected(true); }, 1800); };
  const fund    = () => { setFunding(true);  setTimeout(() => { setFunding(false); setFunded(true); }, 2500); };

  if (funded) {
    return (
      <div className="flex-1 flex items-center justify-center" style={{ fontFamily: "'Inter', system-ui, sans-serif" }}>
        <div className="text-center max-w-sm px-6">
          <div className="w-12 h-12 rounded-full bg-emerald-100 flex items-center justify-center mx-auto mb-5">
            <Check className="w-6 h-6 text-emerald-600" />
          </div>
          <h2 className="text-xl font-semibold text-gray-900 tracking-tight mb-2">Payment secured</h2>
          <p className="text-sm text-gray-500 mb-1">$24,360 is held safely for this project</p>
          <p className="text-xs text-gray-400 font-mono mb-8">MP-2024-0807-001 · Aug 7, 2024</p>
          <div className="border border-gray-100 rounded-lg p-4 text-left mb-5 space-y-2.5">
            <SectionLabel>What happens next</SectionLabel>
            {[
              "Work begins once Sarah accepts the project brief",
              "Each payment releases when you approve a completed step",
              "Your money stays protected until you're satisfied",
            ].map((item, i) => (
              <div key={i} className="flex items-start gap-2.5">
                <Check className="w-3.5 h-3.5 text-emerald-500 flex-shrink-0 mt-0.5" />
                <p className="text-sm text-gray-600">{item}</p>
              </div>
            ))}
          </div>
          <button onClick={() => navigate("/projects/1")} className="w-full bg-violet-600 text-white py-2.5 rounded-lg text-sm font-medium hover:bg-violet-700 transition-colors">
            Open project workspace →
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto" style={{ fontFamily: "'Inter', system-ui, sans-serif" }}>
      <div className="max-w-4xl mx-auto px-6 py-8">
        <Breadcrumb items={[{ label: "Agreements", path: "/agreements" }, { label: "E-commerce Platform Redesign", path: "/agreements/AGR-2847" }, { label: "Secure Payment" }]} />

        {/* Step indicator */}
        <div className="flex items-center gap-0 mb-10 max-w-xs">
          {["Review", "Pay", "Begin"].map((label, i) => (
            <div key={label} className="flex items-center flex-1 last:flex-none">
              <div className="flex items-center gap-1.5">
                <div className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-semibold flex-shrink-0 ${i === 0 ? "bg-emerald-100 text-emerald-700" : i === 1 ? "bg-violet-600 text-white" : "bg-gray-100 text-gray-400"}`}>
                  {i === 0 ? <Check className="w-3 h-3" /> : i + 1}
                </div>
                <span className={`text-xs ${i === 1 ? "text-violet-600 font-medium" : i === 0 ? "text-gray-400 line-through" : "text-gray-300"}`}>{label}</span>
              </div>
              {i < 2 && <div className={`flex-1 h-px mx-2 ${i === 0 ? "bg-emerald-200" : "bg-gray-100"}`} />}
            </div>
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-[1fr_280px] gap-8 items-start">
          {/* Left */}
          <div className="space-y-6">
            {/* Amount display */}
            <div>
              <p className="text-xs text-gray-400 mb-1">Amount to secure</p>
              <p className="text-4xl font-semibold text-gray-900 tracking-tight tabular-nums">$24,360</p>
              <p className="text-sm text-gray-400 mt-1">E-commerce Platform Redesign · TechFlow Inc. · 16 weeks</p>
            </div>

            <Divider />

            {/* Payment account */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <p className="text-sm font-medium text-gray-900">Payment account</p>
                {walletConnected && <button onClick={() => setWalletConnected(false)} className="text-xs text-gray-400 hover:text-gray-600 transition-colors">Change</button>}
              </div>
              {walletConnected ? (
                <div className="border border-gray-100 rounded-lg p-4">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-7 rounded border border-gray-200 bg-gray-50 flex items-center justify-center">
                        <CreditCard className="w-4 h-4 text-gray-400" />
                      </div>
                      <div>
                        <p className="text-sm font-medium text-gray-900">Chase Business ···4821</p>
                        <p className="text-xs text-gray-400">ACH · Routing ···1234</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <div className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                      <span className="text-xs text-gray-500">Connected</span>
                    </div>
                  </div>
                  <Divider />
                  <div className="flex justify-between pt-3">
                    <p className="text-xs text-gray-400">Available balance</p>
                    <p className="text-sm font-medium text-gray-900 tabular-nums">$47,250.00</p>
                  </div>
                </div>
              ) : (
                <div className="border border-gray-100 rounded-lg p-4">
                  <p className="text-sm text-gray-500 mb-4">Connect a bank account to continue.</p>
                  <div className="grid grid-cols-2 gap-2">
                    {["Chase", "Bank of America", "Wells Fargo", "Other bank"].map(b => (
                      <button key={b} onClick={connect} disabled={connecting}
                        className="flex items-center gap-2 p-2.5 rounded-lg border border-gray-100 hover:border-gray-300 transition-colors text-left disabled:opacity-50">
                        <CreditCard className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" />
                        <span className="text-xs text-gray-600">{b}</span>
                      </button>
                    ))}
                  </div>
                  {connecting && <p className="text-xs text-center text-violet-600 mt-3">Connecting securely…</p>}
                </div>
              )}
            </div>

            <Divider />

            {/* Breakdown */}
            <div>
              <p className="text-sm font-medium text-gray-900 mb-3">Payment breakdown</p>
              <div className="space-y-2.5">
                {[
                  { label: "Project total",       sub: "5 milestones · 16 weeks", val: "$24,000.00" },
                  { label: "Service fee (1.5%)",  sub: "MilestonePay",            val: "$360.00",   muted: true },
                ].map(r => (
                  <div key={r.label} className="flex justify-between">
                    <div>
                      <p className="text-sm text-gray-700">{r.label}</p>
                      <p className="text-xs text-gray-400">{r.sub}</p>
                    </div>
                    <p className={`text-sm tabular-nums self-center ${r.muted ? "text-gray-500" : "text-gray-900 font-medium"}`}>{r.val}</p>
                  </div>
                ))}
              </div>
              <Divider />
              <div className="flex justify-between pt-3">
                <p className="text-sm font-semibold text-gray-900">Total to secure</p>
                <p className="text-base font-semibold text-gray-900 tabular-nums">$24,360.00</p>
              </div>
            </div>

            <Divider />

            {/* Release schedule */}
            <div>
              <p className="text-sm font-medium text-gray-900 mb-3">Release schedule</p>
              <div className="space-y-2">
                {PAYMENT_MILESTONES.map(m => (
                  <div key={m.id} className="flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                      <span className="text-xs text-gray-300 font-mono w-4">{m.id}</span>
                      <p className="text-sm text-gray-600">{m.name}</p>
                    </div>
                    <p className="text-sm text-gray-700 tabular-nums font-medium">{usd(m.amount)}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Right: CTA */}
          <div className="space-y-5">
            <div className="border border-gray-100 rounded-lg p-5">
              <div className="text-center mb-5">
                <p className="text-xs text-gray-400 mb-1">Securing payment of</p>
                <p className="text-3xl font-semibold text-gray-900 tabular-nums">$24,360</p>
              </div>

              {walletConnected && (
                <div className="flex items-center gap-2 mb-4 text-xs text-emerald-700">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 flex-shrink-0" />
                  Sufficient funds available — $47,250
                </div>
              )}

              <button onClick={fund} disabled={funding || !walletConnected}
                className="w-full flex items-center justify-center gap-2 bg-violet-600 text-white py-3 rounded-lg text-sm font-medium hover:bg-violet-700 transition-colors disabled:opacity-40 disabled:cursor-not-allowed mb-3">
                {funding ? <><RefreshCw className="w-4 h-4 animate-spin" /> Processing…</> : <><Lock className="w-4 h-4" /> Fund Project</>}
              </button>

              {!walletConnected && <p className="text-xs text-center text-amber-600 mb-3">Connect a payment account first</p>}

              <p className="text-[11px] text-center text-gray-400 leading-relaxed">
                By clicking Fund Project you agree to the MilestonePay{" "}
                <span className="underline cursor-pointer">payment terms</span>.
              </p>
            </div>

            <div>
              <SectionLabel>Your protection</SectionLabel>
              <div className="space-y-3">
                {[
                  { Icon: Lock,         title: "Funds held in trust",      body: "Neither party can access funds without mutual approval." },
                  { Icon: Shield,       title: "Issue resolution",          body: "Raise a concern anytime. Reviewed within 48 hours."     },
                  { Icon: CheckCircle2, title: "You control release",       body: "Payments only go through when you approve each step."   },
                ].map(({ Icon, title, body }) => (
                  <div key={title} className="flex items-start gap-2.5">
                    <Icon className="w-3.5 h-3.5 text-gray-400 flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="text-xs font-medium text-gray-700">{title}</p>
                      <p className="text-xs text-gray-400 mt-0.5">{body}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <Divider />

            <div>
              <SectionLabel>Agreement</SectionLabel>
              <div className="space-y-1.5">
                {[
                  { label: "Reference",  val: "AGR-2847"      },
                  { label: "Freelancer", val: "Sarah Chen"     },
                  { label: "Start",      val: "Aug 12, 2024"   },
                  { label: "Deadline",   val: "Nov 22, 2024"   },
                  { label: "Milestones", val: "5 payments"     },
                ].map(r => (
                  <div key={r.label} className="flex justify-between">
                    <p className="text-xs text-gray-400">{r.label}</p>
                    <p className="text-xs font-medium text-gray-700">{r.val}</p>
                  </div>
                ))}
                <div className="pt-1">
                  <Link to="/agreements/AGR-2847" className="text-xs text-violet-600 hover:text-violet-700 transition-colors">View agreement →</Link>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Project Workspace ──────────────────────────────────────────────────────────

function ProjectWorkspaceView() {
  const navigate = useNavigate();
  const [tab, setTab] = useState<"overview" | "deliverables" | "messages">("overview");
  const [message, setMessage] = useState("");
  const [msgs, setMsgs] = useState(MESSAGES);
  const [showSubmit, setShowSubmit] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const sendMsg = () => {
    if (!message.trim()) return;
    setMsgs(m => [...m, { id: Date.now(), from: "Sarah Chen", initials: "SC", mine: true, text: message, time: "Just now" }]);
    setMessage("");
  };

  const submitMilestone = () => {
    setSubmitting(true);
    setTimeout(() => { setSubmitting(false); setSubmitted(true); setShowSubmit(false); }, 2000);
  };

  const actIcon = (icon: string) => {
    const map: Record<string, string> = {
      upload: "bg-violet-100 text-violet-600", clock: "bg-amber-100 text-amber-600",
      check: "bg-emerald-100 text-emerald-600", dollar: "bg-gray-100 text-gray-600",
      msg: "bg-gray-100 text-gray-600",
    };
    return map[icon] ?? "bg-gray-100 text-gray-600";
  };

  const fileEmoji = (type: string) => type === "Figma" ? "🎨" : type === "PDF" ? "📄" : "📦";

  return (
    <div className="flex-1 overflow-hidden flex" style={{ fontFamily: "'Inter', system-ui, sans-serif" }}>
      {/* Main */}
      <div className="flex-1 overflow-hidden flex flex-col min-w-0">
        {/* Header */}
        <div className="px-6 pt-6 pb-0 border-b border-gray-100 flex-shrink-0">
          <Breadcrumb items={[{ label: "Projects", path: "/agreements" }, { label: "E-commerce Platform Redesign" }]} />
          <div className="flex items-start justify-between mb-4 -mt-2">
            <div>
              <div className="flex items-center gap-2.5">
                <h1 className="text-lg font-semibold text-gray-900">E-commerce Platform Redesign</h1>
                <StatusBadge status="In Progress" />
              </div>
              <p className="text-xs text-gray-400 mt-0.5">TechFlow Inc. · 16 weeks · Started Jul 28, 2024</p>
            </div>
            <button onClick={() => navigate("/projects/1/changes")} className="flex items-center gap-1.5 text-sm border border-gray-200 text-gray-600 px-3 py-1.5 rounded-lg hover:bg-gray-50 transition-colors flex-shrink-0">
              <Plus className="w-3.5 h-3.5" /> Project Changes
            </button>
          </div>

          <div className="flex items-center gap-0">
            {([
              { id: "overview" as const,     label: "Overview"     },
              { id: "deliverables" as const, label: "Deliverables" },
              { id: "messages" as const,     label: "Messages", count: 2 },
            ]).map(t => (
              <button key={t.id} onClick={() => setTab(t.id)}
                className={`flex items-center gap-1.5 px-4 py-2.5 text-sm border-b-2 transition-colors ${tab === t.id ? "border-violet-600 text-violet-600 font-medium" : "border-transparent text-gray-500 hover:text-gray-800"}`}>
                {t.label}
                {"count" in t && t.count && (
                  <span className={`text-[10px] font-bold rounded-full w-4 h-4 flex items-center justify-center ${tab === t.id ? "bg-violet-600 text-white" : "bg-gray-200 text-gray-500"}`}>{t.count}</span>
                )}
              </button>
            ))}
          </div>
        </div>

        {/* Tab content */}
        <div className="flex-1 overflow-y-auto">
          {/* Overview */}
          {tab === "overview" && (
            <div className="px-6 py-6 max-w-2xl space-y-8">
              {/* Milestones */}
              <div>
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-sm font-medium text-gray-900">Milestones</h2>
                  <span className="text-xs text-gray-400">2 of 5 complete</span>
                </div>
                <div className="space-y-0">
                  {WORKSPACE_MILESTONES.map((m, i) => {
                    const isLast = i === WORKSPACE_MILESTONES.length - 1;
                    return (
                      <div key={m.id} className="flex gap-4">
                        <div className="flex flex-col items-center">
                          <div className={`w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 text-xs font-semibold z-10 ${
                            m.status === "Completed" ? "bg-emerald-100 text-emerald-700" :
                            m.status === "In Review" ? "bg-amber-100 text-amber-700" : "bg-gray-100 text-gray-400"}`}>
                            {m.status === "Completed" ? <Check className="w-3 h-3" /> : m.id}
                          </div>
                          {!isLast && <div className={`w-px flex-1 my-1 ${m.status === "Completed" ? "bg-emerald-100" : "bg-gray-100"}`} />}
                        </div>
                        <div className={`${isLast ? "pb-0" : "pb-5"} flex-1 pt-0.5`}>
                          <div className="flex items-center gap-2">
                            <p className="text-sm text-gray-900">{m.name}</p>
                            <StatusBadge status={m.status} />
                            {m.status === "In Review" && (
                              <button onClick={() => navigate("/projects/1/review")} className="text-xs text-violet-600 hover:text-violet-700 font-medium transition-colors">Review →</button>
                            )}
                          </div>
                          <p className="text-xs text-gray-400 mt-0.5">{m.deliverable}</p>
                          <div className="flex items-center gap-3 mt-1">
                            <span className="text-xs text-gray-400 font-mono">{m.duration}</span>
                            <span className="text-xs font-medium text-gray-600 tabular-nums">{usd(m.payment)}</span>
                            {m.date && <span className="text-xs text-gray-400">{m.status === "Completed" ? "✓" : "Due"} {m.date}</span>}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              <Divider />

              {/* Activity */}
              <div>
                <h2 className="text-sm font-medium text-gray-900 mb-4">Activity</h2>
                <div className="space-y-3">
                  {EXTENDED_ACTIVITY.map(item => (
                    <div key={item.id} className="flex items-start gap-3">
                      <div className="w-1.5 h-1.5 rounded-full bg-gray-300 mt-1.5 flex-shrink-0" />
                      <div>
                        <p className="text-sm text-gray-700">{item.text}</p>
                        <p className="text-xs text-gray-400 mt-0.5">{item.sub} · <span className="font-mono">{item.time}</span></p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Deliverables */}
          {tab === "deliverables" && (
            <div className="px-6 py-6 max-w-2xl space-y-5">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-sm font-medium text-gray-900">Deliverables</h2>
                  <p className="text-xs text-gray-400 mt-0.5">Milestone 2 — UI/UX Design</p>
                </div>
                <button onClick={() => setShowSubmit(true)} className="flex items-center gap-1.5 text-sm bg-violet-600 text-white px-3.5 py-2 rounded-lg hover:bg-violet-700 transition-colors font-medium">
                  <Upload className="w-3.5 h-3.5" /> Submit Deliverable
                </button>
              </div>

              {submitted && (
                <div className="flex items-center gap-2.5 text-sm text-emerald-700 border border-emerald-100 rounded-lg px-4 py-3">
                  <CheckCircle2 className="w-4 h-4 text-emerald-500 flex-shrink-0" />
                  Milestone submitted for review. TechFlow has 5 days to respond.
                </div>
              )}

              {/* Drop zone */}
              <div className="border-2 border-dashed border-gray-200 rounded-lg p-8 text-center hover:border-gray-300 transition-colors cursor-pointer">
                <Upload className="w-5 h-5 text-gray-300 mx-auto mb-2" />
                <p className="text-sm text-gray-500 mb-1">Drop files here, or <span className="text-violet-600">browse</span></p>
                <p className="text-xs text-gray-400">Figma, PDF, ZIP, images · Max 500 MB</p>
              </div>

              {/* Files */}
              <div>
                <p className="text-xs text-gray-400 mb-3">Submitted files</p>
                <div>
                  {DELIVERABLES.map((d, i) => (
                    <div key={d.id} className={`flex items-center gap-3 py-3 group ${i < DELIVERABLES.length - 1 ? "border-b border-gray-50" : ""}`}>
                      <span className="text-lg">{fileEmoji(d.type)}</span>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm text-gray-900">{d.name}</p>
                        <p className="text-xs text-gray-400">{d.type} · {d.size} · {d.date}</p>
                      </div>
                      <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button className="p-1.5 text-gray-400 hover:text-gray-700 transition-colors rounded"><ExternalLink className="w-3.5 h-3.5" /></button>
                        <button className="p-1.5 text-gray-400 hover:text-gray-700 transition-colors rounded"><Download className="w-3.5 h-3.5" /></button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {showSubmit && (
                <div className="border border-gray-100 rounded-lg p-5">
                  <p className="text-sm font-medium text-gray-900 mb-1">Submit milestone for review</p>
                  <p className="text-xs text-gray-400 mb-4">Payment of $6,000 releases on approval. TechFlow has 5 days to review.</p>
                  <textarea placeholder="Add a note to TechFlow (optional)…" rows={3}
                    className="w-full text-sm bg-white border border-gray-200 rounded-lg px-3 py-2.5 placeholder-gray-400 focus:outline-none focus:ring-1 focus:ring-violet-500 resize-none mb-3" />
                  <div className="flex gap-2">
                    <button onClick={submitMilestone} disabled={submitting}
                      className="flex items-center gap-2 bg-violet-600 text-white text-sm font-medium px-4 py-2 rounded-lg hover:bg-violet-700 transition-colors disabled:opacity-50">
                      {submitting ? <><RefreshCw className="w-3.5 h-3.5 animate-spin" /> Submitting…</> : "Submit for review"}
                    </button>
                    <button onClick={() => setShowSubmit(false)} className="text-sm text-gray-500 px-4 py-2 rounded-lg hover:bg-gray-100 transition-colors">Cancel</button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Messages */}
          {tab === "messages" && (
            <div className="flex flex-col h-full">
              <div className="flex-1 overflow-y-auto px-6 py-5 space-y-4">
                <div className="text-center">
                  <span className="text-[10px] text-gray-400 font-mono">Aug 7, 2024</span>
                </div>
                {msgs.map(m => (
                  <div key={m.id} className={`flex items-start gap-3 ${m.mine ? "flex-row-reverse" : ""}`}>
                    <div className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold flex-shrink-0 ${m.mine ? "bg-violet-100 text-violet-700" : "bg-gray-100 text-gray-600"}`}>{m.initials}</div>
                    <div className={`max-w-[75%] flex flex-col gap-1 ${m.mine ? "items-end" : ""}`}>
                      <div className={`px-3.5 py-2.5 rounded-xl text-sm leading-relaxed ${m.mine ? "bg-violet-600 text-white" : "bg-gray-100 text-gray-800"}`}>{m.text}</div>
                      <p className="text-[10px] text-gray-400 font-mono px-1">{m.from} · {m.time}</p>
                    </div>
                  </div>
                ))}
              </div>
              <div className="border-t border-gray-100 p-4 flex-shrink-0">
                <div className="flex items-end gap-2 border border-gray-200 rounded-lg px-3 py-2.5 focus-within:border-violet-300 focus-within:ring-1 focus-within:ring-violet-100 transition-all">
                  <textarea value={message} onChange={e => setMessage(e.target.value)}
                    onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendMsg(); }}}
                    placeholder="Message TechFlow…" rows={1}
                    className="flex-1 bg-transparent text-sm text-gray-800 placeholder-gray-400 focus:outline-none resize-none leading-relaxed"
                    style={{ minHeight: "22px", maxHeight: "120px" }} />
                  <button onClick={sendMsg} disabled={!message.trim()}
                    className="w-7 h-7 bg-violet-600 rounded-md flex items-center justify-center hover:bg-violet-700 transition-colors disabled:opacity-30 flex-shrink-0">
                    <Send className="w-3.5 h-3.5 text-white" />
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Sidebar */}
      <div className="w-64 border-l border-gray-100 flex-shrink-0 overflow-y-auto p-5 space-y-6">
        {/* Payment status */}
        <div>
          <SectionLabel>Payment Status</SectionLabel>
          <p className="text-2xl font-semibold text-gray-900 tabular-nums">$24,000</p>
          <p className="text-xs text-gray-400 mt-0.5 mb-3">Total secured · $4,000 paid</p>
          <div className="w-full h-1 bg-gray-100 rounded-full overflow-hidden">
            <div className="bg-violet-500 h-1 rounded-full" style={{ width: "17%" }} />
          </div>
          <p className="text-xs text-gray-400 mt-1.5">1 of 5 milestones paid</p>
        </div>

        <Divider />

        {/* Under review */}
        <div>
          <div className="flex items-center gap-1.5 mb-2">
            <div className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />
            <p className="text-xs font-medium text-amber-600">Under Review</p>
          </div>
          <p className="text-sm font-medium text-gray-900">Milestone 2 — UI/UX Design</p>
          <p className="text-xs text-gray-400 mt-0.5 mb-3">Submitted Aug 7 · Due Aug 12</p>
          <div className="flex justify-between mb-3">
            <p className="text-xs text-gray-400">On approval</p>
            <p className="text-sm font-medium text-gray-900 tabular-nums">$6,000</p>
          </div>
          <button onClick={() => navigate("/projects/1/review")} className="w-full text-xs border border-gray-200 text-gray-700 py-2 rounded-lg hover:bg-gray-50 transition-colors font-medium">
            View Review
          </button>
        </div>

        <Divider />

        {/* Submit CTA */}
        <div>
          <p className="text-xs text-gray-400 mb-1">Next: Milestone 3</p>
          <p className="text-sm font-medium text-gray-900">Frontend Development</p>
          <p className="text-xs text-gray-400 mt-0.5 mb-3">Weeks 6–10 · $8,000</p>
          <button onClick={() => setTab("deliverables")} className="w-full flex items-center justify-center gap-2 bg-violet-600 text-white py-2.5 rounded-lg text-sm font-medium hover:bg-violet-700 transition-colors">
            <Upload className="w-3.5 h-3.5" /> Submit Deliverable
          </button>
        </div>

        <Divider />

        {/* Details */}
        <div>
          <SectionLabel>Project</SectionLabel>
          <div className="space-y-1.5">
            {[
              { label: "Client",   val: "TechFlow Inc."  },
              { label: "Started",  val: "Jul 28, 2024"   },
              { label: "Deadline", val: "Nov 15, 2024"   },
              { label: "Total",    val: "$24,000"         },
            ].map(r => (
              <div key={r.label} className="flex justify-between">
                <p className="text-xs text-gray-400">{r.label}</p>
                <p className="text-xs font-medium text-gray-700">{r.val}</p>
              </div>
            ))}
            <div className="pt-1 flex gap-3">
              <Link to="/agreements/AGR-2847" className="text-xs text-violet-600 hover:text-violet-700 transition-colors">Agreement</Link>
              <button onClick={() => navigate("/projects/1/changes")} className="text-xs text-gray-400 hover:text-gray-600 transition-colors">Changes</button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Milestone Review ────────────────────────────────────────────────────────────

function MilestoneReviewView() {
  const navigate = useNavigate();
  const DEADLINE = new Date(Date.now() + (3 * 86400000 + 14 * 3600000 + 22 * 60000));
  const timer    = useCountdown(DEADLINE);

  const [checks, setChecks]           = useState<boolean[]>(REVIEW_CRITERIA.map(() => false));
  const [accepting, setAccepting]     = useState(false);
  const [accepted, setAccepted]       = useState(false);
  const [action, setAction]           = useState<"none" | "revision" | "issue">("none");
  const [revisionNote, setRevisionNote] = useState("");
  const [issueType, setIssueType]     = useState("deliverable-incomplete");
  const [issueNote, setIssueNote]     = useState("");
  const [submittingAction, setSubmittingAction] = useState(false);
  const [actionDone, setActionDone]   = useState(false);
  const [activeTab, setActiveTab]     = useState<"evidence" | "criteria" | "activity">("evidence");

  const toggleCheck = (i: number) => setChecks(c => c.map((v, j) => j === i ? !v : v));
  const checkedCount   = checks.filter(Boolean).length;
  const criticalChecked = REVIEW_CRITERIA.filter((c, i) => c.critical && checks[i]).length;
  const totalCritical  = REVIEW_CRITERIA.filter(c => c.critical).length;
  const allCriticalDone = criticalChecked === totalCritical;

  const accept = () => { setAccepting(true); setTimeout(() => { setAccepting(false); setAccepted(true); }, 2000); };
  const submitAction = () => { setSubmittingAction(true); setTimeout(() => { setSubmittingAction(false); setActionDone(true); }, 1600); };

  if (accepted) {
    return (
      <div className="flex-1 flex items-center justify-center bg-white" style={{ fontFamily: "'Inter', system-ui, sans-serif" }}>
        <div className="text-center max-w-sm px-6">
          <div className="w-12 h-12 rounded-full bg-emerald-100 flex items-center justify-center mx-auto mb-5">
            <Check className="w-6 h-6 text-emerald-600" />
          </div>
          <h2 className="text-xl font-semibold text-gray-900 tracking-tight mb-2">Payment released</h2>
          <p className="text-sm text-gray-500 mb-1">$6,000 sent to Sarah Chen</p>
          <p className="text-xs text-gray-400 font-mono mb-8">MP-2024-0807-M2</p>
          <div className="border border-gray-100 rounded-lg p-4 text-left mb-5 space-y-2">
            <SectionLabel>What's next</SectionLabel>
            {["Milestone 3 — Frontend Development is now unlocked", "$14,000 remains secured for future milestones", "Sarah has been notified to start Milestone 3"].map((t, i) => (
              <div key={i} className="flex items-start gap-2">
                <Check className="w-3.5 h-3.5 text-violet-500 flex-shrink-0 mt-0.5" />
                <p className="text-sm text-gray-600">{t}</p>
              </div>
            ))}
          </div>
          <button onClick={() => navigate("/projects/1")} className="w-full bg-violet-600 text-white py-2.5 rounded-lg text-sm font-medium hover:bg-violet-700 transition-colors">
            Back to project →
          </button>
        </div>
      </div>
    );
  }

  if (actionDone) {
    const isRevision = action === "revision";
    return (
      <div className="flex-1 flex items-center justify-center bg-white" style={{ fontFamily: "'Inter', system-ui, sans-serif" }}>
        <div className="text-center max-w-sm px-6">
          <div className={`w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-5 ${isRevision ? "bg-amber-100" : "bg-red-100"}`}>
            {isRevision ? <RotateCcw className="w-6 h-6 text-amber-600" /> : <Flag className="w-6 h-6 text-red-500" />}
          </div>
          <h2 className="text-xl font-semibold text-gray-900 mb-2">{isRevision ? "Revision requested" : "Issue raised"}</h2>
          <p className="text-sm text-gray-500 mb-8">{isRevision ? "Sarah has been notified and has 5 days to resubmit." : "A MilestonePay reviewer will assess this within 48 hours."}</p>
          <button onClick={() => navigate("/projects/1")} className="w-full bg-gray-900 text-white py-2.5 rounded-lg text-sm font-medium hover:bg-gray-800 transition-colors">Back to project →</button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-hidden flex flex-col" style={{ fontFamily: "'Inter', system-ui, sans-serif" }}>
      {/* Header */}
      <div className="px-6 py-3.5 border-b border-gray-100 flex items-center justify-between flex-shrink-0 gap-4">
        <div className="flex items-center gap-3 min-w-0">
          <button onClick={() => navigate("/projects/1")} className="w-7 h-7 rounded-md flex items-center justify-center text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors flex-shrink-0">
            <ChevronLeft className="w-4 h-4" />
          </button>
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <h1 className="text-sm font-semibold text-gray-900">Milestone 2 — UI/UX Design</h1>
              <StatusBadge status="In Review" />
            </div>
            <p className="text-xs text-gray-400">E-commerce Platform Redesign · Submitted Aug 7, 2024</p>
          </div>
        </div>
        {/* Timer */}
        <div className={`hidden sm:flex items-center gap-2.5 border rounded-lg px-3.5 py-2 flex-shrink-0 ${timer.d === 0 && timer.h < 12 ? "border-red-100 bg-red-50" : "border-amber-100 bg-amber-50"}`}>
          <Timer className={`w-3.5 h-3.5 flex-shrink-0 ${timer.d === 0 && timer.h < 12 ? "text-red-500" : "text-amber-500"}`} />
          <div>
            <p className={`text-[10px] font-medium uppercase tracking-wide ${timer.d === 0 && timer.h < 12 ? "text-red-500" : "text-amber-600"}`}>Auto-approve in</p>
            <p className={`text-sm font-semibold tabular-nums leading-none ${timer.d === 0 && timer.h < 12 ? "text-red-800" : "text-amber-800"}`}>
              {timer.d}d {String(timer.h).padStart(2,"0")}h {String(timer.m).padStart(2,"0")}m {String(timer.s).padStart(2,"0")}s
            </p>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-hidden flex">
        {/* Main */}
        <div className="flex-1 overflow-hidden flex flex-col min-w-0">
          {/* Submission note */}
          <div className="px-6 pt-5 pb-0 flex-shrink-0">
            <div className="flex items-start gap-3 p-4 border border-gray-100 rounded-lg mb-4">
              <div className="w-7 h-7 rounded-full bg-violet-100 flex items-center justify-center text-xs font-bold text-violet-700 flex-shrink-0">SC</div>
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <p className="text-sm font-medium text-gray-900">Sarah Chen</p>
                  <p className="text-xs text-gray-400">Aug 7 · 10:24 AM</p>
                </div>
                <p className="text-sm text-gray-600 leading-relaxed">Delivered complete design system with 64 components, typography scale, and color tokens. Wireframes across 4 breakpoints. Files are export-ready and organized by atomic design principles. Loom walkthrough in the ZIP.</p>
              </div>
            </div>

            {/* Tabs */}
            <div className="flex items-center gap-0 border-b border-gray-100">
              {([
                { id: "evidence" as const,  label: "Evidence", count: 3 },
                { id: "criteria" as const,  label: "Criteria", count: checkedCount },
                { id: "activity" as const,  label: "Activity"  },
              ]).map(t => (
                <button key={t.id} onClick={() => setActiveTab(t.id)}
                  className={`flex items-center gap-1.5 px-4 py-2.5 text-sm border-b-2 transition-colors ${activeTab === t.id ? "border-violet-600 text-violet-600 font-medium" : "border-transparent text-gray-500 hover:text-gray-800"}`}>
                  {t.label}
                  {"count" in t && t.count !== undefined && (
                    <span className={`text-[10px] font-bold rounded-full w-4 h-4 flex items-center justify-center ${activeTab === t.id ? "bg-violet-600 text-white" : "bg-gray-200 text-gray-500"}`}>{t.count}</span>
                  )}
                </button>
              ))}
            </div>
          </div>

          <div className="flex-1 overflow-y-auto px-6 py-5">
            {/* Evidence */}
            {activeTab === "evidence" && (
              <div className="max-w-2xl space-y-2">
                {REVIEW_FILES.map((f, i) => (
                  <div key={f.id} className={`flex items-center gap-3 py-3 group ${i < REVIEW_FILES.length - 1 ? "border-b border-gray-50" : ""}`}>
                    <span className="text-xl flex-shrink-0">{f.emoji}</span>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-gray-900">{f.name}</p>
                      <p className="text-xs text-gray-400">{f.desc} · {f.size}</p>
                    </div>
                    <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button className="text-xs text-gray-500 hover:text-gray-800 flex items-center gap-1 transition-colors"><Eye className="w-3.5 h-3.5" /> Preview</button>
                      <button className="text-gray-400 hover:text-gray-600 transition-colors"><Download className="w-3.5 h-3.5" /></button>
                    </div>
                    <span className="text-[10px] text-gray-400 font-mono opacity-0 group-hover:opacity-100 transition-opacity">{f.type}</span>
                  </div>
                ))}
                <div className="flex items-center gap-2 pt-3 text-xs text-emerald-600">
                  <Shield className="w-3.5 h-3.5 flex-shrink-0" />
                  Files verified by MilestonePay · Aug 7, 10:25 AM
                </div>
              </div>
            )}

            {/* Criteria */}
            {activeTab === "criteria" && (
              <div className="max-w-2xl">
                <div className="flex items-center justify-between mb-4">
                  <p className="text-sm font-medium text-gray-900">Acceptance criteria — Milestone 2</p>
                  <span className={`text-xs font-medium ${allCriticalDone ? "text-emerald-600" : "text-amber-600"}`}>{checkedCount}/{REVIEW_CRITERIA.length} checked</span>
                </div>

                <div className="mb-4">
                  <p className="text-[11px] text-gray-400 uppercase tracking-widest mb-2">Required</p>
                  <div className="space-y-1">
                    {REVIEW_CRITERIA.filter(c => c.critical).map(c => {
                      const idx = REVIEW_CRITERIA.indexOf(c);
                      return (
                        <button key={c.id} onClick={() => toggleCheck(idx)}
                          className={`w-full flex items-start gap-3 p-3 rounded-lg text-left transition-colors ${checks[idx] ? "bg-emerald-50" : "hover:bg-gray-50"}`}>
                          <div className={`w-4 h-4 rounded border-2 flex items-center justify-center flex-shrink-0 mt-0.5 transition-all ${checks[idx] ? "bg-violet-600 border-violet-600" : "border-gray-300"}`}>
                            {checks[idx] && <Check className="w-2.5 h-2.5 text-white" />}
                          </div>
                          <p className={`text-sm flex-1 ${checks[idx] ? "text-gray-400 line-through" : "text-gray-700"}`}>{c.text}</p>
                          <span className="text-[10px] text-red-400 flex-shrink-0 mt-0.5">Required</span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div>
                  <p className="text-[11px] text-gray-400 uppercase tracking-widest mb-2">Recommended</p>
                  <div className="space-y-1">
                    {REVIEW_CRITERIA.filter(c => !c.critical).map(c => {
                      const idx = REVIEW_CRITERIA.indexOf(c);
                      return (
                        <button key={c.id} onClick={() => toggleCheck(idx)}
                          className={`w-full flex items-start gap-3 p-3 rounded-lg text-left transition-colors ${checks[idx] ? "bg-violet-50/50" : "hover:bg-gray-50"}`}>
                          <div className={`w-4 h-4 rounded border-2 flex items-center justify-center flex-shrink-0 mt-0.5 transition-all ${checks[idx] ? "bg-violet-600 border-violet-600" : "border-gray-300"}`}>
                            {checks[idx] && <Check className="w-2.5 h-2.5 text-white" />}
                          </div>
                          <p className={`text-sm ${checks[idx] ? "text-gray-400 line-through" : "text-gray-700"}`}>{c.text}</p>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {!allCriticalDone && (
                  <div className="flex items-start gap-2 mt-4 text-xs text-amber-600">
                    <AlertCircle className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" />
                    {totalCritical - criticalChecked} required {totalCritical - criticalChecked === 1 ? "item" : "items"} remaining before you can approve.
                  </div>
                )}
              </div>
            )}

            {/* Activity */}
            {activeTab === "activity" && (
              <div className="max-w-lg space-y-3">
                {[
                  { text: "Milestone submitted for review",    time: "Aug 7 · 10:24 AM" },
                  { text: "5-day review period started",       time: "Aug 7 · 10:24 AM" },
                  { text: "3 files verified by MilestonePay", time: "Aug 7 · 10:25 AM" },
                  { text: "TechFlow notified via email",       time: "Aug 7 · 10:25 AM" },
                ].map((a, i) => (
                  <div key={i} className="flex items-start gap-3">
                    <div className="w-1.5 h-1.5 rounded-full bg-gray-300 mt-1.5 flex-shrink-0" />
                    <div>
                      <p className="text-sm text-gray-700">{a.text}</p>
                      <p className="text-xs text-gray-400 font-mono">{a.time}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Right sidebar */}
        <div className="w-64 border-l border-gray-100 flex-shrink-0 overflow-y-auto p-5 space-y-6">
          {/* Amount */}
          <div>
            <SectionLabel>Payment on approval</SectionLabel>
            <p className="text-2xl font-semibold text-gray-900 tabular-nums">$6,000</p>
            <p className="text-xs text-gray-400 mt-0.5">Released to Sarah within 24 hours</p>
          </div>

          <Divider />

          {/* Timer */}
          <div>
            <div className="flex items-center gap-1.5 mb-2">
              <div className={`w-1.5 h-1.5 rounded-full animate-pulse ${timer.d === 0 && timer.h < 12 ? "bg-red-400" : "bg-amber-400"}`} />
              <p className={`text-xs font-medium ${timer.d === 0 && timer.h < 12 ? "text-red-600" : "text-amber-600"}`}>Auto-approves in</p>
            </div>
            <div className="flex items-end gap-2">
              {[{ val: timer.d, label: "d" }, { val: timer.h, label: "h" }, { val: timer.m, label: "m" }].map(u => (
                <div key={u.label} className="flex items-end gap-0.5">
                  <p className="text-xl font-semibold text-gray-900 tabular-nums leading-none">{String(u.val).padStart(2,"0")}</p>
                  <p className="text-xs text-gray-400 mb-0.5">{u.label}</p>
                </div>
              ))}
            </div>
            <div className="mt-2 h-1 bg-gray-100 rounded-full overflow-hidden">
              <div className={`h-1 rounded-full transition-all ${timer.d === 0 && timer.h < 12 ? "bg-red-400" : "bg-amber-400"}`} style={{ width: `${timer.pct}%` }} />
            </div>
          </div>

          <Divider />

          {/* Criteria progress */}
          <div>
            <div className="flex justify-between mb-1">
              <p className="text-xs text-gray-500">Criteria checked</p>
              <p className={`text-xs font-medium ${allCriticalDone ? "text-emerald-600" : "text-gray-400"}`}>{checkedCount}/{REVIEW_CRITERIA.length}</p>
            </div>
            <button onClick={() => setActiveTab("criteria")} className="text-xs text-violet-600 hover:text-violet-700 transition-colors">Review criteria →</button>
          </div>

          <Divider />

          {/* Actions */}
          {action === "none" ? (
            <div className="space-y-2">
              <button onClick={accept} disabled={accepting || !allCriticalDone}
                className="w-full flex items-center justify-center gap-2 bg-violet-600 text-white py-2.5 rounded-lg text-sm font-medium hover:bg-violet-700 transition-colors disabled:opacity-40 disabled:cursor-not-allowed">
                {accepting ? <><RefreshCw className="w-4 h-4 animate-spin" /> Processing…</> : <><Check className="w-4 h-4" /> Accept & Release $6,000</>}
              </button>
              {!allCriticalDone && <p className="text-[11px] text-center text-amber-600">Check required criteria first</p>}
              <button onClick={() => setAction("revision")} className="w-full flex items-center justify-center gap-2 border border-gray-200 text-gray-700 py-2.5 rounded-lg text-sm font-medium hover:bg-gray-50 transition-colors">
                <RotateCcw className="w-3.5 h-3.5" /> Request Revision
              </button>
              <button onClick={() => setAction("issue")} className="w-full flex items-center justify-center gap-2 text-red-500 border border-red-100 py-2.5 rounded-lg text-sm font-medium hover:bg-red-50 transition-colors">
                <Flag className="w-3.5 h-3.5" /> Raise Issue
              </button>
              <div className="flex items-start gap-2 text-[11px] text-gray-400 pt-1">
                <Shield className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" />
                Payment stays protected until you act or the review window closes.
              </div>
            </div>
          ) : action === "revision" ? (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <p className="text-sm font-medium text-gray-900">Request revision</p>
                <button onClick={() => setAction("none")} className="text-gray-400 hover:text-gray-600 transition-colors"><X className="w-4 h-4" /></button>
              </div>
              <p className="text-xs text-gray-400">Sarah will have 5 days to resubmit. Uses revision round 1 of 2.</p>
              <select className="w-full text-sm bg-white border border-gray-200 rounded-lg px-3 py-2 text-gray-700 focus:outline-none focus:ring-1 focus:ring-violet-500">
                <option>Deliverable incomplete</option>
                <option>Doesn't match acceptance criteria</option>
                <option>Quality below agreed standard</option>
                <option>Missing files or documentation</option>
              </select>
              <textarea value={revisionNote} onChange={e => setRevisionNote(e.target.value)} placeholder="Describe what needs to change…" rows={4}
                className="w-full text-sm bg-white border border-gray-200 rounded-lg px-3 py-2.5 placeholder-gray-400 focus:outline-none focus:ring-1 focus:ring-violet-500 resize-none" />
              <button onClick={submitAction} disabled={!revisionNote.trim() || submittingAction}
                className="w-full bg-gray-900 text-white text-sm font-medium py-2.5 rounded-lg hover:bg-gray-800 transition-colors disabled:opacity-40">
                {submittingAction ? "Sending…" : "Send revision request"}
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <p className="text-sm font-medium text-gray-900">Raise an issue</p>
                <button onClick={() => setAction("none")} className="text-gray-400 hover:text-gray-600 transition-colors"><X className="w-4 h-4" /></button>
              </div>
              <div className="flex items-start gap-2 text-xs text-gray-500 border border-gray-100 rounded-lg p-3">
                <Info className="w-3.5 h-3.5 flex-shrink-0 mt-0.5 text-gray-400" />
                A MilestonePay reviewer will assess both sides within 48 hours. Payments pause during review.
              </div>
              <select value={issueType} onChange={e => setIssueType(e.target.value)} className="w-full text-sm bg-white border border-gray-200 rounded-lg px-3 py-2 text-gray-700 focus:outline-none focus:ring-1 focus:ring-violet-500">
                <option value="deliverable-incomplete">Deliverable fundamentally incomplete</option>
                <option value="wrong-work">Work doesn't match the agreement</option>
                <option value="revision-refused">Revision was refused</option>
                <option value="communication">Communication has broken down</option>
              </select>
              <textarea value={issueNote} onChange={e => setIssueNote(e.target.value)} placeholder="Describe the issue with specific evidence…" rows={4}
                className="w-full text-sm bg-white border border-gray-200 rounded-lg px-3 py-2.5 placeholder-gray-400 focus:outline-none focus:ring-1 focus:ring-violet-500 resize-none" />
              <button onClick={submitAction} disabled={!issueNote.trim() || submittingAction}
                className="w-full flex items-center justify-center gap-2 bg-red-600 text-white text-sm font-medium py-2.5 rounded-lg hover:bg-red-700 transition-colors disabled:opacity-40">
                <Flag className="w-3.5 h-3.5" /> {submittingAction ? "Submitting…" : "Submit issue"}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Project Changes ─────────────────────────────────────────────────────────────

type ScopeItem = { id: number; title: string; detail: string; milestone: number; cost: number; hours: number };

function ChangeOrderView() {
  const navigate = useNavigate();
  const [tab, setTab] = useState<"review" | "propose" | "history">("review");
  const [myApproved, setMyApproved] = useState(false);
  const [approving, setApproving]   = useState(false);
  const [declined, setDeclined]     = useState(false);
  const [selectedVersion, setSelectedVersion] = useState("v3");

  const [scopeItems, setScopeItems] = useState<ScopeItem[]>(INITIAL_SCOPE);
  const [newTitle, setNewTitle]     = useState("");
  const [newDetail, setNewDetail]   = useState("");
  const [newMilestone, setNewMilestone] = useState(3);
  const [newCost, setNewCost]       = useState("");
  const [newHours, setNewHours]     = useState("");
  const [proposedDeadline, setProposedDeadline] = useState("Nov 29, 2024");
  const [proposing, setProposing]   = useState(false);
  const [proposed, setProposed]     = useState(false);

  const addItem = () => {
    if (!newTitle.trim() || !newCost) return;
    setScopeItems(items => [...items, { id: Date.now(), title: newTitle, detail: newDetail, milestone: newMilestone, cost: Number(newCost), hours: Number(newHours) || 0 }]);
    setNewTitle(""); setNewDetail(""); setNewCost(""); setNewHours("");
  };
  const removeItem = (id: number) => setScopeItems(items => items.filter(i => i.id !== id));
  const totalAdded = scopeItems.reduce((s, i) => s + i.cost, 0);
  const newTotal   = 24000 + totalAdded;

  const approve = () => { setApproving(true); setTimeout(() => { setApproving(false); setMyApproved(true); }, 1800); };
  const submitProposal = () => { setProposing(true); setTimeout(() => { setProposing(false); setProposed(true); }, 1600); };

  return (
    <div className="flex-1 overflow-hidden flex flex-col" style={{ fontFamily: "'Inter', system-ui, sans-serif" }}>
      {/* Header */}
      <div className="px-6 py-3.5 border-b border-gray-100 flex items-center justify-between flex-shrink-0">
        <div className="flex items-center gap-3 min-w-0">
          <button onClick={() => navigate("/projects/1")} className="w-7 h-7 rounded-md flex items-center justify-center text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors flex-shrink-0">
            <ChevronLeft className="w-4 h-4" />
          </button>
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <h1 className="text-sm font-semibold text-gray-900">Project Changes #2</h1>
              <span className="text-xs font-mono text-gray-400">v3</span>
              <StatusBadge status="Pending Approval" />
            </div>
            <p className="text-xs text-gray-400">E-commerce Platform Redesign · Requested by TechFlow Inc. · Aug 5, 2024</p>
          </div>
        </div>
        <button onClick={() => setTab("propose")} className="flex items-center gap-1.5 text-sm border border-gray-200 text-gray-700 px-3 py-1.5 rounded-lg hover:bg-gray-50 transition-colors flex-shrink-0">
          <Plus className="w-3.5 h-3.5" /> Propose Changes
        </button>
      </div>

      {/* Tabs */}
      <div className="px-6 border-b border-gray-100 flex items-center flex-shrink-0">
        {([
          { id: "review" as const,  label: "Review changes"  },
          { id: "propose" as const, label: "Propose changes" },
          { id: "history" as const, label: "Version history", count: ALL_VERSIONS.length },
        ]).map(t => (
          <button key={t.id} onClick={() => setTab(t.id)}
            className={`flex items-center gap-1.5 px-4 py-3 text-sm border-b-2 transition-colors ${tab === t.id ? "border-violet-600 text-violet-600 font-medium" : "border-transparent text-gray-500 hover:text-gray-800"}`}>
            {t.label}
            {"count" in t && t.count !== undefined && (
              <span className={`text-[10px] font-bold rounded-full w-4 h-4 flex items-center justify-center ${tab === t.id ? "bg-violet-600 text-white" : "bg-gray-200 text-gray-500"}`}>{t.count}</span>
            )}
          </button>
        ))}
      </div>

      <div className="flex-1 overflow-hidden flex">
        {/* Main content */}
        <div className="flex-1 overflow-y-auto">
          {/* Review tab */}
          {tab === "review" && (
            <div className="px-6 py-6 max-w-2xl space-y-8">
              {/* Summary */}
              <div>
                <h2 className="text-sm font-medium text-gray-900 mb-1">What's changing</h2>
                <p className="text-sm text-gray-500 leading-relaxed">TechFlow Inc. is requesting three additions to the original scope. Approving will increase the total by <strong className="text-gray-900">$4,200</strong> and extend the deadline by <strong className="text-gray-900">2 weeks</strong>.</p>
                <div className="grid grid-cols-3 gap-6 mt-4">
                  {[
                    { label: "Additional cost", val: "+$4,200"  },
                    { label: "New total",        val: "$28,200"  },
                    { label: "New deadline",     val: "Nov 29"   },
                  ].map(s => (
                    <div key={s.label}>
                      <p className="text-xs text-gray-400 mb-0.5">{s.label}</p>
                      <p className="text-base font-semibold text-gray-900">{s.val}</p>
                    </div>
                  ))}
                </div>
              </div>

              <Divider />

              {/* Scope items */}
              <div>
                <SectionLabel>New scope items</SectionLabel>
                <div>
                  {INITIAL_SCOPE.map((item, i) => (
                    <div key={item.id} className={`flex items-start justify-between py-3 ${i < INITIAL_SCOPE.length - 1 ? "border-b border-gray-50" : ""}`}>
                      <div className="flex items-start gap-3 flex-1 min-w-0">
                        <span className="text-xs text-gray-300 font-mono mt-0.5 w-4">{i + 1}</span>
                        <div className="min-w-0">
                          <p className="text-sm text-gray-900">{item.title}</p>
                          <p className="text-xs text-gray-400 mt-0.5">{item.detail}</p>
                          <div className="flex items-center gap-2 mt-1">
                            <Tag>Milestone {item.milestone}</Tag>
                            <Tag>{item.hours}h</Tag>
                          </div>
                        </div>
                      </div>
                      <p className="text-sm font-medium text-gray-900 tabular-nums ml-4 flex-shrink-0">{usd(item.cost)}</p>
                    </div>
                  ))}
                </div>
              </div>

              <Divider />

              {/* Financial table */}
              <div>
                <SectionLabel>Financial impact</SectionLabel>
                <div>
                  <div className="grid grid-cols-[1fr_auto_auto_auto] gap-4 pb-2 border-b border-gray-100">
                    <p className="text-xs text-gray-400">Item</p>
                    <p className="text-xs text-gray-400 text-right">Before</p>
                    <p className="text-xs text-gray-400 text-right">Change</p>
                    <p className="text-xs text-gray-400 text-right">After</p>
                  </div>
                  {[
                    { item: "Original agreement",   before: 24000, delta: 0,    after: 24000 },
                    { item: "Recommendation engine",before: 0,     delta: 2200, after: 2200  },
                    { item: "Klaviyo integration",  before: 0,     delta: 1200, after: 1200  },
                    { item: "Loyalty dashboard",    before: 0,     delta: 800,  after: 800   },
                  ].map((r, i) => (
                    <div key={i} className="grid grid-cols-[1fr_auto_auto_auto] gap-4 py-2.5 border-b border-gray-50">
                      <p className="text-sm text-gray-700">{r.item}</p>
                      <p className="text-sm text-gray-400 tabular-nums text-right">{r.before > 0 ? usd(r.before) : "—"}</p>
                      <p className="text-sm tabular-nums text-right">{r.delta > 0 ? <span className="text-violet-600 font-medium">+{usd(r.delta)}</span> : <span className="text-gray-300">—</span>}</p>
                      <p className="text-sm font-medium text-gray-900 tabular-nums text-right">{usd(r.after)}</p>
                    </div>
                  ))}
                  <div className="grid grid-cols-[1fr_auto_auto_auto] gap-4 pt-3">
                    <p className="text-sm font-semibold text-gray-900">Total</p>
                    <p className="text-sm text-gray-400 tabular-nums text-right line-through">{usd(24000)}</p>
                    <p className="text-sm font-semibold text-violet-600 tabular-nums text-right">+{usd(4200)}</p>
                    <p className="text-sm font-bold text-gray-900 tabular-nums text-right">{usd(28200)}</p>
                  </div>
                </div>
              </div>

              <Divider />

              {/* Timeline */}
              <div>
                <SectionLabel>Timeline impact</SectionLabel>
                <div className="flex items-center gap-8 mb-4">
                  <div>
                    <p className="text-xs text-gray-400 mb-0.5">Original deadline</p>
                    <p className="text-sm text-gray-400 line-through">Nov 15, 2024</p>
                  </div>
                  <ChevronRight className="w-4 h-4 text-gray-300" />
                  <div>
                    <p className="text-xs text-gray-400 mb-0.5">Revised deadline</p>
                    <p className="text-sm font-semibold text-gray-900">Nov 29, 2024 <span className="text-violet-600 font-normal">(+2 weeks)</span></p>
                  </div>
                </div>
                <div className="space-y-2">
                  {[
                    { n: 3, name: "Frontend Development", before: 8000, after: 10200, note: "Includes recommendation engine + Klaviyo" },
                    { n: 4, name: "Backend Integration",  before: 4000, after: 4800,  note: "Includes loyalty dashboard API"           },
                  ].map(m => (
                    <div key={m.n} className="flex items-center justify-between py-2.5 border-b border-gray-50">
                      <div>
                        <p className="text-sm text-gray-900">Milestone {m.n} — {m.name}</p>
                        <p className="text-xs text-gray-400">{m.note}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-xs text-gray-400 line-through tabular-nums">{usd(m.before)}</p>
                        <p className="text-sm font-medium text-gray-900 tabular-nums">{usd(m.after)}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Propose tab */}
          {tab === "propose" && (
            <div className="px-6 py-6 max-w-2xl space-y-6">
              {proposed ? (
                <div className="text-center py-12">
                  <CheckCircle2 className="w-8 h-8 text-emerald-500 mx-auto mb-3" />
                  <h2 className="text-base font-semibold text-gray-900 mb-1">Proposal sent</h2>
                  <p className="text-sm text-gray-400 mb-5">TechFlow has been notified and will review your proposed changes.</p>
                  <button onClick={() => { setProposed(false); setTab("review"); }} className="text-sm text-violet-600 hover:text-violet-700 font-medium transition-colors">Back to review →</button>
                </div>
              ) : (
                <>
                  <div>
                    <h2 className="text-sm font-medium text-gray-900 mb-0.5">Propose additional work</h2>
                    <p className="text-sm text-gray-400">Add scope items, costs, and milestones. Both sides must approve before work begins.</p>
                  </div>

                  {/* Existing items */}
                  {scopeItems.length > 0 && (
                    <div>
                      <SectionLabel>Proposed additions</SectionLabel>
                      <div>
                        {scopeItems.map((item, i) => (
                          <div key={item.id} className={`flex items-center gap-3 py-2.5 group ${i < scopeItems.length - 1 ? "border-b border-gray-50" : ""}`}>
                            <span className="text-xs text-gray-300 font-mono w-4">{i + 1}</span>
                            <div className="flex-1 min-w-0">
                              <p className="text-sm text-gray-900">{item.title}</p>
                              <p className="text-xs text-gray-400">M{item.milestone} · {item.hours}h</p>
                            </div>
                            <p className="text-sm font-medium text-gray-900 tabular-nums">{usd(item.cost)}</p>
                            <button onClick={() => removeItem(item.id)} className="text-gray-300 hover:text-red-500 transition-colors opacity-0 group-hover:opacity-100 p-1">
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        ))}
                      </div>
                      <div className="flex justify-between pt-3">
                        <p className="text-xs text-gray-400">Additional cost</p>
                        <p className="text-sm font-semibold text-violet-600 tabular-nums">+{usd(totalAdded)}</p>
                      </div>
                    </div>
                  )}

                  {/* Add item form */}
                  <div className="border border-dashed border-gray-200 rounded-lg p-4 space-y-3">
                    <p className="text-xs font-medium text-gray-600">Add scope item</p>
                    <input value={newTitle} onChange={e => setNewTitle(e.target.value)} placeholder="What needs to be done?" className="w-full text-sm bg-white border border-gray-200 rounded-lg px-3 py-2 text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-1 focus:ring-violet-500 focus:border-violet-500" />
                    <input value={newDetail} onChange={e => setNewDetail(e.target.value)} placeholder="Brief description (optional)" className="w-full text-sm bg-white border border-gray-200 rounded-lg px-3 py-2 text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-1 focus:ring-violet-500 focus:border-violet-500" />
                    <div className="grid grid-cols-3 gap-2">
                      <div>
                        <label className="block text-[10px] font-medium text-gray-400 uppercase tracking-wider mb-1">Milestone</label>
                        <select value={newMilestone} onChange={e => setNewMilestone(Number(e.target.value))} className="w-full text-sm bg-white border border-gray-200 rounded-lg px-3 py-2 text-gray-800 focus:outline-none focus:ring-1 focus:ring-violet-500">
                          {[1,2,3,4,5].map(n => <option key={n} value={n}>M{n}</option>)}
                        </select>
                      </div>
                      <div>
                        <label className="block text-[10px] font-medium text-gray-400 uppercase tracking-wider mb-1">Cost (USD)</label>
                        <input value={newCost} onChange={e => setNewCost(e.target.value)} type="number" min="0" placeholder="0" className="w-full text-sm bg-white border border-gray-200 rounded-lg px-3 py-2 text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-1 focus:ring-violet-500" />
                      </div>
                      <div>
                        <label className="block text-[10px] font-medium text-gray-400 uppercase tracking-wider mb-1">Hours</label>
                        <input value={newHours} onChange={e => setNewHours(e.target.value)} type="number" min="0" placeholder="0" className="w-full text-sm bg-white border border-gray-200 rounded-lg px-3 py-2 text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-1 focus:ring-violet-500" />
                      </div>
                    </div>
                    <button onClick={addItem} disabled={!newTitle.trim() || !newCost} className="flex items-center gap-1.5 text-sm text-violet-600 font-medium hover:text-violet-700 transition-colors disabled:opacity-40 disabled:cursor-not-allowed">
                      <Plus className="w-4 h-4" /> Add to proposal
                    </button>
                  </div>

                  {/* Deadline */}
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1.5">Revised deadline</label>
                    <div className="flex items-center gap-3">
                      <input value={proposedDeadline} onChange={e => setProposedDeadline(e.target.value)} className="text-sm bg-white border border-gray-200 rounded-lg px-3 py-2 text-gray-800 focus:outline-none focus:ring-1 focus:ring-violet-500 flex-1" />
                      <p className="text-xs text-gray-400 flex-shrink-0">Was Nov 15, 2024</p>
                    </div>
                  </div>

                  {scopeItems.length > 0 && (
                    <div className="border border-violet-100 rounded-lg p-4 space-y-3 bg-violet-50/40">
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <p className="text-xs text-gray-400 mb-0.5">New total</p>
                          <p className="text-lg font-semibold text-gray-900 tabular-nums">{usd(newTotal)}</p>
                        </div>
                        <div>
                          <p className="text-xs text-gray-400 mb-0.5">New deadline</p>
                          <p className="text-sm font-semibold text-gray-900">{proposedDeadline.split(",")[0]}</p>
                        </div>
                      </div>
                      <button onClick={submitProposal} disabled={proposing}
                        className="w-full flex items-center justify-center gap-2 bg-violet-600 text-white py-2.5 rounded-lg text-sm font-medium hover:bg-violet-700 transition-colors disabled:opacity-50">
                        {proposing ? <><RefreshCw className="w-4 h-4 animate-spin" /> Sending…</> : <><Send className="w-4 h-4" /> Send proposal to TechFlow</>}
                      </button>
                    </div>
                  )}
                </>
              )}
            </div>
          )}

          {/* History tab */}
          {tab === "history" && (
            <div className="px-6 py-6 max-w-2xl">
              <div className="space-y-0 relative">
                <div className="absolute left-3 top-4 bottom-4 w-px bg-gray-100" />
                {ALL_VERSIONS.map((v, i) => (
                  <button key={v.v} onClick={() => setSelectedVersion(v.v)}
                    className={`w-full text-left flex gap-4 pb-6 relative ${selectedVersion === v.v ? "" : "opacity-60 hover:opacity-80"} transition-opacity`}>
                    <div className={`w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 z-10 ring-4 ring-white ${v.current ? "bg-violet-600 text-white" : v.signed ? "bg-emerald-100 text-emerald-700" : "bg-gray-100 text-gray-400"}`}>
                      {v.signed ? <Check className="w-3 h-3" /> : <Clock className="w-3 h-3" />}
                    </div>
                    <div className={`flex-1 border rounded-lg p-4 transition-colors ${selectedVersion === v.v ? "border-violet-200 bg-violet-50/30" : "border-gray-100"}`}>
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <span className={`text-[10px] font-mono font-semibold px-1.5 py-0.5 rounded ${v.current ? "bg-violet-100 text-violet-600" : "bg-gray-100 text-gray-500"}`}>{v.v}</span>
                          <p className="text-sm font-medium text-gray-900">{v.label}</p>
                        </div>
                        <div className="text-right">
                          <p className="text-sm font-medium text-gray-900 tabular-nums">{usd(v.total)}</p>
                          <p className="text-xs text-gray-400">{v.deadline}</p>
                        </div>
                      </div>
                      <p className="text-xs text-gray-500 mb-1">{v.author} · <span className="font-mono">{v.date}</span></p>
                      {v.changes.length > 0 && (
                        <div className="space-y-0.5 mt-2">
                          {v.changes.map((c, ci) => (
                            <div key={ci} className="flex items-center gap-1.5 text-[11px]">
                              <span className={c.startsWith("+") ? "text-violet-600" : "text-amber-600"}>{c}</span>
                            </div>
                          ))}
                        </div>
                      )}
                      {v.signed && <p className="text-[11px] text-emerald-600 mt-2 flex items-center gap-1"><Check className="w-3 h-3" /> Both parties signed</p>}
                      {v.current && !v.signed && <p className="text-[11px] text-amber-600 mt-2 flex items-center gap-1"><Clock className="w-3 h-3" /> Awaiting approval from Sarah Chen</p>}
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Sidebar */}
        <div className="w-64 border-l border-gray-100 flex-shrink-0 overflow-y-auto p-5 space-y-6">
          {/* Approval status */}
          <div>
            <SectionLabel>Approval status</SectionLabel>
            <div className="space-y-3">
              {[
                { name: "TechFlow Inc.", initials: "TF", approved: true,      time: "Aug 5 · 9:30 AM", role: "Proposed" },
                { name: "Sarah Chen",   initials: "SC", approved: myApproved, time: myApproved ? "Just now" : "Awaiting", role: "Freelancer" },
              ].map((party, i) => (
                <div key={i} className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <div className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold ${i === 0 ? "bg-gray-100 text-gray-600" : "bg-violet-100 text-violet-700"}`}>{party.initials}</div>
                    <div>
                      <p className="text-xs font-medium text-gray-900">{party.name}</p>
                      <p className="text-[10px] text-gray-400">{party.time}</p>
                    </div>
                  </div>
                  {party.approved
                    ? <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                    : <div className="w-4 h-4 rounded-full border-2 border-gray-200" />}
                </div>
              ))}
            </div>
          </div>

          <Divider />

          {/* Cost summary */}
          <div>
            <SectionLabel>Cost summary</SectionLabel>
            <div className="space-y-1.5">
              {[
                { label: "Original agreement",        val: "$24,000" },
                { label: "Changes #1 (approved)",     val: "+$1,200" },
                { label: "Changes #2 (this)",          val: "+$4,200", highlight: true },
              ].map(r => (
                <div key={r.label} className="flex justify-between">
                  <p className="text-xs text-gray-400">{r.label}</p>
                  <p className={`text-xs font-medium tabular-nums ${r.highlight ? "text-violet-600" : "text-gray-700"}`}>{r.val}</p>
                </div>
              ))}
              <Divider />
              <div className="flex justify-between pt-1">
                <p className="text-xs font-medium text-gray-900">New total</p>
                <p className="text-sm font-semibold text-gray-900 tabular-nums">$29,400</p>
              </div>
            </div>
          </div>

          <Divider />

          {/* Actions */}
          {myApproved ? (
            <div className="text-center">
              <CheckCircle2 className="w-6 h-6 text-emerald-500 mx-auto mb-2" />
              <p className="text-sm font-medium text-gray-900 mb-0.5">You approved</p>
              <p className="text-xs text-gray-400">Waiting for both sides to sign.</p>
            </div>
          ) : declined ? (
            <div className="text-center">
              <X className="w-6 h-6 text-red-400 mx-auto mb-2" />
              <p className="text-sm font-medium text-gray-900 mb-0.5">You declined</p>
              <p className="text-xs text-gray-400">TechFlow has been notified.</p>
            </div>
          ) : (
            <div className="space-y-2">
              <button onClick={approve} disabled={approving}
                className="w-full flex items-center justify-center gap-2 bg-violet-600 text-white py-2.5 rounded-lg text-sm font-medium hover:bg-violet-700 transition-colors disabled:opacity-50">
                {approving ? <><RefreshCw className="w-4 h-4 animate-spin" /> Approving…</> : <><Check className="w-4 h-4" /> Approve Changes</>}
              </button>
              <button onClick={() => setDeclined(true)} className="w-full flex items-center justify-center text-red-500 border border-red-100 py-2.5 rounded-lg text-sm font-medium hover:bg-red-50 transition-colors">
                Decline
              </button>
              <button onClick={() => setTab("propose")} className="w-full flex items-center justify-center gap-2 border border-gray-200 text-gray-600 py-2.5 rounded-lg text-sm font-medium hover:bg-gray-50 transition-colors">
                <Pencil className="w-3.5 h-3.5" /> Counter-offer
              </button>
              <div className="flex items-start gap-2 text-[11px] text-gray-400 pt-1">
                <Info className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" />
                Approving adds $4,200 and extends the deadline 2 weeks.
              </div>
            </div>
          )}

          <Divider />

          {/* Quick version picker */}
          <div>
            <SectionLabel>Versions</SectionLabel>
            <div className="space-y-1.5">
              {ALL_VERSIONS.map(v => (
                <button key={v.v} onClick={() => { setSelectedVersion(v.v); setTab("history"); }}
                  className="w-full flex items-center justify-between text-left hover:bg-gray-50 rounded-md p-1.5 -mx-1.5 transition-colors">
                  <div className="flex items-center gap-2">
                    <span className={`text-[10px] font-mono font-semibold px-1.5 py-0.5 rounded ${v.current ? "bg-violet-100 text-violet-600" : "bg-gray-100 text-gray-500"}`}>{v.v}</span>
                    <p className="text-xs text-gray-600 truncate">{v.label}</p>
                  </div>
                  <p className="text-[10px] font-mono text-gray-400 flex-shrink-0 ml-2">{usd(v.total)}</p>
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Contacts ───────────────────────────────────────────────────────────────────

function ContactsListView() {
  const navigate = useNavigate();
  const [search, setSearch] = useState("");
  const [inviteEmail, setInviteEmail] = useState("");
  const [showInvite, setShowInvite] = useState(false);
  const [invited, setInvited] = useState(false);

  const filtered = CONTACTS.filter(c =>
    c.name.toLowerCase().includes(search.toLowerCase()) ||
    c.company.toLowerCase().includes(search.toLowerCase()) ||
    c.email.toLowerCase().includes(search.toLowerCase())
  );

  const sendInvite = () => {
    if (!inviteEmail.trim()) return;
    setInvited(true);
    setTimeout(() => { setInvited(false); setInviteEmail(""); setShowInvite(false); }, 2500);
  };

  return (
    <div className="flex-1 overflow-y-auto" style={{ fontFamily: "'Inter', system-ui, sans-serif" }}>
      <div className="max-w-4xl mx-auto px-6 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-xl font-semibold text-gray-900 tracking-tight">Contacts</h1>
            <p className="text-sm text-gray-400 mt-0.5">{CONTACTS.length} people you've worked with</p>
          </div>
          <button onClick={() => setShowInvite(v => !v)} className="flex items-center gap-1.5 border border-gray-200 text-gray-700 text-sm font-medium px-3.5 py-2 rounded-lg hover:bg-gray-50 transition-colors">
            <UserPlus className="w-3.5 h-3.5" /> Invite by email
          </button>
        </div>

        {/* Invite form */}
        {showInvite && (
          <div className="mb-6 border border-gray-100 rounded-lg p-4 flex items-center gap-3">
            <Mail className="w-4 h-4 text-gray-400 flex-shrink-0" />
            <input
              type="email"
              value={inviteEmail}
              onChange={e => setInviteEmail(e.target.value)}
              onKeyDown={e => e.key === "Enter" && sendInvite()}
              placeholder="colleague@company.com"
              className="flex-1 text-sm text-gray-800 placeholder-gray-400 bg-transparent focus:outline-none"
              autoFocus
            />
            {invited ? (
              <span className="text-xs text-emerald-600 font-medium flex items-center gap-1"><Check className="w-3.5 h-3.5" /> Invite sent</span>
            ) : (
              <div className="flex gap-2 flex-shrink-0">
                <button onClick={sendInvite} disabled={!inviteEmail.trim()} className="text-xs bg-violet-600 text-white px-3 py-1.5 rounded-md hover:bg-violet-700 transition-colors font-medium disabled:opacity-40">Send invite</button>
                <button onClick={() => setShowInvite(false)} className="text-xs text-gray-400 hover:text-gray-600 px-2 transition-colors">Cancel</button>
              </div>
            )}
          </div>
        )}

        {/* Search */}
        <div className="relative mb-6">
          <Search className="w-3.5 h-3.5 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input type="text" value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Search by name, company, or email…"
            className="w-full pl-9 pr-4 py-2 text-sm bg-gray-50 border border-gray-200 rounded-lg text-gray-700 placeholder-gray-400 focus:outline-none focus:ring-1 focus:ring-violet-500 focus:border-violet-500 focus:bg-white transition-all" />
        </div>

        {/* Stats row */}
        <div className="grid grid-cols-3 gap-8 mb-8">
          {[
            { label: "Total contacts", value: String(CONTACTS.length) },
            { label: "Projects together", value: String(CONTACTS.reduce((s, c) => s + c.projects, 0)) },
            { label: "Total billed", value: usd(CONTACTS.reduce((s, c) => s + c.totalValue, 0)) },
          ].map(s => (
            <div key={s.label}>
              <p className="text-xs text-gray-400 mb-0.5">{s.label}</p>
              <p className="text-lg font-semibold text-gray-900 tracking-tight">{s.value}</p>
            </div>
          ))}
        </div>

        <Divider />

        {/* Table */}
        <div className="mt-4">
          <div className="grid grid-cols-[1fr_auto_auto_auto] gap-4 pb-2 border-b border-gray-100">
            <p className="text-xs text-gray-400">Person</p>
            <p className="text-xs text-gray-400 hidden md:block">Last project</p>
            <p className="text-xs text-gray-400 hidden sm:block">Projects</p>
            <p className="text-xs text-gray-400"></p>
          </div>

          {filtered.length === 0 && (
            <div className="py-12 text-center">
              <Users className="w-6 h-6 text-gray-200 mx-auto mb-2" />
              <p className="text-sm text-gray-400">No contacts match "{search}"</p>
            </div>
          )}

          {filtered.map((c, i) => (
            <div key={c.id} className={`grid grid-cols-[1fr_auto_auto_auto] gap-4 py-3.5 items-center ${i < filtered.length - 1 ? "border-b border-gray-50" : ""}`}>
              {/* Person */}
              <button onClick={() => navigate(`/contacts/${c.id}`)} className="flex items-center gap-3 text-left group min-w-0">
                <div className={`w-8 h-8 rounded-full ${c.bg} ${c.text} flex items-center justify-center text-xs font-bold flex-shrink-0`}>{c.initials}</div>
                <div className="min-w-0">
                  <p className="text-sm font-medium text-gray-900 group-hover:text-violet-600 transition-colors truncate">{c.name}</p>
                  <div className="flex items-center gap-1.5 text-xs text-gray-400 mt-0.5">
                    <Building2 className="w-3 h-3 flex-shrink-0" />
                    <span className="truncate">{c.title}, {c.company}</span>
                  </div>
                </div>
              </button>

              {/* Last project */}
              <div className="hidden md:block min-w-0">
                <p className="text-sm text-gray-600 truncate max-w-[180px]">{c.lastProject}</p>
                <p className="text-xs text-gray-400">{c.lastWorked}</p>
              </div>

              {/* Project count */}
              <p className="text-sm text-gray-500 hidden sm:block tabular-nums text-center">{c.projects}</p>

              {/* Actions */}
              <div className="flex items-center gap-2 flex-shrink-0">
                <button onClick={() => navigate(`/agreements/new?client=${encodeURIComponent(c.email)}`)}
                  className="text-xs text-violet-600 hover:text-violet-700 font-medium transition-colors whitespace-nowrap">
                  New agreement
                </button>
                <button onClick={() => navigate(`/contacts/${c.id}`)}
                  className="text-xs text-gray-400 hover:text-gray-600 transition-colors">
                  View
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function ContactProfileView() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const contact = CONTACTS.find(c => c.id === id) ?? CONTACTS[0];
  const projects = CONTACT_PROJECTS[contact.id] ?? [];

  return (
    <div className="flex-1 overflow-y-auto" style={{ fontFamily: "'Inter', system-ui, sans-serif" }}>
      <div className="max-w-3xl mx-auto px-6 py-8">
        <Breadcrumb items={[{ label: "Contacts", path: "/contacts" }, { label: contact.name }]} />

        {/* Contact card */}
        <div className="flex items-start justify-between gap-6 mb-8">
          <div className="flex items-start gap-4">
            <div className={`w-14 h-14 rounded-full ${contact.bg} ${contact.text} flex items-center justify-center text-lg font-bold flex-shrink-0`}>
              {contact.initials}
            </div>
            <div>
              <h1 className="text-xl font-semibold text-gray-900 tracking-tight">{contact.name}</h1>
              <div className="flex items-center gap-1.5 text-sm text-gray-500 mt-0.5">
                <Building2 className="w-3.5 h-3.5 flex-shrink-0" />
                {contact.title}, {contact.company}
              </div>
              <a href={`mailto:${contact.email}`} className="flex items-center gap-1.5 text-xs text-gray-400 hover:text-violet-600 transition-colors mt-1">
                <Mail className="w-3 h-3" /> {contact.email}
              </a>
            </div>
          </div>
          <button onClick={() => navigate("/agreements/new")}
            className="flex items-center gap-1.5 bg-violet-600 text-white text-sm font-medium px-4 py-2 rounded-lg hover:bg-violet-700 transition-colors flex-shrink-0">
            <Plus className="w-3.5 h-3.5" /> New agreement
          </button>
        </div>

        <Divider />

        {/* Stats */}
        <div className="grid grid-cols-3 gap-8 py-6">
          {[
            { label: "Projects together",  value: String(contact.projects) },
            { label: "Total value",        value: usd(contact.totalValue)   },
            { label: "Working since",      value: contact.since             },
          ].map(s => (
            <div key={s.label}>
              <p className="text-xs text-gray-400 mb-0.5">{s.label}</p>
              <p className="text-base font-semibold text-gray-900">{s.value}</p>
            </div>
          ))}
        </div>

        <Divider />

        {/* Shared projects */}
        <div className="py-6">
          <h2 className="text-sm font-medium text-gray-900 mb-4">Shared projects</h2>
          <div>
            <div className="grid grid-cols-[1fr_auto_auto_auto] gap-4 pb-2 border-b border-gray-100">
              <p className="text-xs text-gray-400">Project</p>
              <p className="text-xs text-gray-400 hidden sm:block">Milestones</p>
              <p className="text-xs text-gray-400">Value</p>
              <p className="text-xs text-gray-400">Status</p>
            </div>
            {projects.map((p, i) => (
              <div key={i} className={`grid grid-cols-[1fr_auto_auto_auto] gap-4 py-3 items-center ${i < projects.length - 1 ? "border-b border-gray-50" : ""}`}>
                <div>
                  <p className="text-sm text-gray-900">{p.name}</p>
                  <p className="text-xs text-gray-400">{p.date}</p>
                </div>
                <p className="text-xs text-gray-400 hidden sm:block text-center">{p.milestones}</p>
                <p className="text-sm font-medium text-gray-700 tabular-nums">{usd(p.value)}</p>
                <StatusBadge status={p.status} />
              </div>
            ))}
          </div>
        </div>

        <Divider />

        {/* Contact info */}
        <div className="py-6">
          <h2 className="text-sm font-medium text-gray-900 mb-4">Contact details</h2>
          <div className="space-y-3">
            {[
              { Icon: Mail,      label: "Email",   value: contact.email   },
              { Icon: Building2, label: "Company", value: contact.company },
              { Icon: Users,     label: "Role",    value: contact.title   },
            ].map(row => (
              <div key={row.label} className="flex items-center gap-3">
                <row.Icon className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" />
                <span className="text-xs text-gray-400 w-14 flex-shrink-0">{row.label}</span>
                <span className="text-sm text-gray-700">{row.value}</span>
              </div>
            ))}
          </div>
        </div>

        <Divider />

        <div className="pt-6">
          <button onClick={() => navigate("/agreements/new")}
            className="w-full border border-dashed border-gray-200 rounded-lg py-4 text-sm text-gray-400 hover:border-violet-300 hover:text-violet-600 transition-colors flex items-center justify-center gap-2">
            <Plus className="w-4 h-4" /> Start a new agreement with {contact.name.split(" ")[0]}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Placeholder views ──────────────────────────────────────────────────────────

function NotificationsView() {
  return (
    <div className="flex-1 flex flex-col items-center justify-center text-center px-6 bg-white" style={{ fontFamily: "'Inter', system-ui, sans-serif" }}>
      <Bell className="w-6 h-6 text-gray-200 mb-3" />
      <p className="text-sm text-gray-500 font-medium">Notifications</p>
      <p className="text-xs text-gray-400 mt-1">Coming soon</p>
    </div>
  );
}

function SettingsView() {
  return (
    <div className="flex-1 flex flex-col items-center justify-center text-center px-6 bg-white" style={{ fontFamily: "'Inter', system-ui, sans-serif" }}>
      <Settings className="w-6 h-6 text-gray-200 mb-3" />
      <p className="text-sm text-gray-500 font-medium">Settings</p>
      <p className="text-xs text-gray-400 mt-1">Coming soon</p>
    </div>
  );
}

// ── Router ─────────────────────────────────────────────────────────────────────

export const router = createBrowserRouter([
  {
    path: "/",
    children: [
      { index: true, Component: LandingPage },
      {
        Component: AppShell,
        children: [
          { path: "dashboard",            Component: DashboardView        },
          { path: "agreements",           Component: AgreementsListView   },
          { path: "agreements/new",       Component: ContractBuilderView  },
          { path: "agreements/:id",       Component: AgreementReviewView  },
          { path: "payment/:id",          Component: EscrowFundingView    },
          { path: "projects/:id",         Component: ProjectWorkspaceView },
          { path: "projects/:id/review",  Component: MilestoneReviewView  },
          { path: "projects/:id/changes", Component: ChangeOrderView      },
          { path: "contacts",             Component: ContactsListView     },
          { path: "contacts/:id",         Component: ContactProfileView   },
          { path: "notifications",        Component: NotificationsView    },
          { path: "settings",             Component: SettingsView         },
          { path: "*", Component: () => <Navigate to="/dashboard" replace /> },
        ],
      },
    ],
  },
]);
