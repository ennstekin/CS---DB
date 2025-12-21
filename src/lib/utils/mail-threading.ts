/**
 * Mail Threading Utility
 * Groups emails into conversation threads based on message_id and in_reply_to
 */

export interface ThreadedMail {
  id: string;
  messageId: string | null;
  inReplyTo: string | null;
  fromEmail: string;
  toEmail: string;
  subject: string;
  bodyText: string;
  bodyHtml?: string;
  status: string;
  priority: string;
  direction: string;
  isAiAnalyzed: boolean;
  aiCategory?: string;
  aiSummary?: string;
  suggestedOrderIds: string[];
  matchConfidence?: number;
  receivedAt?: Date;
  sentAt?: Date;
  createdAt: Date;
  labels?: string[];
  flags?: string[];
  matchedOrderNumber?: string | null;
  isMatchedWithOrder?: boolean;
  matchedReturnId?: string | null;
  matchedReturnNumber?: string | null;
}

export interface MailThread {
  id: string; // Thread ID (root mail ID)
  subject: string; // Original subject (without Re:)
  latestMail: ThreadedMail;
  mails: ThreadedMail[];
  mailCount: number;
  hasUnread: boolean;
  participants: string[];
  lastActivityAt: Date;
}

/**
 * Normalize subject by removing Re:, Fwd:, etc.
 */
function normalizeSubject(subject: string): string {
  return subject
    .replace(/^(re|fwd|fw|ynt|ileti|yanıt):\s*/gi, '')
    .trim();
}

/**
 * Extract clean email from formats like "Name" <email@domain.com>
 */
function extractEmail(emailString: string): string {
  const match = emailString.match(/<([^>]+)>/);
  return match ? match[1] : emailString;
}

/**
 * Group mails into threads based on message_id, in_reply_to, AND normalized subject
 * Uses subject-based fallback when in_reply_to chain is broken
 */
