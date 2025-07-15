import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, ManyToOne, JoinColumn } from "typeorm";
import { DiscussionGuide } from "./DiscussionGuide";
import { GuideVersion } from "./GuideVersion";
import { SessionState } from "../types/sessions";

@Entity("interview_sessions")
export class InterviewSession {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => DiscussionGuide)
  @JoinColumn({ name: "guide_id" })
  guide: DiscussionGuide;

  @Column({ name: "guide_id" })
  guideId: number;

  @ManyToOne(() => GuideVersion)
  @JoinColumn({ name: "guide_version_id" })
  guideVersion: GuideVersion;

  @Column({ name: "guide_version_id" })
  guideVersionId: number;

  @Column({ type: "json" })
  state: SessionState;

  @CreateDateColumn({ name: "created_at" })
  createdAt: Date;

  @UpdateDateColumn({ name: "updated_at" })
  updatedAt: Date;
}
