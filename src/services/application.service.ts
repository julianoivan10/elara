import "server-only";
import type { ApplicationStatus, Prisma } from "@prisma/client";

import { db } from "@/server/db";
import { AuthorizationError, NotFoundError } from "@/server/auth/guards";
import { isProviderKey, PROVIDER_LABEL } from "@/lib/jobs/types";
import { ResumeService } from "@/services/resume.service";

export type PreparedAnswer = { question: string; answer: string };

/**
 * ApplicationService: the tracker.
 *
 * Status changes are recorded as events, so the history is real rather than a
 * single mutable field — "when did this go to interview?" has an answer.
 */
export const APPLICATION_STATUSES: {
  value: ApplicationStatus;
  label: string;
  tone: string;
  /** Terminal stages sit apart from the live pipeline. */
  terminal?: boolean;
}[] = [
  { value: "SAVED", label: "Saved", tone: "neutral" },
  { value: "PREPARED", label: "Prepared", tone: "outline" },
  { value: "APPLIED", label: "Applied", tone: "cobalt" },
  { value: "SCREENING", label: "Screening", tone: "info" },
  { value: "ASSESSMENT", label: "Assessment", tone: "warning" },
  { value: "INTERVIEW", label: "Interview", tone: "lime" },
  { value: "OFFER", label: "Offer", tone: "success" },
  { value: "REJECTED", label: "Rejected", tone: "danger", terminal: true },
];

export const ACTIVE_STATUSES: ApplicationStatus[] = [
  "SAVED",
  "PREPARED",
  "APPLIED",
  "SCREENING",
  "ASSESSMENT",
  "INTERVIEW",
  "OFFER",
];

