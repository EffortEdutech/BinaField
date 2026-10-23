// GENERATED — DO NOT EDIT. Source: packages/domain/registry/*.json
export const DOMAIN_CONTRACT_SIGNATURE = '2c9476cffd22d9a76d1a0d8b5ed78a10b41230f1abc5944aad526142290781dc' as const;

export type TemplateState = 'DRAFT' | 'ACTIVE' | 'SUSPENDED' | 'ARCHIVED';
export type TemplateVersionState = 'DRAFT' | 'VALIDATED' | 'PUBLISHED' | 'ACTIVE' | 'SUPERSEDED' | 'ARCHIVED';
export type DeploymentState = 'DRAFT' | 'SCHEDULED' | 'ACTIVE' | 'PAUSED' | 'CLOSED' | 'ARCHIVED';
export type AssignmentState = 'PLANNED' | 'ASSIGNED' | 'IN_PROGRESS' | 'SUBMITTED' | 'COMPLETED' | 'CANCELLED';
export type SubmissionSessionState = 'CREATED' | 'IN_PROGRESS' | 'COMPLETE' | 'SUBMITTED' | 'ABANDONED';
export type SyncState = 'LOCAL_ONLY' | 'QUEUED' | 'SYNCING' | 'SYNC_FAILED' | 'RECONCILIATION_REQUIRED' | 'SYNCED';
export type SubmissionState = 'RECEIVED' | 'VALIDATING' | 'ACCEPTED' | 'REJECTED';
export type EvidenceState = 'LOCAL_ONLY' | 'UPLOAD_PENDING' | 'UPLOADING' | 'UPLOADED' | 'VERIFYING' | 'VERIFIED' | 'BOUND' | 'READY' | 'QUARANTINED' | 'PURGED';
export type WorkflowRunState = 'QUEUED' | 'RUNNING' | 'SUCCEEDED' | 'FAILED' | 'CANCELLED';
export type AnalyticalProjectionState = 'PENDING' | 'BUILDING' | 'CURRENT' | 'STALE' | 'FAILED' | 'REBUILDING';
export type MembershipState = 'INVITED' | 'ACTIVE' | 'SUSPENDED' | 'REVOKED';
export type DeviceState = 'REGISTERED' | 'ACTIVE' | 'SUSPENDED' | 'REVOKED';
export type ProjectState = 'DRAFT' | 'ACTIVE' | 'CLOSED' | 'ARCHIVED';

export const LIFECYCLE_STATES = {
  "Template": [
    "DRAFT",
    "ACTIVE",
    "SUSPENDED",
    "ARCHIVED"
  ],
  "TemplateVersion": [
    "DRAFT",
    "VALIDATED",
    "PUBLISHED",
    "ACTIVE",
    "SUPERSEDED",
    "ARCHIVED"
  ],
  "Deployment": [
    "DRAFT",
    "SCHEDULED",
    "ACTIVE",
    "PAUSED",
    "CLOSED",
    "ARCHIVED"
  ],
  "Assignment": [
    "PLANNED",
    "ASSIGNED",
    "IN_PROGRESS",
    "SUBMITTED",
    "COMPLETED",
    "CANCELLED"
  ],
  "SubmissionSession": [
    "CREATED",
    "IN_PROGRESS",
    "COMPLETE",
    "SUBMITTED",
    "ABANDONED"
  ],
  "Sync": [
    "LOCAL_ONLY",
    "QUEUED",
    "SYNCING",
    "SYNC_FAILED",
    "RECONCILIATION_REQUIRED",
    "SYNCED"
  ],
  "Submission": [
    "RECEIVED",
    "VALIDATING",
    "ACCEPTED",
    "REJECTED"
  ],
  "Evidence": [
    "LOCAL_ONLY",
    "UPLOAD_PENDING",
    "UPLOADING",
    "UPLOADED",
    "VERIFYING",
    "VERIFIED",
    "BOUND",
    "READY",
    "QUARANTINED",
    "PURGED"
  ],
  "WorkflowRun": [
    "QUEUED",
    "RUNNING",
    "SUCCEEDED",
    "FAILED",
    "CANCELLED"
  ],
  "AnalyticalProjection": [
    "PENDING",
    "BUILDING",
    "CURRENT",
    "STALE",
    "FAILED",
    "REBUILDING"
  ],
  "Membership": [
    "INVITED",
    "ACTIVE",
    "SUSPENDED",
    "REVOKED"
  ],
  "Device": [
    "REGISTERED",
    "ACTIVE",
    "SUSPENDED",
    "REVOKED"
  ],
  "Project": [
    "DRAFT",
    "ACTIVE",
    "CLOSED",
    "ARCHIVED"
  ]
} as const;

