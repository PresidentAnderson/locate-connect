/**
 * Reward/Bounty Management System Types (LC-FEAT-025)
 * System to manage rewards offered for information leading to finding missing persons
 */

export type RewardStatus = 'draft' | 'pending_approval' | 'active' | 'claimed' | 'paid' | 'expired' | 'cancelled';
export type ClaimStatus = 'submitted' | 'under_review' | 'verified' | 'approved' | 'rejected' | 'paid';
export type FundingSource = 'family' | 'organization' | 'crowdfunded' | 'government' | 'anonymous';
export type PaymentMethod = 'check' | 'wire_transfer' | 'escrow_release';

export interface Reward {
  id: string;
  caseId: string;
  title: string;
  description: string;
  amount: number;
  currency: string;
  fundingSource: FundingSource;
  fundedByName?: string;
  fundedByOrganization?: string;
  status: RewardStatus;
  termsAndConditions: string;
  eligibilityCriteria?: string;
  expirationDate?: string;
  isAnonymousDonor: boolean;
  escrowAccountId?: string;
  escrowVerified: boolean;
  escrowVerifiedAt?: string;
  displayOnCasePage: boolean;
  requiresIdentityVerification: boolean;
  requiresLEVerification: boolean;
  approvedBy?: string;
  approvedAt?: string;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

export interface RewardInput {
  caseId: string;
  title: string;
  description: string;
  amount: number;
  currency?: string;
  fundingSource: FundingSource;
  fundedByName?: string;
  fundedByOrganization?: string;
  termsAndConditions: string;
  eligibilityCriteria?: string;
  expirationDate?: string;
  isAnonymousDonor?: boolean;
  displayOnCasePage?: boolean;
  requiresIdentityVerification?: boolean;
  requiresLEVerification?: boolean;
}

export interface RewardClaim {
  id: string;
  rewardId: string;
  tipId?: string;
  leadId?: string;
  claimantType: 'anonymous' | 'identified';
  claimantName?: string;
  claimantEmail?: string;
  claimantPhone?: string;
  claimantAddress?: string;
  claimantCity?: string;
  claimantProvince?: string;
  claimantPostalCode?: string;
  claimantCountry?: string;
  claimDescription: string;
  evidenceDescription?: string;
  evidenceAttachments: {
    fileName: string;
    fileUrl: string;
    fileType: string;
    uploadedAt: string;
  }[];
  status: ClaimStatus;
  submittedAt: string;
  identityVerified: boolean;
  identityVerifiedAt?: string;
  identityVerifiedBy?: string;
  leVerified: boolean;
  leVerifiedAt?: string;
  leVerifiedBy?: string;
  leVerificationNotes?: string;
  reviewedBy?: string;
  reviewedAt?: string;
  reviewNotes?: string;
  approvedBy?: string;
  approvedAt?: string;
  rejectionReason?: string;
  paymentAmount?: number;
  paymentMethod?: PaymentMethod;
  paymentDate?: string;
  paymentReference?: string;
  taxDocumentSent?: boolean;
  taxDocumentSentAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface RewardClaimInput {
  rewardId: string;
  tipId?: string;
  leadId?: string;
  claimantType: 'anonymous' | 'identified';
  claimantName?: string;
  claimantEmail?: string;
  claimantPhone?: string;
  claimDescription: string;
  evidenceDescription?: string;
}

export interface EscrowAccount {
  id: string;
  rewardId: string;
  accountNumber: string;
  bankName: string;
  accountType: 'trust' | 'escrow' | 'holding';
  balance: number;
  currency: string;
  fundedAt?: string;
  fundedAmount?: number;
  releasedAt?: string;
  releasedAmount?: number;
  releasedTo?: string;
  status: 'pending' | 'funded' | 'partially_released' | 'fully_released' | 'refunded';
  verifiedBy?: string;
  verifiedAt?: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface RewardTransaction {
  id: string;
  rewardId: string;
  escrowAccountId?: string;
  claimId?: string;
  transactionType: 'deposit' | 'withdrawal' | 'payment' | 'refund' | 'fee';
  amount: number;
  currency: string;
  description: string;
  reference?: string;
  fromAccount?: string;
  toAccount?: string;
  status: 'pending' | 'completed' | 'failed' | 'reversed';
  processedAt?: string;
  processedBy?: string;
  failureReason?: string;
  createdAt: string;
  updatedAt: string;
}

export interface RewardAuditLog {
  id: string;
  rewardId: string;
  claimId?: string;
  action: string;
  actionDetails: Record<string, unknown>;
  performedBy: string;
  performedByName?: string;
  performedAt: string;
  ipAddress?: string;
  userAgent?: string;
}

export interface FraudIndicator {
  id: string;
  claimId: string;
  indicatorType: 'duplicate_claim' | 'suspicious_ip' | 'known_fraudster' | 'inconsistent_info' | 'rapid_submission' | 'pattern_match';
  severity: 'low' | 'medium' | 'high';
  description: string;
  detectedAt: string;
  reviewedBy?: string;
  reviewedAt?: string;
  isFalsePositive?: boolean;
  notes?: string;
}

export interface TaxDocument {
  id: string;
  claimId: string;
  recipientName: string;
  recipientAddress: string;
  recipientTaxId?: string;
  documentType: '1099_misc' | 't4a' | 'other';
  taxYear: number;
  amount: number;
  generatedAt: string;
  sentAt?: string;
  sentVia?: 'email' | 'mail';
  fileUrl?: string;
}

export interface RewardPublicDisplay {
  id: string;
  caseId: string;
  caseName: string;
  caseNumber: string;
  totalRewardAmount: number;
  currency: string;
  fundingSources: string[];
  termsAndConditions: string;
  expirationDate?: string;
  contactInfo?: string;
  isActive: boolean;
}

export interface RewardStats {
  totalActiveRewards: number;
  totalRewardAmount: number;
  totalClaimsSubmitted: number;
  totalClaimsApproved: number;
  totalClaimsPaid: number;
  totalAmountPaid: number;
  averageClaimProcessingDays: number;
  claimApprovalRate: number;
}

export interface RewardDashboard {
  stats: RewardStats;
  activeRewards: Reward[];
  pendingClaims: RewardClaim[];
  recentTransactions: RewardTransaction[];
  fraudAlerts: FraudIndicator[];
}

// Display helpers
export const REWARD_STATUS_LABELS: Record<RewardStatus, string> = {
  draft: 'Draft',
  pending_approval: 'Pending Approval',
  active: 'Active',
  claimed: 'Claimed',
  paid: 'Paid',
  expired: 'Expired',
  cancelled: 'Cancelled',
};

export const CLAIM_STATUS_LABELS: Record<ClaimStatus, string> = {
  submitted: 'Submitted',
  under_review: 'Under Review',
  verified: 'Verified',
  approved: 'Approved',
  rejected: 'Rejected',
  paid: 'Paid',
};

export const FUNDING_SOURCE_LABELS: Record<FundingSource, string> = {
  family: 'Family',
  organization: 'Organization',
  crowdfunded: 'Crowdfunded',
  government: 'Government',
  anonymous: 'Anonymous Donor',
};

export const REWARD_STATUS_COLORS: Record<RewardStatus, string> = {
  draft: 'gray',
  pending_approval: 'yellow',
  active: 'green',
  claimed: 'blue',
  paid: 'cyan',
  expired: 'orange',
  cancelled: 'red',
};

export const CLAIM_STATUS_COLORS: Record<ClaimStatus, string> = {
  submitted: 'gray',
  under_review: 'yellow',
  verified: 'blue',
  approved: 'green',
  rejected: 'red',
  paid: 'cyan',
};