export function groupMailsIntoThreads(mails: ThreadedMail[]): MailThread[] {
  if (!mails || mails.length === 0) return [];

  // Build a map of message_id -> mail
  const messageIdMap = new Map<string, ThreadedMail>();
  mails.forEach(mail => {
    if (mail.messageId) {
      messageIdMap.set(mail.messageId, mail);
    }
  });

  // Find the root of each mail's thread via in_reply_to
  const mailToRootId = new Map<string, string>();

  function findRoot(mail: ThreadedMail): string {
    // Already computed
    if (mailToRootId.has(mail.id)) {
      return mailToRootId.get(mail.id)!;
    }

    // No in_reply_to means this is a root
    if (!mail.inReplyTo) {
      mailToRootId.set(mail.id, mail.id);
      return mail.id;
    }

    // Find parent mail
    const parentMail = messageIdMap.get(mail.inReplyTo);
    if (!parentMail) {
      // Parent not in our dataset - this mail is the effective root
      mailToRootId.set(mail.id, mail.id);
      return mail.id;
    }

    // Recursively find root
    const rootId = findRoot(parentMail);
    mailToRootId.set(mail.id, rootId);
    return rootId;
  }

  // Compute root for all mails
  mails.forEach(mail => findRoot(mail));

  // Group mails by their root (initial grouping)
  const threadMap = new Map<string, ThreadedMail[]>();
  mails.forEach(mail => {
    const rootId = mailToRootId.get(mail.id)!;
    if (!threadMap.has(rootId)) {
      threadMap.set(rootId, []);
    }
    threadMap.get(rootId)!.push(mail);
  });

  // FALLBACK: Merge threads with same normalized subject
  // This handles cases where in_reply_to is missing (e.g., our outbound mails)
  const subjectToThreadRoot = new Map<string, string>();
  const rootMergeMap = new Map<string, string>(); // maps old root -> new root

  // Sort thread roots by oldest mail date (to pick the true root)
  const sortedRoots = Array.from(threadMap.keys()).sort((a, b) => {
    const mailsA = threadMap.get(a)!;
    const mailsB = threadMap.get(b)!;
    const oldestA = Math.min(...mailsA.map(m => new Date(m.receivedAt || m.createdAt).getTime()));
    const oldestB = Math.min(...mailsB.map(m => new Date(m.receivedAt || m.createdAt).getTime()));
    return oldestA - oldestB;
  });

  sortedRoots.forEach(rootId => {
    const threadMails = threadMap.get(rootId)!;
    // Get normalized subject from the oldest mail in this thread
    const oldestMail = threadMails.reduce((oldest, mail) => {
      const dateOldest = new Date(oldest.receivedAt || oldest.createdAt).getTime();
      const dateMail = new Date(mail.receivedAt || mail.createdAt).getTime();
      return dateMail < dateOldest ? mail : oldest;
    });
    const normalizedSubj = normalizeSubject(oldestMail.subject).toLowerCase();

    if (subjectToThreadRoot.has(normalizedSubj)) {
      // Merge this thread into existing one
      const existingRoot = subjectToThreadRoot.get(normalizedSubj)!;
      rootMergeMap.set(rootId, existingRoot);
    } else {
      // This is the first thread with this subject
      subjectToThreadRoot.set(normalizedSubj, rootId);
    }
  });

  // Apply merges
  const mergedThreadMap = new Map<string, ThreadedMail[]>();
  threadMap.forEach((threadMails, rootId) => {
    const finalRoot = rootMergeMap.get(rootId) || rootId;
    if (!mergedThreadMap.has(finalRoot)) {
      mergedThreadMap.set(finalRoot, []);
    }
    mergedThreadMap.get(finalRoot)!.push(...threadMails);
  });

  // Build thread objects
  const threads: MailThread[] = [];

  mergedThreadMap.forEach((threadMails, rootId) => {
    // Sort mails in thread by date (oldest first for display, newest for latest)
    const sortedMails = [...threadMails].sort((a, b) => {
      const dateA = new Date(a.receivedAt || a.createdAt).getTime();
      const dateB = new Date(b.receivedAt || b.createdAt).getTime();
      return dateA - dateB;
    });

    const oldestMail = sortedMails[0];
    const latestMail = sortedMails[sortedMails.length - 1];

    // Get unique participants
    const participantSet = new Set<string>();
    threadMails.forEach(mail => {
      participantSet.add(extractEmail(mail.fromEmail));
      if (mail.toEmail) {
        participantSet.add(extractEmail(mail.toEmail));
      }
    });

    // Check if any mail in thread is unread (NEW status)
    const hasUnread = threadMails.some(mail => mail.status === 'NEW');

    // Only include INBOUND mails for inbox display
    const inboundMails = sortedMails.filter(m => m.direction === 'INBOUND');
    const latestInbound = inboundMails.length > 0
      ? inboundMails[inboundMails.length - 1]
      : latestMail;

    threads.push({
      id: rootId,
      subject: normalizeSubject(oldestMail.subject),
      latestMail: latestInbound,
      mails: sortedMails,
      mailCount: threadMails.length,
      hasUnread,
      participants: Array.from(participantSet),
      lastActivityAt: new Date(latestMail.receivedAt || latestMail.createdAt),
    });
  });

  // Sort threads by last activity (newest first)
  threads.sort((a, b) => b.lastActivityAt.getTime() - a.lastActivityAt.getTime());

  return threads;
}

/**
 * Get thread summary for display in list
 */
export function getThreadSummary(thread: MailThread): string {
  const inboundCount = thread.mails.filter(m => m.direction === 'INBOUND').length;
  const outboundCount = thread.mails.filter(m => m.direction === 'OUTBOUND').length;

  if (outboundCount > 0 && inboundCount > 0) {
    return `${inboundCount} gelen, ${outboundCount} giden`;
  }
  return `${thread.mailCount} mesaj`;
}
