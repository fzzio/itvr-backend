import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, ManyToOne, JoinColumn } from "typeorm";
import { DiscussionGuide } from "./DiscussionGuide";

@Entity("guide_versions")
export class GuideVersion {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => DiscussionGuide, guide => guide.versions)
  @JoinColumn({ name: "guide_id" })
  guide: DiscussionGuide;

  @Column({ type: "int" })
  version: number;

  @Column({ type: "json" })
  content: object;

  @Column({ name: "is_active", default: true })
  isActive: boolean;

  @CreateDateColumn({ name: "created_at" })
  createdAt: Date;
}
