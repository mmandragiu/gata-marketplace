import type { Db } from "@/lib/db/types";

export type CategoryKind = "specialized" | "casual";
export type JobStatus = "open" | "assigned" | "completed" | "cancelled";
export type Urgency = "urgent" | "week" | "flexible";
export type BidStatus = "pending" | "accepted" | "rejected";
export type RoleMode = "worker" | "client";
export type ReportReason = "spam" | "fraud" | "inappropriate" | "fake_profile" | "no_show" | "unlicensed" | "other";
export type ReportTarget = "profile" | "job" | "bid";

export type Tag = {
  id: string;
  slug: string;
  name: string;
  categoryId: string;
  requiresLicense: boolean;
  licenseNote: string | null;
};

export type Category = {
  id: string;
  slug: string;
  name: string;
  kind: CategoryKind;
  icon: string;
  description: string;
  sort: number;
  tags: Tag[];
};

export type WorkerTag = Tag & {
  yearsExperience: number;
  categoryName: string;
  categoryKind: CategoryKind;
};

export type PortfolioItem = { title: string; description: string };

export type ProfileSummary = {
  id: string;
  fullName: string;
  avatarUrl: string | null;
  city: string;
  isPremium: boolean;
  isVerified: boolean;
  isBanned: boolean;
  ratingAvg: number;
  ratingCount: number;
};

export type Profile = ProfileSummary & {
  userId: string;
  bio: string;
  roleMode: RoleMode;
  boostLevel: number;
  bannedReason: string | null;
  isAdmin: boolean;
  licenseInfo: string | null;
  hourlyRate: number | null;
  portfolio: PortfolioItem[];
  premiumSince: string | null;
  createdAt: string;
};

export type Worker = Profile & { tags: WorkerTag[]; completedJobs: number };

export type Job = {
  id: string;
  title: string;
  description: string;
  budget: number;
  city: string;
  location: string;
  isRemote: boolean;
  urgency: Urgency;
  status: JobStatus;
  bidCount: number;
  createdAt: string;
  completedAt: string | null;
  assignedBidId: string | null;
  assignedWorkerId: string | null;
  category: { id: string; slug: string; name: string; kind: CategoryKind; icon: string };
  tags: Tag[];
  client: ProfileSummary;
  /** Jobs of Premium clients are pinned and highlighted in the feed. */
  isPromoted: boolean;
};

export type Bid = {
  id: string;
  jobId: string;
  price: number;
  durationHours: number;
  message: string;
  status: BidStatus;
  createdAt: string;
  worker: ProfileSummary & { licenseInfo: string | null; tags: WorkerTag[] };
  /** Bids of Premium workers appear first, with a "Promovat" badge. */
  isPromoted: boolean;
};

export type MyBid = {
  id: string;
  price: number;
  durationHours: number;
  status: BidStatus;
  createdAt: string;
  job: { id: string; title: string; status: JobStatus; budget: number; location: string; clientName: string };
};

export type Review = {
  id: string;
  jobId: string;
  jobTitle: string;
  rating: number;
  comment: string;
  createdAt: string;
  serviceId: string | null;
  serviceName: string | null;
  direction: "client_to_worker" | "worker_to_client";
  reviewer: { id: string; fullName: string; avatarUrl: string | null };
};

export type Message = {
  id: string;
  jobId: string;
  senderId: string;
  senderName: string;
  body: string;
  createdAt: string;
};

export type Contact = { profileId: string; fullName: string; phone: string | null; email: string | null };

export type Viewer = { authUserId: string; profile: Profile } | null;

export type Ctx = { db: Db; viewer: Viewer };

export type MatchBreakdown = {
  tag: number;
  semantic: number;
  location: number;
  matchedTags: string[];
  missingTags: string[];
  semanticSource: "openai" | "local";
  licenseWarning: boolean;
};

export type MatchResult = {
  score: number;
  boost: number;
  rankScore: number;
  breakdown: MatchBreakdown;
};

export type RecommendedWorker = MatchResult & { worker: Worker };
export type RecommendedJob = MatchResult & { job: Job; alreadyBid: boolean };

export type MatchAnalysis = {
  score: number;
  verdict: string;
  strengths: string[];
  concerns: string[];
  source: "openai" | "local";
};
