import { Injectable } from '@nestjs/common';
import {
  BotFlowStep,
  BotSessionState,
  LeadDraft,
  ResultDraft,
} from './bot.types';

type SessionEnvelope = {
  state: BotSessionState;
  updatedAt: number;
};

@Injectable()
export class BotStateService {
  private readonly sessions = new Map<string, SessionEnvelope>();
  private readonly sessionTtlMs = 30 * 60 * 1000;

  getSession(userId: number | string): BotSessionState {
    this.pruneExpiredSessions();
    return this.sessions.get(String(userId))?.state ?? {};
  }

  setStep(userId: number | string, step: BotFlowStep): void {
    const current = this.getSession(userId);
    this.save(String(userId), {
      ...current,
      step,
    });
  }

  setLeadDraft(userId: number | string, draft: LeadDraft): void {
    const current = this.getSession(userId);
    this.save(String(userId), {
      ...current,
      leadDraft: {
        ...current.leadDraft,
        ...draft,
      },
    });
  }

  setResultDraft(userId: number | string, draft: ResultDraft): void {
    const current = this.getSession(userId);
    this.save(String(userId), {
      ...current,
      resultDraft: {
        ...current.resultDraft,
        ...draft,
      },
    });
  }

  setMeta(userId: number | string, meta: Record<string, unknown>): void {
    const current = this.getSession(userId);
    this.save(String(userId), {
      ...current,
      meta: {
        ...(current.meta ?? {}),
        ...meta,
      },
    });
  }

  clear(userId: number | string): void {
    this.sessions.delete(String(userId));
  }

  private save(userId: string, state: BotSessionState): void {
    this.sessions.set(userId, {
      state,
      updatedAt: Date.now(),
    });
  }

  private pruneExpiredSessions(): void {
    const now = Date.now();
    for (const [userId, session] of this.sessions.entries()) {
      if (now - session.updatedAt > this.sessionTtlMs) {
        this.sessions.delete(userId);
      }
    }
  }
}