export const ApplicationService = {
  async board(userId: string) {
    const applications = await db.application.findMany({
      where: { userId },
      orderBy: [{ sortIndex: "asc" }, { updatedAt: "desc" }],
      include: {
        job: {
          select: {
            id: true,
            title: true,
            company: true,
            isActive: true,
            source: true,
          },
        },
        resume: { select: { id: true, title: true } },
        _count: { select: { notes: true } },
      },
    });

    // Group once here rather than filtering per column in the UI.
    const columns = APPLICATION_STATUSES.map((status) => ({
      ...status,
      items: applications.filter((app) => app.status === status.value),
    }));

    return { applications, columns };
  },

  async get(userId: string, applicationId: string) {
    const application = await db.application.findUnique({
      where: { id: applicationId },
      include: {
        job: true,
        notes: { orderBy: { createdAt: "desc" } },
        events: { orderBy: { createdAt: "desc" } },
      },
    });

    if (!application) throw new NotFoundError("That application is gone.");
    if (application.userId !== userId) throw new AuthorizationError();
    return application;
  },

  async create(
    userId: string,
    input: {
      company: string;
      role: string;
      location?: string | null;
      url?: string | null;
      source?: string | null;
      status?: ApplicationStatus;
      jobId?: string | null;
      appliedAt?: Date | null;
      provider?: string | null;
    },
  ) {
    const status = input.status ?? "SAVED";

    const application = await db.application.create({
      data: {
        userId,
        company: input.company,
        role: input.role,
        location: input.location ?? null,
        url: input.url ?? null,
        source: input.source ?? null,
        status,
        jobId: input.jobId ?? null,
        provider: input.provider ?? null,
        appliedAt:
          input.appliedAt ?? (status === "APPLIED" ? new Date() : null),
        events: { create: { toStatus: status } },
      },
      select: { id: true },
    });

    return application;
  },

  /** Create from a job posting, without retyping what we already know. */
  async createFromJob(userId: string, jobId: string) {
    const job = await db.job.findFirst({
      where: { id: jobId, isDemo: false },
      select: {
        id: true,
        title: true,
        company: true,
        location: true,
        applyUrl: true,
        source: true,
      },
    });
    if (!job) throw new NotFoundError("That job is no longer listed.");

    const existing = await db.application.findFirst({
      where: { userId, jobId },
      select: { id: true },
    });
    if (existing) return existing;

    return ApplicationService.create(userId, {
      company: job.company,
      role: job.title,
      location: job.location,
      url: job.applyUrl,
      source: isProviderKey(job.source)
        ? PROVIDER_LABEL[job.source]
        : job.source,
      provider: job.source,
      jobId: job.id,
      status: "SAVED",
    });
  },

  /**
   * Save the prepared materials for a job: which resume, an optional cover
   * letter, optional answers. Moves a saved application to "prepared" (with a
   * history event). Nothing is sent anywhere — the person applies on the
   * official page themselves.
   */
  async prepare(
    userId: string,
    jobId: string,
    input: {
      resumeId: string | null;
      coverLetter: string | null;
      answers: PreparedAnswer[];
    },
  ) {
    const job = await db.job.findFirst({
      where: { id: jobId, isDemo: false },
      select: {
        id: true,
        title: true,
        company: true,
        location: true,
        applyUrl: true,
        source: true,
      },
    });
    if (!job) throw new NotFoundError("That job is no longer listed.");

    if (input.resumeId) {
      const owned = await db.resume.findFirst({
        where: { id: input.resumeId, userId },
        select: { id: true },
      });
      if (!owned) throw new AuthorizationError("That resume is not yours.");
    }

    const materials = {
      resumeId: input.resumeId,
      coverLetter: input.coverLetter,
      answers: input.answers as unknown as Prisma.InputJsonValue,
      preparedAt: new Date(),
      method: "ASSISTED" as const,
      provider: job.source,
    };

    const existing = await db.application.findFirst({
      where: { userId, jobId },
      select: { id: true, status: true },
    });

    if (existing) {
      const promote = existing.status === "SAVED";
      await db.$transaction([
        db.application.update({
          where: { id: existing.id },
          data: {
            ...materials,
            ...(promote ? { status: "PREPARED" as const } : {}),
          },
        }),
        ...(promote
          ? [
              db.applicationEvent.create({
                data: {
                  applicationId: existing.id,
                  fromStatus: "SAVED",
                  toStatus: "PREPARED",
                },
              }),
            ]
          : []),
      ]);
      return { id: existing.id };
    }

    return db.application.create({
      data: {
        userId,
        jobId: job.id,
        company: job.company,
        role: job.title,
        location: job.location,
        url: job.applyUrl,
        source: isProviderKey(job.source)
          ? PROVIDER_LABEL[job.source]
          : job.source,
        status: "PREPARED",
        ...materials,
        events: { create: { toStatus: "PREPARED" } },
      },
      select: { id: true },
    });
  },

  /**
   * The person says they applied on the official page. Records the date and a
   * snapshot of the resume they used, so later edits to the resume or profile
   * cannot rewrite what was actually sent.
   */
  async markApplied(userId: string, applicationId: string) {
    const current = await db.application.findFirst({
      where: { id: applicationId, userId },
      select: {
        id: true,
        status: true,
        resumeId: true,
        preparedAt: true,
        appliedAt: true,
      },
    });
    if (!current) throw new NotFoundError("That application is gone.");

    const snapshot = current.resumeId
      ? await ResumeService.buildDocument(userId, current.resumeId).catch(
          () => null,
        )
      : null;

    const advance = current.status === "SAVED" || current.status === "PREPARED";
    await db.$transaction([
      db.application.update({
        where: { id: current.id },
        data: {
          ...(advance ? { status: "APPLIED" as const } : {}),
          appliedAt: current.appliedAt ?? new Date(),
          method: current.preparedAt ? "ASSISTED" : "EXTERNAL_LINK",
          ...(snapshot
            ? { resumeSnapshot: snapshot as unknown as Prisma.InputJsonValue }
            : {}),
        },
      }),
      ...(advance
        ? [
            db.applicationEvent.create({
              data: {
                applicationId: current.id,
                fromStatus: current.status,
                toStatus: "APPLIED",
              },
            }),
          ]
        : []),
    ]);
  },

  async setStatus(
    userId: string,
    applicationId: string,
    status: ApplicationStatus,
  ) {
    const current = await db.application.findUnique({
      where: { id: applicationId },
      select: { userId: true, status: true, appliedAt: true },
    });

    if (!current) throw new NotFoundError();
    if (current.userId !== userId) throw new AuthorizationError();
    if (current.status === status) return;

    await db.$transaction([
      db.application.update({
        where: { id: applicationId },
        data: {
          status,
          // Stamp the application date the first time it leaves "saved".
          appliedAt:
            current.appliedAt ?? (status !== "SAVED" ? new Date() : null),
        },
      }),
      db.applicationEvent.create({
        data: {
          applicationId,
          fromStatus: current.status,
          toStatus: status,
        },
      }),
    ]);
  },

  async update(
    userId: string,
    applicationId: string,
    patch: {
      company?: string;
      role?: string;
      location?: string | null;
      url?: string | null;
      source?: string | null;
      nextEventAt?: Date | null;
      nextEventLabel?: string | null;
    },
  ) {
    const result = await db.application.updateMany({
      where: { id: applicationId, userId },
      data: patch,
    });
    if (result.count === 0) throw new AuthorizationError();
  },

  async remove(userId: string, applicationId: string) {
    const result = await db.application.deleteMany({
      where: { id: applicationId, userId },
    });
    if (result.count === 0) throw new AuthorizationError();
  },

  async addNote(userId: string, applicationId: string, body: string) {
    const owned = await db.application.findFirst({
      where: { id: applicationId, userId },
      select: { id: true },
    });
    if (!owned) throw new AuthorizationError();

    await db.applicationNote.create({ data: { applicationId, body } });
    await db.application.update({
      where: { id: applicationId },
      data: { updatedAt: new Date() },
    });
  },

  async removeNote(userId: string, noteId: string) {
    const note = await db.applicationNote.findUnique({
      where: { id: noteId },
      select: { application: { select: { userId: true } } },
    });
    if (!note) throw new NotFoundError();
    if (note.application.userId !== userId) throw new AuthorizationError();

    await db.applicationNote.delete({ where: { id: noteId } });
  },

  /** Counts for the dashboard, in one round trip. */
  async stats(userId: string) {
    const grouped = await db.application.groupBy({
      by: ["status"],
      where: { userId },
      _count: { _all: true },
    });

    const byStatus = Object.fromEntries(
      grouped.map((row) => [row.status, row._count._all]),
    ) as Partial<Record<ApplicationStatus, number>>;

    const total = grouped.reduce((sum, row) => sum + row._count._all, 0);
    const active = ACTIVE_STATUSES.reduce(
      (sum, status) => sum + (byStatus[status] ?? 0),
      0,
    );

    return {
      total,
      active,
      byStatus,
      interviews:
        (byStatus.INTERVIEW ?? 0) +
        (byStatus.ASSESSMENT ?? 0) +
        (byStatus.SCREENING ?? 0),
      offers: byStatus.OFFER ?? 0,
    };
  },

  /** The activity stream: status changes and notes, newest first. */
  async recentActivity(userId: string, take = 8) {
    const events = await db.applicationEvent.findMany({
      where: { application: { userId } },
      orderBy: { createdAt: "desc" },
      take,
      include: {
        application: { select: { id: true, company: true, role: true } },
      },
    });

    return events;
  },
};
