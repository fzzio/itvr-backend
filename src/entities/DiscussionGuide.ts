import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, OneToMany } from "typeorm";
import { GuideVersion } from "./GuideVersion";

@Entity("discussion_guides")
export class DiscussionGuide {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  title: string;

  @Column({ type: "text", nullable: true })
  description: string;

  @Column({ name: "current_version", type: "int", default: 1 })
  currentVersion: number;

  @OneToMany(() => GuideVersion, version => version.guide)
  versions: GuideVersion[];

  @CreateDateColumn({ name: "created_at" })
  createdAt: Date;

  @UpdateDateColumn({ name: "updated_at" })
  updatedAt: Date;
}