export const ALLOWED_TRANSITIONS = {
  "Template": [
    [
      "DRAFT",
      "ACTIVE"
    ],
    [
      "ACTIVE",
      "SUSPENDED"
    ],
    [
      "SUSPENDED",
      "ACTIVE"
    ],
    [
      "ACTIVE",
      "ARCHIVED"
    ],
    [
      "SUSPENDED",
      "ARCHIVED"
    ]
  ],
  "TemplateVersion": [
    [
      "DRAFT",
      "VALIDATED"
    ],
    [
      "VALIDATED",
      "DRAFT"
    ],
    [
      "VALIDATED",
      "PUBLISHED"
    ],
    [
      "PUBLISHED",
      "ACTIVE"
    ],
    [
      "ACTIVE",
      "SUPERSEDED"
    ],
    [
      "PUBLISHED",
      "ARCHIVED"
    ],
    [
      "SUPERSEDED",
      "ARCHIVED"
    ]
  ],
  "Deployment": [
    [
      "DRAFT",
      "SCHEDULED"
    ],
    [
      "DRAFT",
      "ACTIVE"
    ],
    [
      "SCHEDULED",
      "ACTIVE"
    ],
    [
      "ACTIVE",
      "PAUSED"
    ],
    [
      "PAUSED",
      "ACTIVE"
    ],
    [
      "ACTIVE",
      "CLOSED"
    ],
    [
      "PAUSED",
      "CLOSED"
    ],
    [
      "CLOSED",
      "ARCHIVED"
    ]
  ],
  "Assignment": [
    [
      "PLANNED",
      "ASSIGNED"
    ],
    [
      "ASSIGNED",
      "IN_PROGRESS"
    ],
    [
      "IN_PROGRESS",
      "SUBMITTED"
    ],
    [
      "SUBMITTED",
      "COMPLETED"
    ],
    [
      "PLANNED",
      "CANCELLED"
    ],
    [
      "ASSIGNED",
      "CANCELLED"
    ],
    [
      "IN_PROGRESS",
      "CANCELLED"
    ]
  ],
  "SubmissionSession": [
    [
      "CREATED",
      "IN_PROGRESS"
    ],
    [
      "IN_PROGRESS",
      "COMPLETE"
    ],
    [
      "COMPLETE",
      "IN_PROGRESS"
    ],
    [
      "COMPLETE",
      "SUBMITTED"
    ],
    [
      "CREATED",
      "ABANDONED"
    ],
    [
      "IN_PROGRESS",
      "ABANDONED"
    ],
    [
      "COMPLETE",
      "ABANDONED"
    ]
  ],
  "Sync": [
    [
      "LOCAL_ONLY",
      "QUEUED"
    ],
    [
      "QUEUED",
      "SYNCING"
    ],
    [
      "SYNCING",
      "SYNCED"
    ],
    [
      "SYNCING",
      "SYNC_FAILED"
    ],
    [
      "SYNC_FAILED",
      "QUEUED"
    ],
    [
      "SYNCING",
      "RECONCILIATION_REQUIRED"
    ],
    [
      "RECONCILIATION_REQUIRED",
      "QUEUED"
    ]
  ],
  "Submission": [
    [
      "RECEIVED",
      "VALIDATING"
    ],
    [
      "VALIDATING",
      "ACCEPTED"
    ],
    [
      "VALIDATING",
      "REJECTED"
    ]
  ],
  "Evidence": [
    [
      "LOCAL_ONLY",
      "UPLOAD_PENDING"
    ],
    [
      "UPLOAD_PENDING",
      "UPLOADING"
    ],
    [
      "UPLOADING",
      "UPLOADED"
    ],
    [
      "UPLOADED",
      "VERIFYING"
    ],
    [
      "VERIFYING",
      "VERIFIED"
    ],
    [
      "VERIFYING",
      "QUARANTINED"
    ],
    [
      "VERIFIED",
      "BOUND"
    ],
    [
      "BOUND",
      "READY"
    ],
    [
      "QUARANTINED",
      "PURGED"
    ],
    [
      "READY",
      "PURGED"
    ]
  ],
  "WorkflowRun": [
    [
      "QUEUED",
      "RUNNING"
    ],
    [
      "RUNNING",
      "SUCCEEDED"
    ],
    [
      "RUNNING",
      "FAILED"
    ],
    [
      "QUEUED",
      "CANCELLED"
    ],
    [
      "RUNNING",
      "CANCELLED"
    ]
  ],
  "AnalyticalProjection": [
    [
      "PENDING",
      "BUILDING"
    ],
    [
      "BUILDING",
      "CURRENT"
    ],
    [
      "BUILDING",
      "FAILED"
    ],
    [
      "CURRENT",
      "STALE"
    ],
    [
      "STALE",
      "REBUILDING"
    ],
    [
      "FAILED",
      "REBUILDING"
    ],
    [
      "REBUILDING",
      "CURRENT"
    ],
    [
      "REBUILDING",
      "FAILED"
    ]
  ],
  "Membership": [
    [
      "INVITED",
      "ACTIVE"
    ],
    [
      "INVITED",
      "REVOKED"
    ],
    [
      "ACTIVE",
      "SUSPENDED"
    ],
    [
      "SUSPENDED",
      "ACTIVE"
    ],
    [
      "ACTIVE",
      "REVOKED"
    ],
    [
      "SUSPENDED",
      "REVOKED"
    ]
  ],
  "Device": [
    [
      "REGISTERED",
      "ACTIVE"
    ],
    [
      "REGISTERED",
      "REVOKED"
    ],
    [
      "ACTIVE",
      "SUSPENDED"
    ],
    [
      "SUSPENDED",
      "ACTIVE"
    ],
    [
      "ACTIVE",
      "REVOKED"
    ],
    [
      "SUSPENDED",
      "REVOKED"
    ]
  ],
  "Project": [
    [
      "DRAFT",
      "ACTIVE"
    ],
    [
      "ACTIVE",
      "CLOSED"
    ],
    [
      "CLOSED",
      "ARCHIVED"
    ]
  ]
} as const;

export function canTransition(entity: keyof typeof ALLOWED_TRANSITIONS, from: string, to: string): boolean { return ALLOWED_TRANSITIONS[entity].some(([a,b]) => a===from && b===to); }
