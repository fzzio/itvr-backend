import { MigrationInterface, QueryRunner, Table, TableForeignKey } from "typeorm";

export class CreateInterviewSessionsTable1689433786124 implements MigrationInterface {
    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.createTable(
            new Table({
                name: "interview_sessions",
                columns: [
                    {
                        name: "id",
                        type: "int",
                        isPrimary: true,
                        isGenerated: true,
                        generationStrategy: "increment",
                    },
                    {
                        name: "guide_id",
                        type: "int",
                    },
                    {
                        name: "guide_version_id",
                        type: "int",
                    },
                    {
                        name: "state",
                        type: "json",
                    },
                    {
                        name: "created_at",
                        type: "timestamp",
                        default: "CURRENT_TIMESTAMP",
                    },
                    {
                        name: "updated_at",
                        type: "timestamp",
                        default: "CURRENT_TIMESTAMP",
                        onUpdate: "CURRENT_TIMESTAMP",
                    },
                ],
            }),
            true
        );

        // Add foreign keys
        await queryRunner.createForeignKey(
            "interview_sessions",
            new TableForeignKey({
                columnNames: ["guide_id"],
                referencedColumnNames: ["id"],
                referencedTableName: "discussion_guides",
                onDelete: "CASCADE",
            })
        );

        await queryRunner.createForeignKey(
            "interview_sessions",
            new TableForeignKey({
                columnNames: ["guide_version_id"],
                referencedColumnNames: ["id"],
                referencedTableName: "guide_versions",
                onDelete: "RESTRICT",
            })
        );
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        const table = await queryRunner.getTable("interview_sessions");
        if (table) {
            const foreignKeys = table.foreignKeys;
            for (const foreignKey of foreignKeys) {
                await queryRunner.dropForeignKey("interview_sessions", foreignKey);
            }
        }
        await queryRunner.dropTable("interview_sessions");
    }
}
